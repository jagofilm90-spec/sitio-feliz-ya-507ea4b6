/**
 * Generador de Contratos Laborales y Aviso de Privacidad en PDF — ALMASA
 * Usa jsPDF con el texto legal COMPLETO del contrato del abogado (19 cláusulas).
 */
import jsPDF from "jspdf";

// ═══ HELPERS ═══

async function loadLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch("/logo-almasa-header.png");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function addLogo(pdf: jsPDF, logoBase64: string | null, pageW: number): number {
  if (!logoBase64) return 20;
  try {
    pdf.addImage(logoBase64, "PNG", (pageW - 50) / 2, 10, 50, 15);
    return 30;
  } catch { return 20; }
}

const fmt$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

function numberToWords(n: number): string {
  const units = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const teens = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const tens = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const hundreds = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  const num = Math.floor(n);
  const cents = Math.round((n - num) * 100);
  if (num === 0) return `CERO PESOS ${cents.toString().padStart(2, "0")}/100`;
  if (num === 100) return `CIEN PESOS ${cents.toString().padStart(2, "0")}/100`;
  const toWords = (x: number): string => {
    if (x === 0) return "";
    if (x === 100) return "CIEN";
    if (x >= 1000) { const m = Math.floor(x / 1000); const r = x % 1000; return (m === 1 ? "MIL" : `${toWords(m)} MIL`) + (r > 0 ? ` ${toWords(r)}` : ""); }
    if (x >= 100) { const r = x % 100; return hundreds[Math.floor(x / 100)] + (r > 0 ? ` ${toWords(r)}` : ""); }
    if (x >= 20) { const u = x % 10; return tens[Math.floor(x / 10)] + (u > 0 ? ` Y ${units[u]}` : ""); }
    if (x >= 10) return teens[x - 10];
    return units[x];
  };
  return `${toWords(num)} PESOS ${cents.toString().padStart(2, "0")}/100 M.N.`;
}

