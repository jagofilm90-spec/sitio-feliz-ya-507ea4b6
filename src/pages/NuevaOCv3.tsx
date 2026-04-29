import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SeccionProveedor from "@/components/compras/oc-v3/SeccionProveedor";
import SeccionProductos from "@/components/compras/oc-v3/SeccionProductos";
import SeccionEntrega from "@/components/compras/oc-v3/SeccionEntrega";
import SidebarTotales from "@/components/compras/oc-v3/SidebarTotales";
import type { LineaOC, ProveedorLite, TipoPlazo } from "@/components/compras/oc-v3/types";

function defaultFechaEntrega(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function NuevaOCv3() {
  const navigate = useNavigate();

  // Sección 1
  const [proveedor, setProveedor] = useState<ProveedorLite | null>(null);
  const [plazoTipo, setPlazoTipo] = useState<TipoPlazo | null>(null);
  const [plazoOtroDias, setPlazoOtroDias] = useState<number>(0);
  const [metodoAnticipado, setMetodoAnticipado] = useState<string>("");
  const [fechaPagoAnticipado, setFechaPagoAnticipado] = useState<string>("");

  // Sección 2
  const [lineas, setLineas] = useState<LineaOC[]>([]);

  // Sección 3
  const [fechaEntrega, setFechaEntrega] = useState<string>(defaultFechaEntrega());
  const [notas, setNotas] = useState<string>("");
  const [notasInternas, setNotasInternas] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);

  const calcularPlazoDias = (): number => {
    if (!plazoTipo) return 0;
    if (plazoTipo === "contado" || plazoTipo === "anticipado") return 0;
    if (plazoTipo === "otro") return plazoOtroDias;
    return Number(plazoTipo);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!proveedor) {
      toast.error("Selecciona un proveedor");
      return;
    }
    if (!plazoTipo) {
      toast.error("Selecciona el plazo de pago");
      return;
    }
    if (plazoTipo === "otro" && plazoOtroDias <= 0) {
      toast.error("Ingresa los días del plazo");
      return;
    }
    if (plazoTipo === "anticipado") {
      if (!fechaPagoAnticipado) {
        toast.error("Captura la fecha de pago anticipado");
        return;
      }
      if (!metodoAnticipado) {
        toast.error("Selecciona el método de pago anticipado");
        return;
      }
    }
    if (lineas.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    for (const l of lineas) {
      if (l.cantidad <= 0) {
        toast.error(`Cantidad inválida en ${l.producto.nombre}`);
        return;
      }
      if (l.precio_unitario <= 0) {
        toast.error(`Precio inválido en ${l.producto.nombre}`);
        return;
      }
    }

    const tipoPago: "contra_entrega" | "anticipado" =
      plazoTipo === "anticipado" ? "anticipado" : "contra_entrega";

    const payload = {
      p_proveedor_id: proveedor.id,
      p_tipo_pago: tipoPago,
      p_lineas: lineas.map((l) => ({
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
      })),
      p_plazo_pago_dias: calcularPlazoDias(),
      p_metodo_pago_anticipado: tipoPago === "anticipado" ? metodoAnticipado : null,
      p_notas: notas || null,
      p_notas_internas: notasInternas || null,
      p_entregas_multiples: false,
      p_entregas: null,
    };

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("crear_orden_compra_v3", payload as any);
      if (error) throw error;
      const folio = (data as any)?.folio ?? "";
      toast.success(folio ? `OC creada · Folio: ${folio}` : "OC creada");
      navigate("/compras");
    } catch (err: any) {
      console.error("[NuevaOCv3] error", err);
      toast.error(err?.message ?? "Error al crear la OC");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    toast.info("Guardar borrador llegará en la iteración 3");
  };

  const validationError: string | null = (() => {
    if (!proveedor) return "Selecciona un proveedor";
    if (!plazoTipo) return "Selecciona el plazo de pago";
    if (plazoTipo === "otro" && plazoOtroDias <= 0) return "Ingresa los días del plazo";
    if (plazoTipo === "anticipado") {
      if (!fechaPagoAnticipado) return "Captura la fecha de pago anticipado";
      if (!metodoAnticipado) return "Selecciona el método de pago anticipado";
    }
    if (lineas.length === 0) return "Agrega al menos un producto";
    for (const l of lineas) {
      if (l.cantidad <= 0) return `Cantidad inválida en ${l.producto.nombre}`;
      if (l.precio_unitario <= 0) return `Precio inválido en ${l.producto.nombre}`;
    }
    if (!fechaEntrega) return "Selecciona la fecha de entrega";
    return null;
  })();

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="mx-auto max-w-[1280px] px-8 py-10">
        {/* Header */}
        <header className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-400 font-medium">
            Compras · OC v3
          </p>
          <h1 className="font-serif italic text-4xl text-crimson-700 mt-2">
            Nueva orden de compra.
          </h1>
        </header>

        <div className="flex gap-8 items-start">
          {/* Columna izquierda: secciones */}
          <div className="flex-1 min-w-0 space-y-6">
            <SeccionProveedor
              proveedor={proveedor}
              setProveedor={setProveedor}
              plazoTipo={plazoTipo}
              setPlazoTipo={setPlazoTipo}
              plazoOtroDias={plazoOtroDias}
              setPlazoOtroDias={setPlazoOtroDias}
              metodoAnticipado={metodoAnticipado}
              setMetodoAnticipado={setMetodoAnticipado}
              fechaPagoAnticipado={fechaPagoAnticipado}
              setFechaPagoAnticipado={setFechaPagoAnticipado}
            />

            <SeccionProductos
              proveedorId={proveedor?.id ?? null}
              lineas={lineas}
              setLineas={setLineas}
            />

            <SeccionEntrega
              fechaEntrega={fechaEntrega}
              setFechaEntrega={setFechaEntrega}
              notas={notas}
              setNotas={setNotas}
              notasInternas={notasInternas}
              setNotasInternas={setNotasInternas}
            />
          </div>

          {/* Columna derecha: sidebar sticky */}
          <SidebarTotales
            proveedor={proveedor}
            plazoTipo={plazoTipo}
            plazoOtroDias={plazoOtroDias}
            lineas={lineas}
            submitting={submitting}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            validationError={validationError}
          />
        </div>
      </div>
    </div>
  );
}
