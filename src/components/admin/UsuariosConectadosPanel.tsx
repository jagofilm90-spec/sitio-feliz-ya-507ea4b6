import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, RefreshCw, Monitor, Truck, Package, FileText, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { useAllUsersPresence } from "@/hooks/useSystemPresence";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<string, React.ElementType> = {
  dashboard: Monitor,
  almacen: Package,
  chofer: Truck,
  vendedor: FileText,
  secretaria: FileText,
  correos: Mail,
  pedidos: FileText,
  rutas: Truck,
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  almacen: "Almacén Tablet",
  chofer: "Panel Chofer",
  vendedor: "Panel Vendedor",
  secretaria: "Secretaría",
  correos: "Correos",
  pedidos: "Pedidos",
  rutas: "Rutas",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  gerente_almacen: "bg-orange-100 text-orange-700",
  almacen: "bg-blue-100 text-blue-700",
  chofer: "bg-green-100 text-green-700",
  vendedor: "bg-purple-100 text-purple-700",
  secretaria: "bg-pink-100 text-pink-700",
  contabilidad: "bg-yellow-100 text-yellow-700",
  cliente: "bg-cyan-100 text-cyan-700",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  gerente_almacen: "Gerente Almacén",
  almacen: "Almacenista",
  chofer: "Chofer",
  vendedor: "Vendedor",
  secretaria: "Secretaria",
  contabilidad: "Contabilidad",
  cliente: "Cliente",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function UsuariosConectadosPanel() {
  const { onlineUsers, allUsers, isLoading, refetch } = useAllUsersPresence();
  const [showOffline, setShowOffline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const onlineUsersList = allUsers.filter(u => onlineUsers.has(u.id));
  const offlineUsersList = allUsers.filter(u => !onlineUsers.has(u.id));

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Usuarios en el Sistema
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {onlineUsersList.length} conectados
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Online Users */}
        {onlineUsersList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              En línea ahora ({onlineUsersList.length})
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {onlineUsersList.map(user => {
                  const presenceData = onlineUsers.get(user.id);
                  const ModuleIcon = MODULE_ICONS[presenceData?.module || ""] || Monitor;
                  
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full text-white font-semibold text-sm",
                        getAvatarColor(user.full_name || "U")
                      )}>
                        {getInitials(user.full_name || "U")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{user.full_name}</p>
                          <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ModuleIcon className="h-3 w-3" />
                          <span>{MODULE_LABELS[presenceData?.module || ""] || presenceData?.module || "Sistema"}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {user.roles.slice(0, 2).map(role => (
                          <Badge 
                            key={role} 
                            variant="outline" 
                            className={cn("text-xs", ROLE_COLORS[role])}
                          >
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        ))}
                        {user.roles.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.roles.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {onlineUsersList.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay usuarios conectados en este momento</p>
          </div>
        )}

        {/* Offline Users Toggle */}
        {offlineUsersList.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
              onClick={() => setShowOffline(!showOffline)}
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50"></span>
                Desconectados ({offlineUsersList.length})
              </span>
              {showOffline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showOffline && (
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-2">
                  {offlineUsersList.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 opacity-70"
                    >
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full text-white font-semibold text-sm grayscale",
                        getAvatarColor(user.full_name || "U")
                      )}>
                        {getInitials(user.full_name || "U")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.last_seen 
                            ? `Última vez: ${formatDistanceToNow(new Date(user.last_seen), { addSuffix: true, locale: es })}`
                            : "Sin actividad registrada"
                          }
                          {user.last_module && ` · ${MODULE_LABELS[user.last_module] || user.last_module}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {user.roles.slice(0, 1).map(role => (
                          <Badge 
                            key={role} 
                            variant="outline" 
                            className={cn("text-xs opacity-70", ROLE_COLORS[role])}
                          >
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
