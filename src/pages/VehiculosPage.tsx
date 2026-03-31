import Layout from "@/components/Layout";
import VehiculosTab from "@/components/rutas/VehiculosTab";

const VehiculosPage = () => (
  <Layout>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vehículos</h1>
      <VehiculosTab />
    </div>
  </Layout>
);

export default VehiculosPage;
