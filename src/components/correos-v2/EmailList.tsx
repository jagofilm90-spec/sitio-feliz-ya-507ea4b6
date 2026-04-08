import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { MockEmail, MockAccount, filterTabsByAccount } from '@/lib/mock-emails';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmailListProps {
  emails: MockEmail[];
  account: MockAccount;
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
}

const accountTitles: Record<string, string> = {
  personal: 'Tu bandeja,',
  all: 'Todos los buzones,',
  pedidos: 'Pedidos,',
  pagos: 'Pagos,',
  cfdi: 'Facturas prov.,',
  compras: 'Compras,',
  banca: 'Banca,',
  general: 'General,',
};

const accountOriginColors: Record<string, { bg: string; text: string; dot: string }> = {
  pedidos: { bg: 'bg-crimson-50', text: 'text-crimson-700', dot: 'bg-crimson-500' },
  pagos: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  cfdi: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  compras: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  banca: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  general: { bg: 'bg-ink-50', text: 'text-ink-700', dot: 'bg-ink-500' },
};

export const EmailList = ({ emails, account, selectedEmailId, onSelectEmail }: EmailListProps) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filterTabs = filterTabsByAccount[account.id] || filterTabsByAccount['all'];

  const grouped = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const groups: { label: string; meta: string; emails: MockEmail[] }[] = [];
    const todayEmails: MockEmail[] = [];
    const yesterdayEmails: MockEmail[] = [];
    const olderEmails: MockEmail[] = [];

    const filtered = emails.filter(e => {
      if (search) {
        const s = search.toLowerCase();
        return e.subject.toLowerCase().includes(s) || e.from.name.toLowerCase().includes(s) || e.preview.toLowerCase().includes(s);
      }
      return true;
    });

    filtered.forEach(e => {
      const d = new Date(e.date).toDateString();
      if (d === today) todayEmails.push(e);
      else if (d === yesterday) yesterdayEmails.push(e);
      else olderEmails.push(e);
    });

    if (todayEmails.length) groups.push({ label: 'Hoy', meta: `8 ABR · ${todayEmails.length} CORREOS`, emails: todayEmails });
    if (yesterdayEmails.length) groups.push({ label: 'Ayer', meta: `7 ABR · ${yesterdayEmails.length} CORREOS`, emails: yesterdayEmails });
    if (olderEmails.length) groups.push({ label: 'Esta semana', meta: `${olderEmails.length} CORREOS`, emails: olderEmails });

    return groups;
  }, [emails, search]);

  const totalUnread = emails.filter(e => !e.isRead).length;

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return format(d, 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-ink-100 bg-white">
      {/* Header */}
      <div className="px-7 pt-[26px] pb-4 border-b border-ink-100">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
              account.type === 'personal' ? 'text-ink-900' : 'text-crimson-500'
            )}
          >
            <span className={cn('w-[6px] h-[6px] rounded-full', account.type === 'personal' ? 'bg-ink-900' : 'bg-crimson-500')} />
            {account.type === 'personal' ? 'Personal 🔒 Solo tú' : account.nombre}
          </span>
        </div>
        <h1 className="font-serif text-[36px] font-medium leading-[1.1] text-ink-900">
          {accountTitles[account.id] || 'Correos,'} <span className="italic text-ink-400">hoy.</span>
        </h1>
        <p className="text-[12.5px] text-ink-500 mt-1.5">
          {account.email ? `${account.email} · ` : ''}{totalUnread} sin leer · {emails.length} totales
        </p>
      </div>

      {/* Search */}
      <div className="px-6 py-[14px] pb-[10px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Buscar en ${account.nombre.toLowerCase()}…`}
            className="w-full h-9 pl-10 pr-14 text-sm bg-warm-50 border border-ink-100 rounded-lg placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-300 transition"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-white border border-ink-200 rounded text-[10px] text-ink-400 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-6 pb-[14px] overflow-x-auto scrollbar-none">
        {filterTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all tabular-nums',
              activeFilter === tab.value
                ? 'bg-ink-900 text-white'
                : 'bg-warm-50 text-ink-500 hover:bg-warm-100'
            )}
          >
            {tab.label} <span className="opacity-70">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {grouped.map((group) => (
          <div key={group.label}>
            {/* Section header */}
            <div className="flex items-baseline justify-between px-7 pt-5 pb-[6px]">
              <span className="font-serif italic text-[16px] text-ink-500">{group.label}</span>
              <span className="text-[10px] uppercase tracking-[0.08em] text-ink-400 tabular-nums font-medium">
                {group.meta}
              </span>
            </div>

            {/* Emails */}
            {group.emails.map(email => {
              const isSelected = email.id === selectedEmailId;
              const originColor = accountOriginColors[email.accountId];

              return (
                <button
                  key={email.id}
                  onClick={() => onSelectEmail(email.id)}
                  className={cn(
                    'relative w-full text-left grid gap-3 px-7 py-[14px] pl-6 transition-all border-b border-ink-50',
                    isSelected ? 'bg-warm-100' : 'hover:bg-warm-50',
                  )}
                  style={{ gridTemplateColumns: '14px 1fr' }}
                >
                  {/* Selected bar */}
                  {isSelected && (
                    <span className={cn(
                      'absolute left-0 top-[14px] bottom-[14px] w-[3px] rounded-r-full',
                      account.type === 'personal' ? 'bg-ink-900' : 'bg-crimson-500'
                    )} />
                  )}

                  {/* Dot */}
                  <div className="pt-[6px]">
                    {email.isStarred ? (
                      <span className="block w-2 h-2 rounded-full bg-amber-500" />
                    ) : !email.isRead ? (
                      <span className={cn('block w-2 h-2 rounded-full', account.type === 'personal' ? 'bg-ink-900' : 'bg-crimson-500')} />
                    ) : (
                      <span className="block w-2 h-2 rounded-full border border-ink-300" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 space-y-[2px]">
                    {/* Row 1: Sender + time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('text-[13.5px] truncate', !email.isRead ? 'font-semibold text-ink-900' : 'text-ink-700')}>
                        {email.from.name}
                      </span>
                      <span className="text-[11px] text-ink-400 tabular-nums shrink-0">
                        {formatTime(email.date)}
                      </span>
                    </div>

                    {/* Row 2: Subject */}
                    <div className={cn('text-[13px] truncate', !email.isRead ? 'font-medium text-ink-800' : 'text-ink-600')}>
                      {email.subject || '(Sin asunto)'}
                    </div>

                    {/* Row 3: Preview */}
                    <div className="text-[12.5px] text-ink-500 truncate" style={{ lineHeight: '1.45' }}>
                      {email.preview}
                    </div>

                    {/* Row 4: Chips */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {/* Origin chip in unified view */}
                      {account.id === 'all' && originColor && (
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-[9.5px] font-bold', originColor.bg, originColor.text)}>
                          <span className={cn('w-[5px] h-[5px] rounded-full', originColor.dot)} />
                          {email.accountId}@
                        </span>
                      )}

                      {/* Tags */}
                      {email.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-[10px] text-[9.5px] font-medium bg-ink-50 text-ink-500">
                          {tag}
                        </span>
                      ))}

                      {email.isUrgent && (
                        <span className="px-2 py-0.5 rounded-[10px] text-[9.5px] font-bold uppercase bg-crimson-500 text-white">
                          Urgente
                        </span>
                      )}

                      {email.hasAttachments && (
                        <span className="text-ink-400 text-[10px]">📎</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <svg width="48" height="48" viewBox="0 0 100 100" className="mb-6 text-ink-200">
              <path d="M50 10 C25 10, 10 30, 10 50 C10 75, 30 90, 50 90" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M50 20 C30 20, 20 35, 20 50 C20 70, 35 80, 50 80" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <path d="M50 30 C35 30, 30 40, 30 50 C30 65, 40 70, 50 70" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
              <circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.4" />
            </svg>
            <p className="font-serif text-lg italic text-ink-400">No hay correos en este buzón</p>
            <button className="mt-4 text-sm text-crimson-500 hover:underline">Configurar cuenta</button>
          </div>
        )}
      </div>
    </div>
  );
};
