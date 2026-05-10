// Constructor de XML CFDI 4.0 con Complemento Carta Porte 3.1
// Conforme Anexo 20 SAT y XSD CartaPorte31

export interface CartaPorteData {
  folio: string;
  idCCP: string;
  fecha: string;
  emisor: { rfc: string; nombre: string; regimenFiscal: string; codigoPostal: string };
  receptor: { rfc: string; nombre: string; domicilioFiscal: string; usoCFDI: string };
  mercancias: Array<{
    bienesTransp: string;
    descripcion: string;
    cantidad: number;
    claveUnidad: string;
    pesoEnKg: number;
    materialPeligroso: boolean;
    cveMaterialPeligroso?: string;
  }>;
  ubicaciones: Array<{
    tipo: "Origen" | "Destino";
    rfc: string;
    nombreRemitenteDestinatario?: string;
    domicilio: {
      calle?: string;
      numeroExterior?: string;
      colonia?: string;
      municipio?: string;
      estado: string;
      pais: string;
      codigoPostal: string;
    };
    fechaHoraSalidaLlegada: string;
    distanciaRecorrida?: number;
  }>;
  autotransporte: {
    permSCT: string;
    numPermisoSCT: string;
    configVehicular: string;
    placaVM: string;
    anioModeloVM: number;
    pesoBrutoVehicular: number;
    aseguradoraRC: string;
    polizaRC: string;
  };
  figura: {
    tipoFigura: string;
    rfcFigura: string;
    nombreFigura: string;
    numLicencia?: string;
  };
  totalDistRecorrida?: number;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCFDITrasladoXML(data: CartaPorteData): string {
  const totalPeso = data.mercancias.reduce((s, m) => s + m.pesoEnKg, 0);

  const ubicacionesXML = data.ubicaciones
    .map((u, idx) => {
      const idUbicacion = u.tipo === "Origen"
        ? `OR${String(idx + 1).padStart(6, "0")}`
        : `DE${String(idx + 1).padStart(6, "0")}`;
      return `
      <cartaporte31:Ubicacion
        TipoUbicacion="${u.tipo}"
        IDUbicacion="${idUbicacion}"
        RFCRemitenteDestinatario="${esc(u.rfc)}"
        ${u.nombreRemitenteDestinatario ? `NombreRemitenteDestinatario="${esc(u.nombreRemitenteDestinatario)}"` : ""}
        FechaHoraSalidaLlegada="${u.fechaHoraSalidaLlegada}"
        ${u.distanciaRecorrida ? `DistanciaRecorrida="${u.distanciaRecorrida}"` : ""}>
        <cartaporte31:Domicilio
          ${u.domicilio.calle ? `Calle="${esc(u.domicilio.calle)}"` : ""}
          ${u.domicilio.numeroExterior ? `NumeroExterior="${u.domicilio.numeroExterior}"` : ""}
          ${u.domicilio.colonia ? `Colonia="${u.domicilio.colonia}"` : ""}
          ${u.domicilio.municipio ? `Municipio="${u.domicilio.municipio}"` : ""}
          Estado="${u.domicilio.estado}"
          Pais="${u.domicilio.pais}"
          CodigoPostal="${u.domicilio.codigoPostal}"/>
      </cartaporte31:Ubicacion>`;
    })
    .join("");

  const mercanciasXML = data.mercancias
    .map(
      (m) => `
      <cartaporte31:Mercancia
        BienesTransp="${m.bienesTransp}"
        Descripcion="${esc(m.descripcion)}"
        Cantidad="${m.cantidad}"
        ClaveUnidad="${m.claveUnidad}"
        PesoEnKg="${m.pesoEnKg}"
        MaterialPeligroso="${m.materialPeligroso ? "Sí" : "No"}"
        ${m.materialPeligroso && m.cveMaterialPeligroso ? `CveMaterialPeligroso="${m.cveMaterialPeligroso}"` : ""}/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/CartaPorte31 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte31.xsd"
  Version="4.0"
  Folio="${data.folio}"
  Fecha="${data.fecha}"
  TipoDeComprobante="T"
  Exportacion="01"
  LugarExpedicion="${data.emisor.codigoPostal}"
  SubTotal="0"
  Moneda="XXX"
  Total="0">

  <cfdi:Emisor
    Rfc="${data.emisor.rfc}"
    Nombre="${esc(data.emisor.nombre)}"
    RegimenFiscal="${data.emisor.regimenFiscal}"/>

  <cfdi:Receptor
    Rfc="${data.receptor.rfc}"
    Nombre="${esc(data.receptor.nombre)}"
    DomicilioFiscalReceptor="${data.receptor.domicilioFiscal}"
    RegimenFiscalReceptor="616"
    UsoCFDI="${data.receptor.usoCFDI}"/>

  <cfdi:Conceptos>
    <cfdi:Concepto
      ClaveProdServ="78101802"
      Cantidad="1"
      ClaveUnidad="E48"
      Descripcion="Servicio de traslado de mercancias"
      ValorUnitario="0"
      Importe="0"
      ObjetoImp="01"/>
  </cfdi:Conceptos>

  <cfdi:Complemento>
    <cartaporte31:CartaPorte
      Version="3.1"
      IdCCP="${data.idCCP}"
      TranspInternac="No"
      ${data.totalDistRecorrida ? `TotalDistRec="${data.totalDistRecorrida}"` : ""}>

      <cartaporte31:Ubicaciones>${ubicacionesXML}
      </cartaporte31:Ubicaciones>

      <cartaporte31:Mercancias
        PesoBrutoTotal="${totalPeso}"
        UnidadPeso="KGM"
        NumTotalMercancias="${data.mercancias.length}">${mercanciasXML}

        <cartaporte31:Autotransporte
          PermSCT="${data.autotransporte.permSCT}"
          NumPermisoSCT="${data.autotransporte.numPermisoSCT}">
          <cartaporte31:IdentificacionVehicular
            ConfigVehicular="${data.autotransporte.configVehicular}"
            PlacaVM="${data.autotransporte.placaVM}"
            AnioModeloVM="${data.autotransporte.anioModeloVM}"
            PesoBrutoVehicular="${data.autotransporte.pesoBrutoVehicular}"/>
          <cartaporte31:Seguros
            AseguraRespCivil="${esc(data.autotransporte.aseguradoraRC)}"
            PolizaRespCivil="${data.autotransporte.polizaRC}"/>
        </cartaporte31:Autotransporte>
      </cartaporte31:Mercancias>

      <cartaporte31:FiguraTransporte>
        <cartaporte31:TiposFigura
          TipoFigura="${data.figura.tipoFigura}"
          RFCFigura="${data.figura.rfcFigura}"
          NombreFigura="${esc(data.figura.nombreFigura)}"
          ${data.figura.numLicencia ? `NumLicencia="${data.figura.numLicencia}"` : ""}/>
      </cartaporte31:FiguraTransporte>
    </cartaporte31:CartaPorte>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
}
