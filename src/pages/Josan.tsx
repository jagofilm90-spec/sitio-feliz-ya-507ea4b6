import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, Plus, MessageCircle } from "lucide-react";
import { useJosanChat, useConversaciones, useConversacion } from "@/hooks/useJosan";

const SUGERENCIAS = [
  "¿Cómo va el día?",
  "¿Quién es mi cliente que más debe?",
  "Pedidos pendientes de surtir",
  "Empleados con bandera roja",
  "Top 5 productos del mes",
  "¿Hay alertas críticas?",
  "Productos con inventario bajo",
];

export default function Josan() {
  const [input, setInput] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mensajes, send, reset, loadConversacion, isPending } = useJosanChat();
  const { data: conversaciones } = useConversaciones();
  const { data: convCompleta } = useConversacion(selectedConvId);

  useEffect(() => {
    if (convCompleta) loadConversacion(convCompleta);
  }, [convCompleta]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const handleSend = () => {
    if (!input.trim() || isPending) return;
    send(input.trim());
    setInput("");
  };

  const handleNueva = () => {
    reset();
    setSelectedConvId(null);
    inputRef.current?.focus();
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar conversaciones */}
        <div className="w-64 border-r bg-gray-50/50 hidden md:flex flex-col">
          <div className="p-3 border-b">
            <Button onClick={handleNueva} className="w-full bg-[#c41e3a] hover:bg-[#a01830] text-white" size="sm">
              <Plus className="h-3 w-3 mr-1" /> Nueva conversación
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {(conversaciones || []).map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`w-full text-left p-2 rounded text-xs hover:bg-gray-100 ${selectedConvId === c.id ? "bg-gray-100" : ""}`}
                >
                  <p className="truncate font-medium">{c.titulo}</p>
                  <p className="text-[9px] text-muted-foreground">{c.total_mensajes} msgs</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#c41e3a]" />
            <h1 className="text-lg font-semibold">JOSAN</h1>
            <span className="text-xs text-muted-foreground">Asistente IA ALMASA-OS</span>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              {mensajes.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="mx-auto h-12 w-12 text-[#c41e3a] opacity-30 mb-4" />
                  <h2 className="text-lg font-semibold mb-1">Hola, soy JOSAN</h2>
                  <p className="text-sm text-muted-foreground mb-6">Pregúntame lo que sea sobre ALMASA-OS</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGERENCIAS.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); send(s); }}
                        className="text-xs px-3 py-1.5 rounded-full border hover:bg-gray-50 text-muted-foreground hover:text-gray-900 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensajes.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                    m.role === "user"
                      ? "bg-[#c41e3a] text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                    {m.tools && m.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.tools.map((t, j) => (
                          <Badge key={j} variant="outline" className="text-[8px] bg-white/20 border-white/30">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isPending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#c41e3a]" />
                    <span className="text-sm text-muted-foreground">Consultando datos...</span>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-4">
            <div className="max-w-2xl mx-auto flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Pregúntale a JOSAN..."
                className="flex-1"
                disabled={isPending}
              />
              <Button onClick={handleSend} disabled={!input.trim() || isPending} className="bg-[#c41e3a] hover:bg-[#a01830]">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
