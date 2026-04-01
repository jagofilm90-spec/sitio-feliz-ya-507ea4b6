import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveTabsList } from "@/components/ui/responsive-tabs";
import { ZkMappingPanel } from "@/components/asistencia/ZkMappingPanel";
import { AsistenciaView } from "@/components/asistencia/AsistenciaView";
import { ReporteSemanal } from "@/components/asistencia/ReporteSemanal";
import { ReporteQuincenal } from "@/components/asistencia/ReporteQuincenal";
import { ReporteAsistenciaMensual } from "@/components/asistencia/ReporteAsistenciaMensual";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Clock, Link2, BarChart3, Calendar, CalendarDays, Palmtree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { VacacionesMasivasDialog } from "@/components/asistencia/VacacionesMasivasDialog";

export default function Asistencia() {
  const { isAdmin } = useUserRoles();
  const [showVacMasivas, setShowVacMasivas] = useState(false);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Asistencia</h1>
            <p className="text-muted-foreground text-sm">Control de entradas y salidas</p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowVacMasivas(true)}>
              <Palmtree className="h-4 w-4 mr-1" />Vacaciones masivas
            </Button>
          )}
        </div>

        <Tabs defaultValue="registros">
          <ResponsiveTabsList>
            <TabsTrigger value="registros" className="gap-1.5">
              <Clock className="h-4 w-4" />
              Hoy
            </TabsTrigger>
            <TabsTrigger value="semanal" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Semanal
            </TabsTrigger>
            <TabsTrigger value="quincenal" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Quincenal
            </TabsTrigger>
            <TabsTrigger value="mensual" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Mensual
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="mapeo" className="gap-1.5">
                <Link2 className="h-4 w-4" />
                Mapeo ZKTeco
              </TabsTrigger>
            )}
          </ResponsiveTabsList>
          <TabsContent value="registros">
            <AsistenciaView />
          </TabsContent>
          <TabsContent value="semanal">
            <ReporteSemanal />
          </TabsContent>
          <TabsContent value="quincenal">
            <ReporteQuincenal />
          </TabsContent>
          <TabsContent value="mensual">
            <ReporteAsistenciaMensual />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="mapeo">
              <ZkMappingPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
      <VacacionesMasivasDialog open={showVacMasivas} onClose={() => setShowVacMasivas(false)} />
    </Layout>
  );
}
