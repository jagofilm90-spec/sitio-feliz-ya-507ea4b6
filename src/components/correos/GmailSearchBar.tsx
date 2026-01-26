import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu, Search, X, Mail, Check } from "lucide-react";
import EmailAvatarMobile, { extractSenderName } from "./EmailAvatarMobile";

interface GmailCuenta {
  id: string;
  email: string;
  nombre: string;
  proposito: string;
}

interface GmailSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  cuentas: GmailCuenta[];
  selectedAccount: string;
  onAccountChange: (email: string) => void;
  unreadCounts?: Record<string, number>;
  currentUserEmail?: string;
}

const GmailSearchBar = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  cuentas,
  selectedAccount,
  onAccountChange,
  unreadCounts = {},
  currentUserEmail,
}: GmailSearchBarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleAccountSelect = (email: string) => {
    onAccountChange(email);
    setMenuOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearchSubmit();
    }
  };

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-full border border-border/50 shadow-sm">
      {/* Menu hamburguesa */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full relative">
            <Menu className="h-5 w-5" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-left">
              <Mail className="h-5 w-5 text-primary" />
              Cuentas de correo
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-2 space-y-1">
              {cuentas.map((cuenta) => {
                const isSelected = cuenta.email === selectedAccount;
                const unread = unreadCounts[cuenta.email] || 0;
                
                return (
                  <button
                    key={cuenta.id}
                    onClick={() => handleAccountSelect(cuenta.email)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <EmailAvatarMobile from={cuenta.email} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isSelected ? 'text-primary' : ''}`}>
                          {cuenta.nombre}
                        </span>
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">
                        {cuenta.email}
                      </span>
                    </div>
                    {unread > 0 && (
                      <Badge variant="destructive" className="shrink-0 text-xs">
                        {unread}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Barra de búsqueda */}
      <div className="flex-1 relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en el correo"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="pl-8 pr-8 h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={onClearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Avatar del usuario actual */}
      <EmailAvatarMobile 
        from={currentUserEmail || selectedAccount} 
        size="sm" 
        className="cursor-pointer"
      />
    </div>
  );
};

export default GmailSearchBar;
