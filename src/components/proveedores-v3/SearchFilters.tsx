import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  FiltroConfiabilidad,
  FiltroEstado,
  FiltroSaldo,
  SortKey,
} from "@/types/proveedor-v3";

interface SearchFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  categorias: string[];
  categoria: string | "todas";
  onCategoria: (v: string | "todas") => void;
  confiabilidad: FiltroConfiabilidad;
  onConfiabilidad: (v: FiltroConfiabilidad) => void;
  estado: FiltroEstado;
  onEstado: (v: FiltroEstado) => void;
  saldo: FiltroSaldo;
  onSaldo: (v: FiltroSaldo) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
}

const CONFIAB_OPTIONS: { v: FiltroConfiabilidad; l: string }[] = [
  { v: "todas", l: "Todas" },
  { v: "excelente", l: "Excelente" },
  { v: "bueno", l: "Bueno" },
  { v: "regular", l: "Regular" },
  { v: "bajo", l: "Bajo" },
  { v: "critico", l: "Crítico" },
  { v: "sin_historial", l: "Sin historial" },
];

const SORT_OPTIONS: { v: SortKey; l: string }[] = [
  { v: "confiabilidad_desc", l: "Confiabilidad ↓" },
  { v: "nombre_asc", l: "Nombre A–Z" },
  { v: "ultima_compra_desc", l: "Última compra" },
  { v: "saldo_desc", l: "Saldo ↓" },
];

interface ChipProps {
  label: string;
  active: boolean;
  children?: React.ReactNode;
}

const Chip = ({ label, active }: { label: string; active: boolean }) => (
  <button
    type="button"
    className={cn(
      "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
      active
        ? "bg-crimson-50 border-crimson-100 text-crimson-700"
        : "bg-white border-ink-100 text-ink-700 hover:border-ink-200"
    )}
  >
    {label} ▾
  </button>
);

export const SearchFilters = ({
  search,
  onSearchChange,
  categorias,
  categoria,
  onCategoria,
  confiabilidad,
  onConfiabilidad,
  estado,
  onEstado,
  saldo,
  onSaldo,
  sort,
  onSort,
}: SearchFiltersProps) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, RFC, contacto, categoría…"
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <Chip
                  label={categoria === "todas" ? "Categoría" : categoria}
                  active={categoria !== "todas"}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              <DropdownMenuItem onClick={() => onCategoria("todas")}>Todas</DropdownMenuItem>
              {categorias.map((c) => (
                <DropdownMenuItem key={c} onClick={() => onCategoria(c)}>
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <Chip
                  label={
                    confiabilidad === "todas"
                      ? "Confiabilidad"
                      : CONFIAB_OPTIONS.find((o) => o.v === confiabilidad)?.l || "Confiabilidad"
                  }
                  active={confiabilidad !== "todas"}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CONFIAB_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.v} onClick={() => onConfiabilidad(o.v)}>
                  {o.l}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <Chip
                  label={
                    estado === "todos" ? "Estado" : estado === "activo" ? "Activos" : "Inactivos"
                  }
                  active={estado !== "todos"}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEstado("todos")}>Todos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEstado("activo")}>Activo</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEstado("inactivo")}>Inactivo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <Chip
                  label={
                    saldo === "todos"
                      ? "Saldo"
                      : saldo === "con_saldo"
                      ? "Con saldo"
                      : saldo === "vencido"
                      ? "Vencido"
                      : "Sin saldo"
                  }
                  active={saldo !== "todos"}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSaldo("todos")}>Todos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSaldo("con_saldo")}>Con saldo</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSaldo("vencido")}>Vencido</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSaldo("sin_saldo")}>Sin saldo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="px-3 py-2 rounded-lg text-xs font-medium border border-ink-100 bg-white text-ink-700 hover:border-ink-200"
              >
                {SORT_OPTIONS.find((o) => o.v === sort)?.l} ▾
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.v} onClick={() => onSort(o.v)}>
                  {o.l}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
