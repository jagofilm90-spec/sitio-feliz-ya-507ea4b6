// Types for route components - extracted to avoid circular imports with google.maps

export interface RoutePoint {
  id: string;
  folio: string;
  cliente: string;
  sucursal?: string;
  direccion: string;
  peso_kg: number;
  orden: number;
  lat?: number;
  lng?: number;
  prioridad?: string;
}

export interface RouteData {
  id: string;
  vehiculoNombre: string;
  vehiculoTipo: string;
  color: string;
  puntos: RoutePoint[];
  pesoTotal: number;
  capacidadMaxima: number;
}

export interface RealRoutePoint {
  id: string;
  folio: string;
  cliente: string;
  sucursal?: string;
  direccion: string;
  peso_kg: number;
  orden: number;
  lat?: number;
  lng?: number;
}
