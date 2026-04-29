import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, Cell } from "recharts";
import type { ComprasMensuales } from "@/hooks/useProveedorDetalle";

const fmtMoney = (n: number) =>
  "$" + Number(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 });

const tickFormatter = (mes: string) => {
  // mes viene como "Apr 2026" del RPC
  const partes = mes.split(" ");
  const m = partes[0] || mes;
  const map: Record<string, string> = {
    Jan: "Ene", Feb: "Feb", Mar: "Mar", Apr: "Abr", May: "May", Jun: "Jun",
    Jul: "Jul", Aug: "Ago", Sep: "Sep", Oct: "Oct", Nov: "Nov", Dec: "Dic",
  };
  return map[m] || m;
};

interface Props {
  data: ComprasMensuales[];
}

export const ChartComprasMensuales = ({ data }: Props) => {
  return (
    <div className="bg-white border border-ink-100 rounded-xl p-5">
      <div className="mb-3">
        <h3 className="font-serif text-xl text-ink-900 leading-tight">
          Compras <em className="italic text-ink-700">mensuales</em>
        </h3>
        <p className="font-serif italic text-xs text-ink-500">Últimos 6 meses</p>
      </div>
      {data.length === 0 ? (
        <div className="h-[140px] flex items-center justify-center text-sm italic text-ink-500">
          Sin compras en últimos 6 meses
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 25, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="barCrimson" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(348, 73%, 50%)" />
                <stop offset="100%" stopColor="hsl(348, 73%, 38%)" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="mes"
              tickFormatter={tickFormatter}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
            />
            <Tooltip
              cursor={{ fill: "hsl(220, 14%, 96%)" }}
              contentStyle={{
                background: "white",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: any) => [fmtMoney(Number(v)), "Compras"]}
              labelFormatter={(l) => l}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="url(#barCrimson)">
              {data.map((_, i) => (
                <Cell key={i} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
