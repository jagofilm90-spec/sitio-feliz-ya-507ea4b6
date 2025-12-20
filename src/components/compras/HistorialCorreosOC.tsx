import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Mail, Check, AlertTriangle, Send, CreditCard, Bell, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistorialCorreosOCProps {
  ordenId: string;
}

const tipoConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  orden_compra: { 
    label: "Envío OC", 
    icon: <Send className="h-3 w-3" />, 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
  },
  reenvio_oc: { 
    label: "Reenvío OC", 
    icon: <RefreshCw className="h-3 w-3" />, 
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200" 
  },
  orden_compra_confirmacion: { 
    label: "Confirmación", 
    icon: <Check className="h-3 w-3" />, 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
  },
  pago_proveedor: { 
    label: "Pago", 
    icon: <CreditCard className="h-3 w-3" />, 
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" 
  },
  recordatorio_oc: { 
    label: "Recordatorio", 
    icon: <Bell className="h-3 w-3" />, 
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" 
  },
  reprogramacion: { 
    label: "Reprogramación", 
    icon: <RefreshCw className="h-3 w-3" />, 
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" 
  },
};

export function HistorialCorreosOC({ ordenId }: HistorialCorreosOCProps) {
  const { data: correos = [], isLoading } = useQuery({
    queryKey: ["correos-enviados-oc", ordenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("correos_enviados")
        .select(`
          *,
          profiles:enviado_por (full_name)
        `)
        .eq("referencia_id", ordenId)
        .order("fecha_envio", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!ordenId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Cargando historial...
      </div>
    );
  }

  if (correos.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No hay correos registrados para esta orden
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-2">
          {correos.map((correo: any) => {
            const config = tipoConfig[correo.tipo] || { 
              label: correo.tipo, 
              icon: <Mail className="h-3 w-3" />, 
              color: "bg-gray-100 text-gray-800" 
            };
            
            return (
              <div 
                key={correo.id} 
                className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={`p-1.5 rounded-full ${config.color}`}>
                  {config.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                    {correo.error ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{correo.error}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Enviado
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm truncate mt-1" title={correo.destinatario}>
                    <span className="text-muted-foreground">Para:</span> {correo.destinatario}
                  </p>
                  
                  <p className="text-xs text-muted-foreground truncate" title={correo.asunto}>
                    {correo.asunto}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(correo.fecha_envio), "dd MMM yyyy, HH:mm", { locale: es })}
                    </span>
                    {correo.profiles?.full_name && (
                      <>
                        <span>•</span>
                        <span>por {correo.profiles.full_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}

// Función helper para registrar correos enviados
export async function registrarCorreoEnviado(params: {
  tipo: string;
  referencia_id: string;
  destinatario: string;
  asunto: string;
  gmail_cuenta_id?: string;
  gmail_message_id?: string;
  contenido_preview?: string;
  error?: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("correos_enviados")
      .insert({
        tipo: params.tipo,
        referencia_id: params.referencia_id,
        destinatario: params.destinatario,
        asunto: params.asunto,
        gmail_cuenta_id: params.gmail_cuenta_id || null,
        gmail_message_id: params.gmail_message_id || null,
        contenido_preview: params.contenido_preview?.substring(0, 500) || null,
        error: params.error || null,
        enviado_por: user?.id || null,
      });
    
    if (error) {
      console.error("Error registrando correo enviado:", error);
    }
  } catch (err) {
    console.error("Error en registrarCorreoEnviado:", err);
  }
}
