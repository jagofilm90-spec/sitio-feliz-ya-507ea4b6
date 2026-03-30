#!/usr/bin/env python3
"""
Sincronizador ZKTeco MB160 → Supabase (tabla asistencia)
ALMASA ERP — Abarrotes La Manita, S.A. de C.V.

Requisitos:
  pip install pyzk requests

Uso:
  python zk_sync.py
"""

import time
import requests
from datetime import datetime, timedelta
from zk import ZK

# ═══ CONFIGURACIÓN ═══

SUPABASE_URL = "https://vrcyjmfpteoccqdmdmqn.supabase.co"
SUPABASE_KEY = "AQUI_VA_EL_SERVICE_ROLE_KEY"  # Reemplazar con tu service role key

DISPOSITIVOS = [
    {"nombre": "oficina", "ip": "192.168.1.126", "port": 4370},
    {"nombre": "almacen", "ip": "192.168.1.127", "port": 4370},
]

DIAS_ATRAS = 7          # Solo sincronizar registros de los últimos N días
INTERVALO_SEG = 60      # Segundos entre cada sincronización
API_BATCH_SIZE = 100    # Registros por request a Supabase

# ═══ HELPERS ═══

def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

def leer_registros_zk(dispositivo):
    """Conecta al ZKTeco y lee registros de asistencia de los últimos N días."""
    nombre = dispositivo["nombre"]
    ip = dispositivo["ip"]
    port = dispositivo["port"]
    registros = []

    zk = ZK(ip, port=port, timeout=10)
    conn = None
    try:
        log(f"Conectando a {nombre} ({ip}:{port})...")
        conn = zk.connect()
        conn.disable_device()

        attendances = conn.get_attendance()
        conn.enable_device()

        if not attendances:
            log(f"  {nombre}: Sin registros")
            return registros

        fecha_limite = datetime.now() - timedelta(days=DIAS_ATRAS)

        for att in attendances:
            if att.timestamp < fecha_limite:
                continue

            tipo = "entrada" if att.status in (0, 4) else "salida" if att.status in (1, 5) else "entrada"
            fecha_hora = att.timestamp

            registros.append({
                "zk_user_id": str(att.user_id),
                "dispositivo": nombre,
                "fecha_hora": fecha_hora.isoformat(),
                "fecha": fecha_hora.strftime("%Y-%m-%d"),
                "hora": fecha_hora.strftime("%H:%M:%S"),
                "tipo": tipo,
                "zk_status": att.status,
            })

        log(f"  {nombre}: {len(registros)} registros de los últimos {DIAS_ATRAS} días")

    except Exception as e:
        log(f"  ERROR {nombre}: {e}")
    finally:
        if conn:
            try:
                conn.disconnect()
            except:
                pass

    return registros

def subir_a_supabase(registros):
    """Sube registros a Supabase via REST API con upsert (evita duplicados)."""
    if not registros:
        return 0

    url = f"{SUPABASE_URL}/rest/v1/asistencia"
    headers = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    total_subidos = 0

    # Subir en batches
    for i in range(0, len(registros), API_BATCH_SIZE):
        batch = registros[i:i + API_BATCH_SIZE]
        try:
            resp = requests.post(url, json=batch, headers=headers, timeout=30)
            if resp.status_code in (200, 201):
                total_subidos += len(batch)
            elif resp.status_code == 409:
                # Duplicados — ya existen, no es error
                total_subidos += len(batch)
            else:
                log(f"  ERROR Supabase: {resp.status_code} — {resp.text[:200]}")
        except Exception as e:
            log(f"  ERROR Supabase request: {e}")

    return total_subidos

def sincronizar():
    """Ejecuta un ciclo de sincronización completo."""
    log("=" * 50)
    log("Iniciando sincronización...")

    resumen = {}

    for dispositivo in DISPOSITIVOS:
        nombre = dispositivo["nombre"]
        registros = leer_registros_zk(dispositivo)

        if registros:
            subidos = subir_a_supabase(registros)
            resumen[nombre] = subidos
            log(f"  {nombre}: {subidos} registros sincronizados")
        else:
            resumen[nombre] = 0

    log("─" * 50)
    for nombre, count in resumen.items():
        log(f"  {nombre.upper()}: {count} registros")
    log("Sincronización completada.")

# ═══ MAIN ═══

if __name__ == "__main__":
    log("╔══════════════════════════════════════════╗")
    log("║  ZKTeco → Supabase Sync — ALMASA ERP    ║")
    log("╚══════════════════════════════════════════╝")

    if SUPABASE_KEY == "AQUI_VA_EL_SERVICE_ROLE_KEY":
        log("⚠️  CONFIGURA TU SUPABASE_KEY antes de ejecutar!")
        log("   Edita zk_sync.py y reemplaza SUPABASE_KEY")
        exit(1)

    log(f"Dispositivos: {', '.join(d['nombre'] + ' (' + d['ip'] + ')' for d in DISPOSITIVOS)}")
    log(f"Intervalo: cada {INTERVALO_SEG} segundos")
    log(f"Rango: últimos {DIAS_ATRAS} días")
    log("")

    while True:
        try:
            sincronizar()
        except KeyboardInterrupt:
            log("Detenido por el usuario.")
            break
        except Exception as e:
            log(f"ERROR GENERAL: {e}")

        log(f"Próxima sincronización en {INTERVALO_SEG} segundos...")
        try:
            time.sleep(INTERVALO_SEG)
        except KeyboardInterrupt:
            log("Detenido por el usuario.")
            break
