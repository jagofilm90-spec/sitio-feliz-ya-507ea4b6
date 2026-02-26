import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CargaHojaInteractiva } from "./CargaHojaInteractiva";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PedidoEnCola {
  pedidoId: string;
  folio: string;
  clienteNombre: string;
  clienteId: string;
  sucursalNombre: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
}

interface RutaBasica {
  id: string;
  folio: string;
  status: string;
  carga_completada: boolean | null;
  carga_iniciada_en: string | null;
  vehiculo: { id: string; nombre: string; placas: string } | null;
  chofer: { id: string; nombre_completo: string } | null;
  ayudantes_ids?: string[] | null;
  entregas: { id: string; pedido_id: string }[];
}

interface RutaCargaInlineViewProps {
  ruta: RutaBasica;
  onClose: () => void;
  onCargaCompletada: () => void;
}

export const RutaCargaInlineView = ({ ruta, onClose, onCargaCompletada }: RutaCargaInlineViewProps) => {
  const [pedidos, setPedidos] = useState<PedidoEnCola[]>([]);
  const [loading, setLoading] = useState(true);
  const [tiempoSeg, setTiempoSeg] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [ayudantesNombres, setAyudantesNombres] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load pedidos from entregas
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const pedidosData: PedidoEnCola[] = [];

      for (const entrega of ruta.entregas) {
        const { data } = await supabase
          .from("pedidos")
          .select("id, folio, cliente_id, cliente:clientes(nombre, direccion), sucursal:cliente_sucursales(nombre, direccion, latitud, longitud)")
          .eq("id", entrega.pedido_id)
          .single();

        if (data) {
          const suc = data.sucursal as any;
          const cli = data.cliente as any;
          pedidosData.push({
            pedidoId: data.id,
            folio: data.folio,
            clienteNombre: cli?.nombre || "Sin cliente",
            clienteId: data.cliente_id,
            sucursalNombre: suc?.nombre || null,
            direccion: suc?.direccion || cli?.direccion || null,
            latitud: suc?.latitud || null,
            longitud: suc?.longitud || null,
          });
        }
      }

      setPedidos(pedidosData);

      // Load ayudantes names
      if (ruta.ayudantes_ids && ruta.ayudantes_ids.length > 0) {
        const { data: ayudantesData } = await supabase
          .from("empleados")
          .select("nombre_completo")
          .in("id", ruta.ayudantes_ids);
        setAyudantesNombres((ayudantesData || []).map(a => a.nombre_completo));
      }

      // Timer from carga_iniciada_en
      if (ruta.carga_iniciada_en) {
        const inicio = new Date(ruta.carga_iniciada_en);
        setTiempoSeg(Math.floor((Date.now() - inicio.getTime()) / 1000));
      }

      setLoading(false);
    };
    load();
  }, [ruta]);

  // Timer
  useEffect(() => {
    if (!loading && ruta.carga_iniciada_en) {
      timerRef.current = setInterval(() => {
        const inicio = new Date(ruta.carga_iniciada_en!);
        setTiempoSeg(Math.floor((Date.now() - inicio.getTime()) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, ruta.carga_iniciada_en]);

  const formatTiempo = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleFinalizar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("rutas").update({
        carga_completada: true,
        carga_completada_por: user?.id,
        carga_completada_en: new Date().toISOString(),
        status: "cargada",
      }).eq("id", ruta.id);

      for (const item of pedidos) {
        await supabase.from("pedidos").update({
          status: "en_ruta",
          updated_at: new Date().toISOString(),
        }).eq("id", item.pedidoId);

        try {
          await supabase.functions.invoke("send-client-notification", {
            body: {
              clienteId: item.clienteId,
              tipo: "en_ruta",
              data: { pedidoFolio: item.folio, choferNombre: ruta.chofer?.nombre_completo || "Chofer" },
            },
          });
        } catch {}
      }

      toast.success("¡Carga completada!");
      onCargaCompletada();
    } catch (err: any) {
      toast.error("Error al finalizar: " + (err?.message || ""));
    }
  };

  const handleCancelar = async () => {
    setCancelling(true);
    try {
      const { data: entregasRuta } = await supabase.from("entregas").select("id").eq("ruta_id", ruta.id);
      if (entregasRuta && entregasRuta.length > 0) {
        const eIds = entregasRuta.map(e => e.id);
        const { data: cargaProds } = await supabase
          .from("carga_productos")
          .select("id, cargado, lote_id, cantidad_cargada")
          .in("entrega_id", eIds);
        for (const cp of cargaProds || []) {
          if (cp.cargado && cp.lote_id && cp.cantidad_cargada) {
            await supabase.rpc("incrementar_lote", { p_lote_id: cp.lote_id, p_cantidad: cp.cantidad_cargada });
          }
        }
        await supabase.from("carga_productos").delete().in("entrega_id", eIds);
      }
      await supabase.from("entregas").delete().eq("ruta_id", ruta.id);
      if (ruta.vehiculo?.id) {
        await supabase.from("vehiculos").update({ status: "disponible" }).eq("id", ruta.vehiculo.id);
      }
      for (const item of pedidos) {
        await supabase.from("pedidos").update({ status: "pendiente" as any, updated_at: new Date().toISOString() }).eq("id", item.pedidoId);
      }
      await supabase.from("rutas").delete().eq("id", ruta.id);
      toast.success("Ruta eliminada");
      onClose();
    } catch (err: any) {
      toast.error("Error: " + (err?.message || ""));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <CargaHojaInteractiva
      rutaId={ruta.id}
      rutaFolio={ruta.folio}
      pedidos={pedidos}
      tiempoSeg={tiempoSeg}
      formatTiempo={formatTiempo}
      onFinalizar={handleFinalizar}
      onCancelar={handleCancelar}
      onClose={onClose}
      cancelling={cancelling}
      personal={{
        choferNombre: ruta.chofer?.nombre_completo || "",
        ayudantesNombres,
        vehiculoNombre: ruta.vehiculo?.nombre || "",
        vehiculoPlaca: ruta.vehiculo?.placas || "",
      }}
    />
  );
};
