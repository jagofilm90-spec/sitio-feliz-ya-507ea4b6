import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMessages = (): number => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadCurrentUser();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    
    loadUnreadCount();
    
    // Suscribirse a cambios en mensajes en tiempo real
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    try {
      channel = supabase
        .channel('unread-messages-count')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes'
          },
          () => {
            if (isMountedRef.current) {
              loadUnreadCount();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversacion_participantes'
          },
          () => {
            if (isMountedRef.current) {
              loadUnreadCount();
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error("Error subscribing to messages channel:", error);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error("Error removing messages channel:", error);
        }
      }
    };
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error loading current user:", error);
        return;
      }
      if (user && isMountedRef.current) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error("Error in loadCurrentUser:", error);
    }
  };

  const loadUnreadCount = async () => {
    if (!currentUserId || !isMountedRef.current) return;

    try {
      // Obtener todas las conversaciones del usuario
      const { data: participaciones, error: participacionesError } = await supabase
        .from("conversacion_participantes")
        .select("conversacion_id, ultimo_mensaje_leido_id")
        .eq("user_id", currentUserId);

      if (participacionesError) {
        console.error("Error loading participaciones:", participacionesError);
        return;
      }

      let totalUnread = 0;

      // Para cada conversación, contar mensajes no leídos
      for (const participacion of participaciones || []) {
        try {
          const { data: mensajes, error: mensajesError } = await supabase
            .from("mensajes")
            .select("id, created_at, remitente_id")
            .eq("conversacion_id", participacion.conversacion_id)
            .neq("remitente_id", currentUserId)
            .order("created_at", { ascending: true });

          if (mensajesError) {
            console.error("Error loading mensajes:", mensajesError);
            continue;
          }

          if (mensajes && mensajes.length > 0) {
            if (!participacion.ultimo_mensaje_leido_id) {
              // Si no hay último mensaje leído, todos los mensajes son no leídos
              totalUnread += mensajes.length;
            } else {
              // Contar mensajes después del último leído
              const ultimoLeidoIndex = mensajes.findIndex(
                (m) => m.id === participacion.ultimo_mensaje_leido_id
              );
              if (ultimoLeidoIndex !== -1) {
                totalUnread += mensajes.length - ultimoLeidoIndex - 1;
              }
            }
          }
        } catch (msgError) {
          console.error("Error processing conversation messages:", msgError);
        }
      }

      if (isMountedRef.current) {
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error("Error al cargar mensajes no leídos:", error);
      // No crash, just return 0
      if (isMountedRef.current) {
        setUnreadCount(0);
      }
    }
  };

  return unreadCount;
};
