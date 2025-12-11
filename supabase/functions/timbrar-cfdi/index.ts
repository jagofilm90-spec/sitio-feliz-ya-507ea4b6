import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { factura_id } = await req.json();
    
    if (!factura_id) {
      throw new Error('factura_id es requerido');
    }

    console.log('Iniciando timbrado CFDI para factura:', factura_id);

    // Configuración de Facturama
    const apiUser = Deno.env.get('FACTURAMA_API_USER');
    const apiPassword = Deno.env.get('FACTURAMA_API_PASSWORD');
    const apiUrl = Deno.env.get('FACTURAMA_API_URL') || 'https://api.facturama.mx';
    
    if (!apiUser || !apiPassword) {
      throw new Error('Credenciales de Facturama no configuradas');
    }

    // Conectar a Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener datos de la factura con pedido y cliente
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select(`
        *,
        clientes (
          id, nombre, rfc, razon_social, direccion, codigo_postal,
          nombre_colonia, nombre_municipio, nombre_entidad_federativa,
          email, telefono, regimen_capital
        ),
        pedidos (
          id, folio, sucursal_id,
          pedidos_detalles (
            id, cantidad, precio_unitario, subtotal,
            productos (
              id, codigo, nombre, descripcion, unidad_comercial,
              aplica_iva, aplica_ieps, clave_sat, unidad_sat
            )
          )
        )
      `)
      .eq('id', factura_id)
      .single();

    if (facturaError || !factura) {
      console.error('Error obteniendo factura:', facturaError);
      throw new Error('Factura no encontrada');
    }

    console.log('Factura obtenida:', factura.folio);

    // Constantes para Público en General
    const RFC_PUBLICO_GENERAL = 'XAXX010101000';
    const esVentaMostrador = factura.clientes?.rfc === RFC_PUBLICO_GENERAL;

    // Obtener datos del emisor primero (necesitamos el CP para público en general)
    const { data: emisorConfig } = await supabase
      .from('configuracion_empresa')
      .select('valor')
      .eq('clave', 'datos_fiscales_emisor')
      .single();

    if (!emisorConfig?.valor) {
      throw new Error('Datos fiscales del emisor no configurados');
    }

    const emisor = emisorConfig.valor as {
      rfc: string;
      razon_social: string;
      regimen_fiscal: string;
      codigo_postal: string;
      lugar_expedicion: string;
    };

    // Si la factura tiene sucursal, verificar si tiene datos fiscales propios
    let receptorData = {
      rfc: factura.clientes?.rfc,
      razon_social: factura.clientes?.razon_social || factura.clientes?.nombre,
      codigo_postal: factura.clientes?.codigo_postal,
      regimen_fiscal: factura.clientes?.regimen_capital || '601',
      email: factura.clientes?.email
    };

    // Para venta de mostrador: usar régimen 616 y CP del emisor
    if (esVentaMostrador) {
      receptorData = {
        rfc: RFC_PUBLICO_GENERAL,
        razon_social: 'PUBLICO EN GENERAL',
        codigo_postal: emisor.codigo_postal, // Usar CP del emisor para público general
        regimen_fiscal: '616', // Sin obligaciones fiscales
        email: null
      };
      console.log('Factura de venta de mostrador detectada');
    } else if (factura.pedidos?.sucursal_id) {
      const { data: sucursal } = await supabase
        .from('cliente_sucursales')
        .select('rfc, razon_social, direccion_fiscal, email_facturacion')
        .eq('id', factura.pedidos.sucursal_id)
        .single();
      
      if (sucursal?.rfc) {
        receptorData = {
          rfc: sucursal.rfc,
          razon_social: sucursal.razon_social || receptorData.razon_social,
          codigo_postal: receptorData.codigo_postal,
          regimen_fiscal: receptorData.regimen_fiscal,
          email: sucursal.email_facturacion || receptorData.email
        };
      }
    }

    // Validar datos del receptor
    if (!receptorData.rfc) {
      throw new Error('El cliente no tiene RFC configurado');
    }

    console.log('Emisor:', emisor.rfc, 'Receptor:', receptorData.rfc);

    // Construir items del CFDI
    const items = factura.pedidos?.pedidos_detalles?.map((detalle: any) => {
      const producto = detalle.productos;
      const precioUnitario = Number(detalle.precio_unitario);
      const cantidad = Number(detalle.cantidad);
      
      // Calcular base e impuestos
      let tasaIva = producto.aplica_iva ? 0.16 : 0;
      let tasaIeps = producto.aplica_ieps ? 0.08 : 0;
      
      // Precio incluye impuestos, debemos extraer la base
      const divisor = 1 + tasaIva + tasaIeps;
      const precioBase = precioUnitario / divisor;
      const subtotalItem = precioBase * cantidad;
      
      const item: any = {
        ProductCode: producto.clave_sat || '50181900', // Semillas y granos comestibles
        IdentificationNumber: producto.codigo,
        Description: producto.nombre,
        Unit: producto.unidad_sat || 'XBX', // Caja
        UnitCode: producto.unidad_sat || 'XBX',
        UnitPrice: precioBase.toFixed(6),
        Quantity: cantidad.toFixed(6),
        Subtotal: subtotalItem.toFixed(2),
        Taxes: []
      };

      let totalImpuestos = 0;

      if (tasaIva > 0) {
        const ivaAmount = subtotalItem * tasaIva;
        totalImpuestos += ivaAmount;
        item.Taxes.push({
          Total: ivaAmount.toFixed(2),
          Name: 'IVA',
          Base: subtotalItem.toFixed(2),
          Rate: (tasaIva * 100).toFixed(2),
          IsRetention: false
        });
      }

      if (tasaIeps > 0) {
        const iepsAmount = subtotalItem * tasaIeps;
        totalImpuestos += iepsAmount;
        item.Taxes.push({
          Total: iepsAmount.toFixed(2),
          Name: 'IEPS',
          Base: subtotalItem.toFixed(2),
          Rate: (tasaIeps * 100).toFixed(2),
          IsRetention: false
        });
      }

      item.Total = (subtotalItem + totalImpuestos).toFixed(2);

      return item;
    }) || [];

    if (items.length === 0) {
      throw new Error('La factura no tiene productos');
    }

    // Construir payload CFDI 4.0
    const cfdiPayload = {
      Issuer: {
        FiscalRegime: emisor.regimen_fiscal,
        Rfc: emisor.rfc,
        Name: emisor.razon_social
      },
      Receiver: {
        Rfc: receptorData.rfc,
        Name: receptorData.razon_social,
        CfdiUse: factura.uso_cfdi || 'G03',
        FiscalRegime: receptorData.regimen_fiscal,
        TaxZipCode: receptorData.codigo_postal || emisor.codigo_postal
      },
      CfdiType: 'I', // Ingreso
      NameId: '1', // Factura
      ExpeditionPlace: emisor.lugar_expedicion,
      PaymentForm: factura.forma_pago || '99', // Por definir
      PaymentMethod: factura.metodo_pago || 'PUE', // Pago en una sola exhibición
      Currency: 'MXN',
      Items: items
    };

    console.log('Enviando CFDI a Facturama:', JSON.stringify(cfdiPayload, null, 2));

    // Llamar API de Facturama para timbrar
    const auth = btoa(`${apiUser}:${apiPassword}`);
    const response = await fetch(`${apiUrl}/3/cfdis`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cfdiPayload)
    });

    const responseText = await response.text();
    console.log('Respuesta Facturama:', response.status, responseText);

    if (!response.ok) {
      let errorMessage = 'Error al timbrar CFDI';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.Message || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMessage = responseText;
      }
      
      // Guardar error en la factura
      await supabase
        .from('facturas')
        .update({ 
          cfdi_estado: 'error',
          cfdi_error: errorMessage 
        })
        .eq('id', factura_id);

      throw new Error(errorMessage);
    }

    const cfdiResult = JSON.parse(responseText);
    console.log('CFDI timbrado exitosamente:', cfdiResult.Id);

    // Actualizar factura con datos del CFDI
    const { error: updateError } = await supabase
      .from('facturas')
      .update({
        cfdi_uuid: cfdiResult.Complement?.TaxStamp?.Uuid || cfdiResult.Id,
        cfdi_fecha_timbrado: new Date().toISOString(),
        cfdi_estado: 'timbrada',
        cfdi_xml_url: cfdiResult.Id, // ID para descargar XML/PDF
        cfdi_pdf_url: cfdiResult.Id,
        cfdi_error: null
      })
      .eq('id', factura_id);

    if (updateError) {
      console.error('Error actualizando factura:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      uuid: cfdiResult.Complement?.TaxStamp?.Uuid || cfdiResult.Id,
      facturama_id: cfdiResult.Id,
      message: 'CFDI timbrado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en timbrar-cfdi:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
