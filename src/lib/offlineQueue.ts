/**
 * offlineQueue — IndexedDB-backed offline queue for ALMASA-OS.
 *
 * Zero external dependencies. Uses native IndexedDB API.
 *
 * Two object stores:
 *   - borradores:          drafts that couldn't reach Supabase during autosave
 *   - pedidos_pendientes:  submitted orders waiting to sync
 */

const DB_NAME = "almasa-offline-queue";
const DB_VERSION = 1;
const STORE_BORRADORES = "borradores";
const STORE_PENDIENTES = "pedidos_pendientes";

// ── Types ──────────────────────────────────────────────

export interface PedidoPendiente {
  id: string;
  created_at: string;
  cliente_id: string;
  cliente_nombre: string;
  sucursal_id: string | null;
  vendedor_id: string;
  termino_credito: string;
  notas: string;
  notas_entrega: string;
  requiere_factura: boolean;
  es_directo: boolean;
  lineas: Array<{
    producto_id: string;
    producto_nombre: string;
    cantidad: number;
    precio_unitario: number;
    precio_lista: number;
    subtotal: number;
    aplica_iva: boolean;
    aplica_ieps: boolean;
  }>;
  totales: {
    subtotal: number;
    iva: number;
    ieps: number;
    total: number;
    peso_total: number | null;
  };
  status: "pendiente_sync";
  intentos_sync: number;
  ultimo_error: string | null;
}

export interface BorradorOffline {
  id: string;
  updated_at: string;
  cliente_id: string;
  cliente_nombre: string;
  sucursal_id: string | null;
  vendedor_id: string;
  termino_credito: string;
  notas: string;
  notas_entrega: string;
  requiere_factura: boolean;
  es_directo: boolean;
  step: number;
  lineas: Array<{
    producto_id: string;
    producto_nombre: string;
    cantidad: number;
    precio_unitario: number;
    precio_lista: number;
  }>;
}

// ── DB initialization ──────────────────────────────────

let dbInstance: IDBDatabase | null = null;

export async function initOfflineDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_BORRADORES)) {
        db.createObjectStore(STORE_BORRADORES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PENDIENTES)) {
        db.createObjectStore(STORE_PENDIENTES, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ── Generic helpers ────────────────────────────────────

async function getDB(): Promise<IDBDatabase> {
  return dbInstance || initOfflineDB();
}

function txPut<T>(storeName: string, item: T): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = await getDB();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function txGetAll<T>(storeName: string): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    const db = await getDB();
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function txDelete(storeName: string, key: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = await getDB();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function txCount(storeName: string): Promise<number> {
  return new Promise(async (resolve, reject) => {
    const db = await getDB();
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Pedidos pendientes ─────────────────────────────────

export async function guardarPedidoPendiente(pedido: PedidoPendiente): Promise<void> {
  return txPut(STORE_PENDIENTES, pedido);
}

export async function obtenerPedidosPendientes(): Promise<PedidoPendiente[]> {
  return txGetAll<PedidoPendiente>(STORE_PENDIENTES);
}

export async function eliminarPedidoPendiente(id: string): Promise<void> {
  return txDelete(STORE_PENDIENTES, id);
}

export async function contarPedidosPendientes(): Promise<number> {
  return txCount(STORE_PENDIENTES);
}

// ── Borradores offline ─────────────────────────────────

export async function guardarBorradorOffline(borrador: BorradorOffline): Promise<void> {
  return txPut(STORE_BORRADORES, borrador);
}

export async function obtenerBorradoresOffline(): Promise<BorradorOffline[]> {
  return txGetAll<BorradorOffline>(STORE_BORRADORES);
}

export async function eliminarBorradorOffline(id: string): Promise<void> {
  return txDelete(STORE_BORRADORES, id);
}
