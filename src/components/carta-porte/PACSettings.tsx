import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Wifi, Shield, History } from "lucide-react";
import {
  usePACProviders,
  usePACConfig,
  useSavePACConfig,
  useProbarConexionPAC,
  usePACTransacciones,
} from "@/hooks/useCartasPorte";

export default function PACSettings() {
  const { data: providers } = usePACProviders();
  const { data: currentConfig, isLoading } = usePACConfig();
  const saveMutation = useSavePACConfig();
  const probarMutation = useProbarConexionPAC();
  const { data: transacciones } = usePACTransacciones();

  const [form, setForm] = useState({
    pac_provider_id: "facturama",
    modo: "sandbox",
    rfc_emisor: "",
    razon_social_emisor: "",
    regimen_fiscal_emisor: "601",
    username: "",
    password_encrypted: "",
    api_key: "",
  });

  useEffect(() => {
    if (currentConfig) {
      setForm({
        pac_provider_id: currentConfig.pac_provider_id,
        modo: currentConfig.modo,
        rfc_emisor: currentConfig.rfc_emisor,
        razon_social_emisor: currentConfig.razon_social_emisor,
        regimen_fiscal_emisor: currentConfig.regimen_fiscal_emisor,
        username: currentConfig.username || "",
        password_encrypted: "",
        api_key: "",
      });
    }
  }, [currentConfig]);

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  return (
    <Tabs defaultValue="config">
      <TabsList>
        <TabsTrigger value="config" className="text-xs">
          <Shield className="h-3 w-3 mr-1" /> Configuración PAC
        </TabsTrigger>
        <TabsTrigger value="historial" className="text-xs">
          <History className="h-3 w-3 mr-1" /> Historial
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="space-y-4 mt-4">
        {/* Status actual */}
        {currentConfig && (
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  PAC activo: {currentConfig.pac_provider_id} ({currentConfig.modo})
                </span>
              </div>
              {currentConfig.ultimo_test_exitoso !== null && (
                <Badge variant={currentConfig.ultimo_test_exitoso ? "default" : "destructive"} className="text-xs">
                  {currentConfig.ultimo_test_exitoso ? "Conectado" : "Error conexión"}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuración del PAC</CardTitle>
            <CardDescription className="text-xs">
              Arquitectura PAC-agnostic. Cambia de proveedor con 1 clic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Proveedor PAC</Label>
                <Select value={form.pac_provider_id} onValueChange={(v) => setForm({ ...form, pac_provider_id: v })}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} — ${p.precio_promedio_timbre}/timbre
                      </SelectItem>
                    )) || <SelectItem value="facturama">Facturama</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Modo</Label>
                <Select value={form.modo} onValueChange={(v) => setForm({ ...form, modo: v })}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (pruebas)</SelectItem>
                    <SelectItem value="produccion">Producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Datos Fiscales Emisor</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">RFC Emisor</Label>
                  <Input
                    value={form.rfc_emisor}
                    onChange={(e) => setForm({ ...form, rfc_emisor: e.target.value.toUpperCase() })}
                    placeholder="AAL850101XXX"
                    className="h-8 text-sm"
                    maxLength={13}
                  />
                </div>
                <div>
                  <Label className="text-xs">Razón Social</Label>
                  <Input
                    value={form.razon_social_emisor}
                    onChange={(e) => setForm({ ...form, razon_social_emisor: e.target.value })}
                    placeholder="Almacenes y Abastos Alimenticios SA de CV"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Régimen Fiscal</Label>
                  <Select value={form.regimen_fiscal_emisor} onValueChange={(v) => setForm({ ...form, regimen_fiscal_emisor: v })}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="601">601 - General de Ley PM</SelectItem>
                      <SelectItem value="603">603 - Personas Morales sin fines de lucro</SelectItem>
                      <SelectItem value="612">612 - Personas Físicas con Act. Empresariales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Credenciales PAC</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Usuario / API Key</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="usuario@email.com"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Contraseña / API Secret</Label>
                  <Input
                    type="password"
                    value={form.password_encrypted}
                    onChange={(e) => setForm({ ...form, password_encrypted: e.target.value })}
                    placeholder="••••••••"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Facturama sandbox: regístrate gratis en apisandbox.facturama.mx para obtener credenciales de prueba.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
                {saveMutation.isPending ? "Guardando..." : "Guardar Configuración"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => probarMutation.mutate()}
                disabled={probarMutation.isPending || !currentConfig}
              >
                <Wifi className="h-3 w-3 mr-1" />
                {probarMutation.isPending ? "Probando..." : "Probar Conexión"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="historial" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Transacciones PAC</CardTitle>
          </CardHeader>
          <CardContent>
            {transacciones?.length ? (
              <div className="space-y-2">
                {transacciones.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between border-b pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      {t.exitoso ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span className="font-medium">{t.tipo_operacion}</span>
                      <span className="text-muted-foreground">{t.pac_provider_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t.duracion_ms}ms</span>
                      <span className="text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("es-MX")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay transacciones registradas aún.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
