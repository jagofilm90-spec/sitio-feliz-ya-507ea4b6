import { useState } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { useQuery } from "@tanstack/react-query";
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
  TableRow} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  Users,
  Plus,
  Eye,
  MapPin,
  Phone,
  Mail,
  Building2} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  saldo_pendiente: number | null;
  activo: boolean;
  vendedor_asignado: string | null;
  profiles: { full_name: string } | null;
  zona: { nombre: string } | null;
  _count_sucursales?: number;
}

interface Vendedor {
  id: string;
  full_name: string;
}

export const SecretariaClientesTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState<string>("all");
  const navigate = useNavigate();

  // Fetch clients
  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ["secretaria-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select(`
          id,
          codigo,
          nombre,
          rfc,
          email,
          telefono,
          direccion,
          saldo_pendiente,
          activo,
          vendedor_asignado,
          profiles:vendedor_asignado (full_name),
          zona:zona_id (nombre)
        `)
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      return data as Cliente[];
    }});

  // Fetch vendors
  const { data: vendedores } = useQuery({
    queryKey: ["secretaria-vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      return data as Vendedor[];
    }});

  // Filter clients
  const filteredClientes = clientes?.filter((c) => {
    const matchesSearch =
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.rfc?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesVendedor =
      vendedorFilter === "all"
        ? true
        : vendedorFilter === "casa"
        ? !c.vendedor_asignado
        : c.vendedor_asignado === vendedorFilter;

    return matchesSearch && matchesVendedor;
  });

  // Count by vendor
  const countByVendor = (vendedorId: string | null) => {
    return clientes?.filter((c) =>
      vendedorId === null ? !c.vendedor_asignado : c.vendedor_asignado === vendedorId
    ).length || 0;
  };

  // Total with pending balance
  const clientesConSaldo = clientes?.filter((c) => (c.saldo_pendiente || 0) > 0) || [];
  const totalSaldoPendiente = clientesConSaldo.reduce((acc, c) => acc + (c.saldo_pendiente || 0), 0);

  if (loadingClientes) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-pink-600" />
            Gestión de Clientes
          </h2>
          <p className="text-sm text-muted-foreground">
            {clientes?.length || 0} clientes activos • {formatCurrency(totalSaldoPendiente)} pendiente
          </p>
        </div>
        <Button
          onClick={() => navigate("/clientes")}
          className="bg-pink-600 hover:bg-pink-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            vendedorFilter === "all" ? "ring-2 ring-pink-500" : ""
          }`}
          onClick={() => setVendedorFilter("all")}
        >
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-pink-600">{clientes?.length || 0}</p>
            <p className="text-xs font-medium text-muted-foreground">Todos</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            vendedorFilter === "casa" ? "ring-2 ring-pink-500" : ""
          } bg-slate-50`}
          onClick={() => setVendedorFilter("casa")}
        >
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{countByVendor(null)}</p>
            <p className="text-xs font-medium text-muted-foreground">Casa</p>
          </CardContent>
        </Card>
        {vendedores?.slice(0, 4).map((vendedor) => (
          <Card
            key={vendedor.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              vendedorFilter === vendedor.id ? "ring-2 ring-pink-500" : ""
            }`}
            onClick={() => setVendedorFilter(vendedor.id)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{countByVendor(vendedor.id)}</p>
              <p className="text-xs font-medium text-muted-foreground truncate">
                {vendedor.full_name.split(" ")[0]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o RFC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            <SelectItem value="casa">Casa (sin vendedor)</SelectItem>
            {vendedores?.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                  <TableHead className="hidden lg:table-cell">Contacto</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes && filteredClientes.length > 0 ? (
                  filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id} className="group">
                      <TableCell className="font-mono font-medium text-pink-600">
                        {cliente.codigo}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cliente.nombre}</p>
                          {cliente.rfc && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {cliente.rfc}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {cliente.profiles?.full_name ? (
                          <Badge variant="outline">{cliente.profiles.full_name}</Badge>
                        ) : (
                          <Badge variant="secondary">Casa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          {cliente.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {cliente.telefono}
                            </span>
                          )}
                          {cliente.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {cliente.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {(cliente.saldo_pendiente || 0) > 0 ? (
                          <span className="font-mono font-medium text-amber-600">
                            {formatCurrency(cliente.saldo_pendiente || 0)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/clientes?cliente=${cliente.id}`)}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se encontraron clientes
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
