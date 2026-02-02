
# Plan: Adaptación Móvil Completa de TODOS los Diálogos

## Resumen del Problema

Del análisis exhaustivo de todo el código, encontré:
- **96 archivos** con componentes `DialogContent`
- **Solo 3 archivos** tienen las clases móviles correctas (`w-[calc(100vw-2rem)]`)
- **93 archivos** necesitan corrección

Esto significa que cada vez que un usuario toca un botón en móvil que abre un diálogo, hay alta probabilidad de que el contenido se desborde o sea invisible.

---

## Lista Completa de Archivos a Corregir

### Módulo PEDIDOS (5 archivos)
| Archivo | Clase Actual | Problema |
|---------|-------------|----------|
| `PedidoDetalleDialog.tsx` | `max-w-4xl` | Muy ancho para móvil |
| `PedidosPorAutorizarTab.tsx` | `max-w-4xl` | Muy ancho para móvil |
| `EditarEmailClienteDialog.tsx` | `sm:max-w-md` | Falta clase móvil |
| `NuevoPedidoDialog.tsx` | `max-w-4xl` | Muy ancho para móvil |
| `GenerarFacturaDialog.tsx` | `sm:max-w-md` | Falta clase móvil |

### Módulo COTIZACIONES (8 archivos)
| Archivo | Clase Actual |
|---------|-------------|
| `CotizacionesAnalyticsTab.tsx` | `max-w-5xl` |
| `EnviarCotizacionDialog.tsx` | `max-w-lg` |
| `ImprimirCotizacionDialog.tsx` | `max-w-5xl` |
| `EnviarCotizacionesMultiplesDialog.tsx` | `max-w-lg` |
| `CotizacionDetalleDialog.tsx` | `max-w-3xl` |
| `AutorizacionCotizacionDialog.tsx` | `max-w-2xl` |
| `CrearCotizacionDialog.tsx` | `max-w-4xl` |
| `EnviarCotizacionesAgrupadasDialog.tsx` | `max-w-2xl` |

### Módulo RUTAS (9 archivos)
| Archivo | Clase Actual |
|---------|-------------|
| `PlanificadorRutas.tsx` | `max-w-5xl` |
| `RutaKilometrajeDialog.tsx` | `sm:max-w-md` |
| `MapaRutaEnVivo.tsx` (2 diálogos) | `max-w-4xl` |
| `VehiculosTab.tsx` | `max-w-3xl` |
| `SugerirRutasAIDialog.tsx` | `max-w-4xl` |
| `ReasignarPersonalDialog.tsx` | `sm:max-w-lg` |
| `PosponerRutaDialog.tsx` | `sm:max-w-md` |
| `EnviarMensajeChoferDialog.tsx` | `sm:max-w-md` |
| `EditarRutaDialog.tsx` | `sm:max-w-lg` |

### Módulo VENDEDOR (7 archivos)
| Archivo | Clase Actual |
|---------|-------------|
| `VendedorNuevoPedidoTab.tsx` | `sm:max-w-md` |
| `EliminarPedidoDialog.tsx` (AlertDialog) | `max-w-md` |
| `PedidoDetalleVendedorDialog.tsx` | `sm:max-w-lg` |
| `SolicitudDescuentoDialog.tsx` | `sm:max-w-md` |
| `VendedorBienvenidaDialog.tsx` | `sm:max-w-lg` |
| `CancelarPedidoDialog.tsx` | `sm:max-w-md` |
| `RegistrarPagoDialog.tsx` | `max-w-2xl` |

