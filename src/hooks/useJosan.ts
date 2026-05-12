import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useEnviarMensaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { conversacion_id?: string; mensaje: string }) => {
      const { data, error } = await supabase.functions.invoke("chat-josan", { body: params });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as { respuesta: string; conversacion_id: string; tools_usados: string[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["josan-conversaciones"] });
    },
  });
}

export function useConversaciones() {
  return useQuery({
    queryKey: ["josan-conversaciones"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("josan_conversaciones")
        .select("id, titulo, ultimo_mensaje_at, total_mensajes, tools_usados")
        .eq("estado", "activa")
        .order("ultimo_mensaje_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useConversacion(id: string | null) {
  return useQuery({
    queryKey: ["josan-conv", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("josan_conversaciones")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useJosanChat() {
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<{ role: string; text: string; tools?: string[] }[]>([]);
  const enviar = useEnviarMensaje();

  const send = async (texto: string) => {
    setMensajes((prev) => [...prev, { role: "user", text: texto }]);

    const result = await enviar.mutateAsync({ conversacion_id: conversacionId || undefined, mensaje: texto });

    if (!conversacionId && result.conversacion_id) setConversacionId(result.conversacion_id);

    setMensajes((prev) => [...prev, { role: "assistant", text: result.respuesta, tools: result.tools_usados }]);
  };

  const reset = () => {
    setConversacionId(null);
    setMensajes([]);
  };

  const loadConversacion = (conv: any) => {
    setConversacionId(conv.id);
    const msgs: { role: string; text: string }[] = [];
    for (const m of conv.mensajes || []) {
      if (m.role === "user" && typeof m.content === "string") {
        msgs.push({ role: "user", text: m.content });
      }
      if (m.role === "assistant" && Array.isArray(m.content)) {
        const txt = m.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
        if (txt) msgs.push({ role: "assistant", text: txt });
      }
    }
    setMensajes(msgs);
  };

  return { mensajes, send, reset, loadConversacion, conversacionId, isPending: enviar.isPending };
}
