import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, X, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useJosanChat } from "@/hooks/useJosan";

export default function JosanFloatingWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const navigate = useNavigate();
  const { mensajes, send, isPending } = useJosanChat();

  const handleSend = () => {
    if (!input.trim() || isPending) return;
    send(input.trim());
    setInput("");
  };

  return (
    <>
      {/* FAB button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#c41e3a] text-white shadow-lg hover:bg-[#a01830] flex items-center justify-center transition-transform hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat widget */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[500px] bg-white rounded-xl shadow-2xl border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 bg-[#c41e3a] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">JOSAN</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setOpen(false); navigate("/josan"); }} className="p-1 hover:bg-white/20 rounded">
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {mensajes.length === 0 && (
                <div className="text-center py-6">
                  <Sparkles className="mx-auto h-8 w-8 text-[#c41e3a] opacity-30 mb-2" />
                  <p className="text-xs text-muted-foreground">Pregúntame sobre ventas, clientes, alertas...</p>
                </div>
              )}
              {mensajes.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    m.role === "user" ? "bg-[#c41e3a] text-white" : "bg-gray-100"
                  }`}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              {isPending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin text-[#c41e3a]" />
                    <span className="text-[10px] text-muted-foreground">Consultando...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-2 border-t flex gap-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Pregunta..."
              className="text-xs h-8"
              disabled={isPending}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isPending} size="sm" className="h-8 w-8 p-0 bg-[#c41e3a]">
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
