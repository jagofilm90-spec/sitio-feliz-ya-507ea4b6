// ALMASA·OS — Mock Email Data for Correos Module (Visual Shell)

export interface MockAccount {
  id: string;
  email: string;
  nombre: string;
  shortLabel: string;
  color: string;
  type: 'personal' | 'business';
  unread: number;
}

export interface MockAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'word' | 'image' | 'other';
  size: string;
}

export interface OrderLineItem {
  qty: number;
  description: string;
  unit: string;
}

export interface MockEmail {
  id: string;
  accountId: string;
  from: { name: string; email: string };
  to: { name: string; email: string };
  subject: string;
  preview: string;
  body: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments: MockAttachment[];
  detectedOrder?: OrderLineItem[];
  linkedClientId?: string;
  linkedSupplierId?: string;
  tags: string[];
  isUrgent?: boolean;
}

// ─── Accounts ─────────────────────────────────────────────
export const mockAccounts: MockAccount[] = [
  { id: 'personal', email: 'jagomez@almasa.com.mx', nombre: 'Jose A. Gómez', shortLabel: 'JG', color: '#0f0e0d', type: 'personal', unread: 3 },
  { id: 'all', email: '', nombre: 'Bandeja unificada', shortLabel: 'All', color: '#1a1917', type: 'business', unread: 0 },
  { id: 'pedidos', email: 'pedidos@almasa.com.mx', nombre: 'Pedidos', shortLabel: 'Pe', color: '#c41e3a', type: 'business', unread: 8 },
  { id: 'pagos', email: 'pagos@almasa.com.mx', nombre: 'Pagos', shortLabel: 'Pa', color: '#16a34a', type: 'business', unread: 4 },
  { id: 'cfdi', email: 'cfdi@almasa.com.mx', nombre: 'Facturas Proveedores', shortLabel: 'Fp', color: '#d97706', type: 'business', unread: 6 },
  { id: 'compras', email: 'compras@almasa.com.mx', nombre: 'Compras', shortLabel: 'Co', color: '#2563eb', type: 'business', unread: 3 },
  { id: 'banca', email: 'almasa@almasa.com.mx', nombre: 'Banca', shortLabel: 'Bi', color: '#7c3aed', type: 'business', unread: 2 },
  { id: 'general', email: '1904@almasa.com.mx', nombre: 'General', shortLabel: 'Ge', color: '#57534e', type: 'business', unread: 1 },
];

// ─── Filter Tabs by Account ──────────────────────────────
export const filterTabsByAccount: Record<string, { value: string; label: string; count: number }[]> = {
  personal: [
    { value: 'all', label: 'Todos', count: 18 },
    { value: 'unread', label: 'No leídos', count: 3 },
    { value: 'starred', label: 'Destacados', count: 4 },
    { value: 'important', label: 'Importantes', count: 2 },
  ],
  pedidos: [
    { value: 'all', label: 'Todos', count: 12 },
    { value: 'unconverted', label: 'Sin convertir', count: 5 },
    { value: 'converted', label: 'Convertidos', count: 4 },
    { value: 'unlinked', label: 'Sin vincular', count: 3 },
  ],
  pagos: [
    { value: 'all', label: 'Todos', count: 8 },
    { value: 'unreconciled', label: 'Sin conciliar', count: 4 },
    { value: 'reconciled', label: 'Conciliados', count: 4 },
  ],
  cfdi: [
    { value: 'all', label: 'Todos', count: 10 },
    { value: 'pending', label: 'Pendientes registro', count: 6 },
    { value: 'registered', label: 'Registrados', count: 4 },
  ],
  compras: [
    { value: 'all', label: 'Todos', count: 6 },
    { value: 'quotes', label: 'Cotizaciones', count: 3 },
    { value: 'orders', label: 'Órdenes', count: 3 },
  ],
  banca: [
    { value: 'all', label: 'Todos', count: 5 },
    { value: 'statements', label: 'Estados de cuenta', count: 2 },
    { value: 'alerts', label: 'Avisos', count: 3 },
  ],
  general: [
    { value: 'all', label: 'Todos', count: 4 },
    { value: 'unread', label: 'No leídos', count: 1 },
  ],
  all: [
    { value: 'all', label: 'Todos', count: 45 },
    { value: 'unread', label: 'No leídos', count: 27 },
    { value: 'starred', label: 'Destacados', count: 6 },
  ],
};

