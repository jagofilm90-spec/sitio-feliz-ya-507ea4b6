import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MapPin, Globe } from "lucide-react";

interface Zona {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  region: string | null;
  es_foranea: boolean | null;
}

const REGIONES = [
  { value: "cdmx_norte", label: "CDMX Norte", color: "bg-blue-500" },
  { value: "cdmx_centro", label: "CDMX Centro", color: "bg-blue-600" },
  { value: "cdmx_sur", label: "CDMX Sur", color: "bg-blue-700" },
  { value: "cdmx_oriente", label: "CDMX Oriente", color: "bg-blue-400" },
  { value: "cdmx_poniente", label: "CDMX Poniente", color: "bg-blue-300" },
  { value: "edomex_norte", label: "EdoMex Norte", color: "bg-green-500" },
  { value: "edomex_oriente", label: "EdoMex Oriente", color: "bg-green-600" },
  { value: "toluca", label: "Toluca", color: "bg-yellow-500" },
  { value: "morelos", label: "Morelos", color: "bg-orange-500" },
  { value: "puebla", label: "Puebla", color: "bg-red-500" },
  { value: "hidalgo", label: "Hidalgo", color: "bg-purple-500" },
  { value: "queretaro", label: "Querétaro", color: "bg-pink-500" },
  { value: "tlaxcala", label: "Tlaxcala", color: "bg-indigo-500" },
];

const ZonasTab = () => {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZona, setEditingZona] = useState<Zona | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    region: "",
    es_foranea: false,
  });

  useEffect(() => {
    loadZonas();
  }, []);

  const loadZonas = async () => {
    try {
      const { data, error } = await supabase
        .from("zonas")
        .select("*")
        .eq("activo", true)
        .order("region")
        .order("nombre");

      if (error) throw error;
      setZonas(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las zonas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const zonaData: any = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        region: formData.region || null,
        es_foranea: formData.es_foranea,
      };

      if (editingZona) {
        const { error } = await supabase
          .from("zonas")
          .update(zonaData)
          .eq("id", editingZona.id);

        if (error) throw error;
        toast({ title: "Zona actualizada correctamente" });
      } else {
        const { error } = await supabase
          .from("zonas")
          .insert([zonaData]);

        if (error) throw error;
        toast({ title: "Zona creada correctamente" });
      }

      setDialogOpen(false);
      resetForm();
      loadZonas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (zona: Zona) => {
    setEditingZona(zona);
    setFormData({
      nombre: zona.nombre,
      descripcion: zona.descripcion || "",
      region: zona.region || "",
      es_foranea: zona.es_foranea || false,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta zona?")) return;

    try {
      const { error } = await supabase
        .from("zonas")
        .update({ activo: false })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Zona eliminada" });
      loadZonas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingZona(null);
    setFormData({
      nombre: "",
      descripcion: "",
      region: "",
      es_foranea: false,
    });
  };

  const getRegionLabel = (region: string | null) => {
    if (!region) return null;
    const r = REGIONES.find(r => r.value === region);
    return r ? r.label : region;
  };

  const getRegionColor = (region: string | null) => {
    if (!region) return "bg-muted";
    const r = REGIONES.find(r => r.value === region);
    return r ? r.color : "bg-muted";
  };

  // Group zonas by region
  const zonasByRegion = zonas.reduce((acc, zona) => {
    const region = zona.region || "sin_region";
    if (!acc[region]) acc[region] = [];
    acc[region].push(zona);
    return acc;
  }, {} as Record<string, Zona[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Zonas de Entrega</h2>
          <p className="text-sm text-muted-foreground">
            Define las zonas geográficas y sus regiones para optimización de rutas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Zona
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingZona ? "Editar Zona" : "Nueva Zona"}
              </DialogTitle>
              <DialogDescription>
                Define una zona geográfica de entrega con su región
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Gustavo A. Madero"
                  required
                  autoComplete="off"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="region">Región</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({ ...formData, region: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una región" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${r.color}`} />
                          {r.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="es_foranea"
                  checked={formData.es_foranea}
                  onCheckedChange={(checked) => setFormData({ ...formData, es_foranea: checked })}
                />
                <Label htmlFor="es_foranea" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Zona Foránea (fuera del área metropolitana)
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción de la zona..."
                  autoComplete="off"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary by region */}
      <div className="flex flex-wrap gap-2">
        {REGIONES.map(r => {
          const count = zonasByRegion[r.value]?.length || 0;
          if (count === 0) return null;
          return (
            <Badge key={r.value} variant="outline" className="gap-1">
              <div className={`w-2 h-2 rounded-full ${r.color}`} />
              {r.label}: {count}
            </Badge>
          );
        })}
        {zonasByRegion["sin_region"]?.length > 0 && (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            Sin región: {zonasByRegion["sin_region"].length}
          </Badge>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Región</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : zonas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  <div className="py-8 flex flex-col items-center gap-2">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                    <p>No hay zonas registradas</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              zonas.map((zona) => (
                <TableRow key={zona.id}>
                  <TableCell className="font-medium">{zona.nombre}</TableCell>
                  <TableCell>
                    {zona.region ? (
                      <Badge variant="outline" className="gap-1">
                        <div className={`w-2 h-2 rounded-full ${getRegionColor(zona.region)}`} />
                        {getRegionLabel(zona.region)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin región</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {zona.es_foranea ? (
                      <Badge variant="secondary" className="gap-1">
                        <Globe className="h-3 w-3" />
                        Foránea
                      </Badge>
                    ) : (
                      <Badge variant="outline">Local</Badge>
                    )}
                  </TableCell>
                  <TableCell>{zona.descripcion || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(zona)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(zona.id)}>
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
    </div>
  );
};

export default ZonasTab;