function formatFechaLarga(fecha: string): string {
  // Parse YYYY-MM-DD explicitly to avoid timezone issues
  const [y, m, d] = fecha.split("-").map(Number);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

// ═══ INTERFACES ═══

interface DatosContrato {
  empleado: {
    nombre_completo: string;
    rfc: string;
    curp: string;
    puesto: string;
    sueldo_bruto: number;
    premio_asistencia: number | null;
    beneficiario: string;
    fecha_ingreso: string;
    fecha_contrato: string;
    direccion: string | null;
  };
  empresa: {
    representante_legal: string;
    razon_social: string;
    rfc: string;
    domicilio: string;
  };
  firmas?: {
    empleado: string; // base64 PNG
    admin: string;    // base64 PNG
  };
}

// ═══ ANEXOS POR PUESTO ═══

const ANEXOS: Record<string, string> = {
  "Ayudante de Chofer": `Objeto del puesto:
El trabajador será responsable de apoyar al chofer en la carga, traslado, entrega y descarga de mercancía, así como en el manejo físico de los productos durante la ruta, asegurando que las entregas se realicen de manera correcta, completa y en buen estado.

Funciones y responsabilidades:

I. Apoyar en la carga de mercancía en el almacén conforme a las instrucciones y documentos de salida (notas, remisiones o pedidos), verificando cantidades y condiciones del producto.

II. Acomodar la mercancía dentro de la unidad de reparto, asegurando su correcta distribución para evitar daños durante el traslado.

III. Acompañar al chofer durante la ruta de entrega, colaborando en la localización de clientes y optimización de las entregas.

IV. Descargar y entregar la mercancía en el domicilio del cliente, cuidando su integridad y respetando las indicaciones del mismo.

V. Verificar junto con el chofer que la mercancía entregada coincida con los documentos correspondientes.

VI. Apoyar en la obtención de firmas de conformidad por parte del cliente en las notas o remisiones.

VII. Manejar adecuadamente devoluciones, retornando la mercancía al almacén y reportando cualquier incidencia.

VIII. Cuidar la mercancía durante todo el proceso de carga, traslado y descarga, evitando pérdidas, daños o mal manejo.

IX. Mantener una conducta respetuosa y profesional con clientes, compañeros de trabajo y superiores.

X. Apoyar en la descarga de mercancía en el almacén al finalizar la ruta, incluyendo devoluciones o sobrantes.

XI. Reportar cualquier anomalía detectada durante la ruta, incluyendo faltantes, errores en pedidos, daños o incidencias con clientes.

RESPONSABILIDAD DEL PUESTO

El ayudante de chofer será corresponsable junto con el chofer de la mercancía transportada durante la ruta, incluyendo su carga, manejo y entrega.

Cualquier pérdida, daño o diferencia derivada de negligencia, mal manejo o falta de verificación podrá generar responsabilidad conforme a las políticas internas de la empresa.

El ayudante de chofer deberá trabajar en coordinación directa con:
- Chofer repartidor
- Personal de almacén
- Área administrativa

Para asegurar una entrega eficiente, ordenada y sin errores.

CLÁUSULA ADICIONAL

El trabajador se obliga a cumplir con las funciones descritas y aquellas adicionales que le sean asignadas, siempre que sean acordes a la naturaleza de su puesto y necesarias para la operación de la empresa.

CLÁUSULA DE RESPONSABILIDAD POR MERCANCÍA EN RUTA Y FIRMA DE CARGA

El trabajador reconoce que, al momento de iniciar la ruta, la mercancía cargada en la unidad de reparto ha sido previamente verificada en cantidad, presentación y condiciones físicas, conforme a los documentos correspondientes (notas, remisiones o pedidos).

En consecuencia:

I. Verificación de carga
El chofer y el ayudante de chofer (machetero) deberán verificar conjuntamente, antes de la salida de la unidad, que la mercancía cargada coincida con la documentación correspondiente.
La salida de la unidad implicará la aceptación expresa de conformidad sobre la mercancía cargada.

II. Responsabilidad durante la ruta
A partir de la salida de la unidad, el chofer y su ayudante serán corresponsables del resguardo, manejo y entrega de la mercancía, obligándose a:
- Cuidar la integridad de los productos
- Evitar pérdidas, daños o extravíos
- Realizar entregas completas conforme a los documentos

III. Entrega y documentación
El trabajador deberá asegurarse de que toda entrega cuente con firma de conformidad por parte del cliente en la documentación correspondiente.
En caso de faltantes, devoluciones o incidencias, estas deberán anotarse claramente en la documentación y reportarse de inmediato a la empresa.

IV. Faltantes y diferencias
Cualquier diferencia en la mercancía (faltantes, extravíos o daños) detectada al finalizar la ruta, que no se encuentre debidamente justificada o documentada, podrá ser atribuida a responsabilidad del chofer y/o ayudante de chofer.
La empresa podrá aplicar las medidas correspondientes conforme a la legislación laboral vigente y a las políticas internas.

V. Firma de salida
El trabajador se obliga a firmar los documentos de carga o salida de mercancía cuando así le sea requerido, reconociendo con ello la recepción conforme de la mercancía para su traslado.`,

  "Chofer": `Objeto del puesto:
El trabajador será responsable del traslado, resguardo y entrega de la mercancía, así como del correcto manejo de la documentación y, en su caso, de la cobranza, garantizando un servicio eficiente y seguro.

Funciones y responsabilidades:

I. Conducir la unidad asignada de manera responsable, cumpliendo con las normas de tránsito y políticas de la empresa.

II. Verificar, antes de salir, que la mercancía cargada coincida con los documentos de salida (notas, remisiones o pedidos).

III. Supervisar la correcta carga de la unidad, asegurando una adecuada distribución del peso y orden de entrega.

IV. Transportar la mercancía conforme a la ruta asignada, optimizando tiempos y garantizando la seguridad de la carga.

V. Entregar los pedidos al cliente, verificando cantidades y condiciones del producto.

VI. Obtener firma de conformidad del cliente en los documentos correspondientes por cada entrega realizada.

VII. Realizar la cobranza cuando así se le indique, resguardando el dinero y entregándolo a la empresa conforme a los procedimientos establecidos.

VIII. Custodiar y entregar en tiempo y forma toda la documentación de la ruta (notas, remisiones, comprobantes de pago, etc.).

IX. Reportar de inmediato cualquier incidencia durante la ruta, incluyendo rechazos, devoluciones, faltantes, daños o retrasos.

X. Verificar el estado general de la unidad antes, durante y después de la ruta (niveles, llantas, combustible), reportando cualquier falla.

XI. Apoyar en la descarga de devoluciones o mercancía sobrante al regresar al almacén.

XII. Mantener una conducta respetuosa y profesional con clientes, compañeros y superiores.

RESPONSABILIDAD DEL PUESTO

El chofer será responsable directo del resguardo de la mercancía durante su traslado, así como del uso adecuado de la unidad asignada.

Cualquier daño, pérdida o diferencia derivada de negligencia, mal manejo o incumplimiento de sus funciones podrá generar responsabilidad conforme a las políticas internas de la empresa.

CLÁUSULA DE RESPONSABILIDAD POR MERCANCÍA EN RUTA Y FIRMA DE CARGA (CHOFER)

El trabajador reconoce que, al momento de iniciar la ruta, la mercancía cargada en la unidad ha sido verificada en cantidad, presentación y condiciones físicas conforme a los documentos correspondientes.

I. Verificación de carga
El chofer deberá verificar, junto con el ayudante de chofer, que la mercancía cargada coincida con la documentación antes de la salida.
La salida de la unidad implicará aceptación expresa de conformidad sobre la mercancía.

II. Responsabilidad durante la ruta
A partir de la salida, el chofer será responsable de:
- El resguardo total de la mercancía
- La correcta entrega de los pedidos
- El manejo adecuado de la unidad

III. Entrega y documentación
El chofer deberá asegurarse de que todas las entregas cuenten con firma de conformidad del cliente.
Cualquier incidencia deberá anotarse en la documentación y reportarse de inmediato.

IV. Faltantes y diferencias
Las diferencias de mercancía no justificadas o no documentadas al finalizar la ruta podrán ser imputables al chofer y su ayudante, conforme a las políticas internas y la legislación aplicable.

V. Firma de salida
El chofer se obliga a firmar los documentos de carga o salida, reconociendo la recepción conforme de la mercancía.

VI. Prohibiciones
Queda estrictamente prohibido:
- Disponer de mercancía sin autorización
- Realizar entregas fuera de documentación
- Alterar documentos
- Ocultar faltantes o incidencias
El incumplimiento podrá considerarse falta grave.`,

  "Almacenista": `Objeto del puesto:
El trabajador será responsable del control, resguardo, organización y supervisión del almacén, asegurando la correcta administración del inventario, preparación de pedidos y coordinación con el área de reparto.

Funciones y responsabilidades:

I. Recibir mercancía de proveedores, verificando cantidades, presentaciones y estado físico conforme a los documentos correspondientes, reportando cualquier diferencia o daño.

II. Registrar y controlar las entradas de mercancía en los sistemas o formatos establecidos por la empresa.

III. Supervisar el acomodo, clasificación y orden de los productos dentro del almacén, asegurando su correcta identificación.

IV. Coordinar y supervisar al personal de almacén (macheteros o ayudantes) en las actividades de carga, descarga y preparación de pedidos.

V. Preparar o validar los pedidos conforme a notas, remisiones o instrucciones del área administrativa o de ventas.

VI. Verificar que los pedidos estén completos y correctos antes de ser cargados en las unidades de reparto.

VII. Autorizar la salida de mercancía únicamente cuando coincida con la documentación correspondiente.

VIII. Controlar y registrar las devoluciones, verificando cantidades y condiciones de la mercancía retornada.

IX. Mantener actualizado el inventario mediante conteos periódicos, reportando diferencias, mermas o incidencias.

X. Garantizar el correcto manejo, conservación y resguardo de la mercancía, evitando pérdidas, daños o deterioro.

XI. Coordinar la carga de unidades de reparto, asegurando correcta distribución de peso y orden de entrega.

XII. Mantener el almacén en condiciones óptimas de orden, limpieza y seguridad.

XIII. Reportar de inmediato cualquier irregularidad, faltante, error en pedidos o incidencia relevante.

RESPONSABILIDAD DEL PUESTO

El almacenista será responsable del control del inventario físico bajo su resguardo, así como de la correcta preparación y validación de los pedidos.

Cualquier diferencia, pérdida, merma o error derivado de negligencia, falta de control o incumplimiento de sus funciones podrá generar responsabilidad conforme a las políticas internas de la empresa.

CLÁUSULA DE CONTROL DE INVENTARIO Y SALIDAS DE MERCANCÍA

El trabajador reconoce que es el responsable directo de supervisar y validar la correcta salida de mercancía del almacén.

I. Control de inventario
El almacenista deberá mantener control actualizado del inventario, asegurando que toda entrada y salida de mercancía quede debidamente registrada.

II. Validación de pedidos
Antes de autorizar la salida de cualquier pedido, el almacenista deberá verificar que:
- Las cantidades coincidan con la documentación
- La mercancía esté en condiciones adecuadas
- El pedido esté completo

III. Salida de mercancía
Ninguna mercancía podrá salir del almacén sin la validación previa del almacenista y sin contar con la documentación correspondiente.

IV. Diferencias y mermas
Cualquier diferencia de inventario, faltante o merma no justificada podrá ser atribuida a responsabilidad del almacenista cuando derive de falta de control, supervisión o registro.

V. Coordinación de carga
El almacenista será responsable de supervisar que la carga de las unidades de reparto se realice correctamente, en coordinación con el personal de carga y los choferes.

VI. Reporte de incidencias
El almacenista deberá reportar de inmediato cualquier irregularidad, incluyendo:
- Faltantes de mercancía
- Errores en pedidos
- Daños en productos
- Incumplimiento del personal

VII. Prohibiciones
Queda estrictamente prohibido:
- Autorizar salidas de mercancía sin documentación
- Omitir registros de entradas o salidas
- Alterar información de inventario
- Ocultar diferencias o incidencias
El incumplimiento podrá considerarse falta grave.`,

  "Secretaria": `Objeto del puesto:
El trabajador será responsable de la atención a clientes y proveedores, recepción y captura de pedidos, elaboración de documentos administrativos y apoyo en la coordinación operativa de la empresa.

Funciones y responsabilidades:

I. Atender llamadas, correos electrónicos y mensajes de clientes, brindando información sobre productos, precios y pedidos.

II. Recibir, registrar y capturar pedidos en los sistemas o formatos establecidos por la empresa.

III. Elaborar cotizaciones, notas, remisiones y/o facturas conforme a las instrucciones recibidas.

IV. Dar seguimiento a pedidos, coordinando con el área de almacén y reparto para su correcta entrega.

V. Mantener actualizada la información de clientes, incluyendo datos de contacto, condiciones de pago y precios.

VI. Gestionar la documentación administrativa, asegurando el correcto archivo físico o digital de los documentos.

VII. Apoyar en la cobranza, seguimiento de pagos y envío de información a clientes cuando sea requerido.

VIII. Coordinar con vendedores, almacenistas y choferes para asegurar la correcta ejecución de los pedidos.

IX. Reportar cualquier incidencia, error o situación relevante detectada en pedidos o información.

X. Mantener confidencialidad sobre la información de la empresa, clientes y operaciones.

XI. Realizar las actividades administrativas adicionales que le sean asignadas conforme a la operación de la empresa.

RESPONSABILIDAD DEL PUESTO

La secretaria será responsable de la correcta captura, manejo y transmisión de la información administrativa.

Cualquier error en pedidos, documentos o información derivado de negligencia o falta de atención podrá generar responsabilidad conforme a las políticas internas.

CLÁUSULA DE CONTROL DE PEDIDOS E INFORMACIÓN

El trabajador reconoce que la información capturada y gestionada impacta directamente en la operación de la empresa.

I. Captura de pedidos
Todo pedido deberá registrarse de forma clara, completa y correcta, evitando errores en productos, cantidades o condiciones.

II. Validación de información
Antes de procesar cualquier pedido o documento, la secretaria deberá verificar:
- Datos del cliente
- Productos y cantidades
- Condiciones de entrega y pago

III. Errores administrativos
Cualquier error que genere pérdidas, devoluciones o afectaciones a la operación podrá ser atribuible a responsabilidad del puesto si deriva de omisión o negligencia.

IV. Confidencialidad
Queda estrictamente prohibido compartir información de clientes, precios o condiciones comerciales sin autorización.`,

  "Vendedor": `Objeto del puesto:
El trabajador será responsable de la prospección, atención y desarrollo de clientes, así como de la generación de ventas, seguimiento de pedidos y cumplimiento de objetivos comerciales.

Funciones y responsabilidades:

I. Prospectar nuevos clientes y desarrollar relaciones comerciales.

II. Atender a clientes existentes, brindando seguimiento constante a sus necesidades de compra.

III. Levantar pedidos de manera correcta, especificando productos, cantidades y condiciones acordadas.

IV. Enviar los pedidos a la empresa conforme a los procedimientos establecidos.

V. Dar seguimiento a la entrega de pedidos, asegurando la satisfacción del cliente.

VI. Comunicar precios, promociones y condiciones comerciales autorizadas por la empresa.

VII. Respetar las políticas de precios y márgenes establecidos por la empresa.

VIII. Dar seguimiento a la cobranza de sus clientes, informando atrasos o riesgos de pago.

IX. Reportar información relevante del mercado, clientes o competencia.

X. Mantener comunicación constante con el área administrativa y de almacén para coordinar pedidos.

XI. Cumplir con metas de venta establecidas por la empresa.

RESPONSABILIDAD DEL PUESTO

El vendedor será responsable de la correcta gestión de sus clientes, pedidos y condiciones comerciales.

Cualquier error en precios, pedidos o condiciones no autorizadas podrá generar responsabilidad conforme a las políticas internas.

CLÁUSULA DE CONTROL COMERCIAL Y PRECIOS

El trabajador reconoce que deberá apegarse estrictamente a las condiciones comerciales establecidas por la empresa.

I. Manejo de precios
El vendedor no podrá modificar precios, ofrecer descuentos o condiciones especiales sin autorización previa.

II. Levantamiento de pedidos
Todo pedido deberá levantarse de forma clara y completa, evitando errores que afecten la operación.

III. Condiciones de venta
Queda prohibido ofrecer condiciones distintas a las autorizadas, incluyendo:
- Plazos de pago no autorizados
- Precios especiales sin aprobación
- Promesas de entrega fuera de capacidad

IV. Responsabilidad sobre clientes
El vendedor deberá dar seguimiento a sus clientes, incluyendo:
- Pagos pendientes
- Comportamiento de compra
- Riesgo de cartera

V. Incumplimientos
Cualquier desviación en precios, condiciones o manejo de clientes podrá ser considerada falta grave.`,

};

// ═══ GENERADOR DE CONTRATO ═══

export async function generarContratoPDF(datos: DatosContrato): Promise<{ filename: string; pdfBlob: Blob }> {
  const { empleado: emp, empresa, firmas } = datos;
  const logoBase64 = await loadLogoBase64();
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const mL = 22, mR = 22;
  const maxW = pageW - mL - mR;
  let y = addLogo(pdf, logoBase64, pageW);
  let pageNum = 1;

  // Uppercase for PDF
  const NOM = emp.nombre_completo.toUpperCase();
  const RFC = emp.rfc.toUpperCase();
  const CURP = emp.curp.toUpperCase();
  const BEN = emp.beneficiario.toUpperCase();
  const PUESTO = emp.puesto.toUpperCase();
  const esChoferOAyudante = emp.puesto === "Chofer" || emp.puesto === "Ayudante de Chofer";
  const sueldoBase = esChoferOAyudante && emp.premio_asistencia ? emp.sueldo_bruto - emp.premio_asistencia : emp.sueldo_bruto;
  const sueldoTexto = `${fmt$(emp.sueldo_bruto)} (${numberToWords(emp.sueldo_bruto)})`;
  const periodoTexto = esChoferOAyudante
    ? "de forma semanal los días sábados"
    : "por mitad en dos quincenas, los días quince y último de cada mes";
  const premioParrafo = esChoferOAyudante && emp.premio_asistencia
    ? `Adicionalmente, la EMPRESA otorgará al EMPLEADO un Premio de Asistencia semanal equivalente a ${fmt$(emp.premio_asistencia)} (${numberToWords(emp.premio_asistencia)}), siempre y cuando el EMPLEADO no tenga falta injustificada ni acumule 2 (dos) retardos en la semana. Este premio no forma parte del salario base para efectos de cálculo de prestaciones legales y su otorgamiento queda sujeto al cumplimiento de las condiciones aquí establecidas.`
    : "";
  const fechaAntig = formatFechaLarga(emp.fecha_ingreso);
  const fechaContrato = formatFechaLarga(emp.fecha_contrato);

  // Footer with employee signature on every page
  const addFooter = () => {
    const prevSize = pdf.getFontSize();
    const prevFont = pdf.getFont();

    // Si hay firma digital del empleado, insertarla pequeña en cada página
    if (firmas?.empleado) {
      try { pdf.addImage(firmas.empleado, "PNG", pageW - mR - 40, pageH - 22, 35, 12); } catch {}
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(150);
    pdf.text(`Página ${pageNum}`, pageW / 2, pageH - 8, { align: "center" });
    pdf.text(`Firma del empleado: _______________`, pageW - mR, pageH - 8, { align: "right" });
    pdf.setFontSize(6);
    pdf.text(NOM, pageW - mR, pageH - 5, { align: "right" });
    pdf.setTextColor(0);
    pdf.setFont(prevFont.fontName, prevFont.fontStyle);
    pdf.setFontSize(prevSize);
    pageNum++;
  };

  const addPage = () => { addFooter(); pdf.addPage(); y = 20; };
  const checkPage = (needed: number) => { if (y + needed > pageH - 18) addPage(); };

  const writeCenter = (text: string, size = 11, bold = true) => {
    checkPage(8); pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxW);
    for (const l of lines) { checkPage(5); pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size); pdf.text(l, pageW / 2, y, { align: "center" }); y += size * 0.42; }
    y += 2;
  };

  const write = (text: string, size = 9.5, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxW);
    for (const l of lines) { checkPage(4.5); pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size); pdf.text(l, mL, y); y += 4; }
    y += 1.5;
  };

  const writeBold = (t: string, s = 9.5) => write(t, s, true);

  // ═══ PAGE 1: TITLE ═══
  writeCenter("CONTRATO INDIVIDUAL DE TRABAJO POR TIEMPO INDETERMINADO", 11);
  writeCenter("SUJETO A PERIODO A PRUEBA", 10);
  y += 2;

  write(`QUE CELEBRAN POR UNA PARTE ${empresa.razon_social} (REPRESENTADA POR ${empresa.representante_legal} COMO PATRÓN Y POR LA OTRA ${NOM} COMO TRABAJADOR Y QUIENES POR RAZÓN DE BREVEDAD SE DENOMINARÁN EN EL CURSO DEL PRESENTE CONTRATO "EMPRESA" Y "EMPLEADO", RESPECTIVAMENTE Y EL QUE SUJETAN A LAS SIGUIENTES:`);
  y += 3;

  writeCenter("DECLARACIONES", 11);

  writeBold("1. Declara la EMPRESA a través de su representante legal:");
  write("a) Ser una Empresa debidamente constituida y existente conforme a las leyes de la República Mexicana.");
  write("b) Que su representante legal cuenta con las facultades legales suficientes y necesarias para celebrar el presente acto jurídico y que dichas facultades a la fecha de firma del presente no le han sido modificadas ni restringidas en forma alguna.");
  write(`c) Que su número de identificación en el Registro Federal de Contribuyentes es: ${empresa.rfc}`);
  write("d) Que cuenta con registro patronal ante el Instituto Mexicano del Seguro Social.");
  write(`e) Desea contratar a una persona por tiempo indeterminado sujeto a un periodo de prueba de 90 días contados a partir de la fecha de celebración del presente contrato con el fin de verificar que el EMPLEADO cumple con los requisitos, conocimientos y habilidades necesarios para desempeñar el puesto de ${PUESTO} cuyas funciones estarán señaladas en la descripción de puesto y obligaciones así como en las políticas que se lleguen a establecer, de conformidad con el Artículo 39-A de la Ley Federal del Trabajo.`);
  y += 2;

  writeBold("2. Declara el EMPLEADO por su propio derecho:");
  write("a) Es una persona física de nacionalidad mexicana y que cuenta con la capacidad legal suficiente y necesaria para la celebración del presente Contrato y obligarse conforme a sus términos y condiciones.");
  write(`b) Que su número de identificación en el Registro Federal de Contribuyentes es: ${RFC} y su Clave Única de Registro de Población ("CURP") es el número ${CURP}.`);
  write(`c) En términos del artículo 25, fracción X de la Ley Federal del Trabajo, el Empleado conviene en designar como sus beneficiarios a: ${BEN}.`);
  write("d) Que la celebración por su parte del presente Contrato no incumple con ningún acto jurídico celebrado con anterioridad a la fecha de firma del presente.");
  write(`e) Que es el motivo determinante de su voluntad celebrar el presente Contrato con el objeto de ser contratado por la EMPRESA para llevar a cabo las actividades y funciones inherentes al puesto de ${PUESTO} (el "Puesto"), bajo los términos y condiciones del presente Contrato, y que declara tener las aptitudes y capacidades necesarias para el óptimo desempeño en dicho puesto.`);
  write("Estar de acuerdo en ser contratado en la modalidad de un Período a Prueba que permita a la EMPRESA verificar que cumple con los requisitos y conocimientos necesarios para desarrollar el trabajo que se solicita; y se obliga a prestar sus servicios subordinados, bajo la dirección y mando de la EMPRESA con el fin de que adquiera los conocimientos o habilidades necesarios para realizar la actividad para la que es contratado.");
  write("En virtud de las declaraciones anteriores, las partes acuerdan las siguientes:");
  y += 3;

  writeCenter("C L Á U S U L A S", 12);

  // PRIMERA
  writeBold("PRIMERA. OBLIGACIONES.");
  write(`El EMPLEADO se obliga a prestar sus servicios personales a la EMPRESA en el domicilio de ésta, ubicado en ${empresa.domicilio} o en el lugar que al efecto se le indique como ${PUESTO}, trabajo que deberá desempeñar desarrollando siempre su mayor habilidad, actividad y eficiencia. El EMPLEADO deberá prestar sus servicios en favor de cualquier individuo, asociación o empresa con quien la EMPRESA haya celebrado un contrato de prestación de servicios, no importando la naturaleza del mismo o como resultado y/o consecuencia de cualquier arreglo de la EMPRESA con dicho individuo, Empresa o empresa, en cuyo caso las actividades que desarrolle el EMPLEADO en beneficio del citado individuo, Empresa o empresa con quién la EMPRESA tenga celebrado dicho tipo de contrato será parte de los servicios que el EMPLEADO está obligado a prestar a la EMPRESA en virtud del presente contrato. El EMPLEADO expresamente conviene que la EMPRESA es su único patrón.`);
  write(`Las obligaciones de EL EMPLEADO consistirán en forma enunciativa mas no limitativa en las actividades necesarias para el desempeño de las funciones inherentes al puesto de ${PUESTO}, incluyendo de manera enunciativa aquellas actividades señaladas en la "Descripción de Puesto" que se adjunta al presente Contrato como "Anexo A" y el cual forma parte integrante del mismo.`);
  write("El EMPLEADO conviene expresamente, que prestará sus servicios exclusivamente a la EMPRESA.");

  // SEGUNDA
  writeBold("SEGUNDA. DURACIÓN DEL CONTRATO.");
  write("El presente contrato se celebra por tiempo indeterminado, estando sujeto a un Periodo de Prueba de hasta 90 días y no podrá ser suspendido, rescindido o terminado sino de acuerdo con lo previsto en la Ley Federal del Trabajo o por voluntad de ambas partes contratantes, sin embargo, los primero 90 días (noventa días) de prestación de servicios se considerarán como un periodo a prueba, término durante el cual la EMPRESA podrá dar por terminado el presente Contrato sin ninguna responsabilidad de pago de liquidación al Empleado si a juicio de la EMPRESA, el EMPLEADO no cuenta con los requisitos y conocimientos necesarios y suficientes para desempeñar el trabajo contratado.");
  write(`En virtud de lo anterior, durante dicho periodo a prueba, el EMPLEADO deberá demostrar que tiene los atributos y conocimientos necesarios para el Puesto, la cual ambas partes acuerdan que se considera como un puesto de confianza. En caso de que el EMPLEADO no cumpla con los requisitos y conocimientos necesarios para desarrollar el trabajo el Puesto para al que se contrata, al concluir dicho periodo a prueba, a juicio de la EMPRESA, se dará por terminado el presente Contrato sin responsabilidad para la compañía, de conformidad con lo dispuesto por el artículo 39-A de la Ley Federal del Trabajo.`);

  // TERCERA
  writeBold("TERCERA. JORNADA DE TRABAJO.");
  write("La jornada de trabajo del EMPLEADO será de cuarenta y ocho (48) horas a la semana distribuidas en 6 días semanales (lunes a sábado) de conformidad con las necesidades de la EMPRESA y de acuerdo con el segundo párrafo del artículo 59 de la Ley Federal del Trabajo. Dentro de dicha jornada, generalmente, el EMPLEADO comenzará sus labores de lunes a viernes a las 8:00 horas y concluirá a las 18:00 horas. Dicho horario se interrumpirá por 120 minutos para que descanse y/o tome sus alimentos fuera de las instalaciones de trabajo. Dada la naturaleza de las obligaciones asumidas por el EMPLEADO, el mismo no estará sujeto a ningún tipo de control de asistencia.");
  write("El EMPLEADO faculta expresamente a la EMPRESA para modificar el horario de trabajo anterior, de acuerdo con las necesidades de la misma.");

  // CUARTA
  writeBold("CUARTA. SALARIO.");
  write(`El EMPLEADO percibirá como sueldo por la prestación de los servicios a que se refiere este contrato, y cualquier actividad conexa al Puesto la cantidad bruta de ${sueldoTexto} pesos mensuales, menos las deducciones legales correspondientes, dicha suma le será pagada ${periodoTexto}, en las oficinas de la EMPRESA.`);
  write("El EMPLEADO conviene expresamente que la EMPRESA puede pagar la remuneración depositando su salario y cualquier otro pago a su favor en la cuenta bancaria designada por las partes, una vez hechas las retenciones y deducciones que corresponda de conformidad a lo establecido por el artículo 101 de la Ley Federal del Trabajo. Queda entendido que el simple depósito en la cuenta bancaria será equivalente a un recibo de salario, en términos del Artículo 804 de la Ley Federal del Trabajo.");
  if (premioParrafo) write(premioParrafo);

  // QUINTA
  writeBold("QUINTA. DÍAS DE DESCANSO SEMANAL.");
  write("El EMPLEADO disfrutará semanalmente de un día de descanso con goce de sueldo, el que se conviene por ambas partes que será el día Domingo de cada semana, y cuyo salario queda incluido en la suma señalada en la cláusula que antecede, por tratarse de retribución mensual.");
  write("El EMPLEADO faculta expresamente a la EMPRESA para cambiar el día de descanso a que antes se hace mención, de acuerdo con sus necesidades.");

  // SEXTA
  writeBold("SEXTA. DÍAS DE DESCANSO OBLIGATORIO.");
  write("El EMPLEADO disfrutará de los días de descanso obligatorio señalados en la Ley Federal del Trabajo, cuyo salario también queda pagado con la cantidad señalada en la cláusula cuarta, por tratarse de sueldo mensual.");

  // SÉPTIMA
  writeBold("SÉPTIMA. VACACIONES.");
  write("El EMPLEADO disfrutará de 12 (doce) días de vacaciones por cada año completo de servicios prestados. Estos serán incrementados de conformidad a lo establecido por el artículo 76 de la Ley Federal del Trabajo. Ambas partes convienen, que el EMPLEADO disfrutará del periodo de vacaciones en la época que determine la EMPRESA, obligándose el EMPLEADO, en todo caso, a solicitar sus vacaciones con anticipación razonable.");
  write("Por otro lado, el EMPLEADO tendrá derecho a recibir como prima vacacional el equivalente al 25% (veinticinco por ciento) del pago que le corresponda por sus días de vacaciones.");

  // OCTAVA
  writeBold("OCTAVA. AGUINALDO.");
  write("El EMPLEADO tendrá derecho a recibir como aguinaldo el pago de 15 (quince) días de salario base por año completo de servicios. El aguinaldo que le será cubierto por la EMPRESA antes del 20 de diciembre de cada año.");

  // NOVENA
  writeBold("NOVENA. TIEMPO EXTRAORDINARIO.");
  write("Queda prohibido al EMPLEADO trabajar tiempo extraordinario si no es con consentimiento previo y orden escrita, dada por la EMPRESA. Cuando por cualquier circunstancia deba trabajar el EMPLEADO mayor tiempo que el señalado como jornada ordinaria, recabará previamente de la EMPRESA la orden a que se refiere esta cláusula, sin cuyo requisito no le será abonada cantidad alguna por el tiempo que trabajara con exceso a la jornada legal.");

  // DÉCIMA
  writeBold("DÉCIMA. RECIBO DE SALARIOS.");
  write('El Empleado está de acuerdo y otorga su consentimiento para que la Empresa le expida en cada día de pago el Comprobante Fiscal Digital por Internet ("CFDI") que fungirá como recibo de pago que le expide la Empresa por la totalidad de las cantidades devengadas a esa fecha, por lo que el Empleado conviene en revisarlo en el día de pago. El Empleado reconoce y conviene expresamente que, salvo que notifique a la Empresa de algún error u omisión sobre el CFDI, su expedición implicará su conformidad de que la remuneración recibida cubre el trabajo desempeñado hasta esa fecha, sin que pueda exigir posteriormente el pago de prestación alguna por el período de que se trate. El CFDI implicará un finiquito total a favor de la Empresa de todos los sueldos y prestaciones devengados por el Empleado por el período correspondiente por los servicios prestados hasta esa fecha, independientemente de que dicho recibo contenga o no una declaración en tal sentido.');

  // DÉCIMA PRIMERA
  writeBold("DÉCIMA PRIMERA. CONFIDENCIALIDAD.");
  write("En atención a las actividades que realiza la EMPRESA y dada la necesidad de mantener en absoluta confidencialidad los procesos de trabajo y de cualquier otra naturaleza, el EMPLEADO se obliga a guardar escrupulosamente los secretos técnicos, secretos industriales comerciales y de fabricación de los productos, a cuya elaboración concurran directa o indirectamente o de los cuales tenga conocimiento por razones de trabajo, así como de los asuntos administrativos, cuya divulgación pueda causar perjuicios a la EMPRESA, en la inteligencia de que el incumplimiento específico de esta obligación, lo hará acreedor a la rescisión de su Contrato de Trabajo, de conformidad con lo dispuesto en el artículo 47 de la Ley Federal del Trabajo y a las penas conducentes que impone para tales efectos la Ley de Propiedad Intelectual.");
  write("El EMPLEADO reconoce el valor e importancia que caracteriza a la información confidencial, razón por la cual conviene y se obliga a celebrar un convenio de confidencialidad adicional independiente con la EMPRESA, en cualquier momento.");
  write('Adicionalmente, en virtud de la relación laboral que mantiene el EMPLEADO con la EMPRESA, el EMPLEADO reconoce y acuerda que éste pudiera entregar o recibir, debido a dichas relaciones, cierta información confidencial, incluyendo sin limitar, información relativa a las listas de precios, listas de clientes, listas de empleados, patentes, operaciones comerciales, procesamiento, métodos, diseños, diseños industriales, marcas, equipos, proyectos de inversión, expansión e investigaciones técnicas y científicas, sistemas y/o programas de computación, de contabilidad, de costos, de ventas, inventos o patentes, marcas y cualquier otro derecho de propiedad intelectual, distribución de productos, contratos, convenios, acuerdos comerciales, de confidencialidad, finanzas, seguros, planos, políticas, procedimientos, objetivos y propósitos, e información relativa a la publicidad y ventas de los productos (todo lo anterior conjuntamente referido como la "Información Confidencial"), reconociendo el EMPLEADO dicha Información Confidencial como Secretos Industriales y/o Comerciales (al tenor de lo dispuesto por la Ley de la Propiedad Industrial) de la EMPRESA y/o terceras partes, según sea el caso. En consecuencia, de lo anterior, el EMPLEADO reconoce y acuerda que la EMPRESA o los terceros, según sea el caso, son dueños de dicha Información Confidencial y/o son titulares o detentan a justo título todos los derechos autorales o de propiedad industrial de la Información Confidencial y que dicha Información Confidencial será propiedad única y exclusiva de la EMPRESA y/o de terceros, según sea el caso. Derivado de lo anterior, el EMPLEADO se obliga a no revelar la Información Confidencial o cualquier otra información que directa o indirectamente se relaciones con la Información Confidencial, en el entendido de que la divulgación de dicha Información Confidencial, causará daños y perjuicios a la EMPRESA, por lo que con base en el artículo 85 de la Ley de la Propiedad Industrial, el EMPLEADO se hace sabedor de la prevención de confidencialidad de la Información Confidencial y que no debe revelar la misma. En caso de duda por parte del EMPLEADO, éste deberá preguntar a la EMPRESA respecto que información es considerada como Información Confidencial.');
  write("El EMPLEADO conviene expresamente en que la Información Confidencial que le sea proporcionada por la EMPRESA, contenida en cualquier medio, la mantendrá en lugar seguro, con el fin de que ésta no pueda ser copiada por algún tercero; de igual forma, el EMPLEADO se compromete a no copiar en todo o en parte, ni la resumirá, compendiará o trasladará a otro medio de objetivación perdurable, sin la previa autorización por escrito de la EMPRESA, la cual podrá ser negada por cualquier razón, ni de cualquier otra forma violará los derechos de propiedad intelectual e industrial de la EMPRESA, y a la terminación de la relación laboral con EMPRESA, deberá revelar a su supervisor donde mantiene Información Confidencial, obligándose a devolver la Información Confidencial en todos los medios en que se encuentre.");
  write('En adición a lo anterior, el EMPLEADO conviene en que todos los inventos o descubrimientos patentables o no, y denominaciones o derivados relacionadas con productos de la EMPRESA, la Información Confidencial y/o cualesquier y todo material o productos creados y/o concebidos por el EMPLEADO o por otros, sea o no durante horas de trabajo, derivado y en razón de la relación laboral, título o puesto ("Invenciones") deberán ser como propiedad de la EMPRESA, de conformidad con lo aquí establecido, y a lo dispuesto por los artículos aplicables de la Ley Federal del Trabajo, de la Ley de la Propiedad Industrial y de la Ley Federal del Derecho de Autor. Consecuentemente y a requerimiento de la EMPRESA, el EMPLEADO se compromete a firmar cualquier documento que sea necesario para el fin aquí estipulado. Las anteriores obligaciones sobrevivirán indefinidamente a la terminación de la relación de trabajo del EMPLEADO con la EMPRESA por cualquiera razón.');
  write("El EMPLEADO conviene en entregar a la EMPRESA en cualquier momento y según sea requerido, todos los documentos relacionados con cualquier tipo de Información Confidencial, Invenciones, Secretos Industriales y/o Comerciales que haya elaborado, recopilado, generado u obtenido de la EMPRESA derivado de la relación laboral o por cualquier causa.");
  write("El EMPLEADO se obliga a no registrar, o bajo su conocimiento, dejar que terceros registren en modo alguno, o provean a terceros con, o hacer conocedores a terceros de parte o la totalidad de la Información Confidencial, Invenciones, Secretos Industriales y/o Comerciales. Adicionalmente, el EMPLEADO acuerda que no utilizará, directa o indirectamente, para su beneficio personal o revelará de cualquier forma a cualquier tercero la Información Confidencial, Invenciones, Secretos Industriales y/o Comerciales. Dichas obligaciones sobrevivirán indefinidamente a la terminación de la relación de trabajo del EMPLEADO o con la EMPRESA por cualquiera razón.");
  write("El EMPLEADO conviene en que, como contraprestación por lo pactado en esta Cláusula, recibirá el sueldo previamente establecido en el presente Contrato, sin pago de compensación adicional en virtud de que el trabajo que desempeña está remunerado de tal forma que incluye un porcentaje para compensar estas actividades o limitaciones. El EMPLEADO expresamente acuerda que no se reserva y no se reserva acción o derecho alguno en su favor que ejercitar en contra de la EMPRESA, o clientes, incluyendo sin limitar, con respecto a la Información Confidencial, Inventos, Secretos Industriales y/o Comerciales. Dichas obligaciones sobrevivirán indefinidamente a la terminación de la relación de trabajo del EMPLEADO con la EMPRESA por cualquiera razón.");
  write("El EMPLEADO reconoce y acuerda todo lo anterior, en la inteligencia de que el incumplimiento a las obligaciones bajo esta Cláusula, será causal de rescisión del presente Contrato en los términos del artículo 47 de la Ley Federal del Trabajo y 210 y 211 del Código Penal Federal o sus artículos correlativos en los diversos códigos penales de los Estados de la República Mexicana y la Ciudad de México (antes Distrito Federal). El EMPLEADO reconoce y acuerda todo lo anterior, sin perjuicio de cualquier otra acción que pudiera ser ejercitable por parte de la EMPRESA.");

  // DÉCIMA TERCERA (nota: no hay DÉCIMA SEGUNDA en el original)
  writeBold("DÉCIMA TERCERA. INSTRUMENTOS DE TRABAJO.");
  write("El EMPLEADO tiene conocimiento que todo el material, documentos, procesos, planes de trabajo y/o instrumentos y documentos proporcionados en virtud de la relación de trabajo, pertenecen a la EMPRESA, así como la información proporcionada u obtenida por el EMPLEADO con relación a sus obligaciones. Por lo tanto, dichos conceptos nunca deberán ser considerados como parte del salario del EMPLEADO, quien está de acuerdo en guardar en buenas condiciones y regresarlos a la EMPRESA cuando le sean solicitados o cuando se termine la relación de trabajo por cualquier causa o motivo.");
  write("A la terminación de la relación de trabajo e independientemente de la causa de esta, o en cualquier momento que la EMPRESA así lo solicite, el EMPLEADO se obliga a devolver la posesión física, material y jurídica de cualquier otro instrumento de trabajo a la EMPRESA en las mismas condiciones en que le fueron entregados, salvo el desgaste por el uso normal de los mismos. Sin embargo, si a juicio de la EMPRESA existiera un deterioro anormal en cualquiera de los instrumentos de trabajo antes señalados, el EMPLEADO se obliga a responder por los gastos que se realicen para repararlo.");

  // DÉCIMA CUARTA
  writeBold("DÉCIMA CUARTA. EMPLEADO DE CONFIANZA.");
  write("En virtud que dentro de las principales funciones del Empleado se encuentran el velar y tener a su cargo los intereses de la Empresa, incluyendo sin limitación, el manejo, cuidado y administración de efectivo, mercancía y activos de la Empresa, el Empleado es y será considerado como un trabajador de confianza para todos los efectos legales a que haya lugar.");

  // DÉCIMA QUINTA
  writeBold("DÉCIMA QUINTA. CAPACITACIÓN Y ADIESTRAMIENTO.");
  write("La EMPRESA se obliga a proporcionar capacitación y adiestramiento al EMPLEADO en los términos de la Ley Federal del Trabajo.");

  // DÉCIMA SEXTA
  writeBold("DÉCIMA SEXTA. SEGURIDAD SOCIAL.");
  write('La EMPRESA se obliga a afiliar al EMPLEADO al Instituto Mexicano del Seguro Social ("IMSS"). El EMPLEADO conviene en tomar exámenes médicos por instrucciones de la EMPRESA, de acuerdo a la Ley Federal del Trabajo, con el IMSS o con el médico designado por la EMPRESA. Dichos exámenes médicos serán tan extensos como la EMPRESA lo determine.');

  // DÉCIMA SÉPTIMA
  writeBold("DÉCIMA SÉPTIMA. ANTIGÜEDAD.");
  write(`Independientemente de la fecha en que se firme el presente instrumento, la EMPRESA reconoce una antigüedad al EMPLEADO a partir del día ${fechaAntig}.`);

  // DÉCIMA OCTAVA
  writeBold("DÉCIMA OCTAVA. DATOS PERSONALES.");
  write("El EMPLEADO reconoce que se ha puesto a su disposición el aviso de privacidad de la EMPRESA y que se le ha informado el proceso correspondiente al ejercicio de los derechos de acceso, rectificación, cancelación y oposición, así como las maneras limitar el uso y divulgación de los datos personales y para, en su caso, revocar el consentimiento que menciona la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y la normativa aplicable. En consecuencia, el EMPLEADO manifiesta expresamente aceptar los términos y condiciones establecidos en el aviso de privacidad otorgando a la EMPRESA su consentimiento para tratar, almacenar, transferir y/o manejar los datos personales en los términos del aviso de privacidad.");

  // DÉCIMA NOVENA
  writeBold("DÉCIMA NOVENA. LEY APLICABLE.");
  write("Ambas partes contratantes convienen en que todo lo no previsto en el presente contrato se regirá por las disposiciones de la Ley Federal del Trabajo y en que para todo lo que se refiera a interpretación, ejecución y cumplimiento del mismo, se someterán expresamente a la jurisdicción y competencia de los tribunales laborales competentes en la Ciudad de México.");
  write("Este Contrato prevalecerá, dejará sin efectos y reemplazará en su totalidad a cualquier otro contrato, entendimiento y/o oferta laboral verbal o escrito, celebrado con anterioridad entre la EMPRESA y el EMPLEADO, para que ésta actúe como asesor independiente, empleado subordinado o en cualquier otro carácter, así como cualquier oferta anterior. Por consiguiente, el EMPLEADO reconoce que la EMPRESA no le adeuda nada, conforme a algún contrato o relación pasada, ya sea verbal o escrita, o con respecto a alguno de ellos y otorga en este acto el finiquito más amplio e incondicional en favor de la EMPRESA por las obligaciones previstas o derivadas de las leyes aplicables o relacionadas con los contratos o relaciones anteriores celebradas entre las partes.");
  y += 3;

  // CIERRE Y FIRMAS
  write(`Leído que fue el presente contrato, e impuestas las partes de su contenido y fuerza legal, lo firmaron en la Ciudad de México el día ${fechaContrato} ante los testigos que suscriben.`);
  y += 8;

  checkPage(50);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
  pdf.text('"EMPRESA"', mL + maxW * 0.25, y, { align: "center" });
  pdf.text('"EMPLEADO"', mL + maxW * 0.75, y, { align: "center" });
  y += 3;
  // Insert signature images if available
  if (firmas?.admin) {
    try { pdf.addImage(firmas.admin, "PNG", mL + maxW * 0.05, y, maxW * 0.35, 15); } catch {}
  }
  if (firmas?.empleado) {
    try { pdf.addImage(firmas.empleado, "PNG", mL + maxW * 0.6, y, maxW * 0.35, 15); } catch {}
  }
  y += 15;
  pdf.line(mL, y, mL + maxW * 0.4, y);
  pdf.line(mL + maxW * 0.6, y, mL + maxW, y);
  y += 4;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text(empresa.representante_legal, mL + maxW * 0.25, y, { align: "center" });
  pdf.text(NOM, mL + maxW * 0.75, y, { align: "center" });
  y += 4;
  pdf.text("Representante Legal", mL + maxW * 0.25, y, { align: "center" });
  y += 12;

  checkPage(30);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text("Testigo", mL + maxW * 0.25, y, { align: "center" });
  pdf.text("Testigo", mL + maxW * 0.75, y, { align: "center" });
  y += 15;
  pdf.line(mL, y, mL + maxW * 0.4, y);
  pdf.line(mL + maxW * 0.6, y, mL + maxW, y);

  // ═══ ANEXO A ═══
  addPage();
  writeCenter("ANEXO A", 12);
  writeCenter("(DESCRIPCIÓN DE PUESTO)", 10, false);
  y += 2;
  write(`DEL CONTRATO INDIVIDUAL DE TRABAJO POR TIEMPO INDETERMINADO SUJETO A PERIODO A PRUEBA CELEBRADO ENTRE ${empresa.razon_social} (EN LO SUCESIVO LA "EMPRESA"), REPRESENTADA EN ESTE ACTO POR ${empresa.representante_legal} Y ${NOM} (EN LO SUCESIVO EL "EMPLEADO") DE FECHA ${fechaContrato}.`);
  y += 2;
  writeBold(`PUESTO: ${PUESTO}`);
  y += 2;

  const anexo = ANEXOS[emp.puesto];
  if (anexo) {
    for (const linea of anexo.split("\n")) {
      const t = linea.trim();
      if (!t) { y += 2; continue; }
      if (t.startsWith("FUNCIONES:") || t.startsWith("RESPONSABILIDAD") || t.startsWith("CLÁUSULA")) { y += 2; writeBold(t); }
      else write(t, 9);
    }
  }
  y += 5;

  write(`EN TESTIMONIO DE LO ANTERIOR, habiendo leído las partes el presente Anexo A y estando conformes con su contenido y fuerza legal, lo firman en Ciudad de México el ${fechaContrato}.`);
  y += 10;

  checkPage(25);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
  pdf.text("LA EMPRESA", mL + maxW * 0.25, y, { align: "center" });
  pdf.text("EL EMPLEADO", mL + maxW * 0.75, y, { align: "center" });
  y += 2;
  if (firmas?.admin) {
    try { pdf.addImage(firmas.admin, "PNG", mL + maxW * 0.05, y, maxW * 0.35, 13); } catch {}
  }
  if (firmas?.empleado) {
    try { pdf.addImage(firmas.empleado, "PNG", mL + maxW * 0.6, y, maxW * 0.35, 13); } catch {}
  }
  y += 13;
  pdf.line(mL, y, mL + maxW * 0.4, y);
  pdf.line(mL + maxW * 0.6, y, mL + maxW, y);
  y += 4;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text(empresa.representante_legal, mL + maxW * 0.25, y, { align: "center" });
  pdf.text(NOM, mL + maxW * 0.75, y, { align: "center" });
  y += 4;
  pdf.text("Representante Legal", mL + maxW * 0.25, y, { align: "center" });

  // Add footer to last page
  addFooter();

  const filename = `Contrato_${emp.nombre_completo.replace(/\s+/g, "_")}.pdf`;
  const pdfBlob = pdf.output("blob");
  pdf.save(filename);
  return { filename, pdfBlob };
}

