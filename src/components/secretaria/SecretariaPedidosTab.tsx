import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, FileText, Clock, CheckCircle2, Truck, XCircle, Package, Pencil} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { PedidoPDFPreviewDialog } from "@/components/vendedor/PedidoPDFPreviewDialog";
import { EditarPedidoPendienteDialog } from "@/components/vendedor/EditarPedidoPendienteDialog";

interface Pedido {
  id: string;
  folio: string;
  fecha_pedido: string;
  total: number;
  peso_total_kg: number | null;
  status: string;
  termino_credito: string | null;
  notas: string | null;
  vendedor_id: string;
  clientes: { id: string; nombre: string } | null;
  sucursal: { nombre: string; direccion: string | null; zona: { nombre: string } | null } | null;
  profiles: { full_name: string } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  por_autorizar: { label: "Por autorizar", variant: "secondary", icon: Clock },
  rechazado: { label: "Rechazado", variant: "destructive", icon: XCircle },
  pendiente: { label: "Pendiente", variant: "default", icon: Package },
  en_ruta: { label: "En ruta", variant: "outline", icon: Truck },
  entregado: { label: "Entregado", variant: "default", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", variant: "destructive", icon: XCircle }};

const creditoLabels: Record<string, string> = { contado: "Contado", "8_dias": "8 días", "15_dias": "15 días", "30_dias": "30 días", "60_dias": "60 días" };

export const SecretariaPedidosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPDF, setShowPDF] = useState(false);
  const [pdfPedidoId, setPdfPedidoId] = useState("");
  const [showEditar, setShowEditar] = useState(false);
  const [editarPedido, setEditarPedido] = useState<Pedido | null>(null);
  const queryClient = useQueryClient();

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["secretaria-pedidos", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("pedidos")
        .select(`
          id, folio, fecha_pedido, total, peso_total_kg, status, termino_credito, notas, vendedor_id,
          clientes (id, nombre),
          sucursal:cliente_sucursales(nombre, direccion, zona:zonas(nombre)),
          profiles:vendedor_id (full_name)
        `)
        .neq("status", "borrador")
        .order("fecha_pedido", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") query = query.eq("status", statusFilter as any);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Pedido[];
    },
    refetchInterval: 30000});

  const filteredPedidos = pedidos?.filter(p => {
    const q = searchTerm.toLowerCase();
    return p.folio.toLowerCase().includes(q) || p.clientes?.nombre.toLowerCase().includes(q) || (p.sucursal as any)?.zona?.nombre?.toLowerCase().includes(q);
  });

  const statusCounts = pedidos?.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>) || {};

  const handleEditarGuardado = () => {
    queryClient.invalidateQueries({ queryKey: ["secretaria-pedidos"] });
  };

  if (isLoading) {
    return <AlmasaLoading size={48} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pedidos," titleAccent="hoy."
        lead="Autorización, carga y entrega"
      />

      {/* Summary Cards — editorial */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { status: "por_autorizar", label: "Por autorizar" },
          { status: "pendiente", label: "Pendientes" },
          { status: "en_ruta", label: "En ruta" },
          { status: "entregado", label: "Entregados" },
          { status: "cancelado", label: "Cancelados" },
        ].map(item => (
          <div
            key={item.status}
            onClick={() => setStatusFilter(statusFilter === item.status ? "all" : item.status)}
            className={`cursor-pointer bg-white border rounded-xl px-4 py-3 text-center transition-colors ${statusFilter === item.status ? "border-crimson-500 ring-1 ring-crimson-500" : "border-ink-100 hover:border-ink-300"}`}
          >
            <p className="font-serif text-[34px] leading-tight text-ink-900 tabular-nums">
              {statusCounts[item.status] || 0}
            </p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-500 font-medium mt-0.5">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por folio, cliente o zona..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_ruta">En ruta</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="por_autorizar">Por autorizar</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg" style={{ overflowX: "auto" }}>
        <Table style={{ minWidth: "1000px" }}>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Folio</TableHead>
              <TableHead className="text-xs">Cliente</TableHead>
              <TableHead className="text-xs">Dirección</TableHead>
              <TableHead className="text-xs">Zona</TableHead>
              <TableHead className="text-xs">Vendedor</TableHead>
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs">Peso</TableHead>
              <TableHead className="text-xs">Crédito</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs">Días</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPedidos && filteredPedidos.length > 0 ? (
              filteredPedidos.map(p => {
                const dias = differenceInDays(new Date(), new Date(p.fecha_pedido));
                const diasColor = dias < 7 ? "text-green-600" : dias <= 14 ? "text-amber-600" : "text-destructive";
                const sc = statusConfig[p.status];
                const Icon = sc?.icon || Clock;
                const canEdit = p.status === "pendiente";
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-bold" style={{ whiteSpace: "nowrap" }}>
                      {p.folio}
                      {p.notas?.includes("[EDITADO EN OFICINA]") && <Badge className="ml-1 text-[9px] bg-blue-500">Editado</Badge>}
                    </TableCell>
                    <TableCell className="text-xs" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{p.clientes?.nombre || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{(p.sucursal as any)?.direccion || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{(p.sucursal as any)?.zona?.nombre || "—"}</TableCell>
                    <TableCell className="text-xs" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{p.profiles?.full_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground" style={{ whiteSpace: "nowrap" }}>{format(new Date(p.fecha_pedido), "dd/MM/yy")}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground" style={{ whiteSpace: "nowrap" }}>{p.peso_total_kg ? `${Math.round(p.peso_total_kg)} kg` : "—"}</TableCell>
                    <TableCell className="text-xs" style={{ whiteSpace: "nowrap" }}>{creditoLabels[p.termino_credito || ""] || p.termino_credito || "—"}</TableCell>
                    <TableCell className="text-xs text-right font-bold" style={{ whiteSpace: "nowrap" }}>{formatCurrency(p.total)}</TableCell>
                    <TableCell><span className={`text-xs font-semibold ${diasColor}`}>{dias}d</span></TableCell>
                    <TableCell>
                      <Badge variant={sc?.variant || "outline"} className="gap-0.5 text-[10px]">
                        <Icon className="h-3 w-3" />{sc?.label || p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {["pendiente", "en_ruta", "entregado"].includes(p.status) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPdfPedidoId(p.id); setShowPDF(true); }}>
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditarPedido(p); setShowEditar(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No se encontraron pedidos</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PedidoPDFPreviewDialog open={showPDF} onOpenChange={setShowPDF} pedidoId={pdfPedidoId} />

      {editarPedido && (
        <EditarPedidoPendienteDialog
          open={showEditar}
          onOpenChange={setShowEditar}
          pedidoId={editarPedido.id}
          folio={editarPedido.folio}
          onSaved={handleEditarGuardado}
          preciosDisabled={true}
        />
      )}
    </div>
  );
};
