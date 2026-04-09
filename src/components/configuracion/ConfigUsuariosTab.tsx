import { useState, useCallback } from "react";
import { PermisosContent } from "./PermisosContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function ConfigUsuariosTab() {
  const [refetchFn, setRefetchFn] = useState<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefetch = useCallback((fn: () => void) => {
    setRefetchFn(() => fn);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Acceso y permisos"
        lead="Gestión de roles y permisos por módulo"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchFn?.()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        }
      />

      <PermisosContent onRefetch={handleRefetch} isLoadingOut={setIsLoading} />
    </div>
  );
}
