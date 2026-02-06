/**
 * ==========================================================
 * 🚨 MÓDULO CRÍTICO: PEDIDOS
 * ==========================================================
 * 
 * Este módulo maneja operaciones comerciales críticas.
 * 
 * ⚠️ NO MODIFICAR sin validar en preview primero.
 * 
 * Última actualización: 2025-12-08
 * ==========================================================
 */

import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, ShoppingCart, FileText, Link2, Printer, Receipt, Send, CheckCircle2, Clock, BarChart3, Trash2, AlertCircle, FileCheck, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import CotizacionesTab from "@/components/cotizaciones/CotizacionesTab";
import CotizacionesAnalyticsTab from "@/components/cotizaciones/CotizacionesAnalyticsTab";
import { PedidosPorAutorizarTab } from "@/components/pedidos/PedidosPorAutorizarTab";
import { SolicitudesDescuentoPanel } from "@/components/admin/SolicitudesDescuentoPanel";
import { CalendarioPedidosTab } from "@/components/pedidos/CalendarioPedidosTab";
import CotizacionDetalleDialog from "@/components/cotizaciones/CotizacionDetalleDialog";
import { ImprimirRemisionDialog } from "@/components/remisiones/ImprimirRemisionDialog";
import EditarEmailClienteDialog from "@/components/pedidos/EditarEmailClienteDialog";
import NuevoPedidoDialog from "@/components/pedidos/NuevoPedidoDialog";
import PedidoDetalleDialog from "@/components/pedidos/PedidoDetalleDialog";
import GenerarFacturaDialog from "@/components/pedidos/GenerarFacturaDialog";
import { formatCurrency } from "@/lib/utils";
import { ordenarProductosAzucarPrimero } from "@/lib/calculos";
import { getDisplayName } from "@/lib/productUtils";
import { PedidoHistorialCardMobile } from "@/components/pedidos/PedidoHistorialCardMobile";

interface PedidoConCotizacion {
  id: string;
  folio: string;
  fecha_pedido: string;
  total: number;
  peso_total_kg: number | null;
  status: string;
  requiere_factura: boolean;
  facturado: boolean;
  factura_enviada_al_cliente: boolean;
  clientes: { id: string; nombre: string; email: string | null; rfc: string | null; razon_social: string | null } | null;
  profiles: { full_name: string } | null;
  cotizacion_origen?: { id: string; folio: string } | null;
  sucursal?: { nombre: string; email_facturacion: string | null; codigo_sucursal: string | null; rfc: string | null; razon_social: string | null } | null;
}

