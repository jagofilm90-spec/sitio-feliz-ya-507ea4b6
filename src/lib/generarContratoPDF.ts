/**
 * Generador de Contratos Laborales en PDF — ALMASA
 * Usa jsPDF para generar contrato multi-página con texto legal completo.
 */
import jsPDF from "jspdf";

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
}

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

const ANEXOS: Record<string, string> = {
  "Ayudante de Chofer": `ANEXO A — DESCRIPCIÓN DE PUESTO: AYUDANTE DE CHOFER (MACHETERO)

FUNCIONES:
I. Apoyar al chofer en la carga y descarga de mercancía en las instalaciones de la empresa y en los domicilios de los clientes.
II. Verificar que la mercancía cargada coincida con las remisiones y/o facturas correspondientes.
III. Acomodar y estibar correctamente la mercancía dentro de la unidad de reparto para evitar daños durante el traslado.
IV. Entregar la mercancía a los clientes conforme a las rutas asignadas, recabando las firmas de recibido en las remisiones o facturas.
V. Reportar cualquier anomalía, faltante o daño en la mercancía al chofer y/o al supervisor inmediato.
VI. Mantener limpia y ordenada el área de carga de la unidad.
VII. Apoyar en el conteo e inventario de mercancía cuando sea requerido.
VIII. Utilizar el equipo de protección personal proporcionado por la empresa durante las labores de carga y descarga.
IX. Cumplir con los horarios de salida y regreso establecidos para las rutas de reparto.
X. Respetar las normas de seguridad vial cuando se encuentre dentro o alrededor de la unidad de reparto.
XI. Realizar cualquier otra actividad análoga o conexa que le sea encomendada por su jefe inmediato.

RESPONSABILIDAD DEL PUESTO:
El trabajador es responsable solidariamente con el chofer de la mercancía que se le confía para su traslado y entrega, desde el momento de la carga hasta la entrega final al cliente o el retorno a las instalaciones de la empresa.

CLÁUSULA DE RESPONSABILIDAD POR MERCANCÍA:
I. El trabajador deberá verificar, junto con el chofer, el estado y cantidad de la mercancía al momento de la carga.
II. Cualquier faltante o daño detectado durante la ruta deberá ser reportado inmediatamente al supervisor.
III. En caso de pérdida o daño por negligencia comprobada del trabajador, este se obliga a cubrir el costo de la mercancía afectada.
IV. El trabajador firmará la hoja de carga como constancia de haber recibido la mercancía en buen estado.`,

  "Chofer": `ANEXO A — DESCRIPCIÓN DE PUESTO: CHOFER

FUNCIONES:
I. Conducir la unidad de reparto asignada de manera responsable y conforme a las leyes de tránsito aplicables.
II. Realizar la entrega de mercancía a los clientes de acuerdo con las rutas y horarios establecidos.
III. Verificar el buen estado de la unidad antes de cada salida, reportando cualquier falla mecánica o daño.
IV. Supervisar la carga y descarga de mercancía junto con el ayudante, asegurando que coincida con las remisiones.
V. Recabar las firmas de recibido de los clientes en las remisiones y/o facturas.
VI. Cobrar y resguardar el dinero de las ventas de contado conforme a las políticas de la empresa.
VII. Entregar la cobranza y documentación al finalizar cada ruta.
VIII. Mantener limpia y en buen estado la unidad asignada.
IX. Reportar cualquier incidente vial, robo, asalto o situación irregular ocurrida durante la ruta.
X. Respetar los límites de velocidad y las normas de seguridad vial en todo momento.
XI. No permitir el ascenso de personas ajenas a la empresa en la unidad de reparto.
XII. Realizar cualquier otra actividad análoga o conexa que le sea encomendada por su jefe inmediato.

RESPONSABILIDAD DEL PUESTO:
El chofer es el responsable principal de la unidad de reparto asignada, la mercancía transportada, la cobranza recaudada y la seguridad del personal a su cargo durante las rutas de reparto.

CLÁUSULA DE RESPONSABILIDAD POR MERCANCÍA:
I. El chofer deberá firmar la hoja de carga como responsable de la mercancía cargada en la unidad.
II. Cualquier faltante de mercancía o dinero al cierre de ruta será responsabilidad del chofer.
III. En caso de robo o asalto, el chofer deberá levantar el acta correspondiente ante el Ministerio Público.
IV. El chofer no podrá desviarse de las rutas establecidas sin autorización previa.
V. El uso de la unidad para fines personales queda estrictamente prohibido.
VI. El chofer es responsable de las multas de tránsito generadas por infracciones cometidas durante su conducción.`,

  "Almacenista": `ANEXO A — DESCRIPCIÓN DE PUESTO: ALMACENISTA

FUNCIONES:
I. Recibir, verificar y almacenar la mercancía que ingresa al almacén conforme a las órdenes de compra.
II. Preparar los pedidos de los clientes conforme a las remisiones y/o facturas emitidas por el área de ventas.
III. Realizar el acomodo y estiba de mercancía en las áreas designadas del almacén, respetando el sistema PEPS.
IV. Mantener el almacén limpio, ordenado y libre de plagas.
V. Realizar conteos físicos de inventario cuando sea requerido por la administración.
VI. Reportar cualquier faltante, sobrante o daño en la mercancía al supervisor.
VII. Operar el equipo de carga (patín hidráulico, montacargas, diablito) de manera segura.
VIII. Utilizar el equipo de protección personal proporcionado por la empresa.
IX. Apoyar en la carga y descarga de unidades de reparto.
X. Verificar las fechas de caducidad de los productos y reportar los que estén próximos a vencer.
XI. Llevar un registro actualizado de las entradas y salidas de mercancía.
XII. Colaborar en las fumigaciones y medidas de control de plagas.
XIII. Realizar cualquier otra actividad análoga o conexa que le sea encomendada por su jefe inmediato.

RESPONSABILIDAD DEL PUESTO:
El almacenista es responsable del correcto manejo, almacenamiento y control de la mercancía bajo su resguardo.

CLÁUSULA DE CONTROL DE INVENTARIO:
I. El almacenista deberá firmar las hojas de recepción de mercancía como constancia.
II. Cualquier discrepancia entre el inventario físico y el sistema deberá ser reportada inmediatamente.
III. El almacenista es responsable de la correcta rotación de productos (PEPS).
IV. Queda prohibido el consumo de productos del almacén sin autorización.
V. El almacenista deberá mantener actualizados los registros de entrada y salida.
VI. En caso de merma por negligencia comprobada, el almacenista se obliga a cubrir el costo.
VII. El almacenista participará en los inventarios físicos programados por la administración.`,

  "Secretaria": `ANEXO A — DESCRIPCIÓN DE PUESTO: SECRETARIA ADMINISTRATIVA

FUNCIONES:
I. Atender llamadas telefónicas y canalizarlas al área correspondiente.
II. Recibir, clasificar y distribuir la correspondencia y documentación.
III. Capturar pedidos de clientes en el sistema de la empresa.
IV. Elaborar remisiones, facturas y notas de crédito conforme a los pedidos autorizados.
V. Dar seguimiento a la cobranza de los clientes, emitiendo estados de cuenta y recordatorios.
VI. Archivar y organizar la documentación contable, fiscal y administrativa.
VII. Apoyar en la conciliación de cuentas por cobrar y cuentas por pagar.
VIII. Atender a los clientes y proveedores que se presenten en las instalaciones.
IX. Mantener actualizada la base de datos de clientes y proveedores.
X. Elaborar reportes administrativos cuando le sean solicitados.
XI. Realizar cualquier otra actividad análoga o conexa que le sea encomendada por su jefe inmediato.

RESPONSABILIDAD DEL PUESTO:
La secretaria administrativa es responsable del correcto manejo de la documentación y la información confidencial de la empresa.

CLÁUSULA DE CONTROL DE PEDIDOS:
I. La secretaria deberá verificar que los pedidos capturados coincidan con las solicitudes de los clientes.
II. Es responsable de la correcta emisión de facturas y remisiones.
III. Deberá dar seguimiento puntual a las cuentas por cobrar vencidas.
IV. La información confidencial de la empresa deberá ser tratada con absoluta discreción.`,

  "Vendedor": `ANEXO A — DESCRIPCIÓN DE PUESTO: VENDEDOR

FUNCIONES:
I. Visitar a los clientes asignados conforme a la ruta y calendario establecidos.
II. Ofrecer y promover los productos de la empresa a clientes actuales y potenciales.
III. Levantar pedidos y transmitirlos oportunamente al área administrativa para su captura.
IV. Informar a los clientes sobre precios, promociones y condiciones de venta vigentes.
V. Dar seguimiento a la entrega de los pedidos levantados y a la satisfacción de los clientes.
VI. Realizar la cobranza de los clientes que le sean asignados conforme a las políticas de crédito.
VII. Reportar las condiciones del mercado, la competencia y las necesidades de los clientes.
VIII. Prospectar nuevos clientes y mercados en la zona asignada.
IX. Mantener actualizada la información de contacto y crédito de sus clientes.
X. Cumplir con las metas de venta y cobranza establecidas.
XI. Realizar cualquier otra actividad análoga o conexa que le sea encomendada por su jefe inmediato.

RESPONSABILIDAD DEL PUESTO:
El vendedor es responsable del mantenimiento y crecimiento de la cartera de clientes asignada, así como de la cobranza generada por sus ventas.

CLÁUSULA DE CONTROL COMERCIAL:
I. El vendedor deberá respetar las listas de precios y políticas de descuento autorizadas.
II. Cualquier descuento fuera de política deberá ser autorizado previamente por la gerencia.
III. El vendedor es responsable de la cobranza de los clientes que surta.
IV. Queda prohibido otorgar crédito a clientes no autorizados.
V. El vendedor deberá reportar semanalmente su actividad de ventas y cobranza.`,
};

