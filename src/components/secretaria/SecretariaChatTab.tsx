import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  tipo: string;
  nombre: string | null;
  puesto: string | null;
  ultimo_mensaje?: { contenido: string; created_at: string };
  mensajes_no_leidos: number;
  participantes?: { id: string; full_name: string }[];
}

interface Message {
  id: string;
  conversacion_id: string;
  remitente_id: string | null;
  contenido: string;
  created_at: string;
  remitente?: { id: string; full_name: string };
}

export const SecretariaChatTab = () => {
  const [conversacionActiva, setConversacionActiva] = useState<Conversation | null>(null);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Fetch conversations
  const { data: conversaciones, isLoading: loadingConversaciones } = useQuery({
    queryKey: ["secretaria-chat-conversaciones", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];

      const { data, error } = await supabase
        .from("conversaciones")
        .select(`
          *,
          conversacion_participantes!inner(user_id)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get details for each conversation
      const conversacionesConDetalles = await Promise.all(
        (data || []).map(async (conv) => {
          // Last message
          const { data: ultimoMensaje } = await supabase
            .from("mensajes")
            .select("contenido, created_at")
            .eq("conversacion_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Participants
          const { data: participantesData } = await supabase
            .from("conversacion_participantes")
            .select("user_id")
            .eq("conversacion_id", conv.id);

          let participantes: { id: string; full_name: string }[] = [];
          if (participantesData) {
            const userIds = participantesData.map((p) => p.user_id);
            const { data: profiles } = await supabase
              .from("profiles_chat")
              .select("id, full_name")
              .in("id", userIds);
            participantes = profiles || [];
          }

          return {
            ...conv,
            ultimo_mensaje: ultimoMensaje,
            mensajes_no_leidos: 0,
            participantes,
          };
        })
      );

      return conversacionesConDetalles as Conversation[];
    },
    enabled: !!currentUserId,
  });

  // Fetch messages for active conversation
  const { data: mensajes, isLoading: loadingMensajes } = useQuery({
    queryKey: ["secretaria-chat-mensajes", conversacionActiva?.id],
    queryFn: async () => {
      if (!conversacionActiva) return [];

      const { data, error } = await supabase
        .from("mensajes")
        .select("*")
        .eq("conversacion_id", conversacionActiva.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get sender info
      if (data && data.length > 0) {
        const remitentesIds = [...new Set(data.map((m) => m.remitente_id).filter(Boolean))];
        const { data: remitentes } = await supabase
          .from("profiles_chat")
          .select("id, full_name")
          .in("id", remitentesIds);

        const remitentesMap = new Map(remitentes?.map((r) => [r.id, r]) || []);

        return data.map((mensaje) => ({
          ...mensaje,
          remitente: mensaje.remitente_id ? remitentesMap.get(mensaje.remitente_id) : undefined,
        })) as Message[];
      }

      return data as Message[];
    },
    enabled: !!conversacionActiva,
    refetchInterval: 5000,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (contenido: string) => {
      if (!conversacionActiva || !currentUserId) throw new Error("No conversation selected");

      const { error } = await supabase.from("mensajes").insert([
        {
          conversacion_id: conversacionActiva.id,
          remitente_id: currentUserId,
          contenido,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      setNuevoMensaje("");
      queryClient.invalidateQueries({ queryKey: ["secretaria-chat-mensajes"] });
      queryClient.invalidateQueries({ queryKey: ["secretaria-chat-conversaciones"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Get conversation name
  const getNombreConversacion = (conv: Conversation) => {
    if (conv.nombre) return conv.nombre;
    if (conv.tipo === "grupo_puesto") return `Grupo: ${conv.puesto}`;
    if (conv.tipo === "individual" && conv.participantes) {
      const otro = conv.participantes.find((p) => p.id !== currentUserId);
      return otro?.full_name || "Chat";
    }
    return "Conversación";
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;
    sendMutation.mutate(nuevoMensaje.trim());
  };

  if (loadingConversaciones) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {conversacionActiva && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConversacionActiva(null)}
              className="lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-pink-600" />
            {conversacionActiva ? getNombreConversacion(conversacionActiva) : "Chat Interno"}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Conversations List */}
        <Card className={cn("lg:col-span-1", conversacionActiva && "hidden lg:block")}>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {conversaciones && conversaciones.length > 0 ? (
                conversaciones.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setConversacionActiva(conv)}
                    className={cn(
                      "w-full p-4 border-b hover:bg-muted/50 text-left transition-colors",
                      conversacionActiva?.id === conv.id && "bg-pink-50 dark:bg-pink-950/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-pink-100 text-pink-600">
                          {conv.tipo === "individual" ? (
                            getNombreConversacion(conv).charAt(0).toUpperCase()
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">
                            {getNombreConversacion(conv)}
                          </p>
                          {conv.mensajes_no_leidos > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {conv.mensajes_no_leidos}
                            </Badge>
                          )}
                        </div>
                        {conv.ultimo_mensaje && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.ultimo_mensaje.contenido}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay conversaciones</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className={cn("lg:col-span-2", !conversacionActiva && "hidden lg:block")}>
          <CardContent className="p-0 flex flex-col h-[600px]">
            {conversacionActiva ? (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {loadingMensajes ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : mensajes && mensajes.length > 0 ? (
                    <div className="space-y-4">
                      {mensajes.map((mensaje) => {
                        const isOwn = mensaje.remitente_id === currentUserId;
                        return (
                          <div
                            key={mensaje.id}
                            className={cn(
                              "flex",
                              isOwn ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[70%] rounded-lg px-4 py-2",
                                isOwn
                                  ? "bg-pink-600 text-white"
                                  : "bg-muted"
                              )}
                            >
                              {!isOwn && mensaje.remitente && (
                                <p className="text-xs font-medium text-pink-600 mb-1">
                                  {mensaje.remitente.full_name}
                                </p>
                              )}
                              <p className="text-sm">{mensaje.contenido}</p>
                              <p
                                className={cn(
                                  "text-xs mt-1",
                                  isOwn ? "text-pink-200" : "text-muted-foreground"
                                )}
                              >
                                {format(new Date(mensaje.created_at), "HH:mm", { locale: es })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No hay mensajes</p>
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t flex gap-2"
                >
                  <Input
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!nuevoMensaje.trim() || sendMutation.isPending}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Selecciona una conversación</p>
                <p className="text-sm text-muted-foreground">
                  Elige una conversación de la lista para comenzar
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
