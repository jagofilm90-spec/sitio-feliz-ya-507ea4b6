# Roles y Seguridad — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de seguridad + decisiones operativas + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Quién puede hacer qué, dónde, cuándo y con qué evidencia.

---

## 1. La filosofía

ALMASA-OS no es un sistema con un solo dueño. Es una herramienta
que vive entre múltiples manos: vendedores en mercados, almacenistas
en bodega, choferes en ruta, contadora en oficina, Jose en todos lados.

Cada uno tiene un rol, un alcance, una responsabilidad. Y por tanto,
una privacidad propia.

> Principio rector: "Privacidad por rol no es paranoia. 
> Es protección operativa y reducción de tentaciones."  
> (Principio #1 de la Biblia v1.1)

Este documento define formalmente:
- Quiénes son los roles
- Qué puede hacer cada uno
- Cómo se aplican los permisos (3 capas)
- Cómo se audita
- Cómo se entra y se sale del sistema

---

## 2. Estado actual de seguridad

ALMASA-OS tiene un sistema de seguridad MUY AVANZADO. Inventario:

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Roles definidos | ✅ 8 roles | admin, secretaria, vendedor, chofer, almacen, gerente_almacen, contadora, cliente |
| RLS habilitado | ✅ 117 tablas | ENABLE ROW LEVEL SECURITY |
| Policies activas | ✅ 428 | CREATE POLICY con nombres descriptivos |
| Funciones helper | ✅ 6 | has_role, has_any_role, get_user_roles (3 variantes) |
| Route guard | ✅ Completo | ProtectedRoute + redirect inteligente por rol |
| Module permissions | ✅ 3 capas | RLS + ProtectedRoute + usePermissions matrix |
| Login | ✅ Email/pass | 2-step con retry |
| Reset password | ✅ Funcional | resetPasswordForEmail |
| Audit trail | 🟡 Por dominio | 8 tablas de historial, sin audit_log global |
| Baja empleados | 🟡 Parcial | Proceso completo pero NO revoca acceso auth |
| 2FA / MFA | ❌ No existe | — |
| Session timeout | ❌ No existe | Sin auto-logout por inactividad |
| OAuth | ❌ No existe | Solo email/password |

**Conclusión:** Base sólida. Solo 4 brechas que cerrar.

---

## 3. Estándar Oracle / SAP / NetSuite

Los grandes ERPs manejan seguridad con 7 conceptos:

### Concepto 1 — RBAC (Role-Based Access Control)
Permisos se asignan a ROLES, no a usuarios.

### Concepto 2 — RLS (Row-Level Security)
Vendedor ve SUS pedidos, no los de otros.

### Concepto 3 — Field-Level Security
Almacén ve cantidad pero no precio.

### Concepto 4 — Audit Trail
QUIÉN hizo QUÉ, CUÁNDO, desde DÓNDE.

### Concepto 5 — Segregation of Duties (SoD)
Quien CREA OC ≠ quien APRUEBA OC.

### Concepto 6 — Just-In-Time Access
"Por las próximas 4 horas, X puede ver Y".

### Concepto 7 — Deprovisioning
Empleado sale = acceso se quita INMEDIATAMENTE.

### Comparación de estrategias

**Oracle Identity Governance**
- Roles jerárquicos (heredan permisos)
- Compliance audit automático
- Single Sign-On (SSO)
- Just-In-Time access

**SAP Authorizations**
- Authorization Objects (objetos de permiso)
- Composite Roles (admin = secretaria + contadora + más)
- Org levels (sucursales, plantas)

**NetSuite Permissions**
- Roles predefinidos (CFO, Sales Rep, Warehouse)
- Customización vía UI
- Permission List por feature
- Field-level security

---

## 4. Por qué ALMASA-OS gana en seguridad

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Roles definidos | 100s | 8 claros | ALMASA |
| RBAC | ✅ | ✅ | EMPATE |
| Multi-rol por user | ✅ | ✅ | EMPATE |
| RLS | ✅ | ✅ 117 tablas | EMPATE |
| Field-level via RLS | ✅ | ✅ | EMPATE |
| Audit trail | Global | Por dominio | ORACLE |
| Segregation of Duties | Formal | Implícita | ORACLE |
| 2FA / MFA | ✅ | ❌ → planeado | ORACLE → EMPATE |
| Session timeout | ✅ | ❌ → planeado | ORACLE → EMPATE |
| SSO | ✅ | ❌ | ORACLE |
| Just-In-Time access | ✅ | ❌ | ORACLE |
| Deprovisioning auto | ✅ | 🟡 → automatizar | ORACLE → EMPATE |
| Compliance audit | ✅ | 🟡 | ORACLE |
| Costo licencia | $$$$ | $0 | ALMASA |
| Complejidad config | Alta | Media | ALMASA |
| Sistema 3 capas | ❌ | ✅ | ALMASA |

**Marcador final (post-implementación de las 4 brechas):**
ALMASA gana: 4 dimensiones (costo, simplicidad, sistema 3 capas, RBAC simple)
Oracle gana: 4 dimensiones (audit global, SoD formal, SSO, JIT)
Empate: 8 dimensiones

ALMASA-OS DESPUÉS de cerrar las brechas será **mejor que NetSuite básico
y comparable a Oracle Cloud para PYMEs**.

---

## 5. Los 8 Roles de ALMASA-OS (+ 1 nuevo)

### Rol 1 — admin
**Quién:** Jose Antonio Gomez (Director General)  
**Acceso:** Total. Sin restricciones.  
**2FA:** OBLIGATORIO  
**Session timeout:** 30 minutos  
**Particular:** Único que puede crear/editar usuarios, configurar permisos.

### Rol 2 — secretaria
**Quién:** Personal administrativo de oficina  
**Acceso:** Operación de oficina (clientes, pedidos, OCs, facturas)  
**No ve:** Reportes financieros sensibles, configuración técnica  
**2FA:** OPCIONAL (recomendado)  
**Session timeout:** 2 horas  
**Particular:** Aprueba pedidos, edita facturas, gestiona correos.

### Rol 3 — contadora
**Quién:** Contadora externa o interna  
**Acceso:** Finanzas, facturas, reportes, conciliación  
**No ve:** Operación de campo (almacén, choferes, vendedores)  
**2FA:** OBLIGATORIO  
**Session timeout:** 30 minutos  
**Particular:** Acceso a rentabilidad, configuración fiscal.

### Rol 4 — vendedor
**Quién:** Carlos, Salvador, Martín, Venancio  
**Acceso:** Catálogo, sus clientes, sus pedidos, sus comisiones  
**No ve:** Comisiones de otros vendedores, costos de productos  
**2FA:** OPCIONAL  
**Session timeout:** 2 horas  
**Particular:** Crea pedidos en campo (offline-first), ve precios de venta.

### Rol 5 — almacen
**Quién:** Almacenistas operativos  
**Acceso:** Inventario, recepción, carga, fumigaciones  
**No ve:** Precios de venta, costos de compra, datos de clientes  
**2FA:** NO REQUERIDO  
**Session timeout:** 2 horas  
**Particular:** Tablet ALMASA, captura báscula, fotos evidencia.

### Rol 6 — gerente_almacen
**Quién:** Gerente de operaciones de bodega  
**Acceso:** Todo lo de almacen + configuración bodega + fumigaciones  
**No ve:** Precios de venta, ventas, comisiones  
**2FA:** OBLIGATORIO  
**Session timeout:** 30 minutos  
**Particular:** Aprueba ajustes de inventario, configura accesos a bodega.

### Rol 7 — chofer
**Quién:** Choferes de ruta  
**Acceso:** Ruta del día, entregas, evidencia  
**No ve:** Precios, costos, datos sensibles de cliente  
**2FA:** NO REQUERIDO  
**Session timeout:** 2 horas  
**Particular:** Móvil propio (BYOD), GPS background, firmas digitales, OFFLINE-FIRST.

### Rol 8 — cliente (futuro)
**Quién:** Clientes con portal habilitado  
**Acceso:** SUS pedidos, SUS facturas, SU historial  
**No ve:** Precios de otros clientes, datos internos  
**2FA:** OPCIONAL  
**Session timeout:** 30 minutos  
**Particular:** Portal limitado, datos sensibles propios.

### Rol 9 — consejo (NUEVO)
**Quién:** Padre de Jose, socios futuros, miembros del consejo  
**Acceso:** Dashboards, reportes financieros, historial completo  
**Permisos clave:** SOLO LECTURA + APROBACIÓN de OCs grandes  
**No puede:** Crear, editar, eliminar registros  
**2FA:** OBLIGATORIO  
**Session timeout:** 30 minutos  
**Particular:** Para supervisión sin riesgo operativo. Aplicable también para socios futuros.

---

## 6. Los 6 Principios Transversales de Seguridad

### Principio 1 — Privacidad por Rol
(Refuerzo del Principio #1 de Biblia v1.1)

| Rol | Ve precios venta | Ve costos | Ve comisiones | Ve datos cliente |
|-----|------------------|-----------|---------------|------------------|
| admin | ✅ | ✅ | ✅ todas | ✅ |
| consejo | ✅ | ✅ | ✅ todas | ✅ |
| secretaria | ✅ | ❌ | ❌ | ✅ |
| contadora | ✅ | ✅ | ✅ todas | ✅ |
| vendedor | ✅ | ❌ | Solo las suyas | Sus clientes |
| almacen | ❌ | ❌ | ❌ | ❌ |
| gerente_almacen | ❌ | 🟡 algunos | ❌ | ❌ |
| chofer | ❌ | ❌ | ❌ | Solo entrega |
| cliente | Solo sus pedidos | ❌ | ❌ | Solo el suyo |

### Principio 2 — Sistema de 3 Capas
1. **Capa 1 — Backend (RLS):** 117 tablas, 428 policies
2. **Capa 2 — Routes (ProtectedRoute):** Frontend redirect
3. **Capa 3 — Modules (usePermissions):** Matriz CRUD por módulo

Si una capa falla, las otras protegen.

### Principio 3 — Auditoría Granular + Global
- Cada acción crítica genera evidencia (existe)
- Tabla audit_log global (a implementar) captura todo

### Principio 4 — Defensa en Profundidad
- Login (email + password)
- 2FA donde sea crítico
- Session timeout
- IP allowlist (futuro)
- Deprovisioning automático

### Principio 5 — Mínimo Privilegio
Cada rol tiene SOLO los permisos que necesita.
Default: NO tiene acceso. Se otorga explícitamente.

### Principio 6 — Trazabilidad Completa
Todo cambio crítico:
- Usuario que lo hizo
- Timestamp
- IP/Device
- Datos antes/después

---

## 7. Las 4 Brechas a Cerrar

### Brecha 1 — Deprovisioning Automático (URGENTE)
**Hoy:** Da de baja empleado pero acceso queda activo.  
**Riesgo:** Empleado disgustado puede seguir entrando.  

**Solución:**
```sql
CREATE OR REPLACE FUNCTION revocar_acceso_empleado_baja()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.fecha_baja IS NULL AND NEW.fecha_baja IS NOT NULL THEN
    -- Banear usuario en auth.users
    UPDATE auth.users 
    SET banned_until = '2099-01-01'::timestamptz
    WHERE id = NEW.user_id;
    
    -- Eliminar todos sus roles
    DELETE FROM user_roles WHERE user_id = NEW.user_id;
    
    -- Log de auditoría
    INSERT INTO audit_log (...) VALUES (...);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_revocar_acceso_baja
AFTER UPDATE ON empleados
FOR EACH ROW EXECUTE FUNCTION revocar_acceso_empleado_baja();
```

**Tiempo estimado:** 2-3 días  
**Prioridad:** CRÍTICA

### Brecha 2 — 2FA / MFA por Rol (IMPORTANTE)
**Hoy:** Solo email + password.  
**Falta:** Segundo factor (TOTP).  

**Estrategia graduada:**

| Rol | 2FA |
|-----|-----|
| admin | OBLIGATORIO |
| contadora | OBLIGATORIO |
| gerente_almacen | OBLIGATORIO |
| consejo | OBLIGATORIO |
| secretaria | OPCIONAL |
| vendedor | OPCIONAL |
| almacen | NO REQUERIDO |
| chofer | NO REQUERIDO |
| cliente | OPCIONAL |

**Razón de la graduación:**
- Roles con dinero/datos sensibles → OBLIGATORIO
- Roles intermedios → OPCIONAL (ellos deciden)
- Roles operativos de campo → NO REQUERIDO (riesgo de paralizar operación)

**Implementación:**
- Supabase Auth tiene MFA built-in (TOTP)
- App: Google Authenticator / Microsoft Authenticator / Authy
- Recovery codes en caso de pérdida del dispositivo

**Tiempo estimado:** 1-2 semanas  
**Prioridad:** IMPORTANTE

### Brecha 3 — Audit Log Global (IMPORTANTE)
**Hoy:** 8 tablas de historial dispersas.  
**Falta:** Una sola tabla audit_log que capture TODO.  

**Solución:**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  rol_actuante TEXT,
  accion TEXT NOT NULL, -- 'crear', 'actualizar', 'eliminar', 'login', 'logout', 'aprobar', 'rechazar'
  tabla_afectada TEXT,
  registro_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  ip_address TEXT,
  user_agent TEXT,
  modulo TEXT, -- 'pedidos', 'compras', 'inventario', etc.
  resultado TEXT, -- 'exitoso', 'error', 'denegado'
  notas TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_tabla ON audit_log(tabla_afectada, registro_id);
```

**Trigger universal:**
- AFTER INSERT/UPDATE/DELETE en tablas críticas
- Captura datos antes/después
- Asocia con usuario actual + rol activo

**Beneficios:**
- Compliance fiscal (SAT)
- Investigación de incidentes
- Análisis de uso del sistema
- Detección de anomalías

**Tiempo estimado:** 1-2 semanas  
**Prioridad:** IMPORTANTE

### Brecha 4 — Session Timeout (NICE)
**Hoy:** Sin auto-logout.  
**Falta:** Logout después de inactividad.  

**Estrategia graduada:**

| Rol | Timeout | Warning |
|-----|---------|---------|
| admin | 30 min | a 25 min |
| consejo | 30 min | a 25 min |
| contadora | 30 min | a 25 min |
| gerente_almacen | 30 min | a 25 min |
| cliente | 30 min | a 25 min |
| secretaria | 2 horas | a 1h 50min |
| vendedor | 2 horas | a 1h 50min |
| almacen | 2 horas | a 1h 50min |
| chofer | 2 horas | a 1h 50min |

**Razón de la graduación:**
- Roles sensibles: timeout corto (datos críticos)
- Roles operativos: timeout largo (uso continuo en campo)

**Comportamiento:**
- Detecta inactividad (sin click/scroll)
- Warning aparece antes del timeout
- Click "Sigo aquí" extiende sesión
- Si no hay respuesta, logout automático
- Refresh de tokens automático si user activo

**Tiempo estimado:** 3-5 días  
**Prioridad:** NICE

---

## 8. Roadmap de Seguridad

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/11 generado |
| Junio | Brecha 1: Deprovisioning automático |
| Junio | Brecha 3: Audit log global (estructura) |
| Julio | Brecha 2: 2FA para admin/contadora/gerente/consejo |
| Julio | Brecha 4: Session timeout |
| Agosto | Brecha 3: Audit log global (triggers en todas las tablas) |
| Septiembre | Validación completa + tests de penetración |

**Tiempo total:** 4-5 meses  
**Inversión:** $0 adicional (todo software, infraestructura existente)

---

## 9. Decisiones de Negocio Pendientes

### Decisión 1 — Política de contraseñas
- Mínimo 8, 10 o 12 caracteres?
- Obligar mayúsculas + números + símbolos?
- Cambio cada 90 días o nunca?
- Recomendación: 10 caracteres, complejidad media, sin expiración (NIST 2024)

### Decisión 2 — Rol "consejo" - quién lo recibe primero
- Solo padre de Jose por ahora?
- Crear cuenta para socio futuro?

### Decisión 3 — Recuperación de 2FA
- Recovery codes (10 códigos de 1 uso)?
- SMS backup?
- Reset por admin?
- Recomendación: Recovery codes + reset por admin como fallback

### Decisión 4 — IP allowlist para roles sensibles
- Forzar que admin/contadora solo entren desde IPs conocidas?
- Pro: máxima seguridad
- Contra: si Jose viaja, no puede entrar
- Recomendación: opcional, no obligatorio

### Decisión 5 — Tiempo máximo de inactividad para banear
- Si empleado activo no entra al sistema en X días, banear automático?
- Recomendación: 60 días sin login = warning, 90 días = banear

### Decisión 6 — Compliance fiscal (audit log retention)
- Cuánto tiempo guardar audit logs?
- SAT requiere mínimo 5 años para fiscal
- Recomendación: 7 años por seguridad

---

## 10. Conexión con Biblia v1.1

### Principio #1 (Privacidad por rol)
Este documento OPERACIONALIZA el Principio #1 con tablas
concretas por rol y por módulo.

### Principio #2 (AirDrop digital)
Las transferencias entre roles requieren permisos explícitos.
Este documento define quién puede recibir qué.

### Principio #3 (Continuidad operativa)
Deprovisioning automático garantiza que la baja de un empleado
no afecte la operación.

### Principio #4 (CPP real con gastos asociados)
La contadora ve costos completos.
Almacenista NO los ve. Garantizado por RLS + Module permissions.

### Principio #5 (Utilidad en tres niveles)
Solo admin y contadora ven utilidad neta.
Vendedor ve utilidad bruta de SUS pedidos.

### Principio #10 (Users Before Perfection)
2FA graduado: empezar con OBLIGATORIO solo para roles críticos.
Expandir gradualmente.

---

## 11. Recomendación final

ALMASA-OS tiene una base de seguridad **enterprise-grade**:
- 8 roles claros
- 117 tablas con RLS
- 428 policies activas
- 3 capas de protección
- 6 funciones helper

Las 4 brechas son específicas y se cierran en 4-5 meses
con $0 de inversión adicional (solo desarrollo).

**Orden estricto de implementación:**
1. **JUNIO 2026:** Deprovisioning + Audit log global (CRÍTICO)
2. **JULIO 2026:** 2FA + Session timeout (IMPORTANTE)
3. **AGOSTO 2026:** Audit log triggers completos
4. **SEPTIEMBRE 2026:** Validación + testing

Una vez completas las 4 brechas, ALMASA-OS estará al nivel
de Oracle Cloud para PYMEs en seguridad, con la ventaja de
costo $0 y simplicidad superior.

---

## 12. Crear el rol "consejo"

```sql
-- Agregar al enum app_role
ALTER TYPE app_role ADD VALUE 'consejo';

-- Permisos por defecto: solo lectura + aprobación
INSERT INTO module_permissions (rol, modulo, permisos) VALUES
('consejo', 'dashboard', ARRAY['view']),
('consejo', 'pedidos', ARRAY['view']),
('consejo', 'compras', ARRAY['view', 'authorize_large']),
('consejo', 'facturas', ARRAY['view']),
('consejo', 'rentabilidad', ARRAY['view']),
('consejo', 'reportes', ARRAY['view']);

-- Configurar 2FA obligatorio
UPDATE module_permissions 
SET requires_2fa = true 
WHERE rol = 'consejo';
```

**Asignación inicial:**
- Padre de Jose: rol 'consejo'
- Socios futuros: rol 'consejo'

---

*ALMASA-OS · Roles y Seguridad · v1.0*  
*Generado el 10 de mayo de 2026*  
*Documento de diseño · Pendiente decisión y ejecución*  
*Quién puede hacer qué, dónde, cuándo y con qué evidencia.*