// ─── Mock Emails ──────────────────────────────────────────
const today = '2026-04-08';
const yesterday = '2026-04-07';
const thisWeek = '2026-04-06';

export const mockEmails: MockEmail[] = [
  // ── PEDIDOS ──
  {
    id: 'ped-001', accountId: 'pedidos',
    from: { name: 'María Eugenia Solís', email: 'mesolis@lecaroz.com.mx' },
    to: { name: 'Pedidos ALMASA', email: 'pedidos@almasa.com.mx' },
    subject: 'Pedido semanal Lecaroz — Semana 15',
    preview: 'Buenos días, les envío el pedido para la próxima semana. Favor de confirmar disponibilidad de salchichas tipo Viena...',
    body: `<p>Buenos días,</p><p>Les envío el pedido para la próxima semana. Favor de confirmar disponibilidad de los siguientes productos:</p><ul><li>200 kg — Salchicha tipo Viena</li><li>150 kg — Jamón Virginia rebanado</li><li>100 kg — Tocino ahumado</li><li>80 kg — Salami Génova</li><li>50 kg — Mortadela con pistache</li></ul><p>Entrega preferente: <strong>martes 14 de abril</strong> antes de las 7:00 AM en bodega Xalostoc.</p><p>Saludos cordiales,<br/>María Eugenia Solís<br/>Compras — Grupo Lecaroz</p>`,
    date: `${today}T09:15:00`, isRead: false, isStarred: true,
    hasAttachments: true,
    attachments: [{ id: 'att-1', name: 'Pedido_Lecaroz_S15.xlsx', type: 'excel', size: '45 KB' }],
    detectedOrder: [
      { qty: 200, description: 'Salchicha tipo Viena', unit: 'kg' },
      { qty: 150, description: 'Jamón Virginia rebanado', unit: 'kg' },
      { qty: 100, description: 'Tocino ahumado', unit: 'kg' },
      { qty: 80, description: 'Salami Génova', unit: 'kg' },
      { qty: 50, description: 'Mortadela con pistache', unit: 'kg' },
    ],
    linkedClientId: 'lecaroz-001',
    tags: ['pedido-semanal'], isUrgent: false,
  },
  {
    id: 'ped-002', accountId: 'pedidos',
    from: { name: 'Roberto Hernández', email: 'roberto@cremeriaslavaca.com' },
    to: { name: 'Pedidos ALMASA', email: 'pedidos@almasa.com.mx' },
    subject: 'RE: Pedido urgente — queso Oaxaca',
    preview: 'Buen día, necesitamos urgente 300 kg de queso Oaxaca para mañana temprano...',
    body: `<p>Buen día,</p><p>Necesitamos <strong>urgente</strong> lo siguiente para mañana temprano en sucursal Centro:</p><ul><li>300 kg — Queso Oaxaca (hebra)</li><li>50 kg — Crema ácida</li></ul><p>¿Tienen disponibilidad? Confirmamos pago contra entrega.</p><p>Roberto Hernández<br/>Cremerías La Vaca</p>`,
    date: `${today}T08:42:00`, isRead: false, isStarred: false,
    hasAttachments: false, attachments: [],
    detectedOrder: [
      { qty: 300, description: 'Queso Oaxaca (hebra)', unit: 'kg' },
      { qty: 50, description: 'Crema ácida', unit: 'kg' },
    ],
    linkedClientId: 'lavaca-001',
    tags: [], isUrgent: true,
  },
  {
    id: 'ped-003', accountId: 'pedidos',
    from: { name: 'Ana Lucía Mendoza', email: 'almendoza@hotelcaminoreal.com.mx' },
    to: { name: 'Pedidos ALMASA', email: 'pedidos@almasa.com.mx' },
    subject: 'Pedido banquete 19 abril — 450 pax',
    preview: 'Estimados, les comparto el pedido para el banquete del 19 de abril. Se trata de un evento corporativo para 450 personas...',
    body: `<p>Estimados,</p><p>Les comparto el pedido para el banquete del 19 de abril. Evento corporativo para 450 personas:</p><ul><li>180 kg — Filete de res</li><li>90 kg — Pechuga de pollo</li><li>60 kg — Salmón noruego</li><li>40 kg — Camarón U-15</li></ul><p>Favor de confirmar a más tardar el viernes.</p><p>Ana Lucía Mendoza<br/>Hotel Camino Real CDMX</p>`,
    date: `${today}T07:30:00`, isRead: false, isStarred: false,
    hasAttachments: true,
    attachments: [{ id: 'att-2', name: 'Menu_Banquete_19Abr.pdf', type: 'pdf', size: '1.2 MB' }],
    detectedOrder: [
      { qty: 180, description: 'Filete de res', unit: 'kg' },
      { qty: 90, description: 'Pechuga de pollo', unit: 'kg' },
      { qty: 60, description: 'Salmón noruego', unit: 'kg' },
      { qty: 40, description: 'Camarón U-15', unit: 'kg' },
    ],
    tags: ['banquete', 'evento'],
  },
  {
    id: 'ped-004', accountId: 'pedidos',
    from: { name: 'Don Chuy Distribuciones', email: 'ventas@donchuy.mx' },
    to: { name: 'Pedidos ALMASA', email: 'pedidos@almasa.com.mx' },
    subject: 'Solicitud de cotización — productos para cadena de taquerías',
    preview: 'Buenas tardes, representamos a una cadena de 12 taquerías en CDMX y nos interesa...',
    body: `<p>Buenas tardes,</p><p>Representamos a una cadena de 12 taquerías en CDMX y nos interesa conocer sus precios para:</p><ul><li>Bistec de res</li><li>Longaniza</li><li>Chorizo</li><li>Pastor marinado</li></ul><p>Volúmenes aproximados de 500 kg semanales por producto. ¿Podrían enviarnos cotización?</p>`,
    date: `${yesterday}T16:20:00`, isRead: true, isStarred: false,
    hasAttachments: false, attachments: [], tags: ['cotización'],
  },
  {
    id: 'ped-005', accountId: 'pedidos',
    from: { name: 'Restaurante La Cosecha', email: 'compras@lacosecha.rest' },
    to: { name: 'Pedidos ALMASA', email: 'pedidos@almasa.com.mx' },
    subject: 'Confirmación pedido #4521',
    preview: 'Confirmamos el pedido #4521. Entrega el miércoles en sucursal Polanco...',
    body: `<p>Confirmamos el pedido #4521. Entrega el miércoles en sucursal Polanco.</p><p>Gracias,<br/>La Cosecha</p>`,
    date: `${yesterday}T14:00:00`, isRead: true, isStarred: false,
    hasAttachments: false, attachments: [], tags: ['confirmado'],
  },

  // ── PAGOS ──
  {
    id: 'pag-001', accountId: 'pagos',
    from: { name: 'BBVA Empresas', email: 'notificaciones@bbva.mx' },
    to: { name: 'Pagos ALMASA', email: 'pagos@almasa.com.mx' },
    subject: 'Transferencia recibida — $187,450.00 MXN',
    preview: 'Se ha acreditado una transferencia SPEI por $187,450.00 MXN de GRUPO LECAROZ SA DE CV...',
    body: `<p>Se ha acreditado la siguiente transferencia en su cuenta:</p><p><strong>Monto:</strong> $187,450.00 MXN<br/><strong>Ordenante:</strong> GRUPO LECAROZ SA DE CV<br/><strong>Referencia:</strong> FAC-2026-0891<br/><strong>Fecha:</strong> 08/04/2026 09:30:22</p>`,
    date: `${today}T09:31:00`, isRead: false, isStarred: false,
    hasAttachments: false, attachments: [],
    linkedClientId: 'lecaroz-001',
    tags: ['spei', 'acreditada'],
  },
  {
    id: 'pag-002', accountId: 'pagos',
    from: { name: 'Santander Empresarial', email: 'avisos@santander.com.mx' },
    to: { name: 'Pagos ALMASA', email: 'pagos@almasa.com.mx' },
    subject: 'Depósito en cuenta — $52,300.00',
    preview: 'Se registró un depósito por $52,300.00 en su cuenta empresarial...',
    body: `<p>Se registró un depósito por <strong>$52,300.00 MXN</strong> en su cuenta empresarial terminación 4829.</p><p>Referencia: DEP-20260408-001</p>`,
    date: `${today}T08:15:00`, isRead: false, isStarred: false,
    hasAttachments: false, attachments: [], tags: ['deposito'],
  },
  {
    id: 'pag-003', accountId: 'pagos',
    from: { name: 'Contabilidad Lecaroz', email: 'contabilidad@lecaroz.com.mx' },
    to: { name: 'Pagos ALMASA', email: 'pagos@almasa.com.mx' },
    subject: 'Comprobante de pago — Facturas marzo',
    preview: 'Adjunto comprobante de transferencia por $187,450.00 correspondiente a facturas de marzo...',
    body: `<p>Adjunto comprobante de transferencia por $187,450.00 correspondiente a las siguientes facturas de marzo:</p><ul><li>FAC-2026-0891 — $98,200.00</li><li>FAC-2026-0905 — $89,250.00</li></ul>`,
    date: `${yesterday}T17:00:00`, isRead: true, isStarred: true,
    hasAttachments: true,
    attachments: [{ id: 'att-3', name: 'Comprobante_SPEI_Lecaroz.pdf', type: 'pdf', size: '320 KB' }],
    linkedClientId: 'lecaroz-001',
    tags: ['comprobante'],
  },

  // ── CFDI ──
  {
    id: 'cfdi-001', accountId: 'cfdi',
    from: { name: 'Tuny SA de CV', email: 'facturacion@tuny.com.mx' },
    to: { name: 'CFDI ALMASA', email: 'cfdi@almasa.com.mx' },
    subject: 'Factura TUN-A-24891 — $342,180.00',
    preview: 'Adjunto CFDI 4.0 de la factura TUN-A-24891 por compra de atún enlatado...',
    body: `<p>Estimado cliente,</p><p>Adjunto su factura electrónica CFDI 4.0:</p><p><strong>Folio:</strong> TUN-A-24891<br/><strong>Total:</strong> $342,180.00 MXN<br/><strong>Fecha:</strong> 07/04/2026</p>`,
    date: `${today}T10:00:00`, isRead: false, isStarred: false,
    hasAttachments: true,
    attachments: [
      { id: 'att-4', name: 'TUN-A-24891.pdf', type: 'pdf', size: '890 KB' },
      { id: 'att-5', name: 'TUN-A-24891.xml', type: 'other', size: '12 KB' },
    ],
    linkedSupplierId: 'tuny-001',
    tags: ['cfdi-4.0'],
  },
  {
    id: 'cfdi-002', accountId: 'cfdi',
    from: { name: 'McCormick de México', email: 'facturas@mccormick.com.mx' },
    to: { name: 'CFDI ALMASA', email: 'cfdi@almasa.com.mx' },
    subject: 'CFDI — Factura MC-2026-1205',
    preview: 'Le hacemos llegar su factura electrónica correspondiente a la orden de compra OC-2026-089...',
    body: `<p>Le hacemos llegar su factura electrónica correspondiente a la orden de compra OC-2026-089.</p><p><strong>Folio:</strong> MC-2026-1205<br/><strong>Total:</strong> $78,940.00 MXN</p>`,
    date: `${yesterday}T12:30:00`, isRead: false, isStarred: false,
    hasAttachments: true,
    attachments: [{ id: 'att-6', name: 'MC-2026-1205.pdf', type: 'pdf', size: '650 KB' }],
    tags: ['cfdi-4.0'],
  },
  {
    id: 'cfdi-003', accountId: 'cfdi',
    from: { name: 'Carbonell España', email: 'invoices@carbonell.es' },
    to: { name: 'CFDI ALMASA', email: 'cfdi@almasa.com.mx' },
    subject: 'Invoice #CB-EU-8823 — Olive oil shipment',
    preview: 'Please find attached the commercial invoice for your latest olive oil order...',
    body: `<p>Dear customer,</p><p>Please find attached the commercial invoice for order PO-2026-045:</p><p><strong>Invoice:</strong> CB-EU-8823<br/><strong>Total:</strong> €28,500.00 EUR</p>`,
    date: `${thisWeek}T09:00:00`, isRead: true, isStarred: false,
    hasAttachments: true,
    attachments: [{ id: 'att-7', name: 'CB-EU-8823_Invoice.pdf', type: 'pdf', size: '1.1 MB' }],
    linkedSupplierId: 'carbonell-001',
    tags: ['importación', 'eur'],
  },

  // ── COMPRAS ──
  {
    id: 'comp-001', accountId: 'compras',
    from: { name: 'Distribuidora El Sol', email: 'ventas@distribuidoraelsol.mx' },
    to: { name: 'Compras ALMASA', email: 'compras@almasa.com.mx' },
    subject: 'Cotización especias — Abril 2026',
    preview: 'Estimados, les enviamos nuestra cotización actualizada de especias para abril...',
    body: `<p>Estimados,</p><p>Les enviamos nuestra cotización actualizada de especias para abril 2026. Precios válidos hasta el 30 de abril.</p><p>Quedamos a sus órdenes para cualquier consulta.</p>`,
    date: `${today}T11:00:00`, isRead: false, isStarred: false,
    hasAttachments: true,
    attachments: [{ id: 'att-8', name: 'Cotizacion_Especias_Abr2026.xlsx', type: 'excel', size: '78 KB' }],
    tags: ['cotización'],
  },
  {
    id: 'comp-002', accountId: 'compras',
    from: { name: 'Empacadora Nacional', email: 'info@empacadoranacional.com' },
    to: { name: 'Compras ALMASA', email: 'compras@almasa.com.mx' },
    subject: 'RE: Solicitud de tripas naturales — disponibilidad',
    preview: 'Confirmamos disponibilidad de tripas naturales calibre 32-34mm. Tenemos 5,000 metros...',
    body: `<p>Confirmamos disponibilidad de tripas naturales calibre 32-34mm. Tenemos 5,000 metros en stock.</p><p>Precio: $185.00 MXN/metro. Entrega en 3 días hábiles.</p>`,
    date: `${yesterday}T15:45:00`, isRead: true, isStarred: false,
    hasAttachments: false, attachments: [], tags: ['disponibilidad'],
  },

  // ── BANCA ──
  {
    id: 'ban-001', accountId: 'banca',
    from: { name: 'BBVA Empresas', email: 'empresas@bbva.mx' },
    to: { name: 'ALMASA', email: 'almasa@almasa.com.mx' },
    subject: 'Estado de cuenta — Marzo 2026',
    preview: 'Adjunto encontrará su estado de cuenta del mes de marzo 2026...',
    body: `<p>Estimado cliente,</p><p>Adjunto encontrará su estado de cuenta del mes de marzo 2026.</p><p>Saldo final: <strong>$2,847,320.45 MXN</strong></p>`,
    date: `${today}T06:00:00`, isRead: false, isStarred: false,
    hasAttachments: true,
    attachments: [{ id: 'att-9', name: 'EdoCta_BBVA_Mar2026.pdf', type: 'pdf', size: '2.4 MB' }],
    tags: ['estado-cuenta'],
  },
  {
    id: 'ban-002', accountId: 'banca',
    from: { name: 'Santander Empresarial', email: 'banca@santander.com.mx' },
    to: { name: 'ALMASA', email: 'almasa@almasa.com.mx' },
    subject: 'Aviso: Línea de crédito — renovación aprobada',
    preview: 'Le informamos que su línea de crédito revolvente por $5,000,000 ha sido renovada...',
    body: `<p>Le informamos que su línea de crédito revolvente por <strong>$5,000,000.00 MXN</strong> ha sido renovada exitosamente por 12 meses más.</p>`,
    date: `${yesterday}T10:00:00`, isRead: true, isStarred: true,
    hasAttachments: true,
    attachments: [{ id: 'att-10', name: 'Carta_Renovacion_LC.pdf', type: 'pdf', size: '450 KB' }],
    tags: ['crédito'],
  },

  // ── GENERAL ──
  {
    id: 'gen-001', accountId: 'general',
    from: { name: 'CANACINTRA', email: 'comunicacion@canacintra.org.mx' },
    to: { name: 'ALMASA 1904', email: '1904@almasa.com.mx' },
    subject: 'Invitación: Expo Alimentaria 2026',
    preview: 'Estimado asociado, lo invitamos a participar en la Expo Alimentaria 2026 que se realizará...',
    body: `<p>Estimado asociado,</p><p>Lo invitamos a participar en la <strong>Expo Alimentaria 2026</strong> que se realizará del 15 al 18 de mayo en el Centro Citibanamex.</p><p>Stand disponible desde $45,000 MXN.</p>`,
    date: `${today}T08:00:00`, isRead: false, isStarred: false,
    hasAttachments: true,
    attachments: [{ id: 'att-11', name: 'Expo_Alimentaria_2026.pdf', type: 'pdf', size: '3.2 MB' }],
    tags: ['evento'],
  },

  // ── PERSONAL ──
  {
    id: 'per-001', accountId: 'personal',
    from: { name: 'BBVA Personal', email: 'notificaciones@bbva.mx' },
    to: { name: 'Jose Gómez', email: 'jagomez@almasa.com.mx' },
    subject: 'Movimiento en tu tarjeta terminación 8842',
    preview: 'Se realizó un cargo por $3,250.00 MXN en Amazon.com.mx...',
    body: `<p>Se realizó un cargo en tu tarjeta:</p><p><strong>Monto:</strong> $3,250.00 MXN<br/><strong>Comercio:</strong> Amazon.com.mx<br/><strong>Fecha:</strong> 08/04/2026</p>`,
    date: `${today}T10:30:00`, isRead: false, isStarred: false,
    hasAttachments: false, attachments: [], tags: ['banco'],
  },
  {
    id: 'per-002', accountId: 'personal',
    from: { name: 'Laura Gómez', email: 'laurag@gmail.com' },
    to: { name: 'Jose', email: 'jagomez@almasa.com.mx' },
    subject: 'Cena del viernes',
    preview: 'Papi, ¿a qué hora llegan el viernes? Mamá quiere saber si traes el vino...',
    body: `<p>Papi, ¿a qué hora llegan el viernes?</p><p>Mamá quiere saber si traes el vino o lo compramos acá. También invitamos a los Martínez.</p><p>Besos,<br/>Laura</p>`,
    date: `${today}T07:45:00`, isRead: false, isStarred: true,
    hasAttachments: false, attachments: [], tags: ['familia'],
  },
  {
    id: 'per-003', accountId: 'personal',
    from: { name: 'CP Ricardo Fuentes', email: 'rfuentes@contadoresfuentes.mx' },
    to: { name: 'Jose Gómez', email: 'jagomez@almasa.com.mx' },
    subject: 'Declaración anual 2025 — lista para firma',
    preview: 'Estimado Jose, tu declaración anual 2025 está lista. Adjunto el borrador para tu revisión...',
    body: `<p>Estimado Jose,</p><p>Tu declaración anual 2025 está lista. Adjunto el borrador para tu revisión antes de presentarla ante el SAT.</p><p>ISR a favor: <strong>$28,450.00</strong></p>`,
    date: `${yesterday}T18:00:00`, isRead: false, isStarred: false,
    hasAttachments: true,
    attachments: [{ id: 'att-12', name: 'DeclaracionAnual_2025_JAG.pdf', type: 'pdf', size: '1.8 MB' }],
    tags: ['importante'],
  },
  {
    id: 'per-004', accountId: 'personal',
    from: { name: 'LinkedIn', email: 'noreply@linkedin.com' },
    to: { name: 'Jose Gómez', email: 'jagomez@almasa.com.mx' },
    subject: '5 nuevas conexiones te enviaron solicitudes',
    preview: 'Carlos Ramírez y 4 personas más quieren conectar contigo...',
    body: `<p>Carlos Ramírez y 4 personas más quieren conectar contigo en LinkedIn.</p>`,
    date: `${yesterday}T12:00:00`, isRead: true, isStarred: false,
    hasAttachments: false, attachments: [], tags: [],
  },
  {
    id: 'per-005', accountId: 'personal',
    from: { name: 'Cámara de Comercio CDMX', email: 'info@canaco.com.mx' },
    to: { name: 'Jose Gómez', email: 'jagomez@almasa.com.mx' },
    subject: 'Recordatorio: Asamblea General 15 de abril',
    preview: 'Le recordamos que la Asamblea General Ordinaria se llevará a cabo...',
    body: `<p>Le recordamos que la Asamblea General Ordinaria se llevará a cabo el 15 de abril a las 10:00 AM en nuestras instalaciones.</p>`,
    date: `${thisWeek}T09:00:00`, isRead: true, isStarred: false,
    hasAttachments: false, attachments: [], tags: [],
  },
];

