import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZkMappingPanel } from "@/components/asistencia/ZkMappingPanel";
import { AsistenciaView } from "@/components/asistencia/AsistenciaView";
import { ReporteAsistenciaMensual } from "@/components/asistencia/ReporteAsistenciaMensual";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Clock, Link2, BarChart3 } from "lucide-react";

export default function Asistencia() {
  const { isAdmin } = useUserRoles();

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Asistencia</h1>
          <p className="text-muted-foreground text-sm">Control de entradas y salidas</p>
        </div>

        <Tabs defaultValue="registros">
          <TabsList>
            <TabsTrigger value="registros" className="gap-1.5">
              <Clock className="h-4 w-4" />
              Hoy
            </TabsTrigger>
            <TabsTrigger value="reportes" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Reportes
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="mapeo" className="gap-1.5">
                <Link2 className="h-4 w-4" />
                Mapeo ZKTeco
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="registros">
            <AsistenciaView />
          </TabsContent>
          <TabsContent value="reportes">
            <ReporteAsistenciaMensual />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="mapeo">
              <ZkMappingPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
