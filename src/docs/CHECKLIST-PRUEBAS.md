# Checklist de Pruebas - ERP Abarrotes La Manita

> **Última actualización:** 2025-12-12  
> **Propósito:** Validar módulos críticos antes de uso en producción  
> **Responsable:** Equipo de implementación

---

## 📋 Instrucciones de Uso

- [ ] Marcar cada ítem cuando se complete la prueba
- [ ] Documentar cualquier error encontrado con capturas de pantalla
- [ ] No pasar a producción hasta completar al menos Fase 1 y Fase 2
- [ ] Repetir pruebas después de correcciones mayores

---

## 🔐 1. Autenticación y Seguridad

### 1.1 Login/Logout
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 1.1.1 | Iniciar sesión con credenciales válidas | Acceso al dashboard según rol | ☐ |
| 1.1.2 | Iniciar sesión con credenciales inválidas | Mensaje de error claro, sin acceso | ☐ |
| 1.1.3 | Cerrar sesión | Redirección a login, sesión terminada | ☐ |
| 1.1.4 | Acceder a ruta protegida sin sesión | Redirección automática a login | ☐ |

### 1.2 Roles y Permisos
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 1.2.1 | Admin accede a todos los módulos | Menú completo visible | ☐ |
| 1.2.2 | Secretaria accede solo a módulos permitidos | Menú filtrado correctamente | ☐ |
| 1.2.3 | Vendedor no accede a Empleados | Ruta bloqueada, redirección | ☐ |
| 1.2.4 | Chofer solo ve Rutas/Entregas | Módulos limitados correctamente | ☐ |
| 1.2.5 | Modificar permisos en /permisos | Cambios reflejados inmediatamente | ☐ |

### 1.3 Seguridad de Datos
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 1.3.1 | Vendedor intenta ver empleados vía URL directa | Acceso denegado por RLS | ☐ |
| 1.3.2 | Cliente portal no ve datos de otros clientes | Solo sus propios pedidos/sucursales | ☐ |
| 1.3.3 | Tokens OAuth de Gmail no expuestos en frontend | Campos sensibles ocultos | ☐ |

---

## 📦 2. Pedidos

### 2.1 Creación de Pedidos
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 2.1.1 | Crear pedido nuevo desde NuevoPedidoDialog | Pedido guardado con folio automático | ☐ |
| 2.1.2 | Buscar y agregar productos | Productos encontrados, precios correctos | ☐ |
| 2.1.3 | Calcular subtotal, IVA, IEPS, total | Cálculos exactos según fórmulas | ☐ |
| 2.1.4 | Seleccionar cliente y sucursal | Datos fiscales cargados correctamente | ☐ |
| 2.1.5 | Agregar notas al pedido | Notas guardadas y visibles | ☐ |

### 2.2 Flujo de Estados
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 2.2.1 | Pedido inicia en "por_autorizar" | Estado inicial correcto | ☐ |
| 2.2.2 | Autorizar pedido | Cambia a "pendiente", email enviado | ☐ |
| 2.2.3 | Rechazar pedido con motivo | Cambia a "cancelado", motivo guardado | ☐ |
| 2.2.4 | Asignar pedido a ruta | Cambia a "en_proceso" | ☐ |
| 2.2.5 | Marcar como entregado | Cambia a "entregado", fecha registrada | ☐ |

### 2.3 Cálculos de Precios
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 2.3.1 | Producto por kilo: 2 bultos × 25kg × $19/kg | Total línea = $950 | ☐ |
| 2.3.2 | Producto por bulto: 3 bultos × $400/bulto | Total línea = $1,200 | ☐ |
| 2.3.3 | Producto con IVA 16% | IVA calculado correctamente | ☐ |
| 2.3.4 | Producto con IEPS 8% | IEPS calculado correctamente | ☐ |
| 2.3.5 | Producto sin impuestos | Sin IVA ni IEPS | ☐ |

---

## 🧾 3. Facturación CFDI

