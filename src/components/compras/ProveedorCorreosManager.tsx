import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Mail, Star, Loader2 } from "lucide-react";

interface ProveedorCorreosManagerProps {
  proveedorId: string;
  proveedorNombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProveedorCorreo {
  id: string;
  proveedor_id: string;
  email: string;
  nombre_contacto: string | null;
  es_principal: boolean;
  proposito: string | null;
  activo: boolean;
}

const PROPOSITOS = [
  { value: "general", label: "General" },
  { value: "ordenes", label: "Órdenes de compra" },
  { value: "pagos", label: "Pagos" },
  { value: "devoluciones", label: "Devoluciones" },
];

const ProveedorCorreosManager = ({
  proveedorId,
  proveedorNombre,
  open,
  onOpenChange,
}: ProveedorCorreosManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newNombreContacto, setNewNombreContacto] = useState("");
  const [newProposito, setNewProposito] = useState("general");
  const [adding, setAdding] = useState(false);

  const { data: correos = [], isLoading } = useQuery({
    queryKey: ["proveedor_correos", proveedorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedor_correos")
        .select("*")
        .eq("proveedor_id", proveedorId)
        .eq("activo", true)
        .order("proposito")
        .order("es_principal", { ascending: false })
        .order("created_at");
      
      if (error) throw error;
      return data as ProveedorCorreo[];
    },
    enabled: open && !!proveedorId,
  });

  const addCorreo = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      // Check if this will be the first email with this purpose
      const emailsConMismoProposito = correos.filter(c => c.proposito === newProposito);
      const esPrincipal = emailsConMismoProposito.length === 0;

      const { error } = await supabase.from("proveedor_correos").insert({
        proveedor_id: proveedorId,
        email: newEmail,
        nombre_contacto: newNombreContacto || null,
        proposito: newProposito,
        es_principal: esPrincipal,
      });

      if (error) throw error;

      toast({ title: "Correo agregado" });
      queryClient.invalidateQueries({ queryKey: ["proveedor_correos", proveedorId] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-correos", proveedorId] });
      setNewEmail("");
      setNewNombreContacto("");
      setNewProposito("general");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const deleteCorreo = async (correoId: string) => {
    try {
      const { error } = await supabase
        .from("proveedor_correos")
        .update({ activo: false })
        .eq("id", correoId);

      if (error) throw error;

      toast({ title: "Correo eliminado" });
      queryClient.invalidateQueries({ queryKey: ["proveedor_correos", proveedorId] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-correos", proveedorId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const setPrincipal = async (correoId: string, proposito: string | null) => {
    try {
      // First remove principal from all with same purpose
      await supabase
        .from("proveedor_correos")
        .update({ es_principal: false })
        .eq("proveedor_id", proveedorId)
        .eq("proposito", proposito);

      // Then set the new principal
      const { error } = await supabase
        .from("proveedor_correos")
        .update({ es_principal: true })
        .eq("id", correoId);

      if (error) throw error;

      toast({ title: "Correo principal actualizado" });
      queryClient.invalidateQueries({ queryKey: ["proveedor_correos", proveedorId] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-correos", proveedorId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPropositoLabel = (proposito: string | null) => {
    const found = PROPOSITOS.find(p => p.value === proposito);
    return found?.label || proposito || "General";
  };

  const getPropositoVariant = (proposito: string | null): "default" | "secondary" | "outline" => {
    switch (proposito) {
      case "pagos": return "default";
      case "ordenes": return "secondary";
      default: return "outline";
    }
  };

  // Group correos by proposito
  const correosPorProposito = correos.reduce((acc, correo) => {
    const prop = correo.proposito || "general";
    if (!acc[prop]) acc[prop] = [];
    acc[prop].push(correo);
    return acc;
  }, {} as Record<string, ProveedorCorreo[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Correos de {proveedorNombre}
          </DialogTitle>
          <DialogDescription>
            Administra los correos electrónicos de este proveedor por propósito
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new email */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium text-sm">Agregar nuevo correo</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nombre contacto</Label>
                <Input
                  placeholder="Juan Pérez"
                  value={newNombreContacto}
                  onChange={(e) => setNewNombreContacto(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Propósito</Label>
                <Select value={newProposito} onValueChange={setNewProposito}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSITOS.map((prop) => (
                      <SelectItem key={prop.value} value={prop.value}>
                        {prop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={addCorreo} 
                disabled={adding || !newEmail}
                className="self-end"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Agregar
              </Button>
            </div>
          </div>

          {/* Email list grouped by purpose */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Correos registrados</h4>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : correos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay correos registrados para este proveedor
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(correosPorProposito).map(([proposito, correosGrupo]) => (
                  <div key={proposito} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getPropositoVariant(proposito)} className="text-xs">
                        {getPropositoLabel(proposito)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({correosGrupo.length})
                      </span>
                    </div>
                    <div className="space-y-2 pl-2">
                      {correosGrupo.map((correo) => (
                        <div
                          key={correo.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-background"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{correo.email}</span>
                              {correo.es_principal && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  <Star className="h-3 w-3 mr-1 fill-current" />
                                  Principal
                                </Badge>
                              )}
                            </div>
                            {correo.nombre_contacto && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {correo.nombre_contacto}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {!correo.es_principal && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPrincipal(correo.id, correo.proposito)}
                                title="Marcar como principal"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCorreo(correo.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProveedorCorreosManager;
