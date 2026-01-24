import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, CreditCard, Save, Loader2, Phone, Mail } from "lucide-react";
import { COMPANY_DATA } from "@/constants/companyData";

interface DatosEmpresa {
  razon_social: string;
  rfc: string;
  regimen_fiscal: string;
  regimen_fiscal_descripcion: string;
  direccion: {
    calle: string;
    numero_exterior: string;
    colonia: string;
    municipio: string;
    codigo_postal: string;
    ciudad: string;
    estado: string;
  };
  telefonos: {
    principal: string;
    secundario: string;
    alterno1: string;
    alterno2: string;
  };
  emails: {
    compras: string;
    ventas: string;
    pedidos: string;
    contacto: string;
    pagos: string;
  };
  datos_bancarios: {
    banco: string;
    plaza: string;
    sucursal: string;
    cuenta: string;
    clabe: string;
    beneficiario: string;
  };
}

const defaultDatosEmpresa: DatosEmpresa = {
  razon_social: COMPANY_DATA.razonSocial,
  rfc: COMPANY_DATA.rfc,
  regimen_fiscal: COMPANY_DATA.regimenFiscal,
  regimen_fiscal_descripcion: COMPANY_DATA.regimenFiscalDescripcion,
  direccion: {
    calle: COMPANY_DATA.direccion.calle,
    numero_exterior: COMPANY_DATA.direccion.numeroExterior,
    colonia: COMPANY_DATA.direccion.colonia,
    municipio: COMPANY_DATA.direccion.municipio,
    codigo_postal: COMPANY_DATA.direccion.codigoPostal,
    ciudad: COMPANY_DATA.direccion.ciudad,
    estado: COMPANY_DATA.direccion.estado,
  },
  telefonos: {
    principal: COMPANY_DATA.telefonos.principal,
    secundario: COMPANY_DATA.telefonos.secundario,
    alterno1: COMPANY_DATA.telefonos.alterno1,
    alterno2: COMPANY_DATA.telefonos.alterno2,
  },
  emails: {
    compras: COMPANY_DATA.emails.compras,
    ventas: COMPANY_DATA.emails.ventas,
    pedidos: COMPANY_DATA.emails.pedidos,
    contacto: COMPANY_DATA.emails.contacto,
    pagos: COMPANY_DATA.emails.pagos,
  },
  datos_bancarios: {
    banco: COMPANY_DATA.datosBancarios.banco,
    plaza: COMPANY_DATA.datosBancarios.plaza,
    sucursal: COMPANY_DATA.datosBancarios.sucursal,
    cuenta: COMPANY_DATA.datosBancarios.cuenta,
    clabe: COMPANY_DATA.datosBancarios.clabe,
    beneficiario: COMPANY_DATA.datosBancarios.beneficiario,
  },
};

