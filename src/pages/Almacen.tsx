import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, RotateCcw } from "lucide-react";
import { RutasCargaPendiente } from "@/components/almacen/RutasCargaPendiente";
import { DevolucionesTab } from "@/components/almacen/DevolucionesTab";

const Almacen = () => {
  const [activeTab, setActiveTab] = useState("cargas");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Panel de Almacén
          </h1>
          <p className="text-muted-foreground">
            Gestión de cargas, inventario y devoluciones
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="cargas" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Cargas del Día
            </TabsTrigger>
            <TabsTrigger value="devoluciones" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Devoluciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cargas" className="space-y-4">
            <RutasCargaPendiente />
          </TabsContent>

          <TabsContent value="devoluciones" className="space-y-4">
            <DevolucionesTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Almacen;
