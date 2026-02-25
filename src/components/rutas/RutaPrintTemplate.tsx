import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { COMPANY_DATA } from '@/constants/companyData';
import type { RutaMonitoreo } from '@/hooks/useMonitoreoRutas';

interface RutaPrintTemplateProps {
  ruta: RutaMonitoreo;
}

export const RutaPrintTemplate = ({ ruta }: RutaPrintTemplateProps) => {
  const totalProductos = ruta.carga_productos.length;
  const productosCargados = ruta.carga_productos.filter(cp => cp.cargado).length;
  const totalEntregas = ruta.entregas.length;
  const entregasCompletadas = ruta.entregas.filter(
    e => e.status_entrega === 'entregado' || e.status_entrega === 'completo'
  ).length;
  const entregasRechazadas = ruta.entregas.filter(e => e.status_entrega === 'rechazado').length;
  const entregasParciales = ruta.entregas.filter(e => e.status_entrega === 'parcial').length;

  const statusLabels: Record<string, string> = {
    programada: 'PROGRAMADA',
    cargando: 'CARGANDO',
    cargada: 'CARGADA',
    en_curso: 'EN RUTA',
    completada: 'COMPLETADA',
  };

  const entregaStatusLabels: Record<string, string> = {
    entregado: '✔ ENTREGADO',
    completo: '✔ ENTREGADO',
    rechazado: '✘ RECHAZADO',
    parcial: '⚠ PARCIAL',
    pendiente: '○ PENDIENTE',
  };

  return (
    <div className="p-6 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-[11px] flex flex-col" style={{ color: '#000', backgroundColor: '#fff' }}>
      {/* ═══════ HEADER ═══════ */}
      <div className="text-center border-b-2 border-black pb-2 mb-3">
        <div className="flex items-center justify-center gap-3 mb-1">
          <img src="/logo-almasa-header.png" alt="ALMASA" className="h-10 w-auto object-contain" />
          <h1 className="text-xl font-black uppercase tracking-tight" style={{ color: '#000' }}>
            {COMPANY_DATA.razonSocial}
          </h1>
        </div>
        <p className="text-[9px]" style={{ color: '#444' }}>
          {COMPANY_DATA.direccionCompleta} | Tel: {COMPANY_DATA.telefonosFormateados}
        </p>
      </div>

      {/* ═══════ TÍTULO DOCUMENTO ═══════ */}
      <div className="flex items-center justify-between mb-3 border-b border-black pb-2">
        <div>
          <h2 className="text-lg font-black uppercase" style={{ color: '#000' }}>HOJA DE RUTA</h2>
          <p className="text-sm font-bold" style={{ color: '#000' }}>{ruta.folio}</p>
        </div>
        <div className="text-right">
          <div className="border-2 border-black px-3 py-1 inline-block font-black text-sm" style={{ color: '#000' }}>
            {statusLabels[ruta.status] || ruta.status.toUpperCase()}
          </div>
          <p className="text-[10px] mt-1" style={{ color: '#444' }}>
            {format(new Date(ruta.fecha_ruta), "dd 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
      </div>

      {/* ═══════ DATOS RUTA ═══════ */}
      <div className="grid grid-cols-2 gap-0 border border-black mb-3 text-[11px]">
        <div className="border-b border-r border-black p-2">
          <span className="font-bold" style={{ color: '#000' }}>CHOFER:</span>{' '}
          <span style={{ color: '#000' }}>{ruta.chofer?.full_name || 'Sin asignar'}</span>
        </div>
        <div className="border-b border-black p-2">
          <span className="font-bold" style={{ color: '#000' }}>VEHÍCULO:</span>{' '}
          <span style={{ color: '#000' }}>{ruta.vehiculo?.nombre || 'Sin asignar'}</span>
        </div>
        <div className="border-b border-r border-black p-2">
          <span className="font-bold" style={{ color: '#000' }}>AYUDANTE:</span>{' '}
          <span style={{ color: '#000' }}>{ruta.ayudante?.full_name || 'N/A'}</span>
        </div>
        <div className="border-b border-black p-2">
          <span className="font-bold" style={{ color: '#000' }}>TIPO:</span>{' '}
          <span style={{ color: '#000' }}>{ruta.tipo_ruta === 'local' ? 'LOCAL' : 'FORÁNEA'}</span>
        </div>
        <div className="border-r border-black p-2">
          <span className="font-bold" style={{ color: '#000' }}>PESO TOTAL:</span>{' '}
          <span style={{ color: '#000' }}>{ruta.peso_total_kg?.toLocaleString() || 0} kg</span>
        </div>
        <div className="p-2">
          <span className="font-bold" style={{ color: '#000' }}>CARGA:</span>{' '}
          <span style={{ color: '#000' }}>{productosCargados}/{totalProductos} productos</span>
        </div>
      </div>

      {/* ═══════ RESUMEN ENTREGAS ═══════ */}
      <div className="grid grid-cols-4 gap-0 border border-black mb-3 text-center text-[10px]">
        <div className="p-2 border-r border-black bg-gray-100" style={{ backgroundColor: '#f3f3f3' }}>
          <p className="text-lg font-black" style={{ color: '#000' }}>{totalEntregas}</p>
          <p className="font-bold" style={{ color: '#000' }}>TOTAL</p>
        </div>
        <div className="p-2 border-r border-black">
          <p className="text-lg font-black" style={{ color: '#16a34a' }}>{entregasCompletadas}</p>
          <p className="font-bold" style={{ color: '#16a34a' }}>ENTREGADAS</p>
        </div>
        <div className="p-2 border-r border-black">
          <p className="text-lg font-black" style={{ color: '#ca8a04' }}>{entregasParciales}</p>
          <p className="font-bold" style={{ color: '#ca8a04' }}>PARCIALES</p>
        </div>
        <div className="p-2">
          <p className="text-lg font-black" style={{ color: '#dc2626' }}>{entregasRechazadas}</p>
          <p className="font-bold" style={{ color: '#dc2626' }}>RECHAZADAS</p>
        </div>
      </div>

      {/* ═══════ TABLA DE ENTREGAS ═══════ */}
      <table className="w-full border-collapse border border-black mb-3 text-[10px]">
        <thead>
          <tr className="bg-black text-white" style={{ backgroundColor: '#000', color: '#fff' }}>
            <th className="border border-black p-1.5 text-center w-8">#</th>
            <th className="border border-black p-1.5 text-left">CLIENTE</th>
            <th className="border border-black p-1.5 text-left">SUCURSAL</th>
            <th className="border border-black p-1.5 text-center w-24">STATUS</th>
            <th className="border border-black p-1.5 text-center w-16">HORA</th>
            <th className="border border-black p-1.5 text-left">RECEPTOR</th>
          </tr>
        </thead>
        <tbody>
          {ruta.entregas.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-black p-3 text-center" style={{ color: '#666' }}>
                Sin entregas asignadas
              </td>
            </tr>
          ) : (
            ruta.entregas.map((entrega, index) => (
              <tr key={entrega.id} className={index % 2 === 0 ? '' : ''} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td className="border border-black p-1.5 text-center font-bold" style={{ color: '#000' }}>
                  {entrega.orden_entrega || index + 1}
                </td>
                <td className="border border-black p-1.5 font-medium" style={{ color: '#000' }}>
                  {entrega.cliente_nombre || 'Cliente'}
                </td>
                <td className="border border-black p-1.5" style={{ color: '#333' }}>
                  {entrega.sucursal_nombre || '—'}
                </td>
                <td className="border border-black p-1.5 text-center font-bold text-[9px]" style={{
                  color: entrega.status_entrega === 'rechazado' ? '#dc2626' :
                    entrega.status_entrega === 'parcial' ? '#ca8a04' :
                      (entrega.status_entrega === 'entregado' || entrega.status_entrega === 'completo') ? '#16a34a' : '#666'
                }}>
                  {entregaStatusLabels[entrega.status_entrega] || '○ PENDIENTE'}
                </td>
                <td className="border border-black p-1.5 text-center" style={{ color: '#000' }}>
                  {entrega.hora_entrega_real || '—'}
                </td>
                <td className="border border-black p-1.5" style={{ color: '#333' }}>
                  {entrega.nombre_receptor || '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ═══════ MOTIVOS DE RECHAZO ═══════ */}
      {ruta.entregas.some(e => e.motivo_rechazo) && (
        <div className="border border-black p-2 mb-3">
          <p className="font-black text-[10px] mb-1" style={{ color: '#dc2626' }}>MOTIVOS DE RECHAZO:</p>
          {ruta.entregas.filter(e => e.motivo_rechazo).map(e => (
            <p key={e.id} className="text-[9px] ml-2" style={{ color: '#333' }}>
              • <span className="font-bold">{e.cliente_nombre}:</span> {e.motivo_rechazo}
            </p>
          ))}
        </div>
      )}

      {/* ═══════ TIMELINE ═══════ */}
      {(ruta.fecha_hora_inicio || ruta.fecha_hora_fin) && (
        <div className="border border-black p-2 mb-3">
          <p className="font-black text-[10px] mb-1" style={{ color: '#000' }}>REGISTRO DE TIEMPOS:</p>
          <div className="flex gap-8 text-[10px]">
            {ruta.fecha_hora_inicio && (
              <p style={{ color: '#000' }}>
                <span className="font-bold">Inicio:</span>{' '}
                {format(new Date(ruta.fecha_hora_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            )}
            {ruta.fecha_hora_fin && (
              <p style={{ color: '#000' }}>
                <span className="font-bold">Fin:</span>{' '}
                {format(new Date(ruta.fecha_hora_fin), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════ FIRMAS ═══════ */}
      <div className="mt-auto grid grid-cols-3 gap-4 pt-6">
        <div className="text-center">
          <div className="border-t border-black mx-4 pt-1">
            <p className="font-bold text-[10px]" style={{ color: '#000' }}>CHOFER</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black mx-4 pt-1">
            <p className="font-bold text-[10px]" style={{ color: '#000' }}>ALMACÉN</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black mx-4 pt-1">
            <p className="font-bold text-[10px]" style={{ color: '#000' }}>GERENTE</p>
          </div>
        </div>
      </div>
    </div>
  );
};
