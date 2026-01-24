import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield } from "lucide-react";
import { UsuariosContent } from "./UsuariosContent";
import { PermisosContent } from "./PermisosContent";

export function ConfigUsuariosTab() {
  const [activeTab, setActiveTab] = useState("usuarios");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Usuarios y Permisos
        </h2>
        <p className="text-sm text-muted-foreground">
          Gestión de accesos y control de módulos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="permisos" className="gap-2">
            <Shield className="h-4 w-4" />
            Permisos por Módulo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <UsuariosContent />
        </TabsContent>

        <TabsContent value="permisos" className="mt-4">
          <PermisosContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