### Módulo COMPRAS (24 archivos)
| Archivo | Clase Actual |
|---------|-------------|
| `OrdenesCompraTab.tsx` | `max-w-4xl` |
| `RegistrarRecepcionDialog.tsx` | `max-w-3xl` |
| `DevolucionesEvidenciasGallery.tsx` (2) | `max-w-3xl`, `max-w-4xl` |
| `AjustarCostosOCDialog.tsx` | `max-w-2xl` |
| `ConciliacionRapidaDialog.tsx` | `max-w-2xl` |
| `CreditosPendientesPanel.tsx` | `max-w-lg` |
| `EnviarEvidenciasProveedorDialog.tsx` | `max-w-2xl` |
| `CalendarioEntregasTab.tsx` | `max-w-2xl` |
| `DividirEntregaDialog.tsx` | `max-w-2xl` |
| `MarcarPagadoDialog.tsx` | `sm:max-w-md` |
| `ProveedorProductosSelector.tsx` | `max-w-md` |
| `ConvertirEntregasMultiplesDialog.tsx` | `max-w-2xl` |
| `ConciliarFacturaDialog.tsx` | `max-w-4xl` |
| `EvidenciasGallery.tsx` (2) | `max-w-3xl`, `max-w-4xl` |
| `ModificarProductosOCDialog.tsx` | - |
| `CrearOrdenCompraWizard.tsx` (2) | `max-w-3xl`, `max-w-md` |
| `ProcesarPagoOCDialog.tsx` | `max-w-4xl` |
| `ProveedoresTab.tsx` | - |
| `NotificarCambiosOCDialog.tsx` (Alert) | `max-w-lg` |
| `ProveedorFacturasDialog.tsx` | - |
| `ReenviarOCDialog.tsx` | - |
| `AutorizacionOCDialog.tsx` | - |
| `HistorialCorreosOC.tsx` | - |

### Módulo ALMACEN (9 archivos)
| Archivo | Clase Actual |
|---------|-------------|
| `CargaEvidenciasSection.tsx` | `max-w-2xl` |
| `SellosSection.tsx` | `max-w-2xl` |
| `CancelarDescargaDialog.tsx` (Alert) | `max-w-md` |
| `AlmacenRecepcionSheet.tsx` | `sm:max-w-lg` |
| `AlmacenVentasMostradorTab.tsx` | `max-w-2xl` |
| `ConfiguracionFlotillaDialog.tsx` | `max-w-lg` |
| `VehiculoCheckupDialog.tsx` | `max-w-3xl` |
| `DiagramaDanosVehiculo.tsx` | `max-w-2xl` |
| `DevolucionProveedorDialog.tsx` | `max-w-lg` |

### Módulo CLIENTES (8 archivos - 1 ya corregido)
| Archivo | Clase Actual | Estado |
|---------|-------------|--------|
| `ImportarSucursalesExcelDialog.tsx` | `max-w-4xl` | FALTA |
| `ClienteCorreosManager.tsx` | `max-w-lg` | FALTA |
| `ClienteSucursalesDialog.tsx` | ✅ Ya corregido | OK |
| `ClienteSucursalesMapDialog.tsx` (2) | `max-w-4xl`, `max-w-5xl` | FALTA |
| `ImportarCatalogoAspelDialog.tsx` | `max-w-5xl` | FALTA |
| `ClienteProductosDialog.tsx` | `max-w-4xl` | FALTA |
| `DetectarGruposDialog.tsx` | `max-w-4xl` | FALTA |
| `AgruparClientesDialog.tsx` | `max-w-3xl` | FALTA |
| `CrearAccesoPortalDialog.tsx` | `sm:max-w-md` | FALTA |

### Módulo SECRETARIA (6 archivos)
| Archivo | Clase Actual |
|---------|-------------|
| `MigracionLoteDialog.tsx` | `max-w-5xl` |
| `SecretariaBienvenidaDialog.tsx` | `max-w-lg` |
| `SecretariaProductosTab.tsx` | `max-w-2xl` |
| `SecretariaListaPreciosTab.tsx` (2) | `max-w-md`, `max-w-lg` |
| `SecretariaCostosTab.tsx` | `sm:max-w-md` |
| `MigracionProductosDialog.tsx` | `max-w-3xl` |

### Módulo EMPLEADOS (1 archivo)
| Archivo | Clase Actual |
|---------|-------------|
| `ExpedienteAnalysisDialog.tsx` | `max-w-2xl` |

### Módulo FACTURAS (2 archivos)
| Archivo | Clase Actual |
|---------|-------------|
| `NuevaFacturaDirectaDialog.tsx` | `max-w-4xl` |
| `ProcesarSolicitudDialog.tsx` | `max-w-3xl` |