export async function generarContratoPDF(datos: DatosContrato): Promise<{ filename: string }> {
  const { empleado: emp, empresa } = datos;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginL = 25;
  const marginR = 25;
  const maxW = pageW - marginL - marginR;
  let y = 30;

  const esChoferOAyudante = emp.puesto === "Chofer" || emp.puesto === "Ayudante de Chofer";
  const sueldoBase = esChoferOAyudante && emp.premio_asistencia ? emp.sueldo_bruto - emp.premio_asistencia : emp.sueldo_bruto;

  const addPage = () => { pdf.addPage(); y = 25; };
  const checkPage = (needed: number) => { if (y + needed > pageH - 20) addPage(); };

  const writeTitle = (text: string, size = 14) => {
    checkPage(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(size);
    pdf.text(text, pageW / 2, y, { align: "center" });
    y += size * 0.5 + 2;
  };

  const writeParagraph = (text: string, size = 10, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxW);
    for (const line of lines) {
      checkPage(size * 0.4 + 1);
      pdf.text(line, marginL, y);
      y += size * 0.4 + 1;
    }
    y += 2;
  };

  const writeBold = (text: string, size = 10) => writeParagraph(text, size, true);
  const writeNormal = (text: string, size = 10) => writeParagraph(text, size, false);

  const fechaContrato = new Date(emp.fecha_contrato);
  const dia = fechaContrato.getDate();
  const mes = fechaContrato.toLocaleDateString("es-MX", { month: "long" });
  const anio = fechaContrato.getFullYear();
  const fechaAntig = new Date(emp.fecha_ingreso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  // ═══ ENCABEZADO ═══
  writeTitle("CONTRATO INDIVIDUAL DE TRABAJO POR TIEMPO INDETERMINADO");
  y += 3;

  writeNormal(`Contrato individual de trabajo por tiempo indeterminado que celebran por una parte ${empresa.razon_social}, representada por su Representante Legal, el C. ${empresa.representante_legal}, a quien en lo sucesivo se le denominará "LA EMPRESA", y por otra parte el C. ${emp.nombre_completo}, a quien se le denominará "EL TRABAJADOR", al tenor de las siguientes:`);
  y += 3;

  writeTitle("DECLARACIONES", 12);
  writeBold("I. Declara LA EMPRESA:");
  writeNormal(`a) Ser una persona moral constituida conforme a las leyes mexicanas, con RFC ${empresa.rfc} y domicilio en ${empresa.domicilio}.`);
  writeNormal(`b) Que su actividad principal es la compraventa y distribución de productos de abarrotes.`);
  writeNormal(`c) Que requiere los servicios del TRABAJADOR en el puesto de ${emp.puesto}.`);
  y += 2;

  writeBold("II. Declara EL TRABAJADOR:");
  writeNormal(`a) Llamarse ${emp.nombre_completo}, con RFC ${emp.rfc} y CURP ${emp.curp}.`);
  writeNormal(`b) Tener la capacidad legal para trabajar y que los datos proporcionados son verídicos.`);
  writeNormal(`c) Designar como beneficiario(a) al C. ${emp.beneficiario} para los efectos legales correspondientes.`);
  y += 3;

  writeTitle("CLÁUSULAS", 12);

  // PRIMERA
  writeBold("PRIMERA. OBJETO DEL CONTRATO.");
  writeNormal(`LA EMPRESA contrata los servicios del TRABAJADOR para desempeñar el puesto de ${emp.puesto}, cuyas funciones específicas se describen en el Anexo A que forma parte integral del presente contrato.`);
  y += 2;

  // SEGUNDA
  writeBold("SEGUNDA. LUGAR DE TRABAJO.");
  writeNormal(`El TRABAJADOR prestará sus servicios en las instalaciones de LA EMPRESA ubicadas en ${empresa.domicilio}, pudiendo ser comisionado a cualquier otro lugar que LA EMPRESA requiera dentro del territorio nacional.`);
  y += 2;

  // TERCERA
  writeBold("TERCERA. DURACIÓN DEL CONTRATO.");
  writeNormal(`El presente contrato es por tiempo indeterminado. Para efectos de antigüedad, se reconoce como fecha de ingreso el ${fechaAntig}.`);
  y += 2;

  // CUARTA — SALARIO
  writeBold("CUARTA. SALARIO.");
  if (esChoferOAyudante && emp.premio_asistencia) {
    writeNormal(`EL TRABAJADOR percibirá como sueldo la cantidad bruta de ${fmt(sueldoBase)} (${sueldoBase > 0 ? "pesos" : ""}) mensuales, más un Premio de Asistencia semanal de ${fmt(emp.premio_asistencia)}, siempre y cuando no tenga falta injustificada ni acumule 2 retardos en la semana. El pago se realizará de forma semanal los días sábados.`);
  } else {
    writeNormal(`EL TRABAJADOR percibirá como sueldo la cantidad bruta de ${fmt(emp.sueldo_bruto)} (pesos) mensuales. El pago se realizará de forma quincenal.`);
  }
  writeNormal(`El salario incluye el pago por el séptimo día de descanso. Los pagos se realizarán mediante transferencia bancaria a la cuenta que el TRABAJADOR designe.`);
  y += 2;

  // QUINTA
  writeBold("QUINTA. JORNADA DE TRABAJO.");
  writeNormal(`La jornada de trabajo será de lunes a sábado, en el horario que LA EMPRESA establezca según las necesidades del servicio, sin exceder los máximos legales establecidos en la Ley Federal del Trabajo.`);
  y += 2;

  // SEXTA
  writeBold("SEXTA. DÍA DE DESCANSO.");
  writeNormal(`El TRABAJADOR disfrutará de un día de descanso semanal, preferentemente el domingo, o el día que de común acuerdo se establezca.`);
  y += 2;

  // SÉPTIMA
  writeBold("SÉPTIMA. VACACIONES Y PRIMA VACACIONAL.");
  writeNormal(`EL TRABAJADOR tendrá derecho a un periodo anual de vacaciones conforme a lo establecido en el artículo 76 de la Ley Federal del Trabajo, con una prima vacacional del 25% sobre los salarios correspondientes.`);
  y += 2;

  // OCTAVA
  writeBold("OCTAVA. AGUINALDO.");
  writeNormal(`EL TRABAJADOR recibirá un aguinaldo anual equivalente a 15 días de salario, pagadero antes del 20 de diciembre de cada año.`);
  y += 2;

  // NOVENA
  writeBold("NOVENA. OBLIGACIONES DEL TRABAJADOR.");
  writeNormal(`a) Desempeñar sus funciones con diligencia, cuidado y esmero.`);
  writeNormal(`b) Cumplir con el Reglamento Interior de Trabajo y las políticas de LA EMPRESA.`);
  writeNormal(`c) Guardar confidencialidad sobre la información de LA EMPRESA, sus clientes y proveedores.`);
  writeNormal(`d) Cuidar los bienes, herramientas y equipo que le sean proporcionados.`);
  writeNormal(`e) Someterse a los exámenes médicos que LA EMPRESA determine.`);
  writeNormal(`f) Comunicar a LA EMPRESA cualquier cambio en sus datos personales.`);
  y += 2;

  // DÉCIMA
  writeBold("DÉCIMA. CAUSAS DE RESCISIÓN.");
  writeNormal(`Son causas de rescisión del presente contrato, sin responsabilidad para LA EMPRESA, las establecidas en el artículo 47 de la Ley Federal del Trabajo, así como el incumplimiento de las obligaciones descritas en el presente contrato y su Anexo A.`);
  y += 2;

  // DÉCIMA PRIMERA
  writeBold("DÉCIMA PRIMERA. SEGURIDAD SOCIAL.");
  writeNormal(`LA EMPRESA inscribirá al TRABAJADOR ante el Instituto Mexicano del Seguro Social (IMSS) conforme a la ley, desde el inicio de la relación laboral.`);
  y += 2;

  // DÉCIMA SEGUNDA
  writeBold("DÉCIMA SEGUNDA. JURISDICCIÓN.");
  writeNormal(`Para todo lo no previsto en el presente contrato, las partes se sujetarán a lo dispuesto en la Ley Federal del Trabajo. Para la interpretación y cumplimiento del presente contrato, las partes se someten a la jurisdicción de las autoridades laborales competentes de la Ciudad de México.`);
  y += 3;

  // FECHA Y FIRMA
  writeNormal(`Leído que fue el presente contrato por ambas partes y enteradas de su contenido y alcance legal, lo firman por duplicado en la Ciudad de México, a los ${dia} días del mes de ${mes} de ${anio}.`);
  y += 10;

  // Firmas
  checkPage(40);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);

  // Empresa
  pdf.text("POR LA EMPRESA", marginL + maxW * 0.25, y, { align: "center" });
  pdf.text("EL TRABAJADOR", marginL + maxW * 0.75, y, { align: "center" });
  y += 20;

  pdf.line(marginL, y, marginL + maxW * 0.4, y);
  pdf.line(marginL + maxW * 0.6, y, marginL + maxW, y);
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(empresa.representante_legal, marginL + maxW * 0.25, y, { align: "center" });
  pdf.text(emp.nombre_completo, marginL + maxW * 0.75, y, { align: "center" });
  y += 4;
  pdf.text("Representante Legal", marginL + maxW * 0.25, y, { align: "center" });
  y += 15;

  // Testigos
  checkPage(30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("TESTIGO 1", marginL + maxW * 0.25, y, { align: "center" });
  pdf.text("TESTIGO 2", marginL + maxW * 0.75, y, { align: "center" });
  y += 20;
  pdf.line(marginL, y, marginL + maxW * 0.4, y);
  pdf.line(marginL + maxW * 0.6, y, marginL + maxW, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Nombre y firma", marginL + maxW * 0.25, y, { align: "center" });
  pdf.text("Nombre y firma", marginL + maxW * 0.75, y, { align: "center" });

  // ═══ ANEXO A ═══
  addPage();
  const anexoTexto = ANEXOS[emp.puesto];
  if (anexoTexto) {
    writeTitle(`ANEXO A`, 14);
    y += 2;
    // Split by lines and render
    const lineas = anexoTexto.split("\n");
    for (const linea of lineas) {
      const trimmed = linea.trim();
      if (!trimmed) { y += 3; continue; }
      if (trimmed.startsWith("ANEXO A")) {
        writeBold(trimmed, 11);
      } else if (trimmed.startsWith("FUNCIONES:") || trimmed.startsWith("RESPONSABILIDAD") || trimmed.startsWith("CLÁUSULA")) {
        y += 2;
        writeBold(trimmed, 10);
      } else if (/^[IVX]+\./.test(trimmed)) {
        writeNormal(trimmed, 9.5);
      } else {
        writeNormal(trimmed, 9.5);
      }
    }
  }

  // Firma del anexo
  y += 10;
  checkPage(30);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  writeNormal(`Firma de conformidad del TRABAJADOR con el contenido del Anexo A:`);
  y += 15;
  pdf.line(marginL + maxW * 0.3, y, marginL + maxW * 0.7, y);
  y += 5;
  pdf.text(emp.nombre_completo, pageW / 2, y, { align: "center" });

  // Save
  const filename = `Contrato_${emp.nombre_completo.replace(/\s+/g, "_")}.pdf`;
  pdf.save(filename);
  return { filename };
}
