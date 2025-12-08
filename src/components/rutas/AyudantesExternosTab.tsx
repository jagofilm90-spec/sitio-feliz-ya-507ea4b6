import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, DollarSign, Phone, Loader2, Search } from "lucide-react";

interface AyudanteExterno {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  notas: string | null;
  tarifa_por_viaje: number;
  activo: boolean;
  created_at: string;
}

const AyudantesExternosTab = () => {
  const [ayudantes, setAyudantes] = useState<AyudanteExterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAyudante, setEditingAyudante] = useState<AyudanteExterno | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Form state
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [tarifa, setTarifa] = useState("850");
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    loadAyudantes();
  }, []);

  const loadAyudantes = async () => {
    try {
      const { data, error } = await supabase
        .from("ayudantes_externos")
        .select("*")
        .order("nombre_completo");

      if (error) throw error;
      setAyudantes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los ayudantes externos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre("");
    setTelefono("");
    setNotas("");
    setTarifa("850");
    setActivo(true);
    setEditingAyudante(null);
  };

  const handleOpenDialog = (ayudante?: AyudanteExterno) => {
    if (ayudante) {
      setEditingAyudante(ayudante);
      setNombre(ayudante.nombre_completo);
      setTelefono(ayudante.telefono || "");
      setNotas(ayudante.notas || "");
      setTarifa(String(ayudante.tarifa_por_viaje));
      setActivo(ayudante.activo);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const data = {
        nombre_completo: nombre.trim(),
        telefono: telefono.trim() || null,
        notas: notas.trim() || null,
        tarifa_por_viaje: parseFloat(tarifa) || 850,
        activo,
      };

      if (editingAyudante) {
        const { error } = await supabase
          .from("ayudantes_externos")
          .update(data)
          .eq("id", editingAyudante.id);

        if (error) throw error;
        toast({ title: "Ayudante actualizado" });
      } else {
        const { error } = await supabase
          .from("ayudantes_externos")
          .insert([data]);

        if (error) throw error;
        toast({ title: "Ayudante creado" });
      }

      setDialogOpen(false);
      resetForm();
      loadAyudantes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ayudante: AyudanteExterno) => {
    if (!confirm(`¿Eliminar a ${ayudante.nombre_completo}?`)) return;

    try {
      const { error } = await supabase
        .from("ayudantes_externos")
        .delete()
        .eq("id", ayudante.id);

      if (error) throw error;
      toast({ title: "Ayudante eliminado" });
      loadAyudantes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActivo = async (ayudante: AyudanteExterno) => {
    try {
      const { error } = await supabase
        .from("ayudantes_externos")
        .update({ activo: !ayudante.activo })
        .eq("id", ayudante.id);

      if (error) throw error;
      loadAyudantes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAyudantes = ayudantes.filter(a =>
    a.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.telefono?.includes(searchTerm)
  );

  const activos = ayudantes.filter(a => a.activo).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Ayudantes Externos</h2>
          <p className="text-sm text-muted-foreground">
            Personal subcontratado para rutas (tarifa por viaje)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ayudante
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{ayudantes.length}</p>
            <p className="text-xs text-muted-foreground">Total registrados</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{activos}</p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">$850</p>
            <p className="text-xs text-muted-foreground">Tarifa estándar</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Tarifa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredAyudantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No se encontraron resultados" : "No hay ayudantes externos registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAyudantes.map((ayudante) => (
                <TableRow key={ayudante.id}>
                  <TableCell className="font-medium">{ayudante.nombre_completo}</TableCell>
                  <TableCell>
                    {ayudante.telefono ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {ayudante.telefono}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      ${ayudante.tarifa_por_viaje.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={ayudante.activo ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActivo(ayudante)}
                    >
                      {ayudante.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {ayudante.notas || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(ayudante)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ayudante)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAyudante ? "Editar Ayudante Externo" : "Nuevo Ayudante Externo"}
            </DialogTitle>
            <DialogDescription>
              Personal subcontratado que se paga por viaje
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre Completo *</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del ayudante"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="55 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label>Tarifa por Viaje ($)</Label>
                <Input
                  type="number"
                  value={tarifa}
                  onChange={(e) => setTarifa(e.target.value)}
                  placeholder="850"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={activo} onCheckedChange={setActivo} />
              <Label>Activo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAyudante ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AyudantesExternosTab;
