import Layout from "@/components/Layout";
import { useUserRoles } from "@/hooks/useUserRoles";
import { SecretariaListaPreciosTab } from "@/components/secretaria/SecretariaListaPreciosTab";
import { VendedorListaPreciosTab } from "@/components/vendedor/VendedorListaPreciosTab";
import { Skeleton } from "@/components/ui/skeleton";

const Precios = () => {
  const { isAdmin, isSecretaria, isLoading } = useUserRoles();
  
  // Admin/Secretaria ven la versión editable
  // Vendedor ve la versión de solo lectura
  const puedeEditar = isAdmin || isSecretaria;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {puedeEditar ? (
          <SecretariaListaPreciosTab />
        ) : (
          <VendedorListaPreciosTab />
        )}
      </div>
    </Layout>
  );
};

export default Precios;
