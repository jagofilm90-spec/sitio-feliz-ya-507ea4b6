import { Shield } from "lucide-react";
import { PermisosContent } from "./PermisosContent";

export function ConfigUsuariosTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Acceso y Permisos
        </h2>
        <p className="text-sm text-muted-foreground">
          Control de permisos por módulo · Para gestionar usuarios, ve a <a href="/empleados" className="text-primary underline font-medium">Empleados</a>
        </p>
      </div>

      <PermisosContent />
    </div>
  );
}
