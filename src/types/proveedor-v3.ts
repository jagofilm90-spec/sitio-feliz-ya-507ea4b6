export type RatingValue =
  | 'excelente'
  | 'bueno'
  | 'regular'
  | 'bajo'
  | 'critico'
  | 'sin_historial';

export interface ProveedorScore {
  score: number | null;
  rating: RatingValue;
  total_ocs: number;
  porcentaje_completas: number | null;
  peso_correcto: number | null;
  lead_time_promedio: number | null;
}

export interface ProveedorEnriquecido {
  id: string;
  nombre: string;
  nombre_comercial: string | null;
  rfc: string | null;
  categoria: string | null;
  nombre_contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
  notas_operativas: string | null;
  // Enriquecidos
  score: ProveedorScore;
  productos_count: number;
  ultima_oc_fecha: string | null;
  saldo_total: number;
  saldo_vencido: number;
  dias_vencido_max: number;
  faltantes_pendientes_30d: number;
  fecha_pago_proxima: string | null;
}

export interface PulseStats {
  saldosVencidosCount: number;
  saldosVencidosMonto: number;
  faltantesCount: number;
  ocsTransitoCount: number;
}

export type SortKey =
  | 'confiabilidad_desc'
  | 'nombre_asc'
  | 'ultima_compra_desc'
  | 'saldo_desc';

export type FiltroSaldo = 'todos' | 'con_saldo' | 'vencido' | 'sin_saldo';
export type FiltroEstado = 'todos' | 'activo' | 'inactivo';
export type FiltroConfiabilidad = 'todas' | RatingValue;
