export const validateRFC = (rfc: string): boolean => {
  if (!rfc) return false;
  const pattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  return pattern.test(rfc.toUpperCase());
};

export const REGIMENES_FISCALES = [
  { codigo: "601", nombre: "General de Ley Personas Morales" },
  { codigo: "603", nombre: "Personas Morales con Fines no Lucrativos" },
  { codigo: "605", nombre: "Sueldos y Salarios" },
  { codigo: "606", nombre: "Arrendamiento" },
  { codigo: "608", nombre: "Demás ingresos" },
  { codigo: "610", nombre: "Residentes en el Extranjero" },
  { codigo: "611", nombre: "Ingresos por Dividendos" },
  { codigo: "612", nombre: "Personas Físicas con Actividades Empresariales" },
  { codigo: "614", nombre: "Ingresos por intereses" },
  { codigo: "616", nombre: "Sin obligaciones fiscales" },
  { codigo: "620", nombre: "Sociedades Cooperativas de Producción" },
  { codigo: "621", nombre: "Incorporación Fiscal" },
  { codigo: "622", nombre: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
  { codigo: "623", nombre: "Opcional para Grupos de Sociedades" },
  { codigo: "624", nombre: "Coordinados" },
  { codigo: "625", nombre: "Régimen Actividades Empresariales con plataformas tecnológicas" },
  { codigo: "626", nombre: "Régimen Simplificado de Confianza Personas Morales (RESICO P.M.)" },
];

export const CATEGORIAS_PROVEEDOR = [
  "Granos y semillas",
  "Cárnicos",
  "Lácteos",
  "Frutas y verduras",
  "Bebidas",
  "Abarrotes en general",
  "Empaques y embalaje",
  "Servicios",
  "Otra",
];

export const PLAZOS_PAGO = [
  { value: "pendiente_definir", label: "Por definir" },
  { value: "contado", label: "Contado" },
  { value: "8_dias", label: "8 días" },
  { value: "15_dias", label: "15 días" },
  { value: "30_dias", label: "30 días" },
  { value: "45_dias", label: "45 días" },
  { value: "60_dias", label: "60 días" },
  { value: "anticipado", label: "Anticipado" },
];

export const PLAZOS_PAGO_VALUES = PLAZOS_PAGO.map((p) => p.value);

export const METODOS_PAGO_OPCIONES = [
  "Transferencia",
  "Cheque",
  "Efectivo",
  "Tarjeta",
];

export interface ContactoForm {
  id?: string;
  nombre: string;
  puesto: string;
  telefono: string;
  email: string;
  es_principal: boolean;
  _isNew?: boolean;
  _toDelete?: boolean;
}

export interface ProveedorForm {
  nombre: string;
  nombre_comercial: string;
  categoria: string;
  rfc: string;
  regimen_fiscal: string;
  direccion: string;
  municipio: string;
  estado: string;
  termino_pago: string;
  metodos_pago_aceptados: string[];
  notas_operativas: string;
  contactos: ContactoForm[];
}

export const emptyProveedor = (): ProveedorForm => ({
  nombre: "",
  nombre_comercial: "",
  categoria: "",
  rfc: "",
  regimen_fiscal: "",
  direccion: "",
  municipio: "",
  estado: "",
  termino_pago: "15",
  metodos_pago_aceptados: [],
  notas_operativas: "",
  contactos: [
    {
      nombre: "",
      puesto: "",
      telefono: "",
      email: "",
      es_principal: true,
      _isNew: true,
    },
  ],
});

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const validateProveedor = (p: ProveedorForm): ValidationResult => {
  const errors: Record<string, string> = {};
  if (!p.nombre.trim()) errors.nombre = "Requerido";
  if (!p.categoria.trim()) errors.categoria = "Requerido";
  if (!p.rfc.trim()) errors.rfc = "Requerido";
  else if (!validateRFC(p.rfc)) errors.rfc = "RFC no válido";

  const contactosVivos = p.contactos.filter((c) => !c._toDelete);
  if (contactosVivos.length === 0) {
    errors.contactos = "Mínimo 1 contacto";
  } else {
    contactosVivos.forEach((c, i) => {
      if (!c.nombre.trim()) errors[`contacto_${i}_nombre`] = "Nombre requerido";
      if (!c.telefono.trim()) errors[`contacto_${i}_telefono`] = "Teléfono requerido";
    });
  }
  return { valid: Object.keys(errors).length === 0, errors };
};