### 3.1 Generación de Facturas
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 3.1.1 | Generar factura desde pedido entregado | Factura creada con datos correctos | ☐ |
| 3.1.2 | Factura directa (sin pedido previo) | NuevaFacturaDirectaDialog funcional | ☐ |
| 3.1.3 | Venta de mostrador (RFC XAXX010101000) | Usa cliente "PÚBLICO EN GENERAL" | ☐ |
| 3.1.4 | Seleccionar Uso CFDI, Forma Pago, Método Pago | Campos SAT correctos | ☐ |

### 3.2 Timbrado con Facturama
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 3.2.1 | Timbrar factura en Sandbox | UUID generado, sin errores | ☐ |
| 3.2.2 | Timbrar factura en Producción | CFDI válido ante SAT | ☐ |
| 3.2.3 | Descargar PDF de factura timbrada | PDF con UUID y sello fiscal | ☐ |
| 3.2.4 | Descargar XML de factura timbrada | XML válido descargable | ☐ |
| 3.2.5 | Error de timbrado muestra mensaje claro | Usuario entiende el problema | ☐ |

### 3.3 Cancelación CFDI
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 3.3.1 | Cancelar factura con motivo válido | Cancelación procesada | ☐ |
| 3.3.2 | Cancelar factura ya cancelada | Error controlado | ☐ |
| 3.3.3 | Estado actualizado a "cancelado" | Reflejo en interfaz | ☐ |

---

## 📊 4. Inventario y Lotes

### 4.1 Gestión de Lotes
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 4.1.1 | Crear lote con fecha caducidad | Lote guardado correctamente | ☐ |
| 4.1.2 | Ver desglose de lotes por producto | Múltiples lotes visibles | ☐ |
| 4.1.3 | Stock total = suma de lotes | Cálculo correcto | ☐ |
| 4.1.4 | FIFO: lote más antiguo sugerido primero | Orden correcto por fecha | ☐ |

### 4.2 Movimientos de Inventario
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 4.2.1 | Entrada por recepción de compra | Stock aumenta, lote creado | ☐ |
| 4.2.2 | Salida por entrega de pedido | Stock disminuye de lote correcto | ☐ |
| 4.2.3 | Transferencia entre bodegas | Origen baja, destino sube | ☐ |
| 4.2.4 | Ajuste manual de inventario | Movimiento registrado con notas | ☐ |

### 4.3 Alertas de Caducidad
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 4.3.1 | Producto a 30 días de caducar | Notificación generada | ☐ |
| 4.3.2 | Producto ya caducado | Alerta crítica visible | ☐ |
| 4.3.3 | Lista de productos por caducar | Ordenados por urgencia | ☐ |

---

## 🚚 5. Rutas y Entregas

### 5.1 Planificación de Rutas
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 5.1.1 | Ver pedidos pendientes de asignar | Lista completa y filtrable | ☐ |
| 5.1.2 | Crear ruta manual seleccionando pedidos | Ruta creada con entregas | ☐ |
| 5.1.3 | Asignar vehículo a ruta | Capacidad validada | ☐ |
| 5.1.4 | Asignar chofer y ayudante | Personal disponible | ☐ |
| 5.1.5 | Validar capacidad no excede límite | Alerta si sobrepasa | ☐ |

### 5.2 Sugerencias IA
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 5.2.1 | Generar sugerencias de rutas | Rutas optimizadas propuestas | ☐ |
| 5.2.2 | Rutas agrupan por zona geográfica | Clustering correcto | ☐ |
| 5.2.3 | Respeta restricciones de cliente | Horarios, vehículos permitidos | ☐ |
| 5.2.4 | Fallback si IA falla | Algoritmo simple funciona | ☐ |

### 5.3 Visualización de Mapas
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 5.3.1 | Mapa muestra sucursales con coordenadas | Marcadores visibles | ☐ |
| 5.3.2 | Ruta dibujada con polyline | Trayecto visible | ☐ |
| 5.3.3 | Error de Google Maps muestra fallback | No pantalla en blanco | ☐ |
| 5.3.4 | Compartir ubicación funciona | Link copiado/compartido | ☐ |

