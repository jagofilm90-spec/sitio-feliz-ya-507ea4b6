# OC Wizard v3 — Las 21 Decisiones de Negocio
## Aprobadas por Josan el 29 abril 2026

Usado como input para prompt Lovable y referencia permanente.

---

### Sección 1: Proveedor y condiciones

1. **Plazo se autocompleta del proveedor** — al seleccionar proveedor, el campo plazo de pago se llena con el default del catálogo. Editable si esta OC tiene condiciones distintas.

2. **"Pago anticipado" pide fecha + método** — si el usuario elige pago anticipado, el sistema pide fecha de pago y método (transferencia/cheque/depósito). La OC queda en status "pendiente_pago" hasta confirmar.

3. **"Proveedor no registrado" eliminado** — toda OC requiere proveedor del catálogo. Si no existe, dar de alta primero.

### Sección 2: Productos

4. **Solo productos asociados al proveedor** — la búsqueda en el paso de productos solo muestra productos vinculados al proveedor seleccionado (tabla proveedor_productos).

5. **Stock visible con badge** — cada línea de producto muestra stock actual con badge color (verde OK, amarillo bajo, rojo sin stock).

6. **Última compra como hint** — debajo del input de precio, mostrar "Última compra: $X.XX el DD/MM/YYYY" como referencia.

7. **Sistema carga fija vs libre** — configuración por producto-proveedor. Carga fija: capacidad estándar del vehículo (ej: tráiler = 20,000 bultos). Libre: el usuario define cantidad.

8. **Bultos como unidad primaria** — la cantidad siempre se captura en bultos. Si el producto es por kilo, el sistema calcula kg automáticamente (bultos × peso_kg).

9. **Toggle IVA en línea eliminado** — el producto ya tiene aplica_iva configurado en su alta. La OC lo respeta sin toggle por línea.

### Sección 3: Entregas

10. **"Quién recibe" y "Dirección" eliminados** — siempre se recibe en bodega ALMASA. No hay entregas en otros puntos.

11. **Sidebar sticky con totales** — panel derecho fijo con: subtotal, IVA, IEPS, total, peso total, # bultos. Se actualiza en tiempo real.

12. **Card crimson "Pago programado"** — si es pago anticipado, card destacada en sidebar con fecha y monto.

### Sección 4: UX y performance

13. **Borrador autoguardado** — cada cambio se guarda en localStorage. Si el usuario cierra sin completar, al reabrir se restaura.

14. **Cmd-K + Tab + Enter** — atajos para captura veloz. Cmd-K abre búsqueda de producto, Tab navega campos, Enter agrega línea.

### Sección 5: Post-creación

15. **Edición post-creación con histórico** — OC editable hasta status "recibida". Cada cambio queda en log. Al pasar a "recibida", se bloquea.

16. **Plazo arranca al recibir** — el reloj de crédito (8/15/30 días) empieza cuando almacén confirma recepción, no cuando se crea la OC.

17. **Recepción parcial cierra OC** — si llega menos de lo pedido, la OC se cierra como "parcial". El faltante queda registrado en historial del proveedor.

18. **Costo raro = alerta amarilla** — si el precio capturado difiere >20% del último costo, alerta amarilla. Pero deja crear (no bloquea).

### Sección 6: Entregas múltiples

19. **División automática + manual** — el sistema sugiere división por capacidad de vehículo. El usuario puede ajustar manualmente.

### Sección 7: Unidades y decimales

20. **Recepción: solo número** — el almacenista ingresa solo la cantidad numérica. El sistema muestra la unidad (bultos/cajas/etc).

21. **Decimales estándar** — Pesos ($): siempre 2 decimales. Kilogramos: 2 decimales. Bultos/cajas/tráilers: 0 decimales (enteros).
