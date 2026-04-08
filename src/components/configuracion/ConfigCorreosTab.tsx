import { useState } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Users, FileSignature } from "lucide-react";

// Reuse existing components
import GmailPermisosManager from "@/components/correos/GmailPermisosManager";
import GmailFirmasManager from "@/components/correos/GmailFirmasManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface GmailCuenta {
  id: string;
  email: string;
  nombre: string;
  proposito: string | null;
  activo: boolean;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
}

export function ConfigCorreosTab() {
  const [activeTab, setActiveTab] = useState("cuentas");

  const { data: cuentas = [], isLoading, refetch } = useQuery({
    queryKey: ["gmail-cuentas-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gmail_cuentas")
        .select("*")
        .order("nombre");
      
      if (error) throw error;
      return data as GmailCuenta[];
    }});

  const handleConnect = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("gmail-auth", {
        body: { email }});

      if (error) throw error;
      if (data?.authUrl) {
        window.open(data.authUrl, "_blank", "width=500,height=600");
      }
    } catch (error) {
      console.error("Error connecting:", error);
      toast.error("Error al conectar cuenta");
    }
  };

  const handleDisconnect = async (cuenta: GmailCuenta) => {
    try {
      const { error } = await supabase
        .from("gmail_cuentas")
        .update({
          access_token: null,
          refresh_token: null,
          token_expires_at: null})
        .eq("id", cuenta.id);

      if (error) throw error;
      toast.success("Cuenta desconectada");
      refetch();
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Error al desconectar");
    }
  };

  const toggleActive = async (cuenta: GmailCuenta) => {
    try {
      const { error } = await supabase
        .from("gmail_cuentas")
        .update({ activo: !cuenta.activo })
        .eq("id", cuenta.id);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error("Error toggling:", error);
      toast.error("Error al cambiar estado");
    }
  };

  const getStatusBadge = (cuenta: GmailCuenta) => {
    if (!cuenta.access_token) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <XCircle className="h-3 w-3 mr-1" />
          Sin conectar
        </Badge>
      );
    }

    const tokenExpired = cuenta.token_expires_at && new Date(cuenta.token_expires_at) < new Date();
    if (tokenExpired) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Token expirado
        </Badge>
      );
    }

    return (
      <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Conectado
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Correos Corporativos
        </h2>
        <p className="text-sm text-muted-foreground">
          Gestiona las cuentas Gmail integradas al ERP
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cuentas" className="gap-2">
            <Mail className="h-4 w-4" />
            Cuentas
          </TabsTrigger>
          <TabsTrigger value="permisos" className="gap-2">
            <Users className="h-4 w-4" />
            Permisos
          </TabsTrigger>
          <TabsTrigger value="firmas" className="gap-2">
            <FileSignature className="h-4 w-4" />
            Firmas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cuentas" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {isLoading ? (
            <AlmasaLoading size={48} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {cuentas.map((cuenta) => (
                <Card key={cuenta.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{cuenta.nombre}</CardTitle>
                      {getStatusBadge(cuenta)}
                    </div>
                    <CardDescription>{cuenta.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cuenta.activo}
                          onCheckedChange={() => toggleActive(cuenta)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {cuenta.activo ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {cuenta.access_token ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(cuenta)}
                          >
                            Desconectar
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleConnect(cuenta.email)}
                          >
                            Conectar
                          </Button>
                        )}
                      </div>
                    </div>
                    {cuenta.proposito && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {cuenta.proposito}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="permisos" className="mt-4">
          <GmailPermisosManager />
        </TabsContent>

        <TabsContent value="firmas" className="mt-4">
          <GmailFirmasManager cuentas={cuentas} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