### Módulo CORREOS (4 archivos)
| Archivo | Clase Actual |
|---------|-------------|
| `ComposeEmailDialog.tsx` | `sm:max-w-2xl` |
| `ProcesarPedidoDialog.tsx` | `max-w-4xl` |
| `VincularFacturaDialog.tsx` | `max-w-2xl` |
| `PedidosAcumulativosManager.tsx` | `max-w-4xl` |

### Módulo PAGES (5 archivos - 2 ya corregidos)
| Archivo | Clase Actual | Estado |
|---------|-------------|--------|
| `Inventario.tsx` | ✅ Ya condicional | OK |
| `CorreosCorporativos.tsx` | `sm:max-w-md` | FALTA |
| `Productos.tsx` | `max-w-2xl` | FALTA |
| `Empleados.tsx` (2) | `max-w-2xl`, `max-w-3xl` | FALTA |
| `Clientes.tsx` | ✅ Ya corregido | OK |
| `Chat.tsx` | `max-w-2xl` | FALTA |

---

## Solución Técnica

### Patrón de Corrección

Para CADA archivo, aplicar este cambio:

```tsx
// ANTES
<DialogContent className="max-w-4xl max-h-[90vh]">

// DESPUÉS
<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-x-hidden">
```

También para AlertDialog:
```tsx
// ANTES  
<AlertDialogContent className="max-w-md">

// DESPUÉS
<AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
```

### Reglas de Mapeo de Clases

| Clase Actual | Clase Nueva |
|--------------|-------------|
| `max-w-md` | `w-[calc(100vw-2rem)] sm:max-w-md` |
| `max-w-lg` | `w-[calc(100vw-2rem)] sm:max-w-lg` |
| `max-w-xl` | `w-[calc(100vw-2rem)] sm:max-w-xl` |
| `max-w-2xl` | `w-[calc(100vw-2rem)] sm:max-w-2xl` |
| `max-w-3xl` | `w-[calc(100vw-2rem)] sm:max-w-3xl` |
| `max-w-4xl` | `w-[calc(100vw-2rem)] sm:max-w-4xl` |
| `max-w-5xl` | `w-[calc(100vw-2rem)] sm:max-w-5xl` |
| `sm:max-w-X` | `w-[calc(100vw-2rem)] sm:max-w-X` |

Y SIEMPRE agregar `overflow-x-hidden` si no existe.

---

## Plan de Ejecución

Dado el volumen (93+ archivos), organizaré la corrección en lotes por módulo:

### Lote 1: Módulos de uso frecuente
1. Pedidos (5 archivos)
2. Vendedor (7 archivos)
3. Cotizaciones (8 archivos)

### Lote 2: Módulos de operaciones
1. Compras (24 archivos)
2. Almacén (9 archivos)

### Lote 3: Módulos secundarios
1. Rutas (9 archivos)
2. Clientes (7 archivos)
3. Secretaria (6 archivos)

### Lote 4: Módulos restantes
1. Correos (4 archivos)
2. Facturas (2 archivos)
3. Empleados (1 archivo)
4. Pages restantes (3 archivos)

---

## Resultado Esperado

Después de aplicar todos los cambios:
- **100% de diálogos** se ajustarán correctamente al viewport móvil
- **Sin overflow horizontal** en ningún diálogo
- **Desktop sin cambios** (las clases `sm:max-w-X` mantienen el comportamiento actual)
- El usuario podrá usar CUALQUIER funcionalidad desde móvil sin problemas de visualización

---

## Archivos Totales a Modificar

**93 archivos** distribuidos en:
- `/src/components/pedidos/` → 5 archivos
- `/src/components/cotizaciones/` → 8 archivos
- `/src/components/rutas/` → 9 archivos
- `/src/components/vendedor/` → 7 archivos
- `/src/components/compras/` → 24 archivos
- `/src/components/almacen/` → 9 archivos
- `/src/components/clientes/` → 7 archivos
- `/src/components/secretaria/` → 6 archivos
- `/src/components/empleados/` → 1 archivo
- `/src/components/facturas/` → 2 archivo
- `/src/components/correos/` → 4 archivos
- `/src/pages/` → 3 archivos
- Otros componentes dispersos → ~8 archivos