// ═══ AVISO DE PRIVACIDAD ═══

export async function generarAvisoPrivacidadPDF(params: {
  nombre_empleado: string;
  fecha: string;
  firma_empleado?: string;
  checkbox_si?: boolean;
  checkbox_no?: boolean;
}): Promise<{ filename: string; pdfBlob: Blob }> {
  const logoBase64 = await loadLogoBase64();
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const mL = 22;
  const maxW = pageW - 44;
  let y = addLogo(pdf, logoBase64, pageW);

  const addPage = () => { pdf.addPage(); y = 20; };
  const checkPage = (n: number) => { if (y + n > pageH - 18) addPage(); };
  const writeTitle = (t: string, s = 12) => { checkPage(10); pdf.setFont("helvetica", "bold"); pdf.setFontSize(s); pdf.text(t, pageW / 2, y, { align: "center" }); y += s * 0.5 + 2; };
  const writeBold = (t: string, s = 9) => { pdf.setFont("helvetica", "bold"); pdf.setFontSize(s); for (const l of pdf.splitTextToSize(t, maxW)) { checkPage(4.5); pdf.setFont("helvetica", "bold"); pdf.setFontSize(s); pdf.text(l, mL, y); y += 4; } y += 1; };
  const writeNormal = (t: string, s = 9) => { pdf.setFont("helvetica", "normal"); pdf.setFontSize(s); for (const l of pdf.splitTextToSize(t, maxW)) { checkPage(4.5); pdf.setFont("helvetica", "normal"); pdf.setFontSize(s); pdf.text(l, mL, y); y += 4; } y += 1; };

  writeTitle("AVISO DE PRIVACIDAD PARA EMPLEADOS Y CANDIDATOS", 12);
  y += 3;
  writeNormal("AVISO DE PRIVACIDAD PARA EMPLEADOS Y CANDIDATOS");
  writeNormal("ABARROTES LA MANITA, S.A. DE C.V. (\"LA EMPRESA\"), con domicilio en Melchor Ocampo #59, Magdalena Mixhuca, Venustiano Carranza, 15850, México está consciente de la importancia del tratamiento legítimo, controlado e informado de los datos personales del personal que los Prestadores de Servicios especializados ponen a su disposición. Es así que LA EMPRESA en este acto pone a su disposición el presente Aviso de Privacidad, a fin de que conozca cómo LA EMPRESA obtiene, usa, divulga y almacena sus datos personales.");
  y += 2;
  writeBold("Datos personales que se recaban");
  writeNormal("Los datos personales que pudieran recabarse durante el curso de la prestación de los servicios pertenecerán a las siguientes categorías: (i) Datos de Identificación: nombre completo; género; fecha de nacimiento; estado civil; país de origen, ciudadanía y nacionalidad; clave del Registro Federal de Contribuyentes (RFC); Clave Única de Registro de Población (CURP); número de afiliación al Instituto Mexicano del Seguro Social (IMSS); imágenes; fotografías, identificaciones con fotografía; peso; altura; señas particulares; firma; (ii) Datos de Contacto: domicilio; números telefónicos; números celulares; correo electrónico.");
  writeNormal("Además se podrán recabar y/o realizar exámenes y verificación de antecedentes de forma periódica para recabar Datos sensibles (que deberán entenderse incluidos dentro del término \"datos personales\") y que requieren de especial protección como resultados de evaluaciones y exámenes psicométricos; resultados de exámenes médicos, incluyendo exámenes de audiometría, exámenes de sangre, exámenes serológicos, radiografías, toma de temperatura y pruebas de visión; antecedentes médicos, incluyendo la información relacionada a la vacunación contra Covid-19, y familiares (si un familiar suyo tiene o ha tenido una enfermedad contagiosa, si son adultos mayores, embarazadas, con enfermedades crónicos o de inmunosupresión o cualquier otra condición que los coloque en situación de vulnerabilidad), penales, laborales; datos de salud y padecimientos; información sobre si es usted fumador.");
  writeNormal("Adicionalmente, LA EMPRESA le podrá solicitar que muestre documentación en original y que entregue copia de la misma, como evidencia que respalde la información que haya proporcionado.");
  y += 2;
  writeBold("Finalidades y/o usos de los datos personales");
  writeNormal("Los datos personales que recaba LA EMPRESA pueden ser utilizados para las siguientes finalidades necesarias: (i) evaluación de su estado de salud y estado físico (ii) para el cumplimiento de cualquier obligación legal relacionada a la información proporcionada (iii) realización de exámenes médicos para la detección del uso de alcohol y drogas, interfaz biométrica, así como para la prevención y contención de enfermedades contagiosas; (iv) llevar a cabo estudios, análisis o revisiones (monitoreo), a fin de garantizar la seguridad de las personas que se encuentran dentro de las instalaciones de LA EMPRESA, y para la prevención o detección de la comisión de delitos. y en general, para el cumplimiento de obligaciones legales.");
  writeNormal("Asimismo, los datos personales podrán utilizarse para finalidades no necesarias o secundarias tales como (i) comunicaciones (incluyendo correos electrónicos) relativas a LA EMPRESA; (ii) elaborar y mantener una base de datos para futuras oportunidades de empleo con LA EMPRESA; y (iii) proporcionar referencias laborales suyas a prospectos empleadores o agencias de reclutamiento.");
  writeNormal("Para limitar o manifestar su negativa sobre el uso de estos fines no necesarios, puede presentar su solicitud ante nuestra área de Recursos Humanos y su solicitud quedará registrada en la Lista de Exclusión.");
  y += 2;
  writeBold("Transferencia de sus datos personales – LA EMPRESA puede transferir a terceros, nacionales o extranjeros, sus datos personales y/o datos personales sensibles y/o financieros con el fin de cumplir con las finalidades descritas; asimismo, en caso de que exista una restructuración corporativa incluyendo la fusión, consolidación, venta o transferencia total o parcial de nuestro negocio o activos, podría ser necesaria la transferencia nacional o internacional de los datos personales. Los terceros a los que LA EMPRESA puede transferir sus datos personales son otras compañías afiliadas o subsidiarias que actúen bajo las mismas políticas y procedimientos que LA EMPRESA. Asimismo, LA EMPRESA podrá transferir sus datos al Prestador de Servicios Especializados con quien tenga celebrado un contrato, ello para mitigar cualquier riesgo de salud o accidente en sus instalaciones.");
  writeNormal("LA EMPRESA se compromete a transferir solo aquella información que sea absoluta y estrictamente necesaria. Cuando LA EMPRESA comparta sus datos personales con terceros hará su mejor esfuerzo para asegurarse que dichos terceros tomen las medidas necesarias para proteger la confidencialidad y seguridad de sus datos personales. LA EMPRESA requerirá que dichos terceros cumplan con las leyes de protección de datos aplicables, las políticas y el Aviso de Privacidad de LA EMPRESA y les prohibirá utilizar sus datos personales para un fin distinto a aquel para el cual han sido contratados.");
  writeNormal("LA EMPRESA se asegurará que dicha información sea resguardada de acuerdo a los principios de protección de datos personales reconocidos por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y su Reglamento (la \"Ley\") y que, en su caso, el receptor de los datos asuma las mismas obligaciones que LA EMPRESA.");
  writeNormal("LA EMPRESA jamás vende datos personales, ni cede o transfiere sus datos personales a terceros ajenos a LA EMPRESA, sin su consentimiento previo, excepto en los casos antes citados. Sin embargo, LA EMPRESA podrá transferir sus datos personales cuando dicha transferencia esté prevista en la Ley.");
  y += 2;
  writeBold("Resguardo de sus datos personales");
  writeNormal("LA EMPRESA ha adoptado las medidas de seguridad, administrativas, técnicas y físicas, que considera necesarias para proteger sus datos personales, los cuales estarán almacenados de forma segura en un banco de datos electrónico, contra daño, pérdida, alteración, destrucción o contra el uso, acceso o tratamiento no autorizado.");
  writeNormal("El acceso a sus datos personales, en poder de LA EMPRESA, se limitará a las personas que necesiten tener acceso a dicha información, con el propósito de llevar a cabo las finalidades identificadas en este Aviso de Privacidad y durante la temporalidad necesaria para ello.");
  y += 2;
  writeBold("Protección a menores, personas en estado de interdicción o incapacidad");
  writeNormal("LA EMPRESA no recolecta ni trata datos personales de menores, personas en estado de interdicción o incapaces, a menos que hayan sido proporcionados por alguno de sus padres, su tutor o representante legal, según corresponda. En caso que LA EMPRESA considere que los datos personales han sido proporcionados por un menor, una persona incapaz o en estado de interdicción, en contravención al presente Aviso, procederemos a eliminar tales datos personales a la brevedad. Si tiene conocimiento de que algunos datos personales han sido proporcionados por un menor de 18 años, o por una persona incapaz o en estado de interdicción, por favor comuníquelo al área de Recursos Humanos de su oficina.");
  y += 2;
  writeBold("Derechos que le corresponden al titular de los datos personales");
  writeNormal("Usted, como titular de datos personales podrá ejercitar ante el Oficial de Privacidad, el cual es el responsable de Protección de Datos Personales de LA EMPRESA, como más adelante se establece, los derechos de acceso, rectificación, cancelación y oposición (derechos \"ARCO\"), establecidos en la Ley. Asimismo, podrá revocar, en todo momento, el consentimiento que haya otorgado y que fuere necesario para el tratamiento de sus datos personales. Para revocar su consentimiento para el tratamiento de sus datos personales, deberá presentar su solicitud al área de Recursos Humanos de su oficina. Por favor tome en cuenta que en caso de revocar su consentimiento, LA EMPRESA no podrá cumplir con las finalidades antes descritas incluyendo obligaciones legales.");
  writeNormal("LA EMPRESA tiene a su disposición el Formato para llevar a cabo las solicitudes de Derechos ARCO. Por favor contacte a nuestra área de Recursos Humanos de su oficina para obtener este formato.");
  writeNormal("Para que la EMPRESA pueda darle seguimiento a su solicitud, usted o su representante legal, deberán acreditar correctamente su identidad, por lo que deberá acompañar su solicitud con copia de alguna identificación oficial vigente.");
  writeNormal("En caso de que la información proporcionada en su solicitud sea errónea o insuficiente, o bien, no se acompañen los documentos de acreditación correspondientes, la EMPRESA, dentro de los cinco (5) días hábiles siguientes a la recepción de la solicitud, podrá requerirle que aporte los elementos o documentos necesarios para dar trámite a la misma. Usted contará con diez (10) días hábiles para atender el requerimiento, contados a partir del día siguiente en que lo haya recibido. De no dar respuesta en dicho plazo, se tendrá por no presentada la solicitud correspondiente.");
  writeNormal("La EMPRESA le comunicará la respuesta en un plazo máximo de veinte (20) días hábiles contados desde la fecha en que se recibió la solicitud, a efecto de que, si resulta procedente, haga efectiva la misma dentro de los quince (15) días hábiles siguientes a que se comunique la respuesta. La respuesta se dará vía electrónica a la dirección de correo que se especifique en el en su solicitud.");
  y += 2;
  writeBold("Opciones para limitar el uso o divulgación de sus datos personales. Usted podrá limitar el uso o divulgación de sus datos personales para evitar que sean utilizados o divulgados.");
  writeNormal("Si desea limitar el uso o divulgación de sus datos personales, deberá presentar su solicitud al área de Recursos Humanos de su oficina, en el entendido de que LA EMPRESA no podría cumplir con algunas de sus obligaciones si esto sucede.");
  y += 2;
  writeBold("Uso de Cookies y Otras Tecnologías de Rastreo. LA EMPRESA no utiliza directamente cookies u otras tecnologías de rastreo para recabar sus datos personales cuando usted accede al servicio de red interno, portal interno y/o sitio web.");
  y += 2;
  writeBold("Cambios al aviso de privacidad");
  writeNormal("En caso de existir cambios o modificaciones al presente Aviso de Privacidad, se pondrá a su disposición la versión actualizada del mismo a través del área de Recursos Humanos.");
  y += 2;
  writeBold("Contacto");
  writeNormal("En caso de tener dudas o comentarios respecto a este Aviso de Privacidad o si quisiera ejercitar cualquiera de los derechos que por la Ley le corresponden, le pedimos contacte al área de Recursos Humanos.");
  y += 2;
  writeBold("CONSENTIMIENTO EXPRESO DEL TITULAR");
  writeNormal("Manifiesto que he leído y entiendo el presente Aviso de Privacidad y:");
  checkPage(8);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.rect(mL, y - 3, 4, 4);
  if (params.checkbox_si) {
    pdf.setFont("helvetica", "bold");
    pdf.text("X", mL + 0.8, y, { align: "left" });
    pdf.setFont("helvetica", "normal");
  }
  const linesSi = pdf.splitTextToSize("Sí otorgo mi consentimiento a fin de que se lleve a cabo el tratamiento y transferencia de mis datos personales, financieros y sensibles para las finalidades necesarias y no necesarias en los términos del presente.", maxW - 10);
  for (const l of linesSi) { pdf.text(l, mL + 7, y); y += 4; }
  y += 3;
  checkPage(8);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.rect(mL, y - 3, 4, 4);
  if (params.checkbox_no) {
    pdf.setFont("helvetica", "bold");
    pdf.text("X", mL + 0.8, y, { align: "left" });
    pdf.setFont("helvetica", "normal");
  }
  const linesNo = pdf.splitTextToSize("No otorgo mi consentimiento, a fin de que se lleve a cabo el tratamiento de mis datos personales en los términos del presente y entiendo que la Empresa no podrá cumplir con las obligaciones derivadas de una relación de trabajo.", maxW - 10);
  for (const l of linesNo) { pdf.text(l, mL + 7, y); y += 4; }
  y += 3;
  writeNormal("De igual forma, confirmo que he informado a las personas de las cuales he proporcionado datos personales sobre el tratamiento que se dará a sus datos y que cuento con su autorización para proporcionarlos.");
  checkPage(45);
  pdf.text(`Nombre: ${params.nombre_empleado}`, mL, y); y += 6;
  // Signature area
  if (params.firma_empleado) {
    pdf.text("Firma:", mL, y);
    try { pdf.addImage(params.firma_empleado, "PNG", mL + 15, y - 8, 50, 18); } catch {}
    y += 12;
  } else {
    pdf.text("Firma: _________________________________________", mL, y); y += 10;
  }
  pdf.text("Fecha: " + params.fecha, mL, y); y += 8;
  y += 5;
  writeNormal("En términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y su Reglamento, le informamos que, ante la negativa de respuesta a las solicitudes de derechos ARCO o inconformidad con la misma, usted puede presentar ante el Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales, la correspondiente Solicitud de Protección de Derechos en los plazos y términos fijados por el capítulo VII de la Ley y otros relacionados, así como los correspondientes del Reglamento.");

  const filename = `Aviso_Privacidad_${params.nombre_empleado.replace(/\s+/g, "_")}.pdf`;
  const pdfBlob = pdf.output("blob");
  pdf.save(filename);
  return { filename, pdfBlob };
}
