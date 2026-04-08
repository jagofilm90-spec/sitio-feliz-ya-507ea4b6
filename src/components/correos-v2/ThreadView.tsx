import { useState } from 'react';
import { ChevronLeft, ChevronRight, Bold, Italic, List, Link as LinkIcon, Send, Save, X } from 'lucide-react';
import { MockEmail, MockAccount, toolbarActionsByAccount } from '@/lib/mock-emails';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface ThreadViewProps {
  email: MockEmail | null;
  account: MockAccount;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

const attachmentIcons: Record<string, { emoji: string; color: string }> = {
  pdf: { emoji: '📕', color: 'text-red-600' },
  excel: { emoji: '📗', color: 'text-green-600' },
  word: { emoji: '📘', color: 'text-blue-600' },
  image: { emoji: '🖼️', color: 'text-purple-600' },
  other: { emoji: '📄', color: 'text-ink-500' },
};

const accountDotLabels: Record<string, { label: string; color: string }> = {
  personal: { label: 'Bandeja personal', color: 'bg-ink-900' },
  pedidos: { label: 'Acciones de pedidos', color: 'bg-crimson-500' },
  pagos: { label: 'Acciones de pagos', color: 'bg-green-500' },
  cfdi: { label: 'Acciones de facturas', color: 'bg-amber-500' },
  compras: { label: 'Acciones de compras', color: 'bg-blue-500' },
  banca: { label: 'Acciones de banca', color: 'bg-purple-500' },
  general: { label: 'General', color: 'bg-ink-500' },
};

export const ThreadView = ({ email, account, onPrev, onNext, hasPrev, hasNext }: ThreadViewProps) => {
  const [composerOpen, setComposerOpen] = useState(false);

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#fafaf7' }}>
        <div className="text-center">
          <svg width="64" height="64" viewBox="0 0 100 100" className="mx-auto mb-6 text-ink-200">
            <path d="M50 10 C25 10, 10 30, 10 50 C10 75, 30 90, 50 90" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" />
            <path d="M50 20 C30 20, 20 35, 20 50 C20 70, 35 80, 50 80" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.3" />
          </svg>
          <p className="font-serif text-xl italic text-ink-400">Selecciona un correo para verlo</p>
        </div>
      </div>
    );
  }

  const actions = toolbarActionsByAccount[account.id] || toolbarActionsByAccount['general'];
  const dotLabel = accountDotLabels[account.id] || accountDotLabels['general'];

  const avatarGradient = email.linkedClientId
    ? 'from-crimson-500 to-crimson-700'
    : email.linkedSupplierId
    ? 'from-amber-500 to-amber-700'
    : account.type === 'personal'
    ? 'from-purple-500 to-purple-700'
    : 'from-ink-600 to-ink-800';

  const initials = email.from.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col h-full" style={{ background: '#fafaf7' }}>
      {/* Toolbar */}
      <div className="bg-white px-8 py-[14px] border-b border-ink-100 flex items-center gap-3">
        {/* Context label */}
        <div className="flex items-center gap-1.5 mr-4">
          <span className={cn('w-[6px] h-[6px] rounded-full', dotLabel.color)} />
          <span className="text-[10px] uppercase tracking-[0.1em] text-ink-400 font-medium">
            {dotLabel.label}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-1">
          {actions.map((action, i) => (
            <button
              key={i}
              className={cn(
                'px-3.5 py-[8px] rounded-[7px] text-[12.5px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
                action.variant === 'primary'
                  ? 'bg-ink-900 text-white hover:bg-ink-800'
                  : action.variant === 'secondary'
                  ? 'bg-warm-50 border border-ink-100 text-ink-700 hover:bg-warm-100'
                  : 'text-ink-500 hover:bg-warm-50'
              )}
            >
              {action.dotColor && (
                <span className="w-[6px] h-[6px] rounded-full" style={{ background: action.dotColor }} />
              )}
              {action.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="p-1.5 rounded text-ink-400 hover:text-ink-700 disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="p-1.5 rounded text-ink-400 hover:text-ink-700 disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-12 py-9 pb-16">
          {/* Thread header */}
          <div className="mb-8 pb-6 border-b border-ink-100">
            <h2 className="font-serif text-[38px] font-medium leading-[1.15] text-ink-900 mb-3">
              {email.subject}
            </h2>
            <div className="flex items-center gap-2 text-[12px] text-ink-500">
              <span>1 mensaje</span>
              {email.hasAttachments && <span>· {email.attachments.length} adjuntos</span>}
              {email.tags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-ink-50 text-[10px] font-medium">{t}</span>
              ))}
            </div>
          </div>

          {/* Message card */}
          <div className="bg-white border border-ink-100 rounded-xl p-7 shadow-[0_1px_2px_rgba(15,14,13,0.02)] mb-6">
            {/* Message header */}
            <div className="flex items-start gap-[14px] mb-5">
              <div className={cn('w-[42px] h-[42px] rounded-full flex items-center justify-center bg-gradient-to-br shrink-0', avatarGradient)}>
                <span className="text-white font-serif text-[16px] font-medium">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink-900">{email.from.name}</span>
                  <span className="text-[11px] text-ink-400 tabular-nums shrink-0">
                    {format(new Date(email.date), "d MMM yyyy · HH:mm", { locale: es })}
                  </span>
                </div>
                <p className="text-[12px] text-ink-500 truncate">
                  {email.from.email} → para: {email.to.email}
                </p>
              </div>
            </div>

            {/* Message body */}
            <div
              className="text-[14.5px] leading-[1.7] text-ink-800 [&_strong]:text-ink-900 [&_strong]:font-semibold [&_p]:mb-[14px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />

            {/* Order block inline */}
            {email.detectedOrder && email.detectedOrder.length > 0 && (
              <div className="relative mt-6 bg-warm-50 border border-ink-100 rounded-lg p-[18px] px-[22px]">
                <span className="absolute -top-[10px] left-4 bg-white px-2 text-[9.5px] font-bold uppercase text-crimson-500 tracking-[0.05em]">
                  Detectado automáticamente
                </span>
                <div className="space-y-0">
                  {email.detectedOrder.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        'grid py-2.5',
                        i < email.detectedOrder!.length - 1 && 'border-b border-dashed border-ink-100'
                      )}
                      style={{ gridTemplateColumns: '60px 1fr 90px' }}
                    >
                      <span className="text-crimson-500 font-semibold text-sm tabular-nums">{item.qty}</span>
                      <span className="text-sm text-ink-800">{item.description}</span>
                      <span className="text-sm text-ink-500 text-right tabular-nums">{item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {email.hasAttachments && email.attachments.length > 0 && (
              <div className="mt-6 pt-5 border-t border-ink-100">
                <span className="text-[10px] uppercase tracking-[0.1em] text-ink-400 font-bold mb-3 block">
                  {email.attachments.length} adjuntos
                </span>
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map(att => {
                    const icon = attachmentIcons[att.type] || attachmentIcons.other;
                    return (
                      <button
                        key={att.id}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-warm-50 border border-ink-100 rounded-[7px] text-sm hover:bg-warm-100 transition"
                      >
                        <span>{icon.emoji}</span>
                        <span className="text-ink-700 font-medium">{att.name}</span>
                        <span className="text-[11px] text-ink-400 tabular-nums">{att.size}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          {!composerOpen ? (
            <button
              onClick={() => setComposerOpen(true)}
              className="w-full bg-white border border-ink-100 rounded-xl p-[18px] px-[22px] text-left text-ink-400 text-sm hover:border-ink-300 transition"
            >
              Responder a {email.from.name} desde {account.email || 'jagomez@almasa.com.mx'}…
            </button>
          ) : (
            <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
              <div className="p-5 space-y-3">
                <div className="flex gap-2 text-sm">
                  <span className="text-ink-500 w-10 shrink-0">Para:</span>
                  <span className="text-ink-800">{email.from.email}</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="text-ink-500 w-10 shrink-0">CC:</span>
                  <input className="flex-1 text-sm bg-transparent outline-none text-ink-800 placeholder:text-ink-300" placeholder="Agregar CC…" />
                </div>
                <div className="border-b border-ink-100" />
                {/* Editor toolbar */}
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded hover:bg-warm-50 text-ink-500"><Bold className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded hover:bg-warm-50 text-ink-500"><Italic className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded hover:bg-warm-50 text-ink-500"><List className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded hover:bg-warm-50 text-ink-500"><LinkIcon className="w-4 h-4" /></button>
                </div>
                {/* Editor area */}
                <textarea
                  className="w-full min-h-[120px] text-sm text-ink-800 leading-relaxed resize-none outline-none placeholder:text-ink-300"
                  placeholder="Escribe tu respuesta…"
                  autoFocus
                />
              </div>
              <div className="px-5 py-3 bg-warm-50 border-t border-ink-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-crimson-500 hover:bg-crimson-600 text-white gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    Enviar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-ink-500 gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    Borrador
                  </Button>
                  <Button size="sm" variant="ghost" className="text-ink-400" onClick={() => setComposerOpen(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-ink-400 tabular-nums">0 caracteres</span>
                  {account.type === 'business' && (
                    <span className="text-[11px] text-ink-500">
                      Desde <strong>{account.email}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
