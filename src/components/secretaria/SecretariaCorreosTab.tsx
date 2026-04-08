import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";
import BandejaEntrada from "@/components/correos/BandejaEntrada";
import { useGmailPermisos } from "@/hooks/useGmailPermisos";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";

interface GmailCuenta {
  id: string;
  email: string;
  nombre: string;
  proposito: string;
  activo: boolean;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
}

export const SecretariaCorreosTab = () => {
  const { filterCuentasByPermiso, isLoading: isLoadingPermisos } = useGmailPermisos();

  // Fetch Gmail accounts
  const { data: cuentas, isLoading: isLoadingCuentas } = useQuery({
    queryKey: ["secretaria-gmail-cuentas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gmail_cuentas")
        .select("*")
        .order("nombre");

      if (error) throw error;
      return data as GmailCuenta[];
    },
  });

  const isConnected = (cuenta: GmailCuenta) => {
    return !!(cuenta.access_token && cuenta.refresh_token);
  };

  const allConnectedCuentas = cuentas?.filter((c) => isConnected(c) && c.activo) || [];
  const connectedCuentas = filterCuentasByPermiso(allConnectedCuentas);

  const isLoading = isLoadingPermisos || isLoadingCuentas;

  if (isLoading) {
    return <AlmasaLoading size={48} text="Cargando correos..." />;
  }

  if (connectedCuentas.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-pink-600" />
            Correos Corporativos
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestión de correos corporativos
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay cuentas de correo disponibles</p>
            <p className="text-muted-foreground text-center mt-2">
              Contacta al administrador para configurar el acceso a correos corporativos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5 text-pink-600" />
          Correos Corporativos
        </h2>
        <p className="text-sm text-muted-foreground">
          {connectedCuentas.length} cuenta{connectedCuentas.length > 1 ? "s" : ""} disponible
          {connectedCuentas.length > 1 ? "s" : ""}
        </p>
      </div>

      <BandejaEntrada cuentas={connectedCuentas} />
    </div>
  );
};
