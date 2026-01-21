import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AlertaLicencia {
  id: string;
  empleado_nombre: string;
  empleado_puesto: string;
  fecha_vencimiento: string;
  dias_restantes: number;
  vencida: boolean;
  vehiculo_asignado?: string;
}

interface AlertaVerificacion {
  id: string;
  vehiculo_nombre: string;
  vehiculo_placa: string;
  periodo_inicio: string;
  periodo_fin: string;
  dias_restantes: number;
  en_periodo: boolean;
}

interface AlertaDocumento {
  id: string;
  vehiculo_id: string;
  vehiculo_nombre: string;
  vehiculo_placa: string;
  tipo: 'poliza' | 'tarjeta_circulacion';
  fecha_vencimiento: string;
  dias_restantes: number;
  vencido: boolean;
}

interface CheckupPendiente {
  id: string;
  vehiculo_nombre: string;
  vehiculo_placa: string;
  fecha_checkup: string;
  prioridad: string;
  fallas_detectadas: string;
  items_fallados: number;
}

export interface AlertasFlotillaData {
  alertasLicencias: AlertaLicencia[];
  alertasVerificaciones: AlertaVerificacion[];
  alertasDocumentos: AlertaDocumento[];
  checkupsPendientes: CheckupPendiente[];
  totalAlertas: number;
}

