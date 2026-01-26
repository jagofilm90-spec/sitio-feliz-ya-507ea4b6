import Layout from "@/components/Layout";
import { useUserRoles } from "@/hooks/useUserRoles";
import { AdminListaPreciosTab } from "@/components/admin/AdminListaPreciosTab";
import { SecretariaListaPreciosTab } from "@/components/secretaria/SecretariaListaPreciosTab";
import { VendedorListaPreciosTab } from "@/components/vendedor/VendedorListaPreciosTab";
import { Skeleton } from "@/components/ui/skeleton";

const Precios = () => {
  const { isAdmin, isSecretaria, isLoading } = useUserRoles();

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  // Admin: Vista completa con análisis de márgenes
  // Secretaria: Vista editable sin análisis profundo
  // Vendedor: Vista solo lectura
  return (
    <Layout>
      <div className="p-6">
        {isAdmin ? (
          <AdminListaPreciosTab />
        ) : isSecretaria ? (
          <SecretariaListaPreciosTab />
        ) : (
          <VendedorListaPreciosTab />
        )}
      </div>
    </Layout>
  );
};

export default Precios;
