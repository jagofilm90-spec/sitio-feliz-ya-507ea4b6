import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export function ConfigUsuariosTab() {
  const [activeTab, setActiveTab] = useState("usuarios");
  const navigate = useNavigate();

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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestión de Usuarios</CardTitle>
              <CardDescription>
                Crear, editar y eliminar usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                La gestión completa de usuarios está disponible en la página dedicada.
              </p>
              <Button onClick={() => navigate("/usuarios")} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Ir a Gestión de Usuarios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permisos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permisos por Módulo</CardTitle>
              <CardDescription>
                Controla qué roles tienen acceso a cada módulo del ERP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                La matriz de permisos está disponible en la página dedicada.
              </p>
              <Button onClick={() => navigate("/permisos")} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Ir a Matriz de Permisos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
