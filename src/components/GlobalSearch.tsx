import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Package, Users, ShoppingCart, Truck, FileText,
  DollarSign, MessageSquare, Settings, Search, Warehouse, ClipboardList,
  Receipt, UserCircle, Car,
} from "lucide-react";

const PAGES = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Productos", path: "/productos", icon: Package },
  { name: "Lista de Precios", path: "/precios", icon: DollarSign },
  { name: "Clientes", path: "/clientes", icon: Users },
  { name: "Pedidos", path: "/pedidos", icon: ShoppingCart },
  { name: "Compras", path: "/compras", icon: ClipboardList },
  { name: "Inventario", path: "/inventario", icon: Warehouse },
  { name: "Rutas y Entregas", path: "/rutas", icon: Truck },
  { name: "Facturación", path: "/facturas", icon: FileText },
  { name: "Rentabilidad", path: "/rentabilidad", icon: Receipt },
  { name: "Empleados", path: "/empleados", icon: UserCircle },
  { name: "Vehículos", path: "/vehiculos", icon: Car },
  { name: "Chat", path: "/chat", icon: MessageSquare },
  { name: "Configuración", path: "/configuracion", icon: Settings },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clientes, setClientes] = useState<Array<{ id: string; nombre: string; codigo: string }>>([]);
  const [productos, setProductos] = useState<Array<{ id: string; nombre: string; codigo: string }>>([]);
  const [pedidos, setPedidos] = useState<Array<{ id: string; folio: string; cliente_nombre: string }>>([]);
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setClientes([]);
      setProductos([]);
      setPedidos([]);
      return;
    }

    const timeout = setTimeout(async () => {
      // Search clients
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre, codigo")
        .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%`)
        .eq("activo", true)
        .limit(5);
      setClientes(clientesData ?? []);

      // Search products
      const { data: productosData } = await supabase
        .from("productos")
        .select("id, nombre, codigo")
        .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%`)
        .eq("activo", true)
        .limit(5);
      setProductos(productosData ?? []);

      // Search orders by folio
      const { data: pedidosData } = await supabase
        .from("pedidos")
        .select("id, folio, clientes(nombre)")
        .ilike("folio", `%${query}%`)
        .limit(5);
      setPedidos(
        (pedidosData ?? []).map((p: any) => ({
          id: p.id,
          folio: p.folio,
          cliente_nombre: p.clientes?.nombre || "",
        }))
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      setQuery("");
      command();
    },
    []
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors cursor-pointer"
      >
        <Search className="h-4 w-4" />
        <span className="text-xs">Buscar...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar página, cliente, producto o pedido..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>

          {/* Pages */}
          <CommandGroup heading="Páginas">
            {PAGES.filter(
              (p) =>
                !query || p.name.toLowerCase().includes(query.toLowerCase())
            )
              .slice(0, query ? 14 : 6)
              .map((page) => (
                <CommandItem
                  key={page.path}
                  onSelect={() => runCommand(() => navigate(page.path))}
                  className="cursor-pointer"
                >
                  <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {page.name}
                </CommandItem>
              ))}
          </CommandGroup>

          {/* Clients */}
          {clientes.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clientes">
                {clientes.map((c) => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => runCommand(() => navigate("/clientes"))}
                    className="cursor-pointer"
                  >
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      {c.codigo}
                    </span>
                    {c.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Products */}
          {productos.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Productos">
                {productos.map((p) => (
                  <CommandItem
                    key={p.id}
                    onSelect={() => runCommand(() => navigate("/productos"))}
                    className="cursor-pointer"
                  >
                    <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      {p.codigo}
                    </span>
                    {p.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Orders */}
          {pedidos.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pedidos">
                {pedidos.map((p) => (
                  <CommandItem
                    key={p.id}
                    onSelect={() => runCommand(() => navigate("/pedidos"))}
                    className="cursor-pointer"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs font-semibold mr-2">
                      {p.folio}
                    </span>
                    {p.cliente_nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