### 5.4 Ejecución de Entregas
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 5.4.1 | Marcar entrega como completada | Estado actualizado | ☐ |
| 5.4.2 | Registrar devolución parcial | Cantidades ajustadas | ☐ |
| 5.4.3 | Capturar firma digital | Firma guardada | ☐ |
| 5.4.4 | Notificación a oficina al completar | Push/alerta enviada | ☐ |

---

## 👥 6. Clientes y Sucursales

### 6.1 Gestión de Clientes
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 6.1.1 | Crear cliente nuevo | Cliente guardado con código | ☐ |
| 6.1.2 | Editar datos fiscales | RFC, razón social actualizados | ☐ |
| 6.1.3 | Subir CSF (Constancia Situación Fiscal) | Archivo guardado y parseado | ☐ |
| 6.1.4 | Asignar vendedor a cliente | Relación establecida | ☐ |
| 6.1.5 | Configurar término de crédito | 8, 15, o 30 días aplicado | ☐ |

### 6.2 Sucursales
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 6.2.1 | Agregar sucursal a cliente | Sucursal vinculada | ☐ |
| 6.2.2 | Geocodificar dirección | Coordenadas obtenidas | ☐ |
| 6.2.3 | Configurar restricciones de entrega | Horarios, días, vehículos | ☐ |
| 6.2.4 | Sucursal con datos fiscales propios | RFC/razón social separados | ☐ |
| 6.2.5 | Importar sucursales desde Excel | Múltiples creadas | ☐ |

### 6.3 Grupos de Clientes
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 6.3.1 | Crear grupo (ej: Grupo La Universal) | Cliente padre creado | ☐ |
| 6.3.2 | Agrupar clientes existentes bajo grupo | Relación establecida | ☐ |
| 6.3.3 | Detectar posibles duplicados | Sugerencias mostradas | ☐ |

---

## 📧 7. Correos Corporativos

### 7.1 Conexión Gmail
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 7.1.1 | Autenticar cuenta Gmail vía OAuth | Tokens guardados | ☐ |
| 7.1.2 | Listar correos de bandeja entrada | Emails visibles | ☐ |
| 7.1.3 | Ver detalle de email | Contenido renderizado | ☐ |
| 7.1.4 | Cambiar entre cuentas | Bandeja actualiza | ☐ |

### 7.2 Envío de Correos
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 7.2.1 | Componer email nuevo | Dialog abre correctamente | ☐ |
| 7.2.2 | Enviar email con firma | Email enviado, firma incluida | ☐ |
| 7.2.3 | Responder a email | Contexto incluido | ☐ |
| 7.2.4 | Adjuntar archivo | Archivo enviado | ☐ |

### 7.3 Permisos y Auditoría
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 7.3.1 | Asignar permiso de cuenta a usuario | Acceso otorgado | ☐ |
| 7.3.2 | Revocar permiso | Acceso removido | ☐ |
| 7.3.3 | Auditoría muestra quién envió qué | Registro completo | ☐ |

---

## 💰 8. Cotizaciones

### 8.1 Creación y Envío
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 8.1.1 | Crear cotización nueva | Folio generado | ☐ |
| 8.1.2 | Agregar productos con precios | Líneas calculadas | ☐ |
| 8.1.3 | Generar PDF de cotización | PDF profesional con logo | ☐ |
| 8.1.4 | Enviar cotización por email | Email con PDF adjunto | ☐ |
| 8.1.5 | Envío múltiple a mismo cliente | Agrupación correcta | ☐ |

### 8.2 Flujo de Autorización
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 8.2.1 | Autorizar cotización | Estado cambia, fecha registrada | ☐ |
| 8.2.2 | Rechazar cotización con motivo | Estado y motivo guardados | ☐ |
| 8.2.3 | Convertir cotización a pedido | Pedido creado con datos | ☐ |

