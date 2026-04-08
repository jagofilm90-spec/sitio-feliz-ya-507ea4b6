import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveTabsList } from "@/components/ui/responsive-tabs";
import { ZkMappingPanel } from "@/components/asistencia/ZkMappingPanel";
import { AsistenciaView } from "@/components/asistencia/AsistenciaView";
import { ReporteSemanal } from "@/components/asistencia/ReporteSemanal";
import { ReporteQuincenal } from "@/components/asistencia/ReporteQuincenal";
import { ReporteAsistenciaMensual } from "@/components/asistencia/ReporteAsistenciaMensual";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Palmtree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { VacacionesMasivasDialog } from "@/components/asistencia/VacacionesMasivasDialog";
import { PageHeader } from "@/components/layout/PageHeader";

const tabTriggerClass = "px-0 py-3 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-crimson-500 data-[state=active]:border-b-2 data-[state=active]:border-crimson-500 rounded-none text-ink-500 font-medium text-sm";

export default function Asistencia() {
  const { isAdmin } = useUserRoles();
  const [showVacMasivas, setShowVacMasivas] = useState(false);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Recursos Humanos"
          title="Control de"
          titleAccent="asistencia."
          lead="Entradas y salidas registradas en tiempo real."
          actions={
            isAdmin ? (
              <Button variant="outline" size="sm" onClick={() => setShowVacMasivas(true)}>
                <Palmtree className="h-4 w-4 mr-2" />
                Vacaciones masivas
              </Button>
            ) : undefined
          }
        />

        <Tabs defaultValue="registros">
          <TabsList className="bg-transparent border-b border-ink-100 rounded-none p-0 h-auto gap-8 mb-6">
            <TabsTrigger value="registros" className={tabTriggerClass}>
              Hoy
            </TabsTrigger>
            <TabsTrigger value="semanal" className={tabTriggerClass}>
              Semanal
            </TabsTrigger>
            <TabsTrigger value="quincenal" className={tabTriggerClass}>
              Quincenal
            </TabsTrigger>
            <TabsTrigger value="mensual" className={tabTriggerClass}>
              Mensual
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="mapeo" className={tabTriggerClass}>
                Mapeo ZKTeco
              </TabsTrigger>
            )}
          </TabsList>
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