// ─── Context Panel Mock Data ──────────────────────────────
export interface MockClientContext {
  id: string;
  nombre: string;
  rfc: string;
  clienteSince: string;
  direccion: string;
  saldoActual: number;
  plazo: number;
  vendedor: string;
  comision: number;
  ruta: string;
  diasEntrega: string;
  alertas: { type: 'crimson' | 'amber' | 'info'; text: string }[];
  ultimosPedidos: { folio: string; fecha: string; total: number; status: string }[];
}

export const mockClientContexts: Record<string, MockClientContext> = {
  'lecaroz-001': {
    id: 'lecaroz-001', nombre: 'Grupo Lecaroz SA de CV', rfc: 'GLE-040312-KJ8',
    clienteSince: '2015', direccion: 'Av. Industrial 1250, Xalostoc, Ecatepec',
    saldoActual: 342180, plazo: 30, vendedor: 'Carlos Ramírez', comision: 3.5,
    ruta: 'Ruta Ecatepec Norte', diasEntrega: 'Lun, Mié, Vie',
    alertas: [
      { type: 'crimson', text: 'Factura FAC-2026-0891 vencida — $98,200.00 — 8 días' },
    ],
    ultimosPedidos: [
      { folio: 'PED-4892', fecha: '01/04/2026', total: 187450, status: 'Entregado' },
      { folio: 'PED-4756', fecha: '25/03/2026', total: 203100, status: 'Entregado' },
      { folio: 'PED-4621', fecha: '18/03/2026', total: 165800, status: 'Entregado' },
    ],
  },
  'lavaca-001': {
    id: 'lavaca-001', nombre: 'Cremerías La Vaca SA de CV', rfc: 'CLV-091123-AB4',
    clienteSince: '2019', direccion: 'Calle Orizaba 85, Roma Norte, CDMX',
    saldoActual: 52300, plazo: 15, vendedor: 'Ana Torres', comision: 4.0,
    ruta: 'Ruta Roma-Condesa', diasEntrega: 'Mar, Jue',
    alertas: [],
    ultimosPedidos: [
      { folio: 'PED-4880', fecha: '05/04/2026', total: 52300, status: 'En camino' },
      { folio: 'PED-4790', fecha: '29/03/2026', total: 48700, status: 'Entregado' },
    ],
  },
};

