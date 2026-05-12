import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Shield, ShieldOff, Edit, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useClienteCreditoStatus, useCambiarLimiteCredito, useAplicarCreditHold, useLiberarCreditHold, useCreditoLog } from "@/hooks/useClienteCredito";
import { useUserRoles } from "@/hooks/useUserRoles";

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

const ESTADO_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  OK: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "OK" },
  CERCA_LIMITE: { color: "bg-amber-100 text-amber-800", icon: AlertTriangle, label: "Cerca del límite" },
  LIMITE_ALCANZADO: { color: "bg-red-100 text-red-800", icon: AlertTriangle, label: "Límite alcanzado" },
  BLOQUEADO: { color: "bg-red-200 text-red-900", icon: Shield, label: "Bloqueado" },
  SIN_LIMITE: { color: "bg-gray-100 text-gray-700", icon: DollarSign, label: "Sin límite" },
  SIN_CONFIGURAR: { color: "bg-gray-100 text-gray-500", icon: Clock, label: "Sin configurar" },
};

interface Props {
  clienteId: string;
}

export function CreditCard({ clienteId }: Props) {
  const { data: credito, isLoading } = useClienteCreditoStatus(clienteId);
  const { data: logs } = useCreditoLog(clienteId);
  const cambiarLimite = useCambiarLimiteCredito();
  const aplicarHold = useAplicarCreditHold();
  const liberarHold = useLiberarCreditHold();
  const { isAdmin, isContadora } = useUserRoles();

  const [showEditLimit, setShowEditLimit] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [nuevoLimite, setNuevoLimite] = useState("");
  const [motivo, setMotivo] = useState("");

  const canEdit = isAdmin || isContadora;

  if (isLoading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando crédito...</CardContent></Card>;

  const estado = credito?.estado || "SIN_CONFIGURAR";
  const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.SIN_CONFIGURAR;
  const Icon = config.icon;
  const pct = credito?.porcentaje_usado || 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#c41e3a]" /> Crédito
            </CardTitle>
            <Badge className={config.color}>
              <Icon className="h-3 w-3 mr-1" /> {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Límite</p>
              <p className="text-lg font-bold font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(credito?.credito_limite || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Balance</p>
              <p className="text-lg font-bold font-mono text-amber-700" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(credito?.credito_balance || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Disponible</p>
              <p className={`text-lg font-bold font-mono ${(credito?.credito_disponible || 0) < 0 ? "text-red-700" : "text-green-700"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(credito?.credito_disponible || 0)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {(credito?.credito_limite || 0) > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Usado</span>
                <span>{pct.toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(100, pct)} className={`h-2 ${pct > 80 ? "[&>div]:bg-red-500" : pct > 60 ? "[&>div]:bg-amber-500" : ""}`} />
            </div>
          )}

          {/* Hold info */}
          {credito?.hold_activo && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
              <p className="font-medium">Crédito bloqueado</p>
              {credito.hold_motivo && <p className="mt-0.5">{credito.hold_motivo}</p>}
            </div>
          )}

          {/* Admin actions */}
          {canEdit && (
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => { setNuevoLimite(String(credito?.credito_limite || 0)); setMotivo(""); setShowEditLimit(true); }}>
                <Edit className="h-3 w-3 mr-1" /> Editar límite
              </Button>
              {credito?.hold_activo ? (
                <Button variant="outline" size="sm" className="text-green-700" onClick={() => liberarHold.mutate({ clienteId })}>
                  <ShieldOff className="h-3 w-3 mr-1" /> Liberar hold
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="text-red-700" onClick={() => { setMotivo(""); setShowHold(true); }}>
                  <Shield className="h-3 w-3 mr-1" /> Aplicar hold
                </Button>
              )}
            </div>
          )}

          {/* Recent log */}
          {logs && logs.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-[10px] text-muted-foreground uppercase mb-2">Últimos movimientos</p>
              <div className="space-y-1">
                {logs.slice(0, 5).map((l: any) => (
                  <div key={l.id} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{l.accion.replace(/_/g, " ")}</span>
                    <span className="font-mono">
                      {l.valor_despues != null ? fmt(l.valor_despues) : ""}
                      <span className="text-muted-foreground ml-2">{new Date(l.created_at).toLocaleDateString("es-MX")}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit limit dialog */}
      <Dialog open={showEditLimit} onOpenChange={setShowEditLimit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar límite de crédito</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nuevo límite (MXN)</Label>
              <Input type="number" value={nuevoLimite} onChange={(e) => setNuevoLimite(e.target.value)} className="text-lg h-12" />
            </div>
            <div>
              <Label className="text-xs">Motivo del cambio</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Razón del ajuste..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLimit(false)}>Cancelar</Button>
            <Button onClick={() => { cambiarLimite.mutate({ clienteId, nuevoLimite: parseFloat(nuevoLimite) || 0, motivo: motivo || "Ajuste manual" }, { onSuccess: () => setShowEditLimit(false) }); }} disabled={cambiarLimite.isPending}>
              {cambiarLimite.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold dialog */}
      <Dialog open={showHold} onOpenChange={setShowHold}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-red-700">Aplicar credit hold</DialogTitle></DialogHeader>
          <div>
            <Label className="text-xs">Motivo del bloqueo</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Razón del bloqueo..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHold(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { aplicarHold.mutate({ clienteId, motivo: motivo || "Hold manual" }, { onSuccess: () => setShowHold(false) }); }} disabled={aplicarHold.isPending}>
              Aplicar hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