const PedidosContent = () => {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  
  const [pedidos, setPedidos] = useState<PedidoConCotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "pedidos");
  const [selectedCotizacionId, setSelectedCotizacionId] = useState<string | null>(null);
  const [remisionDialogOpen, setRemisionDialogOpen] = useState(false);
  const [selectedPedidoData, setSelectedPedidoData] = useState<any>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedPedidoForEmail, setSelectedPedidoForEmail] = useState<PedidoConCotizacion | null>(null);
  const [nuevoPedidoDialogOpen, setNuevoPedidoDialogOpen] = useState(false);
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  const [pedidoDetalleOpen, setPedidoDetalleOpen] = useState(false);
  const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [facturaDialogOpen, setFacturaDialogOpen] = useState(false);
  const [selectedPedidoForFactura, setSelectedPedidoForFactura] = useState<PedidoConCotizacion | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Sync tab state with URL parameter
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    try {
      // First get pedidos
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select(`
          id,
          folio,
          fecha_pedido,
          total,
          peso_total_kg,
          status,
          requiere_factura,
          facturado,
          factura_enviada_al_cliente,
          sucursal_id,
          clientes (id, nombre, email, rfc, razon_social),
          profiles:vendedor_id (full_name),
          cliente_sucursales:sucursal_id (nombre, email_facturacion, codigo_sucursal, rfc, razon_social)
        `)
        .order("fecha_pedido", { ascending: false });

      if (pedidosError) throw pedidosError;

      // Get cotizaciones that have pedido_id (created from cotizacion)
      const { data: cotizacionesData, error: cotizacionesError } = await supabase
        .from("cotizaciones")
        .select("id, folio, pedido_id")
        .not("pedido_id", "is", null);

      if (cotizacionesError) throw cotizacionesError;

      // Create map of pedido_id to cotizacion
      const cotizacionMap = new Map<string, { id: string; folio: string }>();
      cotizacionesData?.forEach((cot) => {
        if (cot.pedido_id) {
          cotizacionMap.set(cot.pedido_id, { id: cot.id, folio: cot.folio });
        }
      });

      // Merge data
      const pedidosConCotizacion: PedidoConCotizacion[] = (pedidosData || []).map((p: any) => ({
        ...p,
        cotizacion_origen: cotizacionMap.get(p.id) || null,
        sucursal: p.cliente_sucursales,
      }));

      // Ordenar por código de sucursal (numérico)
      pedidosConCotizacion.sort((a, b) => {
        const codigoA = a.sucursal?.codigo_sucursal || '';
        const codigoB = b.sucursal?.codigo_sucursal || '';
        
        // Extraer números del código
        const numA = parseInt(codigoA) || 0;
        const numB = parseInt(codigoB) || 0;
        
        return numA - numB;
      });

      setPedidos(pedidosConCotizacion);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPedidos = pedidos.filter(
    (p) =>
      p.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientes?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cotizacion_origen?.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sucursal?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPedidos(new Set(filteredPedidos.map(p => p.id)));
    } else {
      setSelectedPedidos(new Set());
    }
  };

  const handleSelectPedido = (pedidoId: string, checked: boolean) => {
    const newSelected = new Set(selectedPedidos);
    if (checked) {
      newSelected.add(pedidoId);
    } else {
      newSelected.delete(pedidoId);
    }
    setSelectedPedidos(newSelected);
  };

  // Navegación entre pedidos
  const handleNavigateNextPedido = () => {
    if (!selectedPedidoId) return;
    const currentIndex = filteredPedidos.findIndex(p => p.id === selectedPedidoId);
    if (currentIndex < filteredPedidos.length - 1) {
      setSelectedPedidoId(filteredPedidos[currentIndex + 1].id);
    }
  };

  const handleNavigatePreviousPedido = () => {
    if (!selectedPedidoId) return;
    const currentIndex = filteredPedidos.findIndex(p => p.id === selectedPedidoId);
    if (currentIndex > 0) {
      setSelectedPedidoId(filteredPedidos[currentIndex - 1].id);
    }
  };

  const currentPedidoIndex = selectedPedidoId 
    ? filteredPedidos.findIndex(p => p.id === selectedPedidoId)
    : -1;
  const canNavigateNext = currentPedidoIndex >= 0 && currentPedidoIndex < filteredPedidos.length - 1;
  const canNavigatePrevious = currentPedidoIndex > 0;

  const handleDeleteSelected = async () => {
    if (selectedPedidos.size === 0) return;
    
    setDeleting(true);
    try {
      const ids = Array.from(selectedPedidos);
      
      // Delete related records first
      await supabase.from("pedidos_detalles").delete().in("pedido_id", ids);
      await supabase.from("entregas").delete().in("pedido_id", ids);
      
      // Delete pedidos
      const { error } = await supabase.from("pedidos").delete().in("id", ids);
      
      if (error) throw error;
      
      toast({
        title: "Pedidos eliminados",
        description: `Se eliminaron ${ids.length} pedido(s) correctamente`,
      });
      
      setSelectedPedidos(new Set());
      loadPedidos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron eliminar los pedidos",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const allSelected = filteredPedidos.length > 0 && filteredPedidos.every(p => selectedPedidos.has(p.id));
  const someSelected = filteredPedidos.some(p => selectedPedidos.has(p.id));

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      por_autorizar: "outline",
      pendiente: "secondary",
      en_ruta: "default",
      entregado: "default",
      cancelado: "destructive",
    };

    const labels: Record<string, string> = {
      por_autorizar: "Por Autorizar",
      pendiente: "Pendiente",
      en_ruta: "En Ruta",
      entregado: "Entregado",
      cancelado: "Cancelado",
    };

    return (
      <Badge variant={variants[status] || "default"} className={status === "por_autorizar" ? "border-amber-500 text-amber-600" : ""}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getFacturaBadge = (pedido: PedidoConCotizacion) => {
    if (pedido.factura_enviada_al_cliente) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Enviada
        </Badge>
      );
    }
    if (pedido.facturado) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Por enviar
        </Badge>
      );
    }
    if (pedido.requiere_factura) {
      return (
        <Badge variant="outline" className="gap-1">
          <FileText className="h-3 w-3" />
          Pendiente
        </Badge>
      );
    }
    return (
      <span className="text-muted-foreground text-xs">Remisión</span>
    );
  };

  const getCreditLabel = (term: string) => {
    const labels: Record<string, string> = {
      contado: "Contado",
      "8_dias": "8 días",
      "15_dias": "15 días",
      "30_dias": "30 días",
    };
    return labels[term] || term;
  };

  const getEmailForPedido = (pedido: PedidoConCotizacion): string | null => {
    // First check sucursal email_facturacion
    if (pedido.sucursal?.email_facturacion) {
      return pedido.sucursal.email_facturacion;
    }
    // Fall back to client email
    if (pedido.clientes?.email) {
      return pedido.clientes.email;
    }
    return null;
  };

  // Función unificada: Facturar y Enviar en una sola acción
  const handleFacturarYEnviar = async (pedido: PedidoConCotizacion) => {
    const email = getEmailForPedido(pedido);
    
    // Si no hay email, abrir diálogo para capturarlo
    if (!email) {
      setSelectedPedidoForEmail(pedido);
      setEmailDialogOpen(true);
      return;
    }

    try {
      // Paso 1: Marcar como facturado
      const { error: facturarError } = await supabase
        .from("pedidos")
        .update({ facturado: true })
        .eq("id", pedido.id);

      if (facturarError) throw facturarError;

      // Paso 2: Enviar email (la edge function también marca factura_enviada_al_cliente)
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          pedidoId: pedido.id,
          clienteEmail: email,
          clienteNombre: pedido.clientes?.nombre || 'Cliente',
          pedidoFolio: pedido.folio,
          total: pedido.total,
          fechaPedido: pedido.fecha_pedido,
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Error al enviar factura');
      }

      toast({ 
        title: "Factura enviada",
        description: `Facturado y enviado a ${email}`,
      });
      loadPedidos();
    } catch (error: any) {
      console.error('Error en facturar y enviar:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo facturar y enviar",
        variant: "destructive",
      });
    }
  };

  const handlePrintRemision = async (pedidoId: string) => {
    try {
      // Fetch full pedido data with complete fiscal and delivery address fields
      const { data: pedido, error } = await supabase
        .from("pedidos")
        .select(`
          *,
          clientes (
            id, nombre, codigo, rfc, direccion, telefono, termino_credito,
            razon_social,
            nombre_vialidad, numero_exterior, numero_interior,
            nombre_colonia, nombre_municipio, codigo_postal,
            nombre_localidad, nombre_entidad_federativa
          ),
          cliente_sucursales (
            id, nombre, direccion, contacto, telefono,
            razon_social, rfc, direccion_fiscal
          ),
          profiles:vendedor_id (
            full_name
          ),
          pedidos_detalles (
            id, cantidad, precio_unitario, subtotal, unidades_manual, kilos_totales, es_cortesia,
            productos (
              id, codigo, nombre, marca, presentacion, unidad, aplica_iva, aplica_ieps, kg_por_unidad, precio_por_kilo
            )
          )
        `)
        .eq("id", pedidoId)
        .single();

      if (error) throw error;

      // Prepare data for remision
      // Detectar si es cliente Lecaroz para reglas especiales de presentación
      const esLecaroz = pedido.clientes?.nombre?.toLowerCase().includes('lecaroz');
      
      // Función para pluralizar correctamente en español
      const pluralizar = (unidad: string, cantidad: number): string => {
        if (cantidad === 1) return unidad;
        if (unidad === 'balón') return 'balones';
        if (unidad.endsWith('z')) return unidad.slice(0, -1) + 'ces';
        return unidad + 's';
      };
      
      // Función para formatear cantidad manteniendo decimales
      const formatearCantidad = (cantidad: number): string => {
        return cantidad % 1 === 0 ? String(cantidad) : cantidad.toFixed(2);
      };
      
      const productos = pedido.pedidos_detalles.map((detalle: any) => {
        const producto = detalle.productos;
        const descripcion = getDisplayName(producto);
        const nombreLower = producto.nombre.toLowerCase();
        const cantidadNum = Number(detalle.cantidad);
        
        // Calcular presentación para bodegueros - SIEMPRE en unidades comerciales, nunca solo kg
        let presentacion = "";
        let unidadComercial = producto.unidad || 'pza';
        
        // Reglas especiales para Lecaroz
        if (esLecaroz) {
          // Anís y Canela Molida siempre se muestran como "bolsa"
          if (nombreLower.includes('anís') || nombreLower.includes('anis') || nombreLower.includes('canela molida')) {
            unidadComercial = 'bolsa';
          }
          
          // Arándano Nutri Grand y Avellana Sin Cascara siempre se muestran como "caja"
          if (nombreLower.includes('arándano') || nombreLower.includes('arandano') || nombreLower.includes('avellana')) {
            unidadComercial = 'caja';
          }
        }
        
        // Regla especial para Coco: siempre caja con 20 kg
        if (nombreLower.includes('coco')) {
          unidadComercial = 'caja';
        }
        
        // *** REGLA ESPECIAL LINAZA: Redondear kg a múltiplos de 10 ***
        // Residuo 1-5 kg redondea abajo, residuo 6-9 kg redondea arriba
        // Ejemplo: 21-25kg → 20kg (2 bultos), 26-29kg → 30kg (3 bultos)
        let cantidadParaCalculo = cantidadNum;
        if (nombreLower.includes('linaza')) {
          cantidadParaCalculo = Math.floor((cantidadNum + 4) / 10) * 10;
        }
        
        // Mostrar cantidad con su unidad original - SIN REDONDEAR (excepto Linaza)
        let cantidadDisplay = "";
        if (producto.precio_por_kilo) {
          // Para Linaza, mostrar kg redondeados
          cantidadDisplay = nombreLower.includes('linaza') 
            ? `${formatearCantidad(cantidadParaCalculo)} kg`
            : `${formatearCantidad(cantidadNum)} kg`;
        } else {
          cantidadDisplay = `${formatearCantidad(cantidadNum)} ${pluralizar(unidadComercial, cantidadNum)}`;
        }
        
        // *** PRIORIDAD MÁXIMA: Si tiene unidades_manual guardadas, usarlas directamente ***
        if (detalle.unidades_manual && detalle.unidades_manual > 0) {
          presentacion = `${detalle.unidades_manual} ${pluralizar(unidadComercial, detalle.unidades_manual)}`;
        }
        // *** REGLA ESPECIAL LINAZA: 10 kg por bulto ***
        else if (nombreLower.includes('linaza')) {
          const numBultos = cantidadParaCalculo / 10;
          presentacion = `${numBultos} ${pluralizar('bulto', numBultos)}`;
        }
        // *** REGLA UNIFICADA CANELA MOLIDA / ANÍS: SIEMPRE redondear a bolsas completas de 5kg ***
        else if (nombreLower.includes('canela molida') || nombreLower.includes('anís') || nombreLower.includes('anis')) {
          // Importar lógica centralizada - siempre redondear hacia arriba a múltiplos de 5kg
          const cantidadAjustada = Math.ceil(cantidadNum / 5) * 5; // redondearABolsasCompletas inline
          const numBolsas = cantidadAjustada / 5; // calcularNumeroBolsas inline
          
          // Actualizar cantidad mostrada con el valor ajustado
          cantidadDisplay = `${formatearCantidad(cantidadAjustada)} kg`;
          presentacion = `${numBolsas} ${pluralizar('bolsa', numBolsas)}`;
        }
        // Calcular presentación para bodegueros - SIEMPRE unidades comerciales, SIN "de X kg"
        // Regla especial para ALMENDRA FILETEADA (11.34 kg/caja) - PRIORIDAD ALTA
        else if (nombreLower.includes('almendra fileteada')) {
          const kgPorCaja = producto.kg_por_unidad || 11.34;
          const numCajas = Math.ceil(cantidadNum / kgPorCaja);
          presentacion = `${numCajas} ${pluralizar('caja', numCajas)}`;
        }
        // Regla especial para COCO RALLADO LAS PALMAS (20 kg/caja)
        else if (nombreLower.includes('coco rallado') || nombreLower.includes('coco')) {
          const kgPorCaja = producto.kg_por_unidad || 20;
          const numCajas = Math.ceil(cantidadNum / kgPorCaja);
          presentacion = `${numCajas} ${pluralizar('caja', numCajas)}`;
        }
        // Regla especial Lecaroz: Arándano y Avellana
        else if (esLecaroz && (nombreLower.includes('arándano') || nombreLower.includes('arandano') || nombreLower.includes('avellana'))) {
          const kgPorCaja = producto.kg_por_unidad || 11.34;
          const numCajas = Math.ceil(cantidadNum / kgPorCaja);
          presentacion = `${numCajas} ${pluralizar('caja', numCajas)}`;
        }
        // Producto vendido por kilo con conversión conocida
        else if (producto.precio_por_kilo && producto.kg_por_unidad && producto.kg_por_unidad > 0) {
          const unidadesComerciales = Math.ceil(cantidadNum / producto.kg_por_unidad);
          presentacion = `${unidadesComerciales} ${pluralizar(unidadComercial, unidadesComerciales)}`;
        } 
        // Producto vendido por kilo sin conversión fija - SOLO mostrar unidad, SIN "de X kg"
        else if (producto.precio_por_kilo && (!producto.kg_por_unidad || producto.kg_por_unidad === 0)) {
          presentacion = `1 ${unidadComercial}`;
        } 
        // Producto vendido por unidad comercial directamente
        else {
          presentacion = `${Math.round(cantidadNum)} ${pluralizar(unidadComercial, cantidadNum)}`;
        }
        
        // Fallback para kilos_totales: si no viene de BD, calcular con presentacion
        const kilosTotalesCalculado = detalle.kilos_totales ?? 
          (producto.presentacion ? Number(detalle.cantidad) * Number(producto.presentacion) : null);
        
        return {
          cantidad: detalle.cantidad,
          cantidadDisplay, // Cantidad con unidad original (ej: "45 kg")
          unidad: unidadComercial, // Solo la unidad (ej: "bulto"), el template agrega la cantidad
          descripcion,
          precio_unitario: detalle.precio_unitario,
          total: detalle.subtotal,
          kilos_totales: kilosTotalesCalculado, // Total de kilos del pedido_detalle
          precio_por_kilo: producto.precio_por_kilo, // Para mostrar "/kg" en precio
          es_cortesia: detalle.es_cortesia || false,
        };
      });

      // Calcular impuestos desglosados: IVA (16%) e IEPS (8%)
      let subtotalConIvaYIeps = 0; // Productos con IVA + IEPS
      let subtotalConIva = 0;       // Productos solo con IVA
      let subtotalSinImpuestos = 0; // Productos sin impuestos
      
      pedido.pedidos_detalles.forEach((detalle: any) => {
        const prod = detalle.productos;
        if (prod?.aplica_iva && prod?.aplica_ieps) {
          subtotalConIvaYIeps += detalle.subtotal;
        } else if (prod?.aplica_iva) {
          subtotalConIva += detalle.subtotal;
        } else {
          subtotalSinImpuestos += detalle.subtotal;
        }
      });

      // Productos con IVA (16%) + IEPS (8%) = divisor 1.24
      const baseConIvaYIeps = subtotalConIvaYIeps / 1.24;
      const iepsCalculado = baseConIvaYIeps * 0.08;
      const ivaDeIeps = baseConIvaYIeps * 0.16;

      // Productos solo con IVA (16%)
      const baseConIva = subtotalConIva / 1.16;
      const ivaSolo = subtotalConIva - baseConIva;

      const subtotalReal = baseConIvaYIeps + baseConIva + subtotalSinImpuestos;
      const ivaTotal = ivaSolo + ivaDeIeps;

      // Construir dirección fiscal formateada del cliente
      const formatearDireccionFiscal = (cliente: any): string => {
        if (!cliente) return '';
        const partes = [];
        if (cliente.nombre_vialidad) {
          let linea = cliente.nombre_vialidad;
          if (cliente.numero_exterior) linea += ` No. ${cliente.numero_exterior}`;
          if (cliente.numero_interior) linea += ` Int. ${cliente.numero_interior}`;
          partes.push(linea);
        }
        if (cliente.nombre_colonia) partes.push(`Col. ${cliente.nombre_colonia}`);
        if (cliente.nombre_municipio || cliente.codigo_postal) {
          partes.push(`${cliente.nombre_municipio || ''} C.P. ${cliente.codigo_postal || ''}`);
        }
        if (cliente.nombre_entidad_federativa) partes.push(cliente.nombre_entidad_federativa);
        return partes.join(', ') || cliente.direccion || '';
      };

      const datosRemision = {
        folio: `REM-${pedido.folio}`,
        fecha: pedido.fecha_pedido,
        cliente: {
          nombre: pedido.clientes?.nombre || 'Sin nombre',
          razon_social: pedido.clientes?.razon_social,
          rfc: pedido.clientes?.rfc,
          direccion_fiscal: formatearDireccionFiscal(pedido.clientes),
          telefono: pedido.clientes?.telefono,
        },
        sucursal: pedido.cliente_sucursales ? {
          nombre: pedido.cliente_sucursales.nombre,
          direccion: pedido.cliente_sucursales.direccion,
          contacto: pedido.cliente_sucursales.contacto,
          telefono: pedido.cliente_sucursales.telefono,
          // Datos fiscales propios de sucursal (si tiene RFC propio)
          razon_social: pedido.cliente_sucursales.razon_social,
          rfc: pedido.cliente_sucursales.rfc,
          direccion_fiscal: pedido.cliente_sucursales.direccion_fiscal,
        } : undefined,
        productos: ordenarProductosAzucarPrimero(productos, (p) => p.descripcion),
        subtotal: subtotalReal,
        iva: ivaTotal,
        ieps: iepsCalculado,
        total: pedido.total || (subtotalReal + ivaTotal + iepsCalculado),
        condiciones_credito: getCreditLabel(pedido.clientes?.termino_credito || 'contado'),
        vendedor: pedido.profiles?.full_name,
        notas: pedido.notas,
      };

      setSelectedPedidoData(datosRemision);
      setRemisionDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar el pedido para imprimir",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Pedidos y Cotizaciones</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestión de pedidos de clientes y cotizaciones
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="relative">
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none sm:hidden" />
            <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
              <TabsList className="inline-flex w-max gap-1">
                <TabsTrigger value="por-autorizar" className="gap-1.5 px-2 sm:px-3">
                  <AlertCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Por Autorizar</span>
                  <span className="sm:hidden">Autoriz</span>
                </TabsTrigger>
                <TabsTrigger value="pedidos" className="gap-1.5 px-2 sm:px-3">
                  <ShoppingCart className="h-4 w-4" />
                  Pedidos
                </TabsTrigger>
                <TabsTrigger value="cotizaciones" className="gap-1.5 px-2 sm:px-3">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Cotizaciones</span>
                  <span className="sm:hidden">Cotiz</span>
                </TabsTrigger>
                <TabsTrigger value="analisis" className="gap-1.5 px-2 sm:px-3">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Análisis</span>
                  <span className="sm:hidden">Anál</span>
                </TabsTrigger>
                <TabsTrigger value="calendario" className="gap-1.5 px-2 sm:px-3">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendario</span>
                  <span className="sm:hidden">Cal</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="pedidos" className="mt-4 sm:mt-6 space-y-4">
            <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'justify-between items-center'}`}>
              <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : 'flex-1'}`}>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por folio o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedPedidos.size > 0 && (
                  <Button 
                    variant="destructive" 
                    size={isMobile ? "icon" : "default"}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {!isMobile && <span className="ml-2">Eliminar ({selectedPedidos.size})</span>}
                  </Button>
                )}
              </div>
              <Button onClick={() => setNuevoPedidoDialogOpen(true)} className={isMobile ? "w-full" : ""}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Pedido
              </Button>
            </div>

            {/* Vista móvil: cards */}
            {isMobile ? (
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                ) : filteredPedidos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No hay pedidos registrados</div>
                ) : (
                  filteredPedidos.map((pedido) => (
                    <PedidoHistorialCardMobile
                      key={pedido.id}
                      pedido={pedido}
                      isSelected={selectedPedidos.has(pedido.id)}
                      onSelect={handleSelectPedido}
                      onViewDetalle={(id) => {
                        setSelectedPedidoId(id);
                        setPedidoDetalleOpen(true);
                      }}
                      onPrintRemision={handlePrintRemision}
                      onGenerarFactura={(p) => {
                        setSelectedPedidoForFactura(p);
                        setFacturaDialogOpen(true);
                      }}
                      onFacturarEnviar={handleFacturarYEnviar}
                      onViewCotizacion={setSelectedCotizacionId}
                    />
                  ))
                )}
              </div>
            ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Peso Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : filteredPedidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center">
                        No hay pedidos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPedidos.map((pedido) => (
                      <TableRow key={pedido.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPedidos.has(pedido.id)}
                            onCheckedChange={(checked) => handleSelectPedido(pedido.id, !!checked)}
                            aria-label={`Seleccionar ${pedido.folio}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium font-mono">{pedido.folio}</TableCell>
                        <TableCell>{pedido.clientes?.nombre || "—"}</TableCell>
                        <TableCell className="text-sm">{pedido.sucursal?.nombre || "—"}</TableCell>
                        <TableCell>{pedido.profiles?.full_name || "—"}</TableCell>
                        <TableCell>
                          {new Date(pedido.fecha_pedido).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono">${formatCurrency(pedido.total)}</TableCell>
                        <TableCell className="font-mono">
                          {pedido.peso_total_kg ? (
                            <span className="text-sm">
                              {Math.round(pedido.peso_total_kg).toLocaleString()} kg
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                        <TableCell>{getFacturaBadge(pedido)}</TableCell>
                        <TableCell>
                          {pedido.cotizacion_origen ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-primary hover:text-primary/80 p-1 h-auto"
                                    onClick={() => setSelectedCotizacionId(pedido.cotizacion_origen!.id)}
                                  >
                                    <Link2 className="h-3 w-3" />
                                    <span className="font-mono text-xs">{pedido.cotizacion_origen.folio}</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver cotización origen</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-xs">Directo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      setSelectedPedidoId(pedido.id);
                                      setPedidoDetalleOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver detalles</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handlePrintRemision(pedido.id)}
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Imprimir Remisión</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Botón Generar Factura CFDI */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      setSelectedPedidoForFactura(pedido);
                                      setFacturaDialogOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <FileCheck className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Generar Factura CFDI</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {/* Botón unificado: Facturar y Enviar */}
                            {!pedido.factura_enviada_al_cliente && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleFacturarYEnviar(pedido)}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {pedido.facturado ? "Enviar Factura" : "Facturar y Enviar"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            )}
          </TabsContent>

          <TabsContent value="por-autorizar" className="mt-6 space-y-6">
            <SolicitudesDescuentoPanel />
            <PedidosPorAutorizarTab />
          </TabsContent>

          <TabsContent value="cotizaciones" className="mt-6">
            <CotizacionesTab />
          </TabsContent>

          <TabsContent value="analisis" className="mt-6">
            <CotizacionesAnalyticsTab />
          </TabsContent>

          <TabsContent value="calendario" className="mt-6">
            <CalendarioPedidosTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para ver cotización origen */}
      {selectedCotizacionId && (
        <CotizacionDetalleDialog
          cotizacionId={selectedCotizacionId}
          open={!!selectedCotizacionId}
          onOpenChange={(open) => !open && setSelectedCotizacionId(null)}
          onUpdate={() => loadPedidos()}
        />
      )}

      {/* Dialog para imprimir remisión */}
      <ImprimirRemisionDialog
        open={remisionDialogOpen}
        onOpenChange={setRemisionDialogOpen}
        datos={selectedPedidoData}
      />

      {/* Dialog para agregar email de cliente */}
      {selectedPedidoForEmail && (
        <EditarEmailClienteDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          clienteId={selectedPedidoForEmail.clientes?.id || ""}
          clienteNombre={selectedPedidoForEmail.clientes?.nombre || "Sin nombre"}
          sucursalId={selectedPedidoForEmail.sucursal ? undefined : undefined}
          onEmailUpdated={() => {
            loadPedidos();
            setSelectedPedidoForEmail(null);
          }}
        />
      )}

      <NuevoPedidoDialog
        open={nuevoPedidoDialogOpen}
        onOpenChange={setNuevoPedidoDialogOpen}
        onPedidoCreated={loadPedidos}
      />

      <PedidoDetalleDialog
        pedidoId={selectedPedidoId}
        open={pedidoDetalleOpen}
        onOpenChange={setPedidoDetalleOpen}
        onNavigateNext={handleNavigateNextPedido}
        onNavigatePrevious={handleNavigatePreviousPedido}
        canNavigateNext={canNavigateNext}
        canNavigatePrevious={canNavigatePrevious}
      />

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente {selectedPedidos.size} pedido(s) seleccionado(s) 
              junto con sus detalles y entregas asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para generar factura CFDI */}
      <GenerarFacturaDialog
        open={facturaDialogOpen}
        onOpenChange={setFacturaDialogOpen}
        pedido={selectedPedidoForFactura ? {
          id: selectedPedidoForFactura.id,
          folio: selectedPedidoForFactura.folio,
          fecha_pedido: selectedPedidoForFactura.fecha_pedido,
          total: selectedPedidoForFactura.total,
          clientes: selectedPedidoForFactura.clientes ? {
            id: selectedPedidoForFactura.clientes.id,
            nombre: selectedPedidoForFactura.clientes.nombre,
            rfc: selectedPedidoForFactura.clientes.rfc,
          } : null,
          sucursal: selectedPedidoForFactura.sucursal ? {
            nombre: selectedPedidoForFactura.sucursal.nombre,
            rfc: selectedPedidoForFactura.sucursal.rfc,
            razon_social: selectedPedidoForFactura.sucursal.razon_social,
          } : null,
        } : null}
        onSuccess={() => {
          loadPedidos();
          setSelectedPedidoForFactura(null);
        }}
      />
    </Layout>
  );
};

// Componente principal con ErrorBoundary
const Pedidos = () => (
  <ErrorBoundaryModule moduleName="Pedidos">
    <PedidosContent />
  </ErrorBoundaryModule>
);

export default Pedidos;