export interface MockSupplierContext {
  id: string;
  nombre: string;
  rfc: string;
  tipo: string;
  saldoPorPagar: number;
  proximoVencimiento: string;
  creditoOtorgado: number;
  ultimasCompras: { folio: string; fecha: string; monto: number; estado: string }[];
}

export const mockSupplierContexts: Record<string, MockSupplierContext> = {
  'tuny-001': {
    id: 'tuny-001', nombre: 'Tuny SA de CV', rfc: 'TUN-840215-QA9',
    tipo: 'Nacional', saldoPorPagar: 342180, proximoVencimiento: '15/04/2026',
    creditoOtorgado: 500000,
    ultimasCompras: [
      { folio: 'OC-2026-112', fecha: '03/04/2026', monto: 342180, estado: 'Recibida' },
      { folio: 'OC-2026-098', fecha: '20/03/2026', monto: 298500, estado: 'Recibida' },
    ],
  },
  'carbonell-001': {
    id: 'carbonell-001', nombre: 'Carbonell España SL', rfc: 'N/A',
    tipo: 'Importación', saldoPorPagar: 685000, proximoVencimiento: '30/04/2026',
    creditoOtorgado: 1000000,
    ultimasCompras: [
      { folio: 'OC-2026-045', fecha: '15/03/2026', monto: 685000, estado: 'En tránsito' },
    ],
  },
};

