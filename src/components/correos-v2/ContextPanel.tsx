import { MockEmail, mockClientContexts, mockSupplierContexts } from '@/lib/mock-emails';
import { cn } from '@/lib/utils';
import { Search, Lock, ExternalLink, AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ContextPanelProps {
  email: MockEmail | null;
  accountType: 'personal' | 'business';
}

const SectionLabel = ({ children }: { children: string }) => (
  <h3 className="text-[10px] uppercase tracking-[0.16em] text-ink-400 font-bold mb-3">
    — {children}
  </h3>
);

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n);

export const ContextPanel = ({ email, accountType }: ContextPanelProps) => {
  const navigate = useNavigate();

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center border-l border-ink-100 bg-white px-8">
        <div className="text-center">
          <span className="text-ink-200 text-4xl mb-4 block">📬</span>
          <p className="font-serif italic text-ink-400">Sin correo seleccionado</p>
        </div>
      </div>
    );
  }

  const clientCtx = email.linkedClientId ? mockClientContexts[email.linkedClientId] : null;
  const supplierCtx = email.linkedSupplierId ? mockSupplierContexts[email.linkedSupplierId] : null;

  // MODE A: Client CRM
  if (clientCtx) {
    return (
      <div className="h-full border-l border-ink-100 bg-white overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Client header */}
          <div>
            <SectionLabel>Cliente vinculado</SectionLabel>
            <h2 className="font-serif text-[26px] text-ink-900 leading-tight mb-1">{clientCtx.nombre}</h2>
            <p className="text-xs text-ink-500 tabular-nums font-mono">{clientCtx.rfc}</p>
            <p className="text-xs text-ink-500 mt-1">Cliente desde {clientCtx.clienteSince}</p>
            <p className="text-xs text-ink-400 mt-0.5">{clientCtx.direccion}</p>
            <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200">
              <span className="w-[5px] h-[5px] rounded-full bg-green-500" />
              Vinculado automáticamente
            </span>
          </div>

          {/* Account KPIs */}
          <div>
            <SectionLabel>Cuenta</SectionLabel>
            <div className="grid grid-cols-2 gap-px bg-ink-100 border border-ink-100 rounded-lg overflow-hidden">
              {[
                { label: 'Saldo actual', value: formatCurrency(clientCtx.saldoActual) },
                { label: 'Plazo', value: `${clientCtx.plazo} días` },
                { label: 'Vendedor', value: `${clientCtx.vendedor} (${clientCtx.comision}%)` },
                { label: 'Ruta', value: clientCtx.diasEntrega },
              ].map((kpi, i) => (
                <div key={i} className="bg-white p-3">
                  <div className="text-[9px] uppercase tracking-[0.1em] text-ink-400 font-medium mb-1">{kpi.label}</div>
                  <div className={cn('text-sm font-medium text-ink-900', i === 0 && 'font-serif text-[22px] tabular-nums lining-nums')}>
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          {clientCtx.alertas.length > 0 && (
            <div>
              <SectionLabel>Alertas activas</SectionLabel>
              <div className="space-y-2">
                {clientCtx.alertas.map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-3 rounded-lg border text-[12px] flex items-start gap-2',
                      alert.type === 'crimson' && 'bg-crimson-50 border-crimson-200 text-crimson-700',
                      alert.type === 'amber' && 'bg-amber-50 border-amber-200 text-amber-700',
                      alert.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-700',
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {alert.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent orders */}
          <div>
            <SectionLabel>Últimos pedidos</SectionLabel>
            <div className="space-y-0">
              {clientCtx.ultimosPedidos.map((ped, i) => (
                <button
                  key={i}
                  className="w-full flex items-center justify-between py-2.5 border-b border-ink-50 hover:bg-warm-50 transition text-left"
                >
                  <div>
                    <span className="text-xs font-mono text-ink-500 tabular-nums">{ped.folio}</span>
                    <span className="text-xs text-ink-400 ml-2">{ped.fecha}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-sm text-ink-900 tabular-nums">{formatCurrency(ped.total)}</span>
                    <span className={cn(
                      'ml-2 text-[10px] font-medium',
                      ped.status === 'Entregado' ? 'text-green-600' : 'text-amber-600'
                    )}>
                      {ped.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <button
            onClick={() => navigate(`/clientes`)}
            className="w-full py-3 text-center text-sm font-medium text-ink-900 bg-warm-50 border border-ink-100 rounded-lg hover:bg-warm-100 transition flex items-center justify-center gap-1.5"
          >
            Ver perfil completo del cliente
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // MODE B: Supplier
  if (supplierCtx) {
    return (
      <div className="h-full border-l border-ink-100 bg-white overflow-y-auto">
        <div className="p-6 space-y-6">
          <div>
            <SectionLabel>Proveedor vinculado</SectionLabel>
            <h2 className="font-serif text-[26px] text-ink-900 leading-tight mb-1">{supplierCtx.nombre}</h2>
            <p className="text-xs text-ink-500 tabular-nums font-mono">{supplierCtx.rfc}</p>
            <p className="text-xs text-ink-400 mt-1">Tipo: {supplierCtx.tipo}</p>
          </div>

          <div>
            <SectionLabel>Cuentas por pagar</SectionLabel>
            <div className="grid grid-cols-2 gap-px bg-ink-100 border border-ink-100 rounded-lg overflow-hidden">
              {[
                { label: 'Saldo a pagar', value: formatCurrency(supplierCtx.saldoPorPagar) },
                { label: 'Próximo vencimiento', value: supplierCtx.proximoVencimiento },
                { label: 'Crédito otorgado', value: formatCurrency(supplierCtx.creditoOtorgado) },
                { label: 'Días prom. pago', value: '28 días' },
              ].map((kpi, i) => (
                <div key={i} className="bg-white p-3">
                  <div className="text-[9px] uppercase tracking-[0.1em] text-ink-400 font-medium mb-1">{kpi.label}</div>
                  <div className={cn('text-sm font-medium text-ink-900', i === 0 && 'font-serif text-[22px] tabular-nums')}>
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Últimas compras</SectionLabel>
            <div className="space-y-0">
              {supplierCtx.ultimasCompras.map((comp, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-ink-50">
                  <div>
                    <span className="text-xs font-mono text-ink-500 tabular-nums">{comp.folio}</span>
                    <span className="text-xs text-ink-400 ml-2">{comp.fecha}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-sm text-ink-900 tabular-nums">{formatCurrency(comp.monto)}</span>
                    <span className={cn(
                      'ml-2 text-[10px] font-medium',
                      comp.estado === 'Recibida' ? 'text-green-600' : 'text-blue-600'
                    )}>{comp.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full py-3 text-center text-sm font-medium text-ink-900 bg-warm-50 border border-ink-100 rounded-lg hover:bg-warm-100 transition flex items-center justify-center gap-1.5">
            Ver perfil del proveedor <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // MODE C: Personal contact (no CRM match, personal account)
  if (accountType === 'personal') {
    const initials = email.from.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
      <div className="h-full border-l border-ink-100 bg-white overflow-y-auto">
        <div className="p-6 space-y-6">
          <div>
            <SectionLabel>Contacto</SectionLabel>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <span className="font-serif text-[22px] text-white font-medium">{initials}</span>
              </div>
              <div>
                <h2 className="font-serif text-[22px] text-ink-900">{email.from.name}</h2>
                <p className="text-xs text-ink-500">{email.from.email}</p>
              </div>
            </div>
          </div>

          <div>
            <SectionLabel>Conversaciones recientes</SectionLabel>
            <div className="space-y-2">
              <div className="py-2 border-b border-ink-50">
                <p className="text-sm text-ink-700 truncate">{email.subject}</p>
                <p className="text-xs text-ink-400">{new Date(email.date).toLocaleDateString('es-MX')}</p>
              </div>
            </div>
          </div>

          <div className="bg-warm-50 border border-ink-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-3.5 h-3.5 text-ink-500" />
              <span className="text-[10px] uppercase tracking-[0.1em] text-ink-500 font-bold">Privacidad</span>
            </div>
            <p className="text-xs text-ink-500 leading-relaxed">
              Esta cuenta es solo tuya. Ningún otro usuario del sistema (incluyendo administradores) puede ver, leer o acceder a tu bandeja personal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // MODE D: No context
  return (
    <div className="h-full border-l border-ink-100 bg-white flex items-center justify-center">
      <div className="text-center px-8">
        <Search className="w-12 h-12 text-ink-200 mx-auto mb-4" />
        <h3 className="font-serif text-lg text-ink-700 mb-1">Sin contexto vinculado</h3>
        <p className="text-xs text-ink-400 mb-6 leading-relaxed">
          No encontramos este remitente en tus clientes, proveedores ni contactos.
        </p>
        <div className="space-y-2">
          <button className="w-full py-2.5 text-sm font-medium text-ink-700 bg-warm-50 border border-ink-100 rounded-lg hover:bg-warm-100 transition">
            + Vincular a cliente
          </button>
          <button className="w-full py-2.5 text-sm font-medium text-ink-700 bg-warm-50 border border-ink-100 rounded-lg hover:bg-warm-100 transition">
            + Vincular a proveedor
          </button>
          <button className="w-full py-2.5 text-sm font-medium text-ink-700 bg-warm-50 border border-ink-100 rounded-lg hover:bg-warm-100 transition">
            + Guardar como contacto
          </button>
        </div>
      </div>
    </div>
  );
};