---

## 🛒 9. Compras y Proveedores

### 9.1 Proveedores
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 9.1.1 | Crear proveedor nuevo | Proveedor guardado | ☐ |
| 9.1.2 | Asociar productos a proveedor | Relación establecida | ☐ |
| 9.1.3 | Ver historial de precios | Precios anteriores visibles | ☐ |

### 9.2 Órdenes de Compra
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 9.2.1 | Crear orden de compra | OC con folio generado | ☐ |
| 9.2.2 | Autorizar orden de compra | Estado cambia, notificación | ☐ |
| 9.2.3 | Programar entregas múltiples | Calendario de entregas | ☐ |
| 9.2.4 | Registrar recepción de mercancía | Lotes creados, stock aumenta | ☐ |
| 9.2.5 | Capturar evidencias fotográficas | Fotos guardadas | ☐ |

---

## 🔔 10. Notificaciones y Alertas

### 10.1 Centro de Notificaciones
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 10.1.1 | Ver notificaciones no leídas | Badge con contador | ☐ |
| 10.1.2 | Marcar notificación como leída | Contador disminuye | ☐ |
| 10.1.3 | Notificación de documento por vencer | Alerta visible | ☐ |
| 10.1.4 | Notificación de OC por autorizar | Alerta visible | ☐ |

### 10.2 Push Notifications (Capacitor)
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 10.2.1 | Registrar dispositivo | Token guardado | ☐ |
| 10.2.2 | Recibir push al asignar ruta | Notificación llega | ☐ |
| 10.2.3 | Push al completar carga | Chofer notificado | ☐ |

---

## 💾 11. Respaldos y Exportación

### 11.1 Exportación de Datos
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 11.1.1 | Exportar clientes a Excel | Archivo .xlsx descargado | ☐ |
| 11.1.2 | Exportar productos a CSV | Archivo .csv descargado | ☐ |
| 11.1.3 | Exportar pedidos con filtros | Datos filtrados correctos | ☐ |
| 11.1.4 | Exportar lotes de inventario | Incluye fechas caducidad | ☐ |

---

## 🛡️ 12. Estabilidad y Errores

### 12.1 Manejo de Errores
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 12.1.1 | Error de red muestra mensaje amigable | Toast con retry option | ☐ |
| 12.1.2 | Error en módulo no tumba la app | ErrorBoundary captura | ☐ |
| 12.1.3 | Google Maps falla sin pantalla blanca | Fallback con lista | ☐ |
| 12.1.4 | Sesión expirada redirige a login | Sin error 401 visible | ☐ |

### 12.2 Rendimiento
| # | Prueba | Resultado Esperado | ✓ |
|---|--------|-------------------|---|
| 12.2.1 | Dashboard carga < 300ms | Tiempo aceptable | ☐ |
| 12.2.2 | Lista de 1000+ pedidos no congela | Virtualización activa | ☐ |
| 12.2.3 | Navegación entre módulos instantánea | < 150ms transición | ☐ |

---

## 📊 Resumen de Ejecución

| Fase | Módulos | Prioridad | Estado |
|------|---------|-----------|--------|
| 1 | Auth, Pedidos, CFDI | 🔴 Crítica | ☐ Pendiente |
| 2 | Inventario, Rutas, Clientes | 🟠 Alta | ☐ Pendiente |
| 3 | Correos, Cotizaciones, Compras | 🟡 Media | ☐ Pendiente |
| 4 | Notificaciones, Respaldos, Estabilidad | 🟢 Normal | ☐ Pendiente |

---

## 📝 Registro de Incidencias

| Fecha | Módulo | Descripción | Severidad | Estado |
|-------|--------|-------------|-----------|--------|
| | | | | |

---

## ✅ Aprobación Final

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Admin | | | |
| QA | | | |

---

> **Nota:** Este checklist debe ejecutarse en ambiente de pruebas antes de cada despliegue mayor a producción. Mantener actualizado según se agreguen nuevas funcionalidades.
