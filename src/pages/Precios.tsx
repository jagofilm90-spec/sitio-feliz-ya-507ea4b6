import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useUserRoles } from "@/hooks/useUserRoles";
import { AdminListaPreciosTab } from "@/components/admin/AdminListaPreciosTab";
import { SecretariaListaPreciosTab } from "@/components/secretaria/SecretariaListaPreciosTab";
import { VendedorListaPreciosTab } from "@/components/vendedor/VendedorListaPreciosTab";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";

const Precios = () => {
  const { isAdmin, isSecretaria, isLoading } = useUserRoles();

  if (isLoading) {
    return (
      <Layout>
        <div className="py-12">
          <AlmasaLoading size={48} text="Cargando lista de precios..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Catálogo"
          title="Lista de"
          titleAccent="precios."
          lead="Precios vigentes por producto y presentación."
        />
        <div className="h-full">
          {isAdmin ? (
            <AdminListaPreciosTab />
          ) : isSecretaria ? (
            <SecretariaListaPreciosTab />
          ) : (
            <VendedorListaPreciosTab />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Precios;
