
# Plan: Quitar Detección AI de Placas y Usar Solo Ingreso Manual

## Resumen del Cambio
Eliminar la detección automática de placas vehiculares por AI y dejar solo el campo de ingreso manual. Esto simplifica el flujo y evita dependencias de servicios externos.

## Cambios a Realizar

### Archivo: `src/components/almacen/RegistrarLlegadaSheet.tsx`

**1. Eliminar la función de detección AI (líneas 129-175)**

Eliminar completamente:
```typescript
const detectarPlacasConAI = async (file: File) => {
  // ... toda esta función
}
```

**2. Modificar el manejo de captura de foto de placas (líneas 116-127)**

**Antes:**
```typescript
const handleEvidenciaCapture = async (tipo: TipoEvidencia, file: File, preview: string) => {
  setEvidencias(prev => {
    const filtered = prev.filter(e => e.tipo !== tipo);
    return [...filtered, { tipo, file, preview }];
  });
  
  // Si es foto de placas, intentar detectar con AI
  if (tipo === "placas") {
    await detectarPlacasConAI(file);
  }
};
```

**Después:**
```typescript
const handleEvidenciaCapture = async (tipo: TipoEvidencia, file: File, preview: string) => {
  setEvidencias(prev => {
    const filtered = prev.filter(e => e.tipo !== tipo);
    return [...filtered, { tipo, file, preview }];
  });
  // Ya no se detectan placas con AI - ingreso manual únicamente
};
```

**3. Eliminar estados relacionados con detección AI (líneas 97-100)**

**Antes:**
```typescript
const [placasDetectadas, setPlacasDetectadas] = useState<string | null>(null);
const [placasManual, setPlacasManual] = useState("");
const [detectandoPlacas, setDetectandoPlacas] = useState(false);
const [deteccionFallida, setDeteccionFallida] = useState(false);
```

**Después:**
```typescript
const [placas, setPlacas] = useState("");
```

**4. Simplificar la UI del campo de placas**

Eliminar:
- Badge de "Detectado por AI"
- Estado de carga "Detectando placas..."
- Indicadores de detección fallida

Dejar solo:
- Campo de texto simple para ingresar las placas manualmente
- La foto de placas seguirá siendo obligatoria (para evidencia visual)

**5. Actualizar validación (mantener validación de placas)**

La validación existente ya verifica que `placasManual.trim()` no esté vacío (línea 259), solo hay que renombrar a `placas`.

**6. Actualizar el guardado (línea 464)**

Cambiar:
```typescript
placas_vehiculo: placasManual.trim(),
```

Por:
```typescript
placas_vehiculo: placas.trim(),
```

---

## Edge Function a Mantener (No Eliminar)

El archivo `supabase/functions/extract-placas-vehiculo/index.ts` puede mantenerse por si se quiere reactivar en el futuro, pero ya no será invocado desde el frontend.

---

## UI Simplificada Resultante

El formulario de llegada quedará con:
1. **Nombre del chofer** (texto)
2. **Foto de placas/camión** (captura obligatoria - evidencia visual)
3. **Número de placas** (texto manual - SIN detección AI)
4. **Foto de identificación** (captura obligatoria)
5. **Sellos de seguridad** (fotos o checkbox "Sin sellos" + firma)

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/almacen/RegistrarLlegadaSheet.tsx` | Eliminar detección AI, simplificar estados, mantener campo manual |

---

## Confirmación del Flujo Completo (Ya Funciona)

Para tu tranquilidad, confirmo que todo el flujo está correctamente sincronizado:

| Paso | Estado |
|------|--------|
| Secretaria crea OC con entregas programadas | ✅ Funciona |
| Almacén ve entregas en tiempo real (Realtime) | ✅ Funciona |
| Fase 1: Registrar llegada (chofer, placas, sellos) | ✅ Funciona |
| Fase 2: Completar recepción (cantidades, firmas) | ✅ Funciona |
| Stock se actualiza automáticamente (trigger SQL) | ✅ Funciona |
| Faltantes: Auto-programa siguiente día hábil | ✅ Funciona |
| Notificación al proveedor con PDF | ✅ Funciona |
| Copia interna a admin/secretaria | ✅ Funciona |
| Notificación de faltantes al proveedor | ✅ Funciona |

---

## Próximo Paso Después de Este Cambio

Una vez aprobado este cambio, el flujo quedará listo para que los vendedores puedan hacer pedidos desde su interfaz, ya que habrá producto disponible en inventario.