export const useAlertasFlotilla = () => {
  const [alertas, setAlertas] = useState<AlertasFlotillaData>({
    alertasLicencias: [],
    alertasVerificaciones: [],
    alertasDocumentos: [],
    checkupsPendientes: [],
    totalAlertas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Record<string, string>>({});

  const cargarConfiguracion = async () => {
    const { data } = await supabase
      .from("configuracion_flotilla")
      .select("clave, valor");
    
    if (data) {
      const configMap: Record<string, string> = {};
      data.forEach(item => {
        configMap[item.clave] = item.valor;
      });
      setConfig(configMap);
      return configMap;
    }
    return {};
  };

  const cargarAlertasLicencias = async (diasAlerta: number): Promise<AlertaLicencia[]> => {
    try {
      const fechaActual = new Date();
      
      // Obtener choferes activos
      const { data: empleados } = await supabase
        .from("empleados")
        .select("id, nombre_completo, puesto")
        .eq("activo", true)
        .in("puesto", ["Chofer", "Ayudante de Chofer"]);

      if (!empleados?.length) return [];

      const empleadosIds = empleados.map(e => e.id);

      // Obtener documentos de licencias
      const { data: documentos } = await supabase
        .from("empleados_documentos")
        .select("empleado_id, fecha_vencimiento")
        .in("empleado_id", empleadosIds)
        .eq("tipo_documento", "licencia_conducir")
        .not("fecha_vencimiento", "is", null);

      if (!documentos) return [];

      // Obtener vehículos asignados
      const { data: vehiculos } = await supabase
        .from("vehiculos")
        .select("id, nombre, chofer_asignado_id")
        .eq("activo", true)
        .not("chofer_asignado_id", "is", null);

      const alertas: AlertaLicencia[] = [];

      documentos.forEach(doc => {
        const empleado = empleados.find(e => e.id === doc.empleado_id);
        if (!empleado || !doc.fecha_vencimiento) return;

        const fechaVencimiento = new Date(doc.fecha_vencimiento);
        
        // Excluir licencias permanentes (año 2099)
        if (fechaVencimiento.getFullYear() === 2099) return;

        const diasRestantes = Math.ceil((fechaVencimiento.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24));
        
        // Mostrar si vence dentro de los días configurados o ya venció
        if (diasRestantes <= diasAlerta) {
          const vehiculoAsignado = vehiculos?.find(v => v.chofer_asignado_id === doc.empleado_id);
          
          alertas.push({
            id: `${doc.empleado_id}-licencia`,
            empleado_nombre: empleado.nombre_completo,
            empleado_puesto: empleado.puesto,
            fecha_vencimiento: doc.fecha_vencimiento,
            dias_restantes: diasRestantes,
            vencida: diasRestantes < 0,
            vehiculo_asignado: vehiculoAsignado?.nombre,
          });
        }
      });

      return alertas.sort((a, b) => a.dias_restantes - b.dias_restantes);
    } catch (error) {
      console.error("Error cargando alertas de licencias:", error);
      return [];
    }
  };

  const cargarAlertasVerificaciones = async (diasAlerta: number): Promise<AlertaVerificacion[]> => {
    try {
      const fechaActual = new Date();
      
      // Obtener vehículos activos con placa
      const { data: vehiculos } = await supabase
        .from("vehiculos")
        .select("id, nombre, placa, tipo_tarjeta_circulacion")
        .eq("activo", true)
        .not("placa", "is", null);

      if (!vehiculos?.length) return [];

      const alertas: AlertaVerificacion[] = [];
      const mesActual = fechaActual.getMonth() + 1;
      const anioActual = fechaActual.getFullYear();

      vehiculos.forEach(vehiculo => {
        // Solo verificaciones estatales (las federales son diferentes)
        if (vehiculo.tipo_tarjeta_circulacion === 'federal') return;
        if (!vehiculo.placa) return;

        // Obtener último dígito de la placa
        const ultimoDigito = parseInt(vehiculo.placa.replace(/\D/g, '').slice(-1));
        if (isNaN(ultimoDigito)) return;

        // Calcular período de verificación basado en último dígito (EdoMex/CDMX)
        let periodoInicio: number, periodoFin: number;
        
        // Primer semestre
        if ([5, 6].includes(ultimoDigito)) {
          periodoInicio = 1; periodoFin = 2; // Enero-Febrero
        } else if ([7, 8].includes(ultimoDigito)) {
          periodoInicio = 3; periodoFin = 4; // Marzo-Abril
        } else if ([3, 4].includes(ultimoDigito)) {
          periodoInicio = 5; periodoFin = 6; // Mayo-Junio
        } else if ([1, 2].includes(ultimoDigito)) {
          periodoInicio = 7; periodoFin = 8; // Julio-Agosto (segundo semestre)
        } else { // 9, 0
          periodoInicio = 9; periodoFin = 10; // Sep-Oct
        }

        // Verificar si estamos cerca del período o en él
        const diasHastaPeriodo = (periodoInicio - mesActual) * 30;
        const enPeriodo = mesActual >= periodoInicio && mesActual <= periodoFin;
        
        if (enPeriodo || (diasHastaPeriodo > 0 && diasHastaPeriodo <= diasAlerta)) {
          alertas.push({
            id: vehiculo.id,
            vehiculo_nombre: vehiculo.nombre,
            vehiculo_placa: vehiculo.placa,
            periodo_inicio: `${anioActual}-${String(periodoInicio).padStart(2, '0')}-01`,
            periodo_fin: `${anioActual}-${String(periodoFin).padStart(2, '0')}-28`,
            dias_restantes: enPeriodo ? 0 : diasHastaPeriodo,
            en_periodo: enPeriodo,
          });
        }
      });

      return alertas;
    } catch (error) {
      console.error("Error cargando alertas de verificaciones:", error);
      return [];
    }
  };

  const cargarAlertasDocumentos = async (diasAlerta: number): Promise<AlertaDocumento[]> => {
    try {
      const fechaActual = new Date();
      
      const { data: vehiculos } = await supabase
        .from("vehiculos")
        .select("id, nombre, placa, poliza_seguro_vencimiento, tarjeta_circulacion_vencimiento, tipo_tarjeta_circulacion")
        .eq("activo", true);

      if (!vehiculos?.length) return [];

      const alertas: AlertaDocumento[] = [];

      vehiculos.forEach(vehiculo => {
        // Verificar póliza de seguro
        if (vehiculo.poliza_seguro_vencimiento) {
          const fechaPoliza = new Date(vehiculo.poliza_seguro_vencimiento);
          const diasRestantes = Math.ceil((fechaPoliza.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diasRestantes <= diasAlerta) {
            alertas.push({
              id: `${vehiculo.id}-poliza`,
              vehiculo_id: vehiculo.id,
              vehiculo_nombre: vehiculo.nombre,
              vehiculo_placa: vehiculo.placa || 'Sin placa',
              tipo: 'poliza',
              fecha_vencimiento: vehiculo.poliza_seguro_vencimiento,
              dias_restantes: diasRestantes,
              vencido: diasRestantes < 0,
            });
          }
        }

        // Verificar tarjeta de circulación (solo estatales)
        if (vehiculo.tarjeta_circulacion_vencimiento && vehiculo.tipo_tarjeta_circulacion !== 'federal') {
          const fechaTarjeta = new Date(vehiculo.tarjeta_circulacion_vencimiento);
          const diasRestantes = Math.ceil((fechaTarjeta.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diasRestantes <= diasAlerta) {
            alertas.push({
              id: `${vehiculo.id}-tarjeta`,
              vehiculo_id: vehiculo.id,
              vehiculo_nombre: vehiculo.nombre,
              vehiculo_placa: vehiculo.placa || 'Sin placa',
              tipo: 'tarjeta_circulacion',
              fecha_vencimiento: vehiculo.tarjeta_circulacion_vencimiento,
              dias_restantes: diasRestantes,
              vencido: diasRestantes < 0,
            });
          }
        }
      });

      return alertas.sort((a, b) => a.dias_restantes - b.dias_restantes);
    } catch (error) {
      console.error("Error cargando alertas de documentos:", error);
      return [];
    }
  };

  const cargarCheckupsPendientes = async (): Promise<CheckupPendiente[]> => {
    try {
      const { data: checkups } = await supabase
        .from("vehiculos_checkups")
        .select(`
          id,
          fecha_checkup,
          prioridad,
          fallas_detectadas,
          frenos_ok, luces_ok, llantas_ok, aceite_ok, anticongelante_ok,
          espejos_ok, limpiadores_ok, bateria_ok, direccion_ok, suspension_ok,
          escape_ok, cinturones_ok,
          vehiculos:vehiculo_id (nombre, placa)
        `)
        .eq("resuelto", false)
        .eq("requiere_reparacion", true)
        .order("fecha_checkup", { ascending: false });

      if (!checkups?.length) return [];

      return checkups.map(checkup => {
        const items = [
          checkup.frenos_ok, checkup.luces_ok, checkup.llantas_ok, checkup.aceite_ok,
          checkup.anticongelante_ok, checkup.espejos_ok, checkup.limpiadores_ok,
          checkup.bateria_ok, checkup.direccion_ok, checkup.suspension_ok,
          checkup.escape_ok, checkup.cinturones_ok
        ];
        const itemsFallados = items.filter(item => !item).length;

        return {
          id: checkup.id,
          vehiculo_nombre: (checkup.vehiculos as any)?.nombre || 'Desconocido',
          vehiculo_placa: (checkup.vehiculos as any)?.placa || 'Sin placa',
          fecha_checkup: checkup.fecha_checkup,
          prioridad: checkup.prioridad || 'media',
          fallas_detectadas: checkup.fallas_detectadas || '',
          items_fallados: itemsFallados,
        };
      });
    } catch (error) {
      console.error("Error cargando checkups pendientes:", error);
      return [];
    }
  };

  const cargarTodasLasAlertas = async () => {
    setLoading(true);
    try {
      const configData = await cargarConfiguracion();
      const diasLicencia = parseInt(configData.dias_alerta_licencia || '30');
      const diasVerificacion = parseInt(configData.dias_alerta_verificacion || '15');
      const diasDocumentos = parseInt(configData.dias_alerta_documentos || '30');

      const [licencias, verificaciones, documentos, checkups] = await Promise.all([
        cargarAlertasLicencias(diasLicencia),
        cargarAlertasVerificaciones(diasVerificacion),
        cargarAlertasDocumentos(diasDocumentos),
        cargarCheckupsPendientes(),
      ]);

      const total = licencias.length + verificaciones.length + documentos.length + checkups.length;

      setAlertas({
        alertasLicencias: licencias,
        alertasVerificaciones: verificaciones,
        alertasDocumentos: documentos,
        checkupsPendientes: checkups,
        totalAlertas: total,
      });
    } catch (error) {
      console.error("Error cargando alertas de flotilla:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodasLasAlertas();

    // Recargar cada 5 minutos
    const interval = setInterval(cargarTodasLasAlertas, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    ...alertas,
    loading,
    config,
    recargar: cargarTodasLasAlertas,
  };
};
