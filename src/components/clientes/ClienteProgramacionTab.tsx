import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarDays, Clock, Save, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DIAS_SEMANA = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
];

interface Sucursal {
  id: string;
  nombre: string;
  codigo_sucursal: string | null;
}

interface Programacion {
  id: string;
  cliente_id: string;
  sucursal_id: string | null;
  dia_semana: string;
  hora_preferida: string | null;
  activo: boolean;
  notas: string | null;
}

interface ClienteProgramacionTabProps {
  clienteId: string;
  clienteNombre: string;
}

export function ClienteProgramacionTab({ clienteId, clienteNombre }: ClienteProgramacionTabProps) {
  const queryClient = useQueryClient();
  const [selectedSucursal, setSelectedSucursal] = useState<string>('general');
  const [notas, setNotas] = useState('');

  // Fetch sucursales del cliente
  const { data: sucursales = [] } = useQuery({
    queryKey: ['cliente-sucursales', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente_sucursales')
        .select('id, nombre, codigo_sucursal')
        .eq('cliente_id', clienteId)
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      return data as Sucursal[];
    }
  });

  // Fetch programaciones existentes
  const { data: programaciones = [], isLoading } = useQuery({
    queryKey: ['cliente-programaciones', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente_programacion_pedidos')
        .select('*')
        .eq('cliente_id', clienteId);
      
      if (error) throw error;
      return data as Programacion[];
    }
  });

  // Get current programaciones for selected context (general or specific sucursal)
  const currentProgramaciones = programaciones.filter(p => 
    selectedSucursal === 'general' 
      ? p.sucursal_id === null 
      : p.sucursal_id === selectedSucursal
  );

  const activeDays = currentProgramaciones.filter(p => p.activo).map(p => p.dia_semana);

  // Toggle day mutation
  const toggleDayMutation = useMutation({
    mutationFn: async ({ dia, isActive }: { dia: string; isActive: boolean }) => {
      const sucursalId = selectedSucursal === 'general' ? null : selectedSucursal;
      
      if (isActive) {
        // Create new programacion
        const { error } = await supabase
          .from('cliente_programacion_pedidos')
          .insert({
            cliente_id: clienteId,
            sucursal_id: sucursalId,
            dia_semana: dia,
            activo: true,
            notas: notas || null
          });
        
        if (error) throw error;
      } else {
        // Find and deactivate existing programacion
        const existing = currentProgramaciones.find(p => p.dia_semana === dia);
        if (existing) {
          const { error } = await supabase
            .from('cliente_programacion_pedidos')
            .update({ activo: false })
            .eq('id', existing.id);
          
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente-programaciones', clienteId] });
      queryClient.invalidateQueries({ queryKey: ['programaciones-pedidos'] });
    },
    onError: (error) => {
      console.error('Error toggling day:', error);
      toast.error('Error al actualizar programación');
    }
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const sucursalId = selectedSucursal === 'general' ? null : selectedSucursal;
      
      // Update notes for all active programaciones of this context
      const toUpdate = currentProgramaciones.filter(p => p.activo);
      
      for (const prog of toUpdate) {
        const { error } = await supabase
          .from('cliente_programacion_pedidos')
          .update({ notas: notas || null })
          .eq('id', prog.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente-programaciones', clienteId] });
      toast.success('Notas guardadas');
    },
    onError: (error) => {
      console.error('Error saving notes:', error);
      toast.error('Error al guardar notas');
    }
  });

  // Update notas state when sucursal changes
  const handleSucursalChange = (value: string) => {
    setSelectedSucursal(value);
    const progs = programaciones.filter(p => 
      value === 'general' ? p.sucursal_id === null : p.sucursal_id === value
    );
    const firstWithNotes = progs.find(p => p.notas);
    setNotas(firstWithNotes?.notas || '');
  };

  const handleDayToggle = (dia: string, checked: boolean) => {
    toggleDayMutation.mutate({ dia, isActive: checked });
  };

  // Summary of all programaciones
  const allActiveProgramaciones = programaciones.filter(p => p.activo);
  const generalDays = allActiveProgramaciones.filter(p => !p.sucursal_id).map(p => p.dia_semana);
  const sucursalProgramaciones = allActiveProgramaciones.filter(p => p.sucursal_id);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Resumen de Programación
          </CardTitle>
          <CardDescription>
            Días configurados para pedidos recurrentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allActiveProgramaciones.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay días programados. Configura los días de pedido abajo.
            </p>
          ) : (
            <div className="space-y-3">
              {/* General days */}
              {generalDays.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">General (aplica a todas las sucursales):</p>
                  <div className="flex flex-wrap gap-1">
                    {generalDays.map(dia => (
                      <Badge key={dia} variant="secondary" className="capitalize">
                        {dia}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Per-sucursal days */}
              {sucursales.map(suc => {
                const sucDays = sucursalProgramaciones
                  .filter(p => p.sucursal_id === suc.id)
                  .map(p => p.dia_semana);
                
                if (sucDays.length === 0) return null;
                
                return (
                  <div key={suc.id}>
                    <p className="text-sm font-medium mb-1">
                      {suc.nombre} {suc.codigo_sucursal && `(${suc.codigo_sucursal})`}:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {sucDays.map(dia => (
                        <Badge key={dia} variant="outline" className="capitalize">
                          {dia}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Configurar Programación</CardTitle>
          <CardDescription>
            Selecciona los días de la semana en que {clienteNombre} realiza pedidos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sucursal selector */}
          {sucursales.length > 0 && (
            <div className="space-y-2">
              <Label>Aplicar a:</Label>
              <Select value={selectedSucursal} onValueChange={handleSucursalChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    General (todas las sucursales)
                  </SelectItem>
                  {sucursales.map(suc => (
                    <SelectItem key={suc.id} value={suc.id}>
                      {suc.nombre} {suc.codigo_sucursal && `(${suc.codigo_sucursal})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Days grid */}
          <div className="space-y-2">
            <Label>Días de pedido:</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DIAS_SEMANA.map(dia => (
                <div
                  key={dia.value}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                    activeDays.includes(dia.value)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    id={`dia-${dia.value}`}
                    checked={activeDays.includes(dia.value)}
                    onCheckedChange={(checked) => handleDayToggle(dia.value, checked as boolean)}
                    disabled={toggleDayMutation.isPending}
                  />
                  <Label
                    htmlFor={`dia-${dia.value}`}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {dia.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional):</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Pedido grande los viernes, confirmar antes de las 10am"
              rows={3}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveNotesMutation.mutate()}
              disabled={saveNotesMutation.isPending || activeDays.length === 0}
            >
              {saveNotesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar notas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
