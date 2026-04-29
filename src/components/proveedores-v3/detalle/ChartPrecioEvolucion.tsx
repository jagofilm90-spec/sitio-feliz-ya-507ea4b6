import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { PrecioPunto } from "@/hooks/useProveedorDetalle";

const fmtMoney = (n: number) =>
  "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  data: PrecioPunto[];
  productoNombre: string | null;
}

export const ChartPrecioEvolucion = ({ data, productoNombre }: Props) => {
  const sinDatos = data.length < 2;
  return (
    <div className="bg-white border border-ink-100 rounded-xl p-5">
      <div className="mb-3">
        <h3 className="font-serif text-xl text-ink-900 leading-tight">
          Precio <em className="italic text-ink-700">{productoNombre || "—"}</em>
        </h3>
        <p className="font-serif italic text-xs text-ink-500">Últimos 6 meses · por bulto</p>
      </div>
      {sinDatos ? (
        <div className="h-[140px] flex items-center justify-center text-sm italic text-ink-500">
          Sin datos suficientes
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="areaCrimson" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(348, 73%, 50%)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(348, 73%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
            <XAxis
              dataKey="mes"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: any) => [fmtMoney(Number(v)), "Precio"]}
            />
            <Area
              type="monotone"
              dataKey="precio"
              stroke="hsl(348, 73%, 45%)"
              strokeWidth={2.5}
              fill="url(#areaCrimson)"
              dot={{ r: 4, fill: "hsl(348, 73%, 45%)" }}
              activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
