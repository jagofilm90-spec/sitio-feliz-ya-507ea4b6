import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useGmailPermisos } from "@/hooks/useGmailPermisos";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Link2,
  Unlink,
  ExternalLink,
  Copy,
  PenSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BandejaEntrada from "@/components/correos/BandejaEntrada";
import GmailPermisosManager from "@/components/correos/GmailPermisosManager";
import GmailFirmasManager from "@/components/correos/GmailFirmasManager";
import { PedidosAcumulativosTab } from "@/components/correos/PedidosAcumulativosTab";
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

const tabTriggerClass = "px-0 py-3 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-crimson-500 data-[state=active]:border-b-2 data-[state=active]:border-crimson-500 rounded-none text-ink-500 font-medium text-sm";

const CorreosCorporativos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectingEmail, setConnectingEmail] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("bandeja");

  const { isAdmin, filterCuentasByPermiso, isLoading: isLoadingPermisos } = useGmailPermisos();

  const { data: cuentas, isLoading: isLoadingCuentas, refetch } = useQuery({
    queryKey: ["gmail-cuentas"],
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

  const isTokenExpired = (cuenta: GmailCuenta) => {
    if (!cuenta.token_expires_at) return true;
    return new Date(cuenta.token_expires_at) < new Date();
  };

  const allConnectedCuentas = cuentas?.filter(
    (c) => isConnected(c) && c.activo
  ) || [];
  
  const connectedCuentas = filterCuentasByPermiso(allConnectedCuentas);

  const handleConnect = async (email: string) => {
    setConnectingEmail(email);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para conectar una cuenta",
          variant: "destructive",
        });
        setConnectingEmail(null);
        return;
      }

      const response = await supabase.functions.invoke("gmail-auth", {
        body: { email },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.authUrl) {
        setAuthUrl(response.data.authUrl);
        setAuthEmail(email);
        setConnectingEmail(null);
      } else {
        throw new Error("No se recibió URL de autorización");
      }
    } catch (error: any) {
      console.error("Error connecting Gmail:", error);
      toast({
        title: "Error al conectar",
        description:
          error.message || "No se pudo iniciar el proceso de autorización",
        variant: "destructive",
      });
      setConnectingEmail(null);
    }
  };

  const handleCopyUrl = () => {
    if (authUrl) {
      navigator.clipboard.writeText(authUrl);
      toast({
        title: "URL copiada",
        description: "Pega la URL en una nueva pestaña del navegador",
      });
    }
  };

  const handleCloseAuthDialog = () => {
    setAuthUrl(null);
    setAuthEmail(null);
    refetch();
  };

  const handleDisconnect = async (cuenta: GmailCuenta) => {
    try {
      const { error } = await supabase
        .from("gmail_cuentas")
        .update({
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
        })
        .eq("id", cuenta.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["gmail-cuentas"] });
      toast({
        title: "Cuenta desconectada",
        description: `Se ha desconectado ${cuenta.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo desconectar la cuenta",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (cuenta: GmailCuenta) => {
    try {
      const { error } = await supabase
        .from("gmail_cuentas")
        .update({ activo: !cuenta.activo })
        .eq("id", cuenta.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["gmail-cuentas"] });
      toast({
        title: cuenta.activo ? "Cuenta desactivada" : "Cuenta activada",
        description: `${cuenta.email} ha sido ${
          cuenta.activo ? "desactivada" : "activada"
        }`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (cuenta: GmailCuenta) => {
    if (!isConnected(cuenta)) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Sin conectar
        </Badge>
      );
    }

    if (isTokenExpired(cuenta)) {
      return (
        <Badge variant="secondary" className="gap-1">
          <RefreshCw className="h-3 w-3" />
          Token expirado
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Conectado
      </Badge>
    );
  };

  const getPropositoBadge = (proposito: string) => {
    return (
      <Badge variant="outline">
        {proposito.charAt(0).toUpperCase() + proposito.slice(1)}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Comunicaciones"
          title="Correos"
          titleAccent="corporativos."
          lead="Gestiona las cuentas de correo integradas al sistema."
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b border-ink-100 rounded-none p-0 h-auto gap-6">
            <TabsTrigger value="bandeja" className={tabTriggerClass}>
              Bandeja de entrada
            </TabsTrigger>
            <TabsTrigger value="acumulativos" className={tabTriggerClass}>
              Pedidos acumulativos
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="cuentas" className={tabTriggerClass}>
                  Cuentas
                </TabsTrigger>
                <TabsTrigger value="permisos" className={tabTriggerClass}>
                  Permisos
                </TabsTrigger>
                <TabsTrigger value="firmas" className={tabTriggerClass}>
                  Firmas
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="bandeja" className="mt-8">
            {isLoadingPermisos || isLoadingCuentas ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlmasaLoading size={48} text="Cargando cuentas de correo..." />
                </CardContent>
              </Card>
            ) : connectedCuentas.length > 0 ? (
              <BandejaEntrada cuentas={connectedCuentas} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <svg width="48" height="48" viewBox="0 0 100 100" className="mb-6 text-ink-300">
                    <path d="M50 10 C25 10, 10 30, 10 50 C10 75, 30 90, 50 90" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M50 20 C30 20, 20 35, 20 50 C20 70, 35 80, 50 80" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                    <path d="M50 30 C35 30, 30 40, 30 50 C30 65, 40 70, 50 70" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                    <circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.4" />
                  </svg>
                  <p className="font-serif text-xl text-ink-700 italic mb-2">
                    Sin cuentas disponibles
                  </p>
                  <p className="text-sm text-ink-400 text-center max-w-sm">
                    {isAdmin
                      ? "Ve a la pestaña \"Cuentas\" para conectar una cuenta de correo."
                      : "Contacta al administrador para que te asigne acceso a las cuentas de correo."}
                  </p>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="mt-6"
                      onClick={() => setActiveTab("cuentas")}
                    >
                      Ir a Cuentas
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="acumulativos" className="mt-8">
            <PedidosAcumulativosTab />
          </TabsContent>

          <TabsContent value="cuentas" className="mt-8">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>

            {isLoadingCuentas ? (
              <div className="flex items-center justify-center py-12">
                <AlmasaLoading size={48} />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {cuentas?.map((cuenta) => (
                  <Card
                    key={cuenta.id}
                    className={!cuenta.activo ? "opacity-60" : ""}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="font-serif text-lg">
                            {cuenta.nombre}
                          </CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {cuenta.email}
                          </CardDescription>
                        </div>
                        {getStatusBadge(cuenta)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-ink-500 font-medium">
                          Propósito
                        </span>
                        {getPropositoBadge(cuenta.proposito)}
                      </div>

                      {cuenta.token_expires_at && isConnected(cuenta) && (
                        <p className="text-xs text-ink-400">
                          Token expira:{" "}
                          {new Date(cuenta.token_expires_at).toLocaleString("es-MX")}
                        </p>
                      )}

                      <div className="flex gap-2 pt-2">
                        {!isConnected(cuenta) || isTokenExpired(cuenta) ? (
                          <Button
                            onClick={() => handleConnect(cuenta.email)}
                            disabled={connectingEmail === cuenta.email}
                            className="flex-1"
                            size="sm"
                          >
                            {connectingEmail === cuenta.email ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Link2 className="h-4 w-4 mr-2" />
                            )}
                            {isTokenExpired(cuenta) ? "Reconectar" : "Conectar"}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleDisconnect(cuenta)}
                            className="flex-1"
                            size="sm"
                          >
                            <Unlink className="h-4 w-4 mr-2" />
                            Desconectar
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(cuenta)}
                          title={
                            cuenta.activo
                              ? "Desactivar cuenta"
                              : "Activar cuenta"
                          }
                        >
                          {cuenta.activo ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-ink-400" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {cuentas?.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Mail className="h-12 w-12 text-ink-300 mb-4" />
                      <p className="text-ink-500">
                        No hay cuentas de correo configuradas
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="permisos" className="mt-8">
              <GmailPermisosManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="firmas" className="mt-8">
              <GmailFirmasManager cuentas={allConnectedCuentas} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Auth URL Dialog */}
      <Dialog
        open={!!authUrl}
        onOpenChange={(open) => !open && handleCloseAuthDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Autorizar {authEmail}</DialogTitle>
            <DialogDescription>
              Haz clic en el botón para abrir Google y autorizar el acceso.
              Después regresa aquí y cierra este diálogo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Button className="w-full" asChild>
              <a
                href={authUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Google para autorizar
              </a>
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  O copia la URL
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleCopyUrl}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar URL
            </Button>
            <p className="text-xs text-ink-400 text-center">
              Después de autorizar en Google, haz clic en "Actualizar" para
              verificar la conexión.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CorreosCorporativos;
