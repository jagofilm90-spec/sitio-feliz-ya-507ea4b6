import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  FileText,
  Send,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

interface Factura {
  id: string;
  folio: string;
  fecha: string;
  subtotal: number;
  impuestos: number;
  total: number;
  status: string;
  cfdi_uuid: string | null;
  cfdi_fecha_timbrado: string | null;
  cfdi_xml_url: string | null;
  cfdi_pdf_url: string | null;
  clientes: { id: string; nombre: string; email: string | null; rfc: string | null } | null;
  pedidos: { id: string; folio: string } | null;
}

const getStatusBadge = (factura: Factura) => {
  if (factura.cfdi_uuid) {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-3 w-3" />
        Timbrada
      </Badge>
    );
  }

  if (factura.status === "cancelada") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Cancelada
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      Pendiente
    </Badge>
  );
};

export const SecretariaFacturacionTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "timbradas">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch facturas
  const { data: facturas, isLoading } = useQuery({
    queryKey: ["secretaria-facturas", filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facturas")
        .select(`
          id,
          folio,
          created_at,
          subtotal,
          impuestos,
          total,
          pagada,
          cfdi_uuid,
          cfdi_estado,
          cfdi_fecha_timbrado,
          cfdi_xml_url,
          cfdi_pdf_url,
          clientes (id, nombre, email, rfc),
          pedidos:pedido_id (id, folio)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Map to expected interface
      return (data || []).map(f => ({
        id: f.id,
        folio: f.folio,
        fecha: f.created_at,
        subtotal: f.subtotal,
        impuestos: f.impuestos,
        total: f.total,
        status: f.cfdi_estado || (f.pagada ? "pagada" : "activa"),
        cfdi_uuid: f.cfdi_uuid,
        cfdi_fecha_timbrado: f.cfdi_fecha_timbrado,
        cfdi_xml_url: f.cfdi_xml_url,
        cfdi_pdf_url: f.cfdi_pdf_url,
        clientes: f.clientes,
        pedidos: f.pedidos
      })) as Factura[];
    },
    refetchInterval: 30000,
  });

  // Mutation to stamp invoice
  const timbrarMutation = useMutation({
    mutationFn: async (facturaId: string) => {
      const response = await supabase.functions.invoke("timbrar-cfdi", {
        body: { facturaId },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Factura timbrada", description: "El CFDI se generó correctamente" });
      queryClient.invalidateQueries({ queryKey: ["secretaria-facturas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al timbrar",
        description: error.message || "No se pudo timbrar la factura",
        variant: "destructive",
      });
    },
  });

  // Mutation to send invoice
  const enviarMutation = useMutation({
    mutationFn: async (factura: Factura) => {
      if (!factura.clientes?.email) {
        throw new Error("El cliente no tiene email registrado");
      }

      const response = await supabase.functions.invoke("send-invoice-email", {
        body: {
          facturaId: factura.id,
          email: factura.clientes.email,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Factura enviada", description: "El correo se envió correctamente" });
    },
    onError: (error: any) => {
      toast({
        title: "Error al enviar",
        description: error.message || "No se pudo enviar la factura",
        variant: "destructive",
      });
    },
  });

  // Filter by search term
  const filteredFacturas = facturas?.filter((f) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      f.folio.toLowerCase().includes(searchLower) ||
      f.clientes?.nombre.toLowerCase().includes(searchLower) ||
      f.pedidos?.folio.toLowerCase().includes(searchLower)
    );
  });

  // Count by status
  const pendingCount = facturas?.filter((f) => !f.cfdi_uuid && f.status === "activa").length || 0;
  const timbradasCount = facturas?.filter((f) => f.cfdi_uuid).length || 0;

  const handleDownload = async (url: string | null, type: "xml" | "pdf") => {
    if (!url) {
      toast({ title: "Error", description: `No hay archivo ${type.toUpperCase()} disponible`, variant: "destructive" });
      return;
    }

    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Todas
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          Pendientes
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount}</Badge>
          )}
        </Button>
        <Button
          variant={filter === "timbradas" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("timbradas")}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Timbradas
        </Button>
      </div>

      {/* Alert for pending invoices */}
      {pendingCount > 0 && filter !== "timbradas" && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {pendingCount} factura{pendingCount > 1 ? "s" : ""} pendiente
            {pendingCount > 1 ? "s" : ""} de timbrar
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por folio, cliente o pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Pedido</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFacturas && filteredFacturas.length > 0 ? (
                  filteredFacturas.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-mono font-medium">{factura.folio}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[150px]">
                            {factura.clientes?.nombre || "—"}
                          </p>
                          {factura.clientes?.rfc && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {factura.clientes.rfc}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {factura.pedidos?.folio || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {format(new Date(factura.fecha), "dd/MM/yy", { locale: es })}
                      </TableCell>
                      <TableCell>{getStatusBadge(factura)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${formatCurrency(factura.total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {!factura.cfdi_uuid && factura.status === "activa" ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => timbrarMutation.mutate(factura.id)}
                              disabled={timbrarMutation.isPending}
                            >
                              {timbrarMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <FileText className="h-4 w-4 mr-1" />
                                  Timbrar
                                </>
                              )}
                            </Button>
                          ) : factura.cfdi_uuid ? (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDownload(factura.cfdi_pdf_url, "pdf")}
                                title="Descargar PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => enviarMutation.mutate(factura)}
                                disabled={enviarMutation.isPending || !factura.clientes?.email}
                                title="Enviar por correo"
                              >
                                {enviarMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron facturas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
