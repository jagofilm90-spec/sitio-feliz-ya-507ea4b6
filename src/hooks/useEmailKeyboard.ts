import { useEffect, useCallback } from 'react';

interface UseEmailKeyboardProps {
  onNext: () => void;
  onPrev: () => void;
  onArchive: () => void;
  onReply: () => void;
  onStar: () => void;
  onDelete: () => void;
  onSearch: () => void;
  onSelectAccount: (index: number) => void;
  showHelp: () => void;
}

export const useEmailKeyboard = ({
  onNext, onPrev, onArchive, onReply, onStar, onDelete, onSearch, onSelectAccount, showHelp,
}: UseEmailKeyboardProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).contentEditable === 'true') return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      onSearch();
      return;
    }

    switch (e.key) {
      case 'j': onNext(); break;
      case 'k': onPrev(); break;
      case 'e': onArchive(); break;
      case 'r': onReply(); break;
      case 's': onStar(); break;
      case '#': onDelete(); break;
      case '?': showHelp(); break;
      case '1': case '2': case '3': case '4': case '5': case '6': case '7':
        onSelectAccount(parseInt(e.key) - 1);
        break;
    }
  }, [onNext, onPrev, onArchive, onReply, onStar, onDelete, onSearch, onSelectAccount, showHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
