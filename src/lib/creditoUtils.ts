/**
 * Utilidades para cálculos de crédito y plazos de pago
 * El plazo de crédito comienza a contar desde la fecha de ENTREGA real, no desde la creación del pedido
 */

export const CREDITO_DIAS: Record<string, number> = {
  'contado': 0,
  '8_dias': 8,
  '15_dias': 15,
  '30_dias': 30,
  '60_dias': 60
};

export const CREDITO_LABELS: Record<string, string> = {
  'contado': 'Contado',
  '8_dias': '8 días',
  '15_dias': '15 días',
  '30_dias': '30 días',
  '60_dias': '60 días'
};

export const CREDITO_OPTIONS = [
  { value: 'contado', label: 'Contado', description: 'Pago al entregar' },
  { value: '8_dias', label: '8 días', description: 'Vence 8 días después de entrega' },
  { value: '15_dias', label: '15 días', description: 'Vence 15 días después de entrega' },
  { value: '30_dias', label: '30 días', description: 'Vence 30 días después de entrega' },
  { value: '60_dias', label: '60 días', description: 'Vence 60 días después de entrega' },
] as const;

export type CreditoColor = 'gray' | 'orange' | 'green' | 'yellow' | 'red';

export interface EstadoCredito {
  tipo: 'no_entregado' | 'vigente' | 'por_vencer' | 'vencido' | 'pagado' | 'contado';
  diasDesdeCreacion: number;
  diasParaVencer: number | null;  // null si no entregado
  diasAtraso: number;
  fechaVencimiento: Date | null;
  color: CreditoColor;
  mensaje: string;
}

export function calcularEstadoCredito(params: {
  terminoCredito: string;
  fechaCreacion: Date;
  fechaEntregaReal: Date | null;
  pagado: boolean;
}): EstadoCredito {
  const { terminoCredito, fechaCreacion, fechaEntregaReal, pagado } = params;
  const hoy = new Date();
  
  // Reset hours to compare only dates
  const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const fechaCreacionNormalizada = new Date(
    fechaCreacion.getFullYear(), 
    fechaCreacion.getMonth(), 
    fechaCreacion.getDate()
  );
  
  // Días desde creación
  const diasDesdeCreacion = Math.floor(
    (hoyNormalizado.getTime() - fechaCreacionNormalizada.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Si ya está pagado
  if (pagado) {
    return {
      tipo: 'pagado',
      diasDesdeCreacion,
      diasParaVencer: null,
      diasAtraso: 0,
      fechaVencimiento: null,
      color: 'gray',
      mensaje: 'Pagado'
    };
  }
  
  // Si es contado
  if (terminoCredito === 'contado') {
    if (!fechaEntregaReal) {
      return {
        tipo: 'contado',
        diasDesdeCreacion,
        diasParaVencer: 0,
        diasAtraso: 0,
        fechaVencimiento: null,
        color: 'gray',
        mensaje: 'Contado'
      };
    }
    
    // Si ya se entregó pero es contado, calcular atraso desde entrega
    const fechaEntregaNormalizada = new Date(
      fechaEntregaReal.getFullYear(),
      fechaEntregaReal.getMonth(),
      fechaEntregaReal.getDate()
    );
    const diasDesdeEntrega = Math.floor(
      (hoyNormalizado.getTime() - fechaEntregaNormalizada.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return {
      tipo: 'contado',
      diasDesdeCreacion,
      diasParaVencer: 0,
      diasAtraso: diasDesdeEntrega > 0 ? diasDesdeEntrega : 0,
      fechaVencimiento: fechaEntregaReal,
      color: diasDesdeEntrega > 0 ? 'red' : 'yellow',
      mensaje: diasDesdeEntrega > 0 ? `${diasDesdeEntrega} días sin cobrar` : 'Cobrar al entregar'
    };
  }
  
  // Si no está entregado
  if (!fechaEntregaReal) {
    return {
      tipo: 'no_entregado',
      diasDesdeCreacion,
      diasParaVencer: null,
      diasAtraso: 0,
      fechaVencimiento: null,
      color: diasDesdeCreacion > 7 ? 'orange' : 'gray',
      mensaje: diasDesdeCreacion === 0 
        ? 'Creado hoy' 
        : diasDesdeCreacion === 1 
          ? '1 día sin entregar'
          : `${diasDesdeCreacion} días sin entregar`
    };
  }
  
  // Calcular fecha de vencimiento basada en fecha de entrega real
  const diasCredito = CREDITO_DIAS[terminoCredito] || 30;
  const fechaEntregaNormalizada = new Date(
    fechaEntregaReal.getFullYear(),
    fechaEntregaReal.getMonth(),
    fechaEntregaReal.getDate()
  );
  const fechaVencimiento = new Date(fechaEntregaNormalizada);
  fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);
  
  const diasParaVencer = Math.floor(
    (fechaVencimiento.getTime() - hoyNormalizado.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (diasParaVencer < 0) {
    // Vencido
    const diasAtraso = Math.abs(diasParaVencer);
    return {
      tipo: 'vencido',
      diasDesdeCreacion,
      diasParaVencer,
      diasAtraso,
      fechaVencimiento,
      color: 'red',
      mensaje: diasAtraso === 1 ? '1 día de atraso' : `${diasAtraso} días de atraso`
    };
  } else if (diasParaVencer === 0) {
    // Vence hoy
    return {
      tipo: 'por_vencer',
      diasDesdeCreacion,
      diasParaVencer: 0,
      diasAtraso: 0,
      fechaVencimiento,
      color: 'yellow',
      mensaje: 'Vence hoy'
    };
  } else if (diasParaVencer <= 3) {
    // Por vencer (próximos 3 días)
    return {
      tipo: 'por_vencer',
      diasDesdeCreacion,
      diasParaVencer,
      diasAtraso: 0,
      fechaVencimiento,
      color: 'yellow',
      mensaje: diasParaVencer === 1 ? 'Vence mañana' : `Vence en ${diasParaVencer} días`
    };
  } else {
    // Vigente
    return {
      tipo: 'vigente',
      diasDesdeCreacion,
      diasParaVencer,
      diasAtraso: 0,
      fechaVencimiento,
      color: 'green',
      mensaje: `Vence en ${diasParaVencer} días`
    };
  }
}

/**
 * Obtiene el color de Tailwind para el estado de crédito
 */
export function getCreditoColorClasses(color: CreditoColor): string {
  const colorClasses: Record<CreditoColor, string> = {
    gray: 'bg-muted text-muted-foreground',
    orange: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
    green: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
    red: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
  };
  
  return colorClasses[color];
}
