import { PermisosContent } from "./PermisosContent";
import { PageHeader } from "@/components/layout/PageHeader";

export function ConfigUsuariosTab() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Acceso y permisos"
        lead={`Control de permisos por módulo. Para gestionar usuarios, ve a Empleados.`}
      />

      <PermisosContent />
    </div>
  );
}
