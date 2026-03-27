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
  const d = new Date(fecha + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
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
}

// ═══ ANEXOS POR PUESTO ═══

const ANEXOS: Record<string, string> = {
  "Ayudante de Chofer": `FUNCIONES:
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
  "Chofer": `FUNCIONES:
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
  "Almacenista": `FUNCIONES:
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
  "Secretaria": `FUNCIONES:
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
  "Vendedor": `FUNCIONES:
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

// ═══ GENERADOR DE CONTRATO ═══

export async function generarContratoPDF(datos: DatosContrato): Promise<{ filename: string }> {
  const { empleado: emp, empresa } = datos;
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
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(150);
    pdf.text(`Página ${pageNum}`, pageW / 2, pageH - 8, { align: "center" });
    pdf.text(`Firma del empleado: _______________`, pageW - mR, pageH - 8, { align: "right" });
    pdf.setFontSize(6);
    pdf.text(NOM, pageW - mR, pageH - 5, { align: "right" });
    pdf.setTextColor(0);
    pageNum++;
  };

  const addPage = () => { addFooter(); pdf.addPage(); y = 20; };
  const checkPage = (needed: number) => { if (y + needed > pageH - 18) addPage(); };

  const writeCenter = (text: string, size = 11, bold = true) => {
    checkPage(8); pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxW);
    for (const l of lines) { checkPage(5); pdf.text(l, pageW / 2, y, { align: "center" }); y += size * 0.42; }
    y += 2;
  };

  const write = (text: string, size = 9.5, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxW);
    for (const l of lines) { checkPage(4.5); pdf.text(l, mL, y); y += 4; }
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
  write('Adicionalmente, en virtud de la relación laboral que mantiene el EMPLEADO con la EMPRESA, el EMPLEADO reconoce y acuerda que éste pudiera entregar o recibir, debido a dichas relaciones, cierta información confidencial, incluyendo sin limitar, información relativa a las listas de precios, listas de clientes, listas de empleados, patentes, operaciones comerciales, procesamiento, métodos, diseños, diseños industriales, marcas, equipos, proyectos de inversión, expansión e investigaciones técnicas y científicas, sistemas y/o programas de computación, de contabilidad, de costos, de ventas, inventos o patentes, marcas y cualquier otro derecho de propiedad intelectual, distribución de productos, contratos, convenios, acuerdos comerciales, de confidencialidad, finanzas, seguros, planos, políticas, procedimientos, objetivos y propósitos, e información relativa a la publicidad y ventas de los productos (todo lo anterior conjuntamente referido como la "Información Confidencial"), reconociendo el EMPLEADO dicha Información Confidencial como Secretos Industriales y/o Comerciales de la EMPRESA y/o terceras partes, según sea el caso.');
  write("El EMPLEADO conviene expresamente en que la Información Confidencial que le sea proporcionada por la EMPRESA, contenida en cualquier medio, la mantendrá en lugar seguro, con el fin de que ésta no pueda ser copiada por algún tercero; de igual forma, el EMPLEADO se compromete a no copiar en todo o en parte, ni la resumirá, compendiará o trasladará a otro medio de objetivación perdurable, sin la previa autorización por escrito de la EMPRESA.");
  write("El EMPLEADO reconoce y acuerda todo lo anterior, en la inteligencia de que el incumplimiento a las obligaciones bajo esta Cláusula, será causal de rescisión del presente Contrato en los términos del artículo 47 de la Ley Federal del Trabajo y 210 y 211 del Código Penal Federal.");

  // DÉCIMA TERCERA (nota: no hay DÉCIMA SEGUNDA en el original)
  writeBold("DÉCIMA TERCERA. INSTRUMENTOS DE TRABAJO.");
  write("El EMPLEADO tiene conocimiento que todo el material, documentos, procesos, planes de trabajo y/o instrumentos y documentos proporcionados en virtud de la relación de trabajo, pertenecen a la EMPRESA, así como la información proporcionada u obtenida por el EMPLEADO con relación a sus obligaciones. Por lo tanto, dichos conceptos nunca deberán ser considerados como parte del salario del EMPLEADO, quien está de acuerdo en guardar en buenas condiciones y regresarlos a la EMPRESA cuando le sean solicitados o cuando se termine la relación de trabajo por cualquier causa o motivo.");
  write("A la terminación de la relación de trabajo e independientemente de la causa de esta, o en cualquier momento que la EMPRESA así lo solicite, el EMPLEADO se obliga a devolver la posesión física, material y jurídica de cualquier otro instrumento de trabajo a la EMPRESA en las mismas condiciones en que le fueron entregados, salvo el desgaste por el uso normal de los mismos.");

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
  y += 18;
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
  y += 15;
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
  pdf.save(filename);
  return { filename };
}

// ═══ AVISO DE PRIVACIDAD ═══

export async function generarAvisoPrivacidadPDF(params: { nombre_empleado: string; fecha: string }): Promise<{ filename: string }> {
  const logoBase64 = await loadLogoBase64();
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const mL = 25;
  const maxW = pageW - 50;
  let y = addLogo(pdf, logoBase64, pageW);

  const addPage = () => { pdf.addPage(); y = 20; };
  const checkPage = (n: number) => { if (y + n > pageH - 20) addPage(); };
  const writeTitle = (t: string, s = 12) => { checkPage(10); pdf.setFont("helvetica", "bold"); pdf.setFontSize(s); pdf.text(t, pageW / 2, y, { align: "center" }); y += s * 0.5 + 2; };
  const writeBold = (t: string, s = 9.5) => { pdf.setFont("helvetica", "bold"); pdf.setFontSize(s); for (const l of pdf.splitTextToSize(t, maxW)) { checkPage(5); pdf.text(l, mL, y); y += 4.5; } y += 1; };
  const writeNormal = (t: string, s = 9.5) => { pdf.setFont("helvetica", "normal"); pdf.setFontSize(s); for (const l of pdf.splitTextToSize(t, maxW)) { checkPage(5); pdf.text(l, mL, y); y += 4.5; } y += 1; };

  writeTitle("AVISO DE PRIVACIDAD INTEGRAL", 13);
  writeTitle("PARA EMPLEADOS Y CANDIDATOS", 11);
  y += 3;

  writeBold("RESPONSABLE DEL TRATAMIENTO DE DATOS PERSONALES");
  writeNormal("ABARROTES LA MANITA, S.A. DE C.V., con domicilio en Melchor Ocampo 59, Magdalena Mixiuhca, Venustiano Carranza, C.P. 15850, Ciudad de México, es responsable del uso, tratamiento y protección de sus datos personales, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y su Reglamento.");
  y += 2;
  writeBold("DATOS PERSONALES QUE SE RECABAN");
  writeNormal("Para las finalidades señaladas en el presente aviso, se podrán recabar los siguientes datos personales:");
  writeNormal("• Datos de identificación: nombre completo, fecha de nacimiento, CURP, RFC, INE, fotografía, estado civil.");
  writeNormal("• Datos de contacto: domicilio, teléfono fijo y móvil, correo electrónico.");
  writeNormal("• Datos laborales: historial laboral, puesto, antigüedad, evaluaciones de desempeño.");
  writeNormal("• Datos financieros: cuenta bancaria, CLABE interbancaria para depósito de nómina.");
  writeNormal("• Datos de seguridad social: número de seguridad social (NSS/IMSS).");
  writeNormal("• Datos de beneficiarios: nombre y datos de contacto de beneficiarios designados.");
  writeNormal("• Datos sensibles: tipo de sangre, alergias, información médica relevante para el desempeño del puesto.");
  y += 2;
  writeBold("FINALIDADES DEL TRATAMIENTO");
  writeNormal("Sus datos personales serán utilizados para las siguientes finalidades primarias:");
  writeNormal("I. Administración de la relación laboral (contratación, nómina, prestaciones).");
  writeNormal("II. Inscripción y trámites ante el IMSS, SAT, INFONAVIT y demás instituciones.");
  writeNormal("III. Elaboración de contratos, recibos de nómina y constancias laborales.");
  writeNormal("IV. Cumplimiento de obligaciones fiscales y de seguridad social.");
  writeNormal("V. Control de asistencia, puntualidad y evaluación de desempeño.");
  writeNormal("VI. Comunicación interna y gestión de emergencias.");
  writeNormal("VII. Contacto con beneficiarios en caso de emergencia o fallecimiento.");
  writeNormal("Finalidades secundarias:");
  writeNormal("VIII. Envío de comunicaciones internas, capacitaciones y eventos.");
  writeNormal("IX. Elaboración de estadísticas y reportes internos.");
  y += 2;
  writeBold("TRANSFERENCIAS DE DATOS");
  writeNormal("• IMSS, SAT, INFONAVIT — para cumplimiento de obligaciones legales.");
  writeNormal("• Instituciones bancarias — para pago de nómina.");
  writeNormal("• Aseguradoras — en caso de contar con seguro de vida o gastos médicos.");
  writeNormal("• Autoridades competentes — cuando sea requerido por mandato judicial o legal.");
  y += 2;
  writeBold("DERECHOS ARCO");
  writeNormal("Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales (Derechos ARCO). Para ejercer estos derechos, deberá presentar una solicitud por escrito dirigida al área de Recursos Humanos de ABARROTES LA MANITA, S.A. DE C.V., en el domicilio señalado, o al correo electrónico: 1904@almasa.com.mx");
  y += 2;
  writeBold("MODIFICACIONES AL AVISO DE PRIVACIDAD");
  writeNormal("El presente aviso de privacidad puede sufrir modificaciones, cambios o actualizaciones. Cualquier cambio será notificado personalmente o publicado en las instalaciones de la empresa.");
  y += 2;
  writeBold("CONSENTIMIENTO");
  writeNormal(`Al firmar el presente documento, el C. ${params.nombre_empleado.toUpperCase()} manifiesta que:`);
  y += 3;
  checkPage(15);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5);
  pdf.rect(mL, y - 3, 4, 4);
  pdf.text("Sí otorgo mi consentimiento para el tratamiento de mis datos personales conforme al presente aviso.", mL + 7, y);
  y += 8;
  pdf.rect(mL, y - 3, 4, 4);
  pdf.text("No otorgo mi consentimiento para las finalidades secundarias (puntos VIII y IX).", mL + 7, y);
  y += 12;
  checkPage(30);
  pdf.text("Nombre: ________________________________________", mL, y); y += 10;
  pdf.text("Firma: _________________________________________", mL, y); y += 10;
  pdf.text(`Fecha: ${params.fecha}`, mL, y);

  const filename = `Aviso_Privacidad_${params.nombre_empleado.replace(/\s+/g, "_")}.pdf`;
  pdf.save(filename);
  return { filename };
}
