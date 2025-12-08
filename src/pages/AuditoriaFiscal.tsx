import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, Building2 } from "lucide-react";
import { ClientesFiscalesTab } from "@/components/auditoria/ClientesFiscalesTab";
import { SucursalesFiscalesTab } from "@/components/auditoria/SucursalesFiscalesTab";

const AuditoriaFiscal = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auditoría de Datos Fiscales</h1>
          <p className="text-muted-foreground">
            Revisa y corrige datos fiscales incompletos de clientes y sucursales
          </p>
        </div>

        <Tabs defaultValue="clientes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clientes" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="sucursales" className="gap-2">
              <Building2 className="h-4 w-4" />
              Sucursales con Facturación Propia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes">
            <ClientesFiscalesTab />
          </TabsContent>

          <TabsContent value="sucursales">
            <SucursalesFiscalesTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AuditoriaFiscal;
