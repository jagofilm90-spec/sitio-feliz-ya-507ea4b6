import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Paperclip, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import EmailAvatarMobile, { extractSenderName } from "./EmailAvatarMobile";

interface Email {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  hasAttachments: boolean;
  isProcesado?: boolean;
}

interface EmailRowMobileProps {
  email: Email;
  onClick: () => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  accountTag?: string;
}

const formatEmailDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return format(date, "HH:mm", { locale: es });
    }
    if (isYesterday) {
      return "Ayer";
    }
    // Si es de este año, mostrar día y mes
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, "d MMM", { locale: es });
    }
    // Si es de otro año, incluir el año
    return format(date, "d MMM yy", { locale: es });
  } catch {
    return dateStr;
  }
};

const EmailRowMobile = ({
  email,
  onClick,
  selectionMode,
  isSelected,
  onToggleSelect,
  accountTag,
}: EmailRowMobileProps) => {
  const senderName = extractSenderName(email.from);

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      e.preventDefault();
      onToggleSelect();
    } else {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 p-3 text-left transition-colors active:bg-muted/70 ${
        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
      } ${email.isUnread ? 'bg-background' : ''}`}
    >
      {/* Avatar o Checkbox */}
      <div className="relative shrink-0">
        {selectionMode ? (
          <div className="h-11 w-11 flex items-center justify-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5"
            />
          </div>
        ) : (
          <EmailAvatarMobile from={email.from} size="lg" />
        )}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0 space-y-0.5">
        {/* Primera línea: Nombre y fecha */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-[15px] ${
              email.isUnread ? 'font-semibold text-foreground' : 'text-foreground/80'
            }`}
          >
            {senderName}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {formatEmailDate(email.date)}
          </span>
        </div>

        {/* Segunda línea: Asunto */}
        <div
          className={`truncate text-sm ${
            email.isUnread ? 'font-medium text-foreground' : 'text-foreground/70'
          }`}
        >
          {email.subject || "(Sin asunto)"}
        </div>

        {/* Tercera línea: Snippet */}
        <div className="text-sm text-muted-foreground truncate">
          {email.snippet}
        </div>

        {/* Cuarta línea: Tags y adjuntos */}
        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
          {accountTag && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-5 bg-muted/50"
            >
              {accountTag}
            </Badge>
          )}
          {email.isProcesado && (
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0 h-5 gap-0.5"
            >
              <CheckCheck className="h-3 w-3" />
              Procesado
            </Badge>
          )}
          {email.hasAttachments && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-5 gap-0.5"
            >
              <Paperclip className="h-3 w-3" />
              Adjunto
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
};

export default EmailRowMobile;