// ─── Toolbar Actions by Account ───────────────────────────
export interface ToolbarAction {
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
  color?: string;
  dotColor?: string;
}

export const toolbarActionsByAccount: Record<string, ToolbarAction[]> = {
  personal: [
    { label: 'Responder', variant: 'primary' },
    { label: 'Reenviar', variant: 'secondary' },
    { label: 'Destacar', variant: 'ghost' },
    { label: 'Archivar', variant: 'ghost' },
    { label: 'Eliminar', variant: 'ghost' },
  ],
  pedidos: [
    { label: 'Convertir a pedido', variant: 'primary', dotColor: '#c41e3a' },
    { label: 'Crear cotización', variant: 'secondary' },
    { label: 'Asignar vendedor', variant: 'secondary' },
    { label: 'Archivar', variant: 'ghost' },
    { label: 'Eliminar', variant: 'ghost' },
  ],
  pagos: [
    { label: 'Marcar como pagado', variant: 'primary', dotColor: '#16a34a' },
    { label: 'Conciliar con factura', variant: 'secondary' },
    { label: 'Generar recibo', variant: 'secondary' },
    { label: 'Archivar', variant: 'ghost' },
  ],
  cfdi: [
    { label: 'Registrar en CxP', variant: 'primary', dotColor: '#d97706' },
    { label: 'Validar SAT', variant: 'secondary' },
    { label: 'Asignar a compra', variant: 'secondary' },
    { label: 'Archivar', variant: 'ghost' },
  ],
  compras: [
    { label: 'Crear orden de compra', variant: 'primary', dotColor: '#2563eb' },
    { label: 'Vincular proveedor', variant: 'secondary' },
    { label: 'Solicitar cotización', variant: 'secondary' },
    { label: 'Archivar', variant: 'ghost' },
  ],
  banca: [
    { label: 'Registrar movimiento', variant: 'primary', dotColor: '#7c3aed' },
    { label: 'Vincular cuenta', variant: 'secondary' },
    { label: 'Archivar', variant: 'ghost' },
  ],
  general: [
    { label: 'Responder', variant: 'secondary' },
    { label: 'Reenviar a buzón…', variant: 'secondary' },
    { label: 'Archivar', variant: 'ghost' },
  ],
};

// ─── Keyboard Shortcuts ───────────────────────────────────
export const keyboardShortcuts = [
  { key: '⌘K', description: 'Buscar' },
  { key: 'J', description: 'Siguiente correo' },
  { key: 'K', description: 'Anterior correo' },
  { key: 'E', description: 'Archivar' },
  { key: '#', description: 'Eliminar' },
  { key: 'R', description: 'Responder' },
  { key: 'A', description: 'Responder a todos' },
  { key: 'F', description: 'Reenviar' },
  { key: 'S', description: 'Destacar' },
  { key: 'U', description: 'Marcar no leído' },
  { key: '1-7', description: 'Saltar a cuenta' },
  { key: '?', description: 'Mostrar atajos' },
  { key: '⌘Enter', description: 'Enviar (en composer)' },
];
