import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, MapPin, Phone, Clock, User, Building2, ExternalLink, Plus, Edit, ArrowLeft } from "lucide-react";
import { getRegimenDescripcionCorta } from "@/constants/catalogoSAT";

export default function DetalleCliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<any>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [vendedorNombre, setVendedorNombre] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", id).single(),
        supabase.from("cliente_sucursales").select("*").eq("cliente_id", id).eq("activo", true).order("created_at"),
      ]);
      setCliente(c);
      setSucursales(s || []);

      if (c?.vendedor_asignado) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", c.vendedor_asignado)
          .single();
        setVendedorNombre(p?.full_name || "");
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!cliente) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Cliente no encontrado</div>
      </Layout>
    );
  }

  const creditLabel = {
    contado: "Contado",
    "8_dias": "8 días",
    "15_dias": "15 días",
    "30_dias": "30 días",
    "60_dias": "60 días",
  }[cliente.termino_credito as string] || cliente.termino_credito;

  return (
    <Layout>
      <div className="max-w-[760px] mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb */}
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <button onClick={() => navigate("/clientes")} className="hover:text-foreground transition-colors">
              Clientes
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">{cliente.nombre}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{cliente.razon_social || cliente.nombre}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {cliente.rfc && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {cliente.rfc}
                  </Badge>
                )}
                <Badge variant={cliente.activo ? "default" : "secondary"}>
                  {cliente.activo ? "Activo" : "Inactivo"}
                </Badge>
                {vendedorNombre && (
                  <Badge variant="outline">
                    <User className="h-3 w-3 mr-1" />
                    {vendedorNombre}
                  </Badge>
                )}
                <Badge variant="outline">{creditLabel}</Badge>
                {cliente.limite_credito ? (
                  <Badge variant="outline">${Number(cliente.limite_credito).toLocaleString("es-MX")}</Badge>
                ) : (
                  <Badge variant="outline">Sin límite</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => navigate("/clientes")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver
              </Button>
            </div>
          </div>
        </div>

        {/* Info fiscal */}
        {cliente.direccion && (
          <div className="text-sm text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dirección fiscal</span>
            <p className="mt-0.5 text-foreground">{cliente.direccion}</p>
          </div>
        )}

        {/* Puntos de entrega */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Puntos de entrega</h2>
              <p className="text-xs text-muted-foreground">{sucursales.length} punto(s) registrados</p>
            </div>
          </div>

          <div className="space-y-3">
            {sucursales.map((s, i) => {
              const label = (() => {
                const code = s.codigo_sucursal?.trim();
                const name = s.nombre?.trim();
                if (code && name) return `#${code} ${name}`;
                if (code) return `#${code}`;
                return name || "Sin nombre";
              })();

              return (
                <Card key={s.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-foreground">{label}</span>
                          {i === 0 && (
                            <Badge variant="outline" className="text-xs">Matriz</Badge>
                          )}
                        </div>
                        {s.direccion && (
                          <p className="text-sm text-muted-foreground pl-6">{s.direccion}</p>
                        )}
                        <div className="flex gap-4 pl-6 text-xs text-muted-foreground">
                          {s.contacto && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {s.contacto}
                            </span>
                          )}
                          {s.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {s.telefono}
                            </span>
                          )}
                          {s.horario_entrega && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {s.horario_entrega}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {s.latitud && s.longitud && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`https://www.google.com/maps?q=${s.latitud},${s.longitud}`, "_blank")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {sucursales.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Este cliente no tiene puntos de entrega registrados.
            </p>
          )}
        </section>
      </div>
    </Layout>
  );
}
