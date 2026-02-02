import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Edit, Key, Trash2 } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  telefono: string | null;
  roles: string[];
}

interface UsuarioCardMobileProps {
  user: UserData;
  onEdit: (user: UserData) => void;
  onResetPassword: (user: UserData) => void;
  onDelete: (user: UserData) => void;
  getRoleBadge: (role: string) => React.ReactNode;
}

export function UsuarioCardMobile({ 
  user, 
  onEdit, 
  onResetPassword, 
  onDelete,
  getRoleBadge
}: UsuarioCardMobileProps) {
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header con nombre */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">
              {user.full_name || "Sin nombre"}
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Teléfono */}
        {user.telefono && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{user.telefono}</span>
          </div>
        )}

        {/* Roles */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {user.roles?.length > 0 ? (
            user.roles.map((role) => (
              <div key={role}>{getRoleBadge(role)}</div>
            ))
          ) : (
            <Badge variant="secondary">Sin rol</Badge>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit(user)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onResetPassword(user)}
          >
            <Key className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(user)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
