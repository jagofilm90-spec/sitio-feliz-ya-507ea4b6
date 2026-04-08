import { useState, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import { mockAccounts, mockEmails, keyboardShortcuts, MockEmail } from '@/lib/mock-emails';
import { AccountRail } from '@/components/correos-v2/AccountRail';
import { EmailList } from '@/components/correos-v2/EmailList';
import { ThreadView } from '@/components/correos-v2/ThreadView';
import { ContextPanel } from '@/components/correos-v2/ContextPanel';
import { useEmailKeyboard } from '@/hooks/useEmailKeyboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlmasaLoading } from '@/components/brand/AlmasaLoading';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const CorreosV2 = () => {
  const [activeAccountId, setActiveAccountId] = useState('pedidos');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  const isMobile = useIsMobile();

  const activeAccount = mockAccounts.find(a => a.id === activeAccountId) || mockAccounts[0];

  const filteredEmails = useMemo(() => {
    if (activeAccountId === 'all') {
      return mockEmails.filter(e => e.accountId !== 'personal');
    }
    return mockEmails.filter(e => e.accountId === activeAccountId);
  }, [activeAccountId]);

  const selectedEmail = useMemo(() =>
    filteredEmails.find(e => e.id === selectedEmailId) || null,
    [filteredEmails, selectedEmailId]
  );

  const selectedIndex = useMemo(() =>
    filteredEmails.findIndex(e => e.id === selectedEmailId),
    [filteredEmails, selectedEmailId]
  );

  const handleSelectEmail = useCallback((id: string) => {
    setSelectedEmailId(id);
    if (isMobile) setMobileView('thread');
  }, [isMobile]);

  const handleSelectAccount = useCallback((id: string) => {
    setActiveAccountId(id);
    setSelectedEmailId(null);
    if (isMobile) setMobileView('list');
  }, [isMobile]);

  const goNext = useCallback(() => {
    if (selectedIndex < filteredEmails.length - 1) {
      setSelectedEmailId(filteredEmails[selectedIndex + 1].id);
    }
  }, [selectedIndex, filteredEmails]);

  const goPrev = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedEmailId(filteredEmails[selectedIndex - 1].id);
    }
  }, [selectedIndex, filteredEmails]);

  useEmailKeyboard({
    onNext: goNext,
    onPrev: goPrev,
    onArchive: () => {},
    onReply: () => {},
    onStar: () => {},
    onDelete: () => {},
    onSearch: () => {},
    onSelectAccount: (index) => {
      if (index < mockAccounts.length) {
        handleSelectAccount(mockAccounts[index].id);
      }
    },
    showHelp: () => setShowShortcuts(true),
  });

  // Mobile: 1 pane at a time
  if (isMobile) {
    return (
      <Layout>
        <div className="h-[calc(100vh-64px)] flex flex-col">
          {mobileView === 'list' ? (
            <>
              {/* Mobile account pills */}
              <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none border-b border-ink-100 bg-white">
                {mockAccounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc.id)}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition',
                      activeAccountId === acc.id
                        ? 'bg-ink-900 text-white'
                        : 'bg-warm-50 text-ink-600'
                    )}
                  >
                    {acc.shortLabel}
                    {acc.unread > 0 && <span className="ml-1 opacity-70">{acc.unread}</span>}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-hidden">
                <EmailList
                  emails={filteredEmails}
                  account={activeAccount}
                  selectedEmailId={selectedEmailId}
                  onSelectEmail={handleSelectEmail}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <button
                onClick={() => setMobileView('list')}
                className="flex items-center gap-1.5 px-4 py-3 text-sm text-ink-600 border-b border-ink-100 bg-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
              <div className="flex-1 overflow-hidden">
                <ThreadView
                  email={selectedEmail}
                  account={activeAccount}
                  onPrev={goPrev}
                  onNext={goNext}
                  hasPrev={selectedIndex > 0}
                  hasNext={selectedIndex < filteredEmails.length - 1}
                />
              </div>
            </div>
          )}
        </div>

        <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Atajos de teclado</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {keyboardShortcuts.map(s => (
                <div key={s.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-ink-600">{s.description}</span>
                  <kbd className="px-2 py-0.5 bg-warm-50 border border-ink-200 rounded text-xs font-mono text-ink-500">{s.key}</kbd>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  // Desktop: 4-pane layout
  return (
    <Layout>
      <div
        className="h-[calc(100vh-64px)] overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: '76px 400px 1fr 360px',
        }}
      >
        {/* Pane 1 — Rail */}
        <AccountRail
          accounts={mockAccounts}
          activeAccountId={activeAccountId}
          onSelectAccount={handleSelectAccount}
        />

        {/* Pane 2 — Email list */}
        <EmailList
          emails={filteredEmails}
          account={activeAccount}
          selectedEmailId={selectedEmailId}
          onSelectEmail={handleSelectEmail}
        />

        {/* Pane 3 — Thread */}
        <ThreadView
          email={selectedEmail}
          account={activeAccount}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < filteredEmails.length - 1}
        />

        {/* Pane 4 — Context */}
        <ContextPanel
          email={selectedEmail}
          accountType={activeAccount.type}
        />
      </div>

      {/* Keyboard shortcuts modal */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Atajos de teclado</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {keyboardShortcuts.map(s => (
              <div key={s.key} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-ink-600">{s.description}</span>
                <kbd className="px-2 py-0.5 bg-warm-50 border border-ink-200 rounded text-xs font-mono text-ink-500">{s.key}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CorreosV2;
