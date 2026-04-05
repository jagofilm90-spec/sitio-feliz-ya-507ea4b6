import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { notificarCambioPrecio } from "@/lib/notificarVendedores";
import type { ProductoPrecio } from "./useListaPrecios";

interface UsePrecioEditorOptions {
  /** Roles to notify on price change */
  notifyRoles?: string[];
  /** List of products for navigation */
  productList?: ProductoPrecio[];
}

export function usePrecioEditor(options: UsePrecioEditorOptions = {}) {
  const { notifyRoles = ['secretaria', 'vendedor'], productList = [] } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoPrecio | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [precioVenta, setPrecioVenta] = useState("");
  const [descuentoMaximo, setDescuentoMaximo] = useState("");

  // Save feedback
  const [isSaved, setIsSaved] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [originalPrecio, setOriginalPrecio] = useState("");
  const [originalDescuento, setOriginalDescuento] = useState("");

  // Calculator state
  const [modoCalculadora, setModoCalculadora] = useState(false);
  const [usarCostoPromedio, setUsarCostoPromedio] = useState(true);
  const [margenPorcentaje, setMargenPorcentaje] = useState("");

  // Detect changes to reset saved state
  useEffect(() => {
    if (!editingProduct) return;
    const hasChanges = precioVenta !== originalPrecio || descuentoMaximo !== originalDescuento;
    if (hasChanges && isSaved) setIsSaved(false);
  }, [precioVenta, descuentoMaximo, originalPrecio, originalDescuento, isSaved, editingProduct]);

  // Update mutation
  const updatePriceMutation = useMutation({
    mutationFn: async ({
      id,
      precio_venta,
      descuento_maximo,
      precio_anterior,
    }: {
      id: string;
      precio_venta: number;
      descuento_maximo: number | null;
      precio_anterior: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("productos")
        .update({ precio_venta, descuento_maximo })
        .eq("id", id);

      if (error) throw error;

      if (precio_anterior !== precio_venta) {
        await supabase.from("productos_historial_precios").insert({
          producto_id: id,
          precio_anterior,
          precio_nuevo: precio_venta,
          usuario_id: user?.id ?? null,
        });

        const productoNombre = editingProduct?.nombre || "";
        notificarCambioPrecio({
          productoNombre,
          precioAnterior: precio_anterior,
          precioNuevo: precio_venta,
          roles: notifyRoles,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Precio actualizado" });
      queryClient.invalidateQueries({ queryKey: ["lista-precios"] });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
    },
  });

  // Open editor
  const openEditor = (producto: ProductoPrecio, index?: number) => {
    const idx = index ?? productList.findIndex(p => p.id === producto.id);
    setCurrentIndex(idx);
    setEditingProduct(producto);
    const precio = producto.precio_venta.toString();
    const descuento = producto.descuento_maximo?.toString() || "";
    setPrecioVenta(precio);
    setDescuentoMaximo(descuento);
    setOriginalPrecio(precio);
    setOriginalDescuento(descuento);
    setIsSaved(false);
    setModoCalculadora(false);
    setMargenPorcentaje("");
    setUsarCostoPromedio(true);
    setEditDialogOpen(true);
  };

  // Save
  const handleSave = (callbacks?: { onSuccess?: () => void }) => {
    if (!editingProduct) return;

    const precio = parseFloat(precioVenta);
    if (isNaN(precio) || precio <= 0) {
      toast({ title: "Error", description: "El precio debe ser mayor a 0", variant: "destructive" });
      return;
    }

    const descuento = descuentoMaximo ? parseFloat(descuentoMaximo) : null;

    updatePriceMutation.mutate(
      {
        id: editingProduct.id,
        precio_venta: precio,
        descuento_maximo: descuento,
        precio_anterior: editingProduct.precio_venta,
      },
      {
        onSuccess: () => {
          setShowSuccessAnimation(true);
          setTimeout(() => {
            setIsSaved(true);
            setShowSuccessAnimation(false);
          }, 400);
          setOriginalPrecio(precioVenta);
          setOriginalDescuento(descuentoMaximo);
          setEditingProduct(prev =>
            prev ? { ...prev, precio_venta: precio, descuento_maximo: descuento } : null
          );
          callbacks?.onSuccess?.();
        },
      }
    );
  };

  // Navigation between products
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!productList.length || currentIndex === -1) return;

    const newIndex = direction === 'prev'
      ? Math.max(0, currentIndex - 1)
      : Math.min(productList.length - 1, currentIndex + 1);

    if (newIndex === currentIndex) return;

    // Auto-save current before navigating
    if (editingProduct) {
      const precio = parseFloat(precioVenta);
      if (!isNaN(precio) && precio > 0) {
        const descuento = descuentoMaximo ? parseFloat(descuentoMaximo) : null;
        updatePriceMutation.mutate(
          {
            id: editingProduct.id,
            precio_venta: precio,
            descuento_maximo: descuento,
            precio_anterior: editingProduct.precio_venta,
          },
          {
            onSuccess: () => {
              openEditor(productList[newIndex], newIndex);
            },
          }
        );
      } else {
        openEditor(productList[newIndex], newIndex);
      }
    }
  };

  // Keyboard shortcuts for navigation
  useEffect(() => {
    if (!editDialogOpen || !editingProduct) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        handleNavigate('prev');
      } else if (e.key === 'ArrowRight' && currentIndex < productList.length - 1) {
        e.preventDefault();
        handleNavigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editDialogOpen, editingProduct, currentIndex, productList.length, precioVenta, descuentoMaximo]);

  // Close editor
  const closeEditor = () => {
    setEditDialogOpen(false);
    setCurrentIndex(-1);
  };

  return {
    // Dialog state
    editDialogOpen,
    setEditDialogOpen: (open: boolean) => {
      if (!open) setCurrentIndex(-1);
      setEditDialogOpen(open);
    },
    editingProduct,
    currentIndex,

    // Form values
    precioVenta, setPrecioVenta,
    descuentoMaximo, setDescuentoMaximo,

    // Calculator
    modoCalculadora, setModoCalculadora,
    usarCostoPromedio, setUsarCostoPromedio,
    margenPorcentaje, setMargenPorcentaje,

    // Save state
    isSaved,
    showSuccessAnimation,
    isPending: updatePriceMutation.isPending,

    // Actions
    openEditor,
    closeEditor,
    handleSave,
    handleNavigate,
    updatePriceMutation,
  };
}
