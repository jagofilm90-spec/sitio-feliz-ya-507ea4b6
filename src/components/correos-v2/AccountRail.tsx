import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MockAccount } from '@/lib/mock-emails';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AccountRailProps {
  accounts: MockAccount[];
  activeAccountId: string;
  onSelectAccount: (id: string) => void;
}

export const AccountRail = ({ accounts, activeAccountId, onSelectAccount }: AccountRailProps) => {
  const navigate = useNavigate();
  const personal = accounts.find(a => a.type === 'personal');
  const allAccount = accounts.find(a => a.id === 'all');
  const businessAccounts = accounts.filter(a => a.type === 'business' && a.id !== 'all');

  const totalBusinessUnread = businessAccounts.reduce((sum, a) => sum + a.unread, 0);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col items-center h-full py-[18px] gap-1" style={{ background: '#fafaf7' }}>
        {/* Personal account */}
        {personal && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelectAccount(personal.id)}
                className={cn(
                  'relative w-[50px] h-[50px] rounded-full flex items-center justify-center transition-all duration-200',
                  activeAccountId === personal.id
                    ? 'ring-2 ring-ink-900 ring-offset-[3px] ring-offset-[#fafaf7]'
                    : 'hover:-translate-y-[1px]'
                )}
                style={{
                  background: 'linear-gradient(135deg, #2a2622, #0f0e0d)',
                  boxShadow: '0 2px 8px rgba(15,14,13,0.15)',
                  border: '2px solid #fafaf7',
                }}
              >
                <span className="font-serif text-[19px] text-white font-medium">JG</span>
                {personal.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-crimson-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {personal.unread}
                  </span>
                )}
                {activeAccountId === personal.id && (
                  <span className="absolute left-[-22px] top-1/2 -translate-y-1/2 w-[4px] h-[28px] rounded-r-full bg-ink-900" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="space-y-1">
              <p className="font-medium text-sm">Tu bandeja personal</p>
              <p className="text-xs text-muted-foreground">{personal.email}</p>
              <p className="text-[10px] text-amber-600 font-medium">Solo tú la ves</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Divider with NEGOCIO label */}
        <div className="relative w-[38px] my-[14px] mb-3">
          <div className="w-full h-px bg-ink-300" />
          <span
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1 text-ink-400 font-sans"
            style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#fafaf7' }}
          >
            NEGOCIO
          </span>
        </div>

        {/* Unified inbox */}
        {allAccount && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelectAccount('all')}
                className={cn(
                  'relative w-[48px] h-[48px] rounded-[11px] flex items-center justify-center transition-all duration-200 mb-1',
                  activeAccountId === 'all'
                    ? 'bg-crimson-500 text-white shadow-md'
                    : 'bg-white border border-ink-100 text-ink-700 hover:border-ink-300 hover:-translate-y-[1px]'
                )}
              >
                <span className="font-sans text-[11px] font-bold uppercase">All</span>
                {totalBusinessUnread > 0 && activeAccountId !== 'all' && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-crimson-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {totalBusinessUnread}
                  </span>
                )}
                {activeAccountId === 'all' && (
                  <span className="absolute left-[-22px] top-1/2 -translate-y-1/2 w-[4px] h-[28px] rounded-r-full bg-crimson-500" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium text-sm">Bandeja unificada</p>
              <p className="text-xs text-muted-foreground">Todos los buzones del negocio</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Thin divider */}
        <div className="w-[28px] h-px bg-ink-200 my-[6px]" />

        {/* Business accounts */}
        {businessAccounts.map((account) => (
          <Tooltip key={account.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelectAccount(account.id)}
                className={cn(
                  'relative w-[48px] h-[48px] rounded-[11px] flex items-center justify-center transition-all duration-200',
                  activeAccountId === account.id
                    ? 'bg-crimson-500 text-white shadow-md'
                    : 'bg-white border border-ink-100 hover:border-ink-300 hover:-translate-y-[1px]'
                )}
              >
                <span
                  className="font-serif text-[20px] font-semibold"
                  style={{ color: activeAccountId === account.id ? 'white' : account.color }}
                >
                  {account.shortLabel}
                </span>
                {account.unread > 0 && activeAccountId !== account.id && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-crimson-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {account.unread}
                  </span>
                )}
                {activeAccountId === account.id && (
                  <span className="absolute left-[-22px] top-1/2 -translate-y-1/2 w-[4px] h-[28px] rounded-r-full bg-crimson-500" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium text-sm">{account.nombre}</p>
              <p className="text-xs text-muted-foreground">{account.email}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Settings at bottom */}
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/correos/config')}
                className="w-[40px] h-[40px] rounded-[9px] flex items-center justify-center text-ink-400 hover:text-ink-700 hover:bg-white hover:border hover:border-ink-100 transition-all"
              >
                <Settings className="w-[18px] h-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Configuración de correos</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
