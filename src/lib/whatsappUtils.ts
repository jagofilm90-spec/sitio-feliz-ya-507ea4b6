/**
 * WhatsApp utilities for semi-automatic messaging via wa.me links
 */

/**
 * Formats a Mexican phone number for WhatsApp.
 * Removes spaces, dashes, parentheses. Adds country code 52 if missing.
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // If starts with 0, remove it
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  // If 10 digits (Mexican local), prepend 52
  if (cleaned.length === 10) {
    cleaned = "52" + cleaned;
  }

  // If starts with 521 and is 13 digits (old mobile format), remove the 1
  if (cleaned.startsWith("521") && cleaned.length === 13) {
    cleaned = "52" + cleaned.slice(3);
  }

  return cleaned;
}

/**
 * Generates a WhatsApp wa.me URL with pre-filled message
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

type WhatsAppNotificationType =
  | "pedido_confirmado"
  | "en_ruta"
  | "entregado"
  | "pedido_conciliado"
  | "pedido_conciliado_ajustado"
  | "vencimiento_proximo";

interface WhatsAppMessageData {
  pedidoFolio?: string;
  facturaFolio?: string;
  fechaVencimiento?: string;
  diasRestantes?: number;
  total?: number;
  choferNombre?: string;
  horaEstimada?: string;
  horaEntrega?: string;
  nombreReceptor?: string;
  fechaEntrega?: string;
  diasCredito?: string;
  clienteNombre?: string;
}

/**
 * Generates a plain-text WhatsApp message based on notification type
 */
export function generateWhatsAppMessage(
  tipo: WhatsAppNotificationType,
  data: WhatsAppMessageData
): string {
  const saludo = `Estimado/a ${data.clienteNombre || "cliente"}`;
  const firma = "\n\n— ALMASA (Abarrotes La Manita, S.A. de C.V.)";
  const banco = `\n\n📌 *Datos Bancarios*\nBeneficiario: ABARROTES LA MANITA, S.A. DE C.V.\nBanco: BBVA BANCOMER\nCuenta: 0442413388\nCLABE: 012180004424133881\nComprobante a: pagos@almasa.com.mx`;

  switch (tipo) {
    case "pedido_confirmado":
      return `${saludo},\n\n✅ Su pedido *${data.pedidoFolio}* ha sido confirmado y está siendo preparado.${data.total ? `\nTotal: $${data.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : ""}\n\nLe notificaremos cuando esté en camino.${firma}`;

    case "en_ruta":
      return `${saludo},\n\n🚚 ¡Su pedido *${data.pedidoFolio}* va en camino!${data.choferNombre ? `\nChofer: ${data.choferNombre}` : ""}${data.horaEstimada ? `\nHora estimada: ${data.horaEstimada}` : ""}\n\nPor favor tenga a alguien disponible para recibirlo.${firma}`;

    case "entregado":
      return `${saludo},\n\n✓ Su pedido *${data.pedidoFolio}* ha sido entregado exitosamente.${data.nombreReceptor ? `\nRecibió: ${data.nombreReceptor}` : ""}${data.horaEntrega ? `\nHora: ${data.horaEntrega}` : ""}${banco}${firma}`;

    case "pedido_conciliado":
      return `${saludo},\n\n📄 Su pedido *${data.pedidoFolio}* ha sido entregado y conciliado.${data.total ? `\nTotal: $${data.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : ""}${data.fechaEntrega ? `\nFecha de entrega: ${data.fechaEntrega}` : ""}${data.diasCredito ? `\nDías de crédito: ${data.diasCredito}` : ""}\n\nA partir de la fecha de entrega comienzan los días de crédito acordados.${banco}${firma}`;

    case "pedido_conciliado_ajustado":
      return `${saludo},\n\n📄 Su pedido *${data.pedidoFolio}* fue ajustado tras la entrega (devolución/faltante).${data.total ? `\nTotal ajustado: $${data.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : ""}${data.fechaEntrega ? `\nFecha de entrega: ${data.fechaEntrega}` : ""}${data.diasCredito ? `\nDías de crédito: ${data.diasCredito}` : ""}${banco}${firma}`;

    case "vencimiento_proximo":
      return `${saludo},\n\n⚠️ Recordatorio de pago:\nFactura: *${data.facturaFolio}*${data.total ? `\nMonto: $${data.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : ""}${data.fechaVencimiento ? `\nVencimiento: ${data.fechaVencimiento}` : ""}${data.diasRestantes !== undefined ? `\nDías restantes: ${data.diasRestantes}` : ""}${banco}${firma}`;

    default:
      return `${saludo}, tiene una nueva notificación de ALMASA respecto a su pedido.${firma}`;
  }
}

/**
 * Opens WhatsApp with the given phone and message.
 * Returns true if a URL was opened.
 */
export function openWhatsApp(phones: string[], message: string): boolean {
  if (!phones.length) return false;
  const url = generateWhatsAppUrl(phones[0], message);
  window.open(url, "_blank");
  return true;
}