export function ConfigEmpresaTab() {
  const [datos, setDatos] = useState<DatosEmpresa>(defaultDatosEmpresa);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDatosEmpresa();
  }, []);

  const loadDatosEmpresa = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion_empresa")
        .select("valor")
        .eq("clave", "datos_empresa")
        .maybeSingle();

      if (error) throw error;

      if (data?.valor) {
        // Merge with defaults to ensure all fields exist
        const stored = data.valor as unknown as DatosEmpresa;
        setDatos({
          ...defaultDatosEmpresa,
          ...stored,
          direccion: { ...defaultDatosEmpresa.direccion, ...stored.direccion },
          telefonos: { ...defaultDatosEmpresa.telefonos, ...stored.telefonos },
          emails: { ...defaultDatosEmpresa.emails, ...stored.emails },
          datos_bancarios: { ...defaultDatosEmpresa.datos_bancarios, ...stored.datos_bancarios },
        });
      }
    } catch (error) {
      console.error("Error loading company data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de la empresa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if exists first
      const { data: existing } = await supabase
        .from("configuracion_empresa")
        .select("id")
        .eq("clave", "datos_empresa")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("configuracion_empresa")
          .update({
            valor: datos as unknown as Json,
          })
          .eq("clave", "datos_empresa");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("configuracion_empresa")
          .insert({
            clave: "datos_empresa",
            valor: datos as unknown as Json,
          });
        if (error) throw error;
      }

      toast({
        title: "Guardado",
        description: "Los datos de la empresa se actualizaron correctamente",
      });
    } catch (error) {
      console.error("Error saving company data:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path: string, value: string) => {
    setDatos((prev) => {
      const parts = path.split(".");
      const newData = { ...prev };
      
      if (parts.length === 1) {
        (newData as any)[parts[0]] = value;
      } else if (parts.length === 2) {
        (newData as any)[parts[0]] = {
          ...(newData as any)[parts[0]],
          [parts[1]]: value,
        };
      }
      
      return newData;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Datos de la Empresa
          </h2>
          <p className="text-sm text-muted-foreground">
            Información fiscal que aparece en documentos oficiales
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      <Separator />

      {/* Fiscal Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos Fiscales</CardTitle>
          <CardDescription>RFC, razón social y régimen fiscal</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Razón Social</Label>
            <Input
              value={datos.razon_social}
              onChange={(e) => updateField("razon_social", e.target.value)}
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label>RFC</Label>
            <Input
              value={datos.rfc}
              onChange={(e) => updateField("rfc", e.target.value.toUpperCase())}
              maxLength={13}
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label>Régimen Fiscal (Código SAT)</Label>
            <Input
              value={datos.regimen_fiscal}
              onChange={(e) => updateField("regimen_fiscal", e.target.value)}
              maxLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción del Régimen</Label>
            <Input
              value={datos.regimen_fiscal_descripcion}
              onChange={(e) => updateField("regimen_fiscal_descripcion", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dirección Fiscal</CardTitle>
          <CardDescription>Domicilio según Constancia de Situación Fiscal</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Calle</Label>
            <Input
              value={datos.direccion.calle}
              onChange={(e) => updateField("direccion.calle", e.target.value)}
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label>Número Exterior</Label>
            <Input
              value={datos.direccion.numero_exterior}
              onChange={(e) => updateField("direccion.numero_exterior", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Colonia</Label>
            <Input
              value={datos.direccion.colonia}
              onChange={(e) => updateField("direccion.colonia", e.target.value)}
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label>Municipio/Alcaldía</Label>
            <Input
              value={datos.direccion.municipio}
              onChange={(e) => updateField("direccion.municipio", e.target.value)}
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label>Código Postal</Label>
            <Input
              value={datos.direccion.codigo_postal}
              onChange={(e) => updateField("direccion.codigo_postal", e.target.value)}
              maxLength={5}
            />
          </div>
          <div className="space-y-2">
            <Label>Ciudad</Label>
            <Input
              value={datos.direccion.ciudad}
              onChange={(e) => updateField("direccion.ciudad", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Estado</Label>
            <Input
              value={datos.direccion.estado}
              onChange={(e) => updateField("direccion.estado", e.target.value)}
              className="uppercase"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Teléfonos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Principal</Label>
            <Input
              value={datos.telefonos.principal}
              onChange={(e) => updateField("telefonos.principal", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Secundario</Label>
            <Input
              value={datos.telefonos.secundario}
              onChange={(e) => updateField("telefonos.secundario", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Alterno 1</Label>
            <Input
              value={datos.telefonos.alterno1}
              onChange={(e) => updateField("telefonos.alterno1", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Alterno 2</Label>
            <Input
              value={datos.telefonos.alterno2}
              onChange={(e) => updateField("telefonos.alterno2", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Correos Corporativos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Compras</Label>
            <Input
              type="email"
              value={datos.emails.compras}
              onChange={(e) => updateField("emails.compras", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ventas</Label>
            <Input
              type="email"
              value={datos.emails.ventas}
              onChange={(e) => updateField("emails.ventas", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Pedidos</Label>
            <Input
              type="email"
              value={datos.emails.pedidos}
              onChange={(e) => updateField("emails.pedidos", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Contacto</Label>
            <Input
              type="email"
              value={datos.emails.contacto}
              onChange={(e) => updateField("emails.contacto", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Pagos</Label>
            <Input
              type="email"
              value={datos.emails.pagos}
              onChange={(e) => updateField("emails.pagos", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Banking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Datos Bancarios
          </CardTitle>
          <CardDescription>Información para depósitos y transferencias</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Input
              value={datos.datos_bancarios.banco}
              onChange={(e) => updateField("datos_bancarios.banco", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Plaza</Label>
            <Input
              value={datos.datos_bancarios.plaza}
              onChange={(e) => updateField("datos_bancarios.plaza", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Input
              value={datos.datos_bancarios.sucursal}
              onChange={(e) => updateField("datos_bancarios.sucursal", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Cuenta</Label>
            <Input
              value={datos.datos_bancarios.cuenta}
              onChange={(e) => updateField("datos_bancarios.cuenta", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>CLABE</Label>
            <Input
              value={datos.datos_bancarios.clabe}
              onChange={(e) => updateField("datos_bancarios.clabe", e.target.value)}
              maxLength={18}
            />
          </div>
          <div className="space-y-2">
            <Label>Beneficiario</Label>
            <Input
              value={datos.datos_bancarios.beneficiario}
              onChange={(e) => updateField("datos_bancarios.beneficiario", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
