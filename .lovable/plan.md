
# Plan: Agregar Status "pendiente_pago" al Constraint de Base de Datos

## Problema Identificado

El código intenta insertar una OC con `status = 'pendiente_pago'` pero la base de datos tiene un CHECK constraint que no permite ese valor.

**Error exacto:**
```
new row for relation "ordenes_compra" violates check constraint "ordenes_compra_status_check"
```

**Constraint actual:**
```sql
CHECK (status = ANY (ARRAY['pendiente', 'pendiente_autorizacion', 'autorizada', 'enviada', 
'confirmada', 'parcial', 'recibida', 'completada', 'rechazada', 'devuelta', 'cancelada']))
```

---

## Solucion

Modificar el CHECK constraint para incluir el nuevo status `pendiente_pago`.

### Migracion SQL Requerida

```sql
-- Eliminar constraint actual
ALTER TABLE ordenes_compra 
DROP CONSTRAINT ordenes_compra_status_check;

-- Crear nuevo constraint con pendiente_pago incluido
ALTER TABLE ordenes_compra 
ADD CONSTRAINT ordenes_compra_status_check 
CHECK (status = ANY (ARRAY[
  'pendiente',
  'pendiente_autorizacion', 
  'pendiente_pago',  -- NUEVO: para OCs con pago anticipado
  'autorizada',
  'enviada',
  'confirmada',
  'parcial',
  'recibida',
  'completada',
  'rechazada',
  'devuelta',
  'cancelada'
]));
```

---

## Flujo de Status Actualizado

```text
PAGO CONTRA ENTREGA:
  pendiente -> pendiente_autorizacion -> autorizada -> enviada -> parcial/recibida -> completada

PAGO ANTICIPADO:
  pendiente_pago -> autorizada (al registrar pago) -> enviada -> parcial/recibida -> completada
```

---

## Impacto

- **Base de datos**: Solo se modifica el constraint, no afecta datos existentes
- **Codigo**: Ya esta listo para usar `pendiente_pago`
- **UI**: Ya muestra el badge correcto para este status

---

## Verificacion Post-Migracion

Despues de aplicar la migracion:
1. Crear OC con pago anticipado
2. Verificar que se crea con status `pendiente_pago`
3. Registrar pago y verificar transicion a `autorizada`
4. Programar entregas normalmente
