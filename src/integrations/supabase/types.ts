export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ayudantes_externos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: string
          nombre_completo: string
          notas: string | null
          tarifa_por_viaje: number | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre_completo: string
          notas?: string | null
          tarifa_por_viaje?: number | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre_completo?: string
          notas?: string | null
          tarifa_por_viaje?: number | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bodegas: {
        Row: {
          activo: boolean
          costo_por_kilo: number | null
          created_at: string
          direccion: string | null
          es_externa: boolean
          id: string
          latitud: number | null
          longitud: number | null
          nombre: string
          radio_deteccion_metros: number | null
          updated_at: string
          wifi_ssids: string[] | null
        }
        Insert: {
          activo?: boolean
          costo_por_kilo?: number | null
          created_at?: string
          direccion?: string | null
          es_externa?: boolean
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre: string
          radio_deteccion_metros?: number | null
          updated_at?: string
          wifi_ssids?: string[] | null
        }
        Update: {
          activo?: boolean
          costo_por_kilo?: number | null
          created_at?: string
          direccion?: string | null
          es_externa?: boolean
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          radio_deteccion_metros?: number | null
          updated_at?: string
          wifi_ssids?: string[] | null
        }
        Relationships: []
      }
      carga_evidencias: {
        Row: {
          capturado_por: string | null
          created_at: string | null
          id: string
          nombre_archivo: string | null
          ruta_id: string
          ruta_storage: string
          tipo_evidencia: string
        }
        Insert: {
          capturado_por?: string | null
          created_at?: string | null
          id?: string
          nombre_archivo?: string | null
          ruta_id: string
          ruta_storage: string
          tipo_evidencia: string
        }
        Update: {
          capturado_por?: string | null
          created_at?: string | null
          id?: string
          nombre_archivo?: string | null
          ruta_id?: string
          ruta_storage?: string
          tipo_evidencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "carga_evidencias_ruta_id_fkey"
            columns: ["ruta_id"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      carga_productos: {
        Row: {
          cantidad_cargada: number | null
          cantidad_solicitada: number
          cargado: boolean | null
          cargado_en: string | null
          cargado_por: string | null
          corregido_en: string | null
          created_at: string | null
          entrega_id: string
          id: string
          lote_id: string | null
          motivo_correccion: string | null
          movimiento_inventario_id: string | null
          notas: string | null
          pedido_detalle_id: string
          peso_real_kg: number | null
          updated_at: string | null
        }
        Insert: {
          cantidad_cargada?: number | null
          cantidad_solicitada: number
          cargado?: boolean | null
          cargado_en?: string | null
          cargado_por?: string | null
          corregido_en?: string | null
          created_at?: string | null
          entrega_id: string
          id?: string
          lote_id?: string | null
          motivo_correccion?: string | null
          movimiento_inventario_id?: string | null
          notas?: string | null
          pedido_detalle_id: string
          peso_real_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          cantidad_cargada?: number | null
          cantidad_solicitada?: number
          cargado?: boolean | null
          cargado_en?: string | null
          cargado_por?: string | null
          corregido_en?: string | null
          created_at?: string | null
          entrega_id?: string
          id?: string
          lote_id?: string | null
          motivo_correccion?: string | null
          movimiento_inventario_id?: string | null
          notas?: string | null
          pedido_detalle_id?: string
          peso_real_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carga_productos_cargado_por_fkey"
            columns: ["cargado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carga_productos_cargado_por_fkey"
            columns: ["cargado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carga_productos_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carga_productos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "inventario_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carga_productos_movimiento_inventario_id_fkey"
            columns: ["movimiento_inventario_id"]
            isOneToOne: false
            referencedRelation: "inventario_movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carga_productos_pedido_detalle_id_fkey"
            columns: ["pedido_detalle_id"]
            isOneToOne: false
            referencedRelation: "pedidos_detalles"
            referencedColumns: ["id"]
          },
        ]
      }
      chofer_ubicaciones: {
        Row: {
          chofer_id: string
          created_at: string | null
          heading: number | null
          id: string
          latitud: number
          longitud: number
          precision_metros: number | null
          ruta_id: string | null
          timestamp: string | null
          velocidad_kmh: number | null
        }
        Insert: {
          chofer_id: string
          created_at?: string | null
          heading?: number | null
          id?: string
          latitud: number
          longitud: number
          precision_metros?: number | null
          ruta_id?: string | null
          timestamp?: string | null
          velocidad_kmh?: number | null
        }
        Update: {
          chofer_id?: string
          created_at?: string | null
          heading?: number | null
          id?: string
          latitud?: number
          longitud?: number
          precision_metros?: number | null
          ruta_id?: string | null
          timestamp?: string | null
          velocidad_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chofer_ubicaciones_ruta_id_fkey"
            columns: ["ruta_id"]
            isOneToOne: true
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_contactos: {
        Row: {
          activo: boolean | null
          cliente_id: string
          created_at: string | null
          es_principal: boolean | null
          id: string
          nombre: string
          puesto: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          cliente_id: string
          created_at?: string | null
          es_principal?: boolean | null
          id?: string
          nombre: string
          puesto?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          cliente_id?: string
          created_at?: string | null
          es_principal?: boolean | null
          id?: string
          nombre?: string
          puesto?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_contactos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_correos: {
        Row: {
          activo: boolean | null
          cliente_id: string
          created_at: string
          email: string
          es_principal: boolean | null
          id: string
          nombre_contacto: string | null
          proposito: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          cliente_id: string
          created_at?: string
          email: string
          es_principal?: boolean | null
          id?: string
          nombre_contacto?: string | null
          proposito?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          cliente_id?: string
          created_at?: string
          email?: string
          es_principal?: boolean | null
          id?: string
          nombre_contacto?: string | null
          proposito?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_correos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_cortesias_default: {
        Row: {
          activo: boolean | null
          cantidad: number
          cliente_id: string
          created_at: string
          id: string
          notas: string | null
          producto_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          cantidad?: number
          cliente_id: string
          created_at?: string
          id?: string
          notas?: string | null
          producto_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          cantidad?: number
          cliente_id?: string
          created_at?: string
          id?: string
          notas?: string | null
          producto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_cortesias_default_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_cortesias_default_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_cortesias_default_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_creditos_excepciones: {
        Row: {
          cliente_id: string
          created_at: string | null
          id: string
          notas: string | null
          producto_id: string
          termino_credito: Database["public"]["Enums"]["credit_term"]
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          id?: string
          notas?: string | null
          producto_id: string
          termino_credito: Database["public"]["Enums"]["credit_term"]
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          id?: string
          notas?: string | null
          producto_id?: string
          termino_credito?: Database["public"]["Enums"]["credit_term"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_creditos_excepciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_creditos_excepciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_creditos_excepciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_productos_frecuentes: {
        Row: {
          activo: boolean | null
          cliente_id: string
          created_at: string
          es_especial: boolean | null
          id: string
          orden_display: number | null
          producto_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          cliente_id: string
          created_at?: string
          es_especial?: boolean | null
          id?: string
          orden_display?: number | null
          producto_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          cliente_id?: string
          created_at?: string
          es_especial?: boolean | null
          id?: string
          orden_display?: number | null
          producto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_productos_frecuentes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_productos_frecuentes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_productos_frecuentes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_programacion_pedidos: {
        Row: {
          activo: boolean | null
          cliente_id: string
          created_at: string | null
          dia_semana: string
          hora_preferida: string | null
          id: string
          notas: string | null
          sucursal_id: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          cliente_id: string
          created_at?: string | null
          dia_semana: string
          hora_preferida?: string | null
          id?: string
          notas?: string | null
          sucursal_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          cliente_id?: string
          created_at?: string | null
          dia_semana?: string
          hora_preferida?: string | null
          id?: string
          notas?: string | null
          sucursal_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_programacion_pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_programacion_pedidos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "cliente_sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_sucursales: {
        Row: {
          activo: boolean
          cl: string | null
          cliente_id: string
          codigo_sucursal: string | null
          contacto: string | null
          created_at: string
          dias_sin_entrega: string | null
          direccion: string | null
          direccion_fiscal: string | null
          email_facturacion: string | null
          es_rosticeria: boolean | null
          horario_entrega: string | null
          id: string
          latitud: number | null
          longitud: number | null
          no_combinar_pedidos: boolean | null
          nombre: string
          notas: string | null
          razon_social: string | null
          restricciones_vehiculo: string | null
          rfc: string | null
          telefono: string | null
          updated_at: string
          zona_id: string | null
        }
        Insert: {
          activo?: boolean
          cl?: string | null
          cliente_id: string
          codigo_sucursal?: string | null
          contacto?: string | null
          created_at?: string
          dias_sin_entrega?: string | null
          direccion?: string | null
          direccion_fiscal?: string | null
          email_facturacion?: string | null
          es_rosticeria?: boolean | null
          horario_entrega?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          no_combinar_pedidos?: boolean | null
          nombre: string
          notas?: string | null
          razon_social?: string | null
          restricciones_vehiculo?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
          zona_id?: string | null
        }
        Update: {
          activo?: boolean
          cl?: string | null
          cliente_id?: string
          codigo_sucursal?: string | null
          contacto?: string | null
          created_at?: string
          dias_sin_entrega?: string | null
          direccion?: string | null
          direccion_fiscal?: string | null
          email_facturacion?: string | null
          es_rosticeria?: boolean | null
          horario_entrega?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          no_combinar_pedidos?: boolean | null
          nombre?: string
          notas?: string | null
          razon_social?: string | null
          restricciones_vehiculo?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_sucursales_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_sucursales_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_telefonos: {
        Row: {
          activo: boolean | null
          cliente_id: string
          created_at: string | null
          es_principal: boolean | null
          etiqueta: string | null
          id: string
          telefono: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          cliente_id: string
          created_at?: string | null
          es_principal?: boolean | null
          etiqueta?: string | null
          id?: string
          telefono: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          cliente_id?: string
          created_at?: string | null
          es_principal?: boolean | null
          etiqueta?: string | null
          id?: string
          telefono?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_telefonos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean | null
          codigo: string
          codigo_postal: string | null
          created_at: string
          csf_archivo_url: string | null
          deadline_dias_habiles_default: number | null
          dias_visita_preferidos: string[] | null
          direccion: string | null
          email: string | null
          entre_calle: string | null
          es_grupo: boolean | null
          grupo_cliente_id: string | null
          id: string
          limite_credito: number | null
          logo_url: string | null
          nombre: string
          nombre_colonia: string | null
          nombre_entidad_federativa: string | null
          nombre_localidad: string | null
          nombre_municipio: string | null
          nombre_vialidad: string | null
          numero_exterior: string | null
          numero_interior: string | null
          preferencia_facturacion: Database["public"]["Enums"]["preferencia_facturacion"]
          prioridad_entrega_default:
            | Database["public"]["Enums"]["delivery_priority"]
            | null
          razon_social: string | null
          regimen_capital: string | null
          rfc: string | null
          saldo_pendiente: number | null
          telefono: string | null
          termino_credito: Database["public"]["Enums"]["credit_term"]
          tipo_vialidad: string | null
          updated_at: string
          user_id: string | null
          vendedor_asignado: string | null
          y_calle: string | null
          zona_id: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          codigo_postal?: string | null
          created_at?: string
          csf_archivo_url?: string | null
          deadline_dias_habiles_default?: number | null
          dias_visita_preferidos?: string[] | null
          direccion?: string | null
          email?: string | null
          entre_calle?: string | null
          es_grupo?: boolean | null
          grupo_cliente_id?: string | null
          id?: string
          limite_credito?: number | null
          logo_url?: string | null
          nombre: string
          nombre_colonia?: string | null
          nombre_entidad_federativa?: string | null
          nombre_localidad?: string | null
          nombre_municipio?: string | null
          nombre_vialidad?: string | null
          numero_exterior?: string | null
          numero_interior?: string | null
          preferencia_facturacion?: Database["public"]["Enums"]["preferencia_facturacion"]
          prioridad_entrega_default?:
            | Database["public"]["Enums"]["delivery_priority"]
            | null
          razon_social?: string | null
          regimen_capital?: string | null
          rfc?: string | null
          saldo_pendiente?: number | null
          telefono?: string | null
          termino_credito?: Database["public"]["Enums"]["credit_term"]
          tipo_vialidad?: string | null
          updated_at?: string
          user_id?: string | null
          vendedor_asignado?: string | null
          y_calle?: string | null
          zona_id?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          codigo_postal?: string | null
          created_at?: string
          csf_archivo_url?: string | null
          deadline_dias_habiles_default?: number | null
          dias_visita_preferidos?: string[] | null
          direccion?: string | null
          email?: string | null
          entre_calle?: string | null
          es_grupo?: boolean | null
          grupo_cliente_id?: string | null
          id?: string
          limite_credito?: number | null
          logo_url?: string | null
          nombre?: string
          nombre_colonia?: string | null
          nombre_entidad_federativa?: string | null
          nombre_localidad?: string | null
          nombre_municipio?: string | null
          nombre_vialidad?: string | null
          numero_exterior?: string | null
          numero_interior?: string | null
          preferencia_facturacion?: Database["public"]["Enums"]["preferencia_facturacion"]
          prioridad_entrega_default?:
            | Database["public"]["Enums"]["delivery_priority"]
            | null
          razon_social?: string | null
          regimen_capital?: string | null
          rfc?: string | null
          saldo_pendiente?: number | null
          telefono?: string | null
          termino_credito?: Database["public"]["Enums"]["credit_term"]
          tipo_vialidad?: string | null
          updated_at?: string
          user_id?: string | null
          vendedor_asignado?: string | null
          y_calle?: string | null
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_grupo_cliente_id_fkey"
            columns: ["grupo_cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_vendedor_asignado_fkey"
            columns: ["vendedor_asignado"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_vendedor_asignado_fkey"
            columns: ["vendedor_asignado"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      cobros_pedido: {
        Row: {
          cliente_id: string
          created_at: string
          fecha_cheque: string | null
          forma_pago: string
          id: string
          monto: number
          notas: string | null
          pedido_id: string
          referencia: string | null
          registrado_por: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          fecha_cheque?: string | null
          forma_pago?: string
          id?: string
          monto: number
          notas?: string | null
          pedido_id: string
          referencia?: string | null
          registrado_por: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          fecha_cheque?: string | null
          forma_pago?: string
          id?: string
          monto?: number
          notas?: string | null
          pedido_id?: string
          referencia?: string | null
          registrado_por?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobros_pedido_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_pedido_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_pedido_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      comisiones_detalle: {
        Row: {
          comision_id: string | null
          created_at: string | null
          factura_id: string | null
          id: string
          monto_comision: number
          monto_venta: number
          pedido_id: string | null
        }
        Insert: {
          comision_id?: string | null
          created_at?: string | null
          factura_id?: string | null
          id?: string
          monto_comision: number
          monto_venta: number
          pedido_id?: string | null
        }
        Update: {
          comision_id?: string | null
          created_at?: string | null
          factura_id?: string | null
          id?: string
          monto_comision?: number
          monto_venta?: number
          pedido_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_detalle_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones_vendedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_detalle_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_detalle_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      comisiones_vendedor: {
        Row: {
          aprobado_por: string | null
          calculado_por: string | null
          created_at: string | null
          empleado_id: string
          fecha_pago: string | null
          forma_pago: string | null
          id: string
          monto_comision: number
          notas: string | null
          periodo_fin: string
          periodo_inicio: string
          porcentaje_aplicado: number
          referencia_pago: string | null
          status: string | null
          total_ventas: number
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          calculado_por?: string | null
          created_at?: string | null
          empleado_id: string
          fecha_pago?: string | null
          forma_pago?: string | null
          id?: string
          monto_comision?: number
          notas?: string | null
          periodo_fin: string
          periodo_inicio: string
          porcentaje_aplicado: number
          referencia_pago?: string | null
          status?: string | null
          total_ventas?: number
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          calculado_por?: string | null
          created_at?: string | null
          empleado_id?: string
          fecha_pago?: string | null
          forma_pago?: string | null
          id?: string
          monto_comision?: number
          notas?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          porcentaje_aplicado?: number
          referencia_pago?: string | null
          status?: string | null
          total_ventas?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_vendedor_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_vendedor_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_vendedor_calculado_por_fkey"
            columns: ["calculado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_vendedor_calculado_por_fkey"
            columns: ["calculado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_vendedor_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_vendedor_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_empresa: {
        Row: {
          clave: string
          created_at: string | null
          descripcion: string | null
          id: string
          updated_at: string | null
          valor: Json
        }
        Insert: {
          clave: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          updated_at?: string | null
          valor: Json
        }
        Update: {
          clave?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          updated_at?: string | null
          valor?: Json
        }
        Relationships: []
      }
      configuracion_flotilla: {
        Row: {
          clave: string
          descripcion: string | null
          id: string
          updated_at: string | null
          valor: string
        }
        Insert: {
          clave: string
          descripcion?: string | null
          id?: string
          updated_at?: string | null
          valor: string
        }
        Update: {
          clave?: string
          descripcion?: string | null
          id?: string
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      conversacion_participantes: {
        Row: {
          conversacion_id: string
          created_at: string | null
          id: string
          ultimo_mensaje_leido_id: string | null
          user_id: string
        }
        Insert: {
          conversacion_id: string
          created_at?: string | null
          id?: string
          ultimo_mensaje_leido_id?: string | null
          user_id: string
        }
        Update: {
          conversacion_id?: string
          created_at?: string | null
          id?: string
          ultimo_mensaje_leido_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversacion_participantes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      conversaciones: {
        Row: {
          creado_por: string | null
          created_at: string | null
          id: string
          nombre: string | null
          puesto: string | null
          tipo: Database["public"]["Enums"]["conversation_type"]
          updated_at: string | null
        }
        Insert: {
          creado_por?: string | null
          created_at?: string | null
          id?: string
          nombre?: string | null
          puesto?: string | null
          tipo: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string | null
        }
        Update: {
          creado_por?: string | null
          created_at?: string | null
          id?: string
          nombre?: string | null
          puesto?: string | null
          tipo?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      correos_enviados: {
        Row: {
          asunto: string
          contenido_preview: string | null
          created_at: string | null
          destinatario: string
          enviado_por: string | null
          error: string | null
          fecha_envio: string | null
          gmail_cuenta_id: string | null
          gmail_message_id: string | null
          id: string
          referencia_id: string | null
          tipo: string
        }
        Insert: {
          asunto: string
          contenido_preview?: string | null
          created_at?: string | null
          destinatario: string
          enviado_por?: string | null
          error?: string | null
          fecha_envio?: string | null
          gmail_cuenta_id?: string | null
          gmail_message_id?: string | null
          id?: string
          referencia_id?: string | null
          tipo: string
        }
        Update: {
          asunto?: string
          contenido_preview?: string | null
          created_at?: string | null
          destinatario?: string
          enviado_por?: string | null
          error?: string | null
          fecha_envio?: string | null
          gmail_cuenta_id?: string | null
          gmail_message_id?: string | null
          id?: string
          referencia_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "correos_enviados_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correos_enviados_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correos_enviados_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correos_enviados_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas_segura"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          autorizado_por: string | null
          cliente_id: string
          creado_por: string
          created_at: string
          email_origen_id: string | null
          fecha_autorizacion: string | null
          fecha_creacion: string
          fecha_rechazo: string | null
          fecha_vigencia: string
          folio: string
          gmail_cuenta_id: string | null
          id: string
          impuestos: number
          mes_vigencia: string | null
          motivo_rechazo: string | null
          nombre: string | null
          notas: string | null
          pedido_id: string | null
          rechazado_por: string | null
          status: string
          subtotal: number
          sucursal_id: string | null
          tipo_cotizacion: string | null
          total: number
          updated_at: string
        }
        Insert: {
          autorizado_por?: string | null
          cliente_id: string
          creado_por: string
          created_at?: string
          email_origen_id?: string | null
          fecha_autorizacion?: string | null
          fecha_creacion?: string
          fecha_rechazo?: string | null
          fecha_vigencia: string
          folio: string
          gmail_cuenta_id?: string | null
          id?: string
          impuestos?: number
          mes_vigencia?: string | null
          motivo_rechazo?: string | null
          nombre?: string | null
          notas?: string | null
          pedido_id?: string | null
          rechazado_por?: string | null
          status?: string
          subtotal?: number
          sucursal_id?: string | null
          tipo_cotizacion?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          autorizado_por?: string | null
          cliente_id?: string
          creado_por?: string
          created_at?: string
          email_origen_id?: string | null
          fecha_autorizacion?: string | null
          fecha_creacion?: string
          fecha_rechazo?: string | null
          fecha_vigencia?: string
          folio?: string
          gmail_cuenta_id?: string | null
          id?: string
          impuestos?: number
          mes_vigencia?: string | null
          motivo_rechazo?: string | null
          nombre?: string | null
          notas?: string | null
          pedido_id?: string | null
          rechazado_por?: string | null
          status?: string
          subtotal?: number
          sucursal_id?: string | null
          tipo_cotizacion?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_rechazado_por_fkey"
            columns: ["rechazado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_rechazado_por_fkey"
            columns: ["rechazado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "cliente_sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones_detalles: {
        Row: {
          cantidad: number
          cantidad_maxima: number | null
          cotizacion_id: string
          created_at: string
          id: string
          kilos_totales: number | null
          nota_linea: string | null
          precio_unitario: number
          producto_id: string
          subtotal: number
          tipo_precio: string | null
        }
        Insert: {
          cantidad: number
          cantidad_maxima?: number | null
          cotizacion_id: string
          created_at?: string
          id?: string
          kilos_totales?: number | null
          nota_linea?: string | null
          precio_unitario: number
          producto_id: string
          subtotal: number
          tipo_precio?: string | null
        }
        Update: {
          cantidad?: number
          cantidad_maxima?: number | null
          cotizacion_id?: string
          created_at?: string
          id?: string
          kilos_totales?: number | null
          nota_linea?: string | null
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
          tipo_precio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_detalles_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones_envios: {
        Row: {
          cotizacion_id: string
          created_at: string
          email_destino: string
          enviado_por: string
          gmail_cuenta_id: string | null
          id: string
        }
        Insert: {
          cotizacion_id: string
          created_at?: string
          email_destino: string
          enviado_por: string
          gmail_cuenta_id?: string | null
          id?: string
        }
        Update: {
          cotizacion_id?: string
          created_at?: string
          email_destino?: string
          enviado_por?: string
          gmail_cuenta_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_envios_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_envios_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_envios_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_envios_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_envios_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas_segura"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          device_name: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      devoluciones: {
        Row: {
          cantidad_devuelta: number
          created_at: string | null
          entrega_id: string
          id: string
          lote_id: string | null
          motivo: string
          pedido_detalle_id: string
          registrado_por: string
          reingresado_a_inventario: boolean | null
        }
        Insert: {
          cantidad_devuelta: number
          created_at?: string | null
          entrega_id: string
          id?: string
          lote_id?: string | null
          motivo: string
          pedido_detalle_id: string
          registrado_por: string
          reingresado_a_inventario?: boolean | null
        }
        Update: {
          cantidad_devuelta?: number
          created_at?: string | null
          entrega_id?: string
          id?: string
          lote_id?: string | null
          motivo?: string
          pedido_detalle_id?: string
          registrado_por?: string
          reingresado_a_inventario?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "devoluciones_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "inventario_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_pedido_detalle_id_fkey"
            columns: ["pedido_detalle_id"]
            isOneToOne: false
            referencedRelation: "pedidos_detalles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      devoluciones_proveedor: {
        Row: {
          cantidad_devuelta: number
          created_at: string
          fecha_resolucion: string | null
          firma_chofer: string | null
          id: string
          lote_id: string | null
          motivo: string
          notas: string | null
          orden_compra_entrega_id: string | null
          orden_compra_id: string
          producto_id: string
          registrado_por: string | null
          resolucion_notas: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cantidad_devuelta: number
          created_at?: string
          fecha_resolucion?: string | null
          firma_chofer?: string | null
          id?: string
          lote_id?: string | null
          motivo: string
          notas?: string | null
          orden_compra_entrega_id?: string | null
          orden_compra_id: string
          producto_id: string
          registrado_por?: string | null
          resolucion_notas?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cantidad_devuelta?: number
          created_at?: string
          fecha_resolucion?: string | null
          firma_chofer?: string | null
          id?: string
          lote_id?: string | null
          motivo?: string
          notas?: string | null
          orden_compra_entrega_id?: string | null
          orden_compra_id?: string
          producto_id?: string
          registrado_por?: string | null
          resolucion_notas?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devoluciones_proveedor_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "inventario_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_proveedor_orden_compra_entrega_id_fkey"
            columns: ["orden_compra_entrega_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_proveedor_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_proveedor_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_proveedor_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      devoluciones_proveedor_evidencias: {
        Row: {
          capturado_por: string | null
          created_at: string
          devolucion_id: string
          id: string
          nombre_archivo: string | null
          ruta_storage: string
          tipo_evidencia: string
        }
        Insert: {
          capturado_por?: string | null
          created_at?: string
          devolucion_id: string
          id?: string
          nombre_archivo?: string | null
          ruta_storage: string
          tipo_evidencia: string
        }
        Update: {
          capturado_por?: string | null
          created_at?: string
          devolucion_id?: string
          id?: string
          nombre_archivo?: string | null
          ruta_storage?: string
          tipo_evidencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "devoluciones_proveedor_evidencias_devolucion_id_fkey"
            columns: ["devolucion_id"]
            isOneToOne: false
            referencedRelation: "devoluciones_proveedor"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilidad_personal: {
        Row: {
          created_at: string
          disponible: boolean
          empleado_id: string
          fecha: string
          hora_entrada: string | null
          hora_salida: string | null
          id: string
          notas: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          disponible?: boolean
          empleado_id: string
          fecha: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          notas?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          disponible?: boolean
          empleado_id?: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          notas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidad_personal_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disponibilidad_personal_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          activo: boolean | null
          clabe_interbancaria: string | null
          contacto_emergencia_nombre: string | null
          contacto_emergencia_telefono: string | null
          created_at: string
          cuenta_bancaria: string | null
          curp: string | null
          direccion: string | null
          email: string | null
          estado_civil: string | null
          fecha_baja: string | null
          fecha_ingreso: string
          fecha_nacimiento: string | null
          foto_url: string | null
          id: string
          motivo_baja: string | null
          nivel_estudios: string | null
          nombre: string | null
          nombre_completo: string
          notas: string | null
          numero_dependientes: number | null
          numero_seguro_social: string | null
          periodo_comision: string | null
          periodo_pago: string | null
          porcentaje_comision: number | null
          primer_apellido: string | null
          puesto: string
          rfc: string | null
          segundo_apellido: string | null
          sueldo_bruto: number | null
          telefono: string | null
          tipo_sangre: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activo?: boolean | null
          clabe_interbancaria?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          curp?: string | null
          direccion?: string | null
          email?: string | null
          estado_civil?: string | null
          fecha_baja?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          motivo_baja?: string | null
          nivel_estudios?: string | null
          nombre?: string | null
          nombre_completo: string
          notas?: string | null
          numero_dependientes?: number | null
          numero_seguro_social?: string | null
          periodo_comision?: string | null
          periodo_pago?: string | null
          porcentaje_comision?: number | null
          primer_apellido?: string | null
          puesto: string
          rfc?: string | null
          segundo_apellido?: string | null
          sueldo_bruto?: number | null
          telefono?: string | null
          tipo_sangre?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activo?: boolean | null
          clabe_interbancaria?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          curp?: string | null
          direccion?: string | null
          email?: string | null
          estado_civil?: string | null
          fecha_baja?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          motivo_baja?: string | null
          nivel_estudios?: string | null
          nombre?: string | null
          nombre_completo?: string
          notas?: string | null
          numero_dependientes?: number | null
          numero_seguro_social?: string | null
          periodo_comision?: string | null
          periodo_pago?: string | null
          porcentaje_comision?: number | null
          primer_apellido?: string | null
          puesto?: string
          rfc?: string | null
          segundo_apellido?: string | null
          sueldo_bruto?: number | null
          telefono?: string | null
          tipo_sangre?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      empleados_documentos: {
        Row: {
          created_at: string
          empleado_id: string
          fecha_vencimiento: string | null
          id: string
          nombre_archivo: string
          ruta_storage: string
          tipo_documento: string
        }
        Insert: {
          created_at?: string
          empleado_id: string
          fecha_vencimiento?: string | null
          id?: string
          nombre_archivo: string
          ruta_storage: string
          tipo_documento: string
        }
        Update: {
          created_at?: string
          empleado_id?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre_archivo?: string
          ruta_storage?: string
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_documentos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_documentos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados_documentos_pendientes: {
        Row: {
          created_at: string
          empleado_id: string
          id: string
          notas: string | null
          tipo_documento: string
        }
        Insert: {
          created_at?: string
          empleado_id: string
          id?: string
          notas?: string | null
          tipo_documento: string
        }
        Update: {
          created_at?: string
          empleado_id?: string
          id?: string
          notas?: string | null
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_documentos_pendientes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_documentos_pendientes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          carga_confirmada: boolean | null
          carga_confirmada_en: string | null
          carga_confirmada_por: string | null
          created_at: string
          entregado: boolean | null
          fecha_entrega: string | null
          firma_recibido: string | null
          hora_entrega_real: string | null
          id: string
          motivo_rechazo: string | null
          nombre_receptor: string | null
          notas: string | null
          notas_conciliacion: string | null
          orden_entrega: number
          papeles_recibidos: boolean | null
          papeles_recibidos_en: string | null
          papeles_recibidos_por: string | null
          pedido_id: string
          ruta_id: string
          status_entrega: string | null
          updated_at: string
        }
        Insert: {
          carga_confirmada?: boolean | null
          carga_confirmada_en?: string | null
          carga_confirmada_por?: string | null
          created_at?: string
          entregado?: boolean | null
          fecha_entrega?: string | null
          firma_recibido?: string | null
          hora_entrega_real?: string | null
          id?: string
          motivo_rechazo?: string | null
          nombre_receptor?: string | null
          notas?: string | null
          notas_conciliacion?: string | null
          orden_entrega: number
          papeles_recibidos?: boolean | null
          papeles_recibidos_en?: string | null
          papeles_recibidos_por?: string | null
          pedido_id: string
          ruta_id: string
          status_entrega?: string | null
          updated_at?: string
        }
        Update: {
          carga_confirmada?: boolean | null
          carga_confirmada_en?: string | null
          carga_confirmada_por?: string | null
          created_at?: string
          entregado?: boolean | null
          fecha_entrega?: string | null
          firma_recibido?: string | null
          hora_entrega_real?: string | null
          id?: string
          motivo_rechazo?: string | null
          nombre_receptor?: string | null
          notas?: string | null
          notas_conciliacion?: string | null
          orden_entrega?: number
          papeles_recibidos?: boolean | null
          papeles_recibidos_en?: string | null
          papeles_recibidos_por?: string | null
          pedido_id?: string
          ruta_id?: string
          status_entrega?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_carga_confirmada_por_fkey"
            columns: ["carga_confirmada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_carga_confirmada_por_fkey"
            columns: ["carga_confirmada_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_ruta_id_fkey"
            columns: ["ruta_id"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_detalles: {
        Row: {
          cantidad: number
          created_at: string
          factura_id: string
          id: string
          precio_unitario: number
          producto_id: string
          subtotal: number
        }
        Insert: {
          cantidad: number
          created_at?: string
          factura_id: string
          id?: string
          precio_unitario: number
          producto_id: string
          subtotal: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          factura_id?: string
          id?: string
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "factura_detalles_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          cfdi_error: string | null
          cfdi_estado: string | null
          cfdi_fecha_timbrado: string | null
          cfdi_pdf_url: string | null
          cfdi_uuid: string | null
          cfdi_xml_url: string | null
          cliente_id: string
          created_at: string
          fecha_emision: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          folio: string
          forma_pago: string | null
          id: string
          impuestos: number
          metodo_pago: string | null
          notas: string | null
          pagada: boolean | null
          pedido_id: string | null
          subtotal: number
          total: number
          updated_at: string
          uso_cfdi: string | null
        }
        Insert: {
          cfdi_error?: string | null
          cfdi_estado?: string | null
          cfdi_fecha_timbrado?: string | null
          cfdi_pdf_url?: string | null
          cfdi_uuid?: string | null
          cfdi_xml_url?: string | null
          cliente_id: string
          created_at?: string
          fecha_emision?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          folio: string
          forma_pago?: string | null
          id?: string
          impuestos: number
          metodo_pago?: string | null
          notas?: string | null
          pagada?: boolean | null
          pedido_id?: string | null
          subtotal: number
          total: number
          updated_at?: string
          uso_cfdi?: string | null
        }
        Update: {
          cfdi_error?: string | null
          cfdi_estado?: string | null
          cfdi_fecha_timbrado?: string | null
          cfdi_pdf_url?: string | null
          cfdi_uuid?: string | null
          cfdi_xml_url?: string | null
          cliente_id?: string
          created_at?: string
          fecha_emision?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          folio?: string
          forma_pago?: string | null
          id?: string
          impuestos?: number
          metodo_pago?: string | null
          notas?: string | null
          pagada?: boolean | null
          pedido_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          uso_cfdi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_auditoria: {
        Row: {
          accion: string
          created_at: string
          email_subject: string | null
          email_to: string | null
          gmail_cuenta_id: string
          gmail_message_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          accion: string
          created_at?: string
          email_subject?: string | null
          email_to?: string | null
          gmail_cuenta_id: string
          gmail_message_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          accion?: string
          created_at?: string
          email_subject?: string | null
          email_to?: string | null
          gmail_cuenta_id?: string
          gmail_message_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_auditoria_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_auditoria_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_auditoria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_auditoria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_cuenta_permisos: {
        Row: {
          asignado_por: string | null
          created_at: string
          gmail_cuenta_id: string
          id: string
          user_id: string
        }
        Insert: {
          asignado_por?: string | null
          created_at?: string
          gmail_cuenta_id: string
          id?: string
          user_id: string
        }
        Update: {
          asignado_por?: string | null
          created_at?: string
          gmail_cuenta_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_cuenta_permisos_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_cuenta_permisos_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_cuenta_permisos_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_cuenta_permisos_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: false
            referencedRelation: "gmail_cuentas_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_cuenta_permisos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_cuenta_permisos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_cuentas: {
        Row: {
          access_token: string | null
          activo: boolean | null
          created_at: string
          email: string
          id: string
          nombre: string
          proposito: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          activo?: boolean | null
          created_at?: string
          email: string
          id?: string
          nombre: string
          proposito: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          activo?: boolean | null
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          proposito?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gmail_firmas: {
        Row: {
          activo: boolean | null
          created_at: string
          firma_html: string
          gmail_cuenta_id: string
          id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string
          firma_html?: string
          gmail_cuenta_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string
          firma_html?: string
          gmail_cuenta_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_firmas_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: true
            referencedRelation: "gmail_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_firmas_gmail_cuenta_id_fkey"
            columns: ["gmail_cuenta_id"]
            isOneToOne: true
            referencedRelation: "gmail_cuentas_segura"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_lotes: {
        Row: {
          bodega_id: string | null
          cantidad_disponible: number
          conciliado: boolean | null
          created_at: string
          fecha_caducidad: string | null
          fecha_entrada: string
          fecha_ultima_fumigacion: string | null
          id: string
          lote_referencia: string | null
          notas: string | null
          orden_compra_id: string | null
          precio_compra: number
          precio_compra_provisional: number | null
          producto_id: string
          recibido_por: string | null
          updated_at: string
        }
        Insert: {
          bodega_id?: string | null
          cantidad_disponible?: number
          conciliado?: boolean | null
          created_at?: string
          fecha_caducidad?: string | null
          fecha_entrada?: string
          fecha_ultima_fumigacion?: string | null
          id?: string
          lote_referencia?: string | null
          notas?: string | null
          orden_compra_id?: string | null
          precio_compra: number
          precio_compra_provisional?: number | null
          producto_id: string
          recibido_por?: string | null
          updated_at?: string
        }
        Update: {
          bodega_id?: string | null
          cantidad_disponible?: number
          conciliado?: boolean | null
          created_at?: string
          fecha_caducidad?: string | null
          fecha_entrada?: string
          fecha_ultima_fumigacion?: string | null
          id?: string
          lote_referencia?: string | null
          notas?: string | null
          orden_compra_id?: string | null
          precio_compra?: number
          precio_compra_provisional?: number | null
          producto_id?: string
          recibido_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_lotes_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_lotes_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_lotes_recibido_por_fkey"
            columns: ["recibido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_lotes_recibido_por_fkey"
            columns: ["recibido_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_movimientos: {
        Row: {
          bodega_destino_id: string | null
          bodega_origen_id: string | null
          cantidad: number
          cliente_destino_id: string | null
          created_at: string
          fecha_caducidad: string | null
          id: string
          lote: string | null
          notas: string | null
          producto_id: string
          referencia: string | null
          stock_anterior: number | null
          stock_nuevo: number | null
          tipo_movimiento: string
          usuario_id: string
        }
        Insert: {
          bodega_destino_id?: string | null
          bodega_origen_id?: string | null
          cantidad: number
          cliente_destino_id?: string | null
          created_at?: string
          fecha_caducidad?: string | null
          id?: string
          lote?: string | null
          notas?: string | null
          producto_id: string
          referencia?: string | null
          stock_anterior?: number | null
          stock_nuevo?: number | null
          tipo_movimiento: string
          usuario_id: string
        }
        Update: {
          bodega_destino_id?: string | null
          bodega_origen_id?: string | null
          cantidad?: number
          cliente_destino_id?: string | null
          created_at?: string
          fecha_caducidad?: string | null
          id?: string
          lote?: string | null
          notas?: string | null
          producto_id?: string
          referencia?: string | null
          stock_anterior?: number | null
          stock_nuevo?: number | null
          tipo_movimiento?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_movimientos_bodega_destino_id_fkey"
            columns: ["bodega_destino_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_bodega_origen_id_fkey"
            columns: ["bodega_origen_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_cliente_destino_id_fkey"
            columns: ["cliente_destino_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes: {
        Row: {
          archivo_nombre: string | null
          archivo_tipo: string | null
          archivo_url: string | null
          contenido: string
          conversacion_id: string
          created_at: string | null
          id: string
          remitente_id: string | null
        }
        Insert: {
          archivo_nombre?: string | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          contenido: string
          conversacion_id: string
          created_at?: string | null
          id?: string
          remitente_id?: string | null
        }
        Update: {
          archivo_nombre?: string | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          contenido?: string
          conversacion_id?: string
          created_at?: string | null
          id?: string
          remitente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      migracion_productos_sugerencias: {
        Row: {
          aprobado_por: string | null
          cambios_detectados: boolean | null
          contenido_empaque_sugerido: string | null
          created_at: string | null
          especificaciones_actual: string | null
          especificaciones_sugerida: string | null
          estado: string | null
          explicacion: string | null
          fecha_aprobacion: string | null
          id: string
          marca_actual: string | null
          marca_sugerida: string | null
          nombre_actual: string
          nombre_sugerido: string
          peso_kg_actual: number | null
          peso_kg_sugerido: number | null
          producto_id: string
          unidad_sat_sugerida: string | null
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          cambios_detectados?: boolean | null
          contenido_empaque_sugerido?: string | null
          created_at?: string | null
          especificaciones_actual?: string | null
          especificaciones_sugerida?: string | null
          estado?: string | null
          explicacion?: string | null
          fecha_aprobacion?: string | null
          id?: string
          marca_actual?: string | null
          marca_sugerida?: string | null
          nombre_actual: string
          nombre_sugerido: string
          peso_kg_actual?: number | null
          peso_kg_sugerido?: number | null
          producto_id: string
          unidad_sat_sugerida?: string | null
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          cambios_detectados?: boolean | null
          contenido_empaque_sugerido?: string | null
          created_at?: string | null
          especificaciones_actual?: string | null
          especificaciones_sugerida?: string | null
          estado?: string | null
          explicacion?: string | null
          fecha_aprobacion?: string | null
          id?: string
          marca_actual?: string | null
          marca_sugerida?: string | null
          nombre_actual?: string
          nombre_sugerido?: string
          peso_kg_actual?: number | null
          peso_kg_sugerido?: number | null
          producto_id?: string
          unidad_sat_sugerida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "migracion_productos_sugerencias_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migracion_productos_sugerencias_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          created_at: string | null
          id: string
          module_name: string
          module_path: string
          role: Database["public"]["Enums"]["app_role"]
          tiene_acceso: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_name: string
          module_path: string
          role: Database["public"]["Enums"]["app_role"]
          tiene_acceso?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          module_name?: string
          module_path?: string
          role?: Database["public"]["Enums"]["app_role"]
          tiene_acceso?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          cotizacion_id: string | null
          created_at: string
          descripcion: string
          documento_id: string | null
          empleado_id: string | null
          fecha_vencimiento: string | null
          id: string
          leida: boolean | null
          orden_compra_id: string | null
          pedido_id: string | null
          tipo: string
          titulo: string
          vehiculo_id: string | null
        }
        Insert: {
          cotizacion_id?: string | null
          created_at?: string
          descripcion: string
          documento_id?: string | null
          empleado_id?: string | null
          fecha_vencimiento?: string | null
          id?: string
          leida?: boolean | null
          orden_compra_id?: string | null
          pedido_id?: string | null
          tipo: string
          titulo: string
          vehiculo_id?: string | null
        }
        Update: {
          cotizacion_id?: string | null
          created_at?: string
          descripcion?: string
          documento_id?: string | null
          empleado_id?: string | null
          fecha_vencimiento?: string | null
          id?: string
          leida?: boolean | null
          orden_compra_id?: string | null
          pedido_id?: string | null
          tipo?: string
          titulo?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "empleados_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra: {
        Row: {
          autorizado_por: string | null
          comprobante_pago_url: string | null
          creado_por: string
          created_at: string
          creditos_aplicados: number | null
          creditos_aplicados_detalle: Json | null
          email_enviado_en: string | null
          entregas_multiples: boolean | null
          fecha_autorizacion: string | null
          fecha_entrega_programada: string | null
          fecha_entrega_real: string | null
          fecha_orden: string
          fecha_pago: string | null
          fecha_rechazo: string | null
          folio: string
          id: string
          impuestos: number
          monto_devoluciones: number | null
          monto_pagado: number | null
          motivo_devolucion: string | null
          motivo_rechazo: string | null
          notas: string | null
          notas_proveedor_manual: string | null
          proveedor_email_manual: string | null
          proveedor_id: string | null
          proveedor_nombre_manual: string | null
          proveedor_telefono_manual: string | null
          rechazado_por: string | null
          referencia_pago: string | null
          status: string
          status_conciliacion: string | null
          status_pago: string | null
          subtotal: number
          tipo_pago: string | null
          total: number
          total_ajustado: number | null
          updated_at: string
        }
        Insert: {
          autorizado_por?: string | null
          comprobante_pago_url?: string | null
          creado_por: string
          created_at?: string
          creditos_aplicados?: number | null
          creditos_aplicados_detalle?: Json | null
          email_enviado_en?: string | null
          entregas_multiples?: boolean | null
          fecha_autorizacion?: string | null
          fecha_entrega_programada?: string | null
          fecha_entrega_real?: string | null
          fecha_orden?: string
          fecha_pago?: string | null
          fecha_rechazo?: string | null
          folio: string
          id?: string
          impuestos?: number
          monto_devoluciones?: number | null
          monto_pagado?: number | null
          motivo_devolucion?: string | null
          motivo_rechazo?: string | null
          notas?: string | null
          notas_proveedor_manual?: string | null
          proveedor_email_manual?: string | null
          proveedor_id?: string | null
          proveedor_nombre_manual?: string | null
          proveedor_telefono_manual?: string | null
          rechazado_por?: string | null
          referencia_pago?: string | null
          status?: string
          status_conciliacion?: string | null
          status_pago?: string | null
          subtotal?: number
          tipo_pago?: string | null
          total?: number
          total_ajustado?: number | null
          updated_at?: string
        }
        Update: {
          autorizado_por?: string | null
          comprobante_pago_url?: string | null
          creado_por?: string
          created_at?: string
          creditos_aplicados?: number | null
          creditos_aplicados_detalle?: Json | null
          email_enviado_en?: string | null
          entregas_multiples?: boolean | null
          fecha_autorizacion?: string | null
          fecha_entrega_programada?: string | null
          fecha_entrega_real?: string | null
          fecha_orden?: string
          fecha_pago?: string | null
          fecha_rechazo?: string | null
          folio?: string
          id?: string
          impuestos?: number
          monto_devoluciones?: number | null
          monto_pagado?: number | null
          motivo_devolucion?: string | null
          motivo_rechazo?: string | null
          notas?: string | null
          notas_proveedor_manual?: string | null
          proveedor_email_manual?: string | null
          proveedor_id?: string | null
          proveedor_nombre_manual?: string | null
          proveedor_telefono_manual?: string | null
          rechazado_por?: string | null
          referencia_pago?: string | null
          status?: string
          status_conciliacion?: string | null
          status_pago?: string | null
          subtotal?: number
          tipo_pago?: string | null
          total?: number
          total_ajustado?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_rechazado_por_fkey"
            columns: ["rechazado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_rechazado_por_fkey"
            columns: ["rechazado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra_detalles: {
        Row: {
          cantidad_cancelada: number | null
          cantidad_ordenada: number
          cantidad_recibida: number
          created_at: string
          fecha_pago: string | null
          id: string
          notas_diferencia: string | null
          orden_compra_id: string
          pagado: boolean | null
          precio_unitario_compra: number
          producto_id: string
          razon_diferencia: string | null
          subtotal: number
        }
        Insert: {
          cantidad_cancelada?: number | null
          cantidad_ordenada: number
          cantidad_recibida?: number
          created_at?: string
          fecha_pago?: string | null
          id?: string
          notas_diferencia?: string | null
          orden_compra_id: string
          pagado?: boolean | null
          precio_unitario_compra: number
          producto_id: string
          razon_diferencia?: string | null
          subtotal: number
        }
        Update: {
          cantidad_cancelada?: number | null
          cantidad_ordenada?: number
          cantidad_recibida?: number
          created_at?: string
          fecha_pago?: string | null
          id?: string
          notas_diferencia?: string | null
          orden_compra_id?: string
          pagado?: boolean | null
          precio_unitario_compra?: number
          producto_id?: string
          razon_diferencia?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_detalles_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra_entregas: {
        Row: {
          cancelacion_descripcion: string | null
          cancelacion_firma_almacenista: string | null
          cancelacion_firma_chofer: string | null
          cancelacion_tipo: string | null
          cantidad_bultos: number
          comprobante_recepcion_url: string | null
          conciliado_en: string | null
          conciliado_por: string | null
          created_at: string
          datos_llegada_parcial: Json | null
          descarga_cancelada_en: string | null
          descarga_cancelada_por: string | null
          devolucion_generada_id: string | null
          fecha_entrega_real: string | null
          fecha_programada: string | null
          firma_almacenista: string | null
          firma_almacenista_fecha: string | null
          firma_chofer_conformidad: string | null
          firma_chofer_conformidad_fecha: string | null
          firma_chofer_diferencia: string | null
          firma_chofer_diferencia_fecha: string | null
          firma_chofer_rechazo: string | null
          firma_chofer_sin_sellos: string | null
          id: string
          llegada_registrada_en: string | null
          llegada_registrada_por: string | null
          motivo_cancelacion_descarga: string | null
          motivo_rechazo: string | null
          nombre_chofer_proveedor: string | null
          notas: string | null
          numero_entrega: number
          numero_remision_proveedor: string | null
          numero_sello_llegada: string | null
          numero_talon: string | null
          orden_compra_id: string
          origen_faltante: boolean | null
          placas_vehiculo: string | null
          productos_faltantes: Json | null
          recepcion_finalizada_en: string | null
          rechazada_en: string | null
          rechazada_por: string | null
          recibido_por: string | null
          sin_sellos: boolean | null
          status: string
          status_conciliacion: string | null
          trabajando_desde: string | null
          trabajando_por: string | null
          updated_at: string
        }
        Insert: {
          cancelacion_descripcion?: string | null
          cancelacion_firma_almacenista?: string | null
          cancelacion_firma_chofer?: string | null
          cancelacion_tipo?: string | null
          cantidad_bultos: number
          comprobante_recepcion_url?: string | null
          conciliado_en?: string | null
          conciliado_por?: string | null
          created_at?: string
          datos_llegada_parcial?: Json | null
          descarga_cancelada_en?: string | null
          descarga_cancelada_por?: string | null
          devolucion_generada_id?: string | null
          fecha_entrega_real?: string | null
          fecha_programada?: string | null
          firma_almacenista?: string | null
          firma_almacenista_fecha?: string | null
          firma_chofer_conformidad?: string | null
          firma_chofer_conformidad_fecha?: string | null
          firma_chofer_diferencia?: string | null
          firma_chofer_diferencia_fecha?: string | null
          firma_chofer_rechazo?: string | null
          firma_chofer_sin_sellos?: string | null
          id?: string
          llegada_registrada_en?: string | null
          llegada_registrada_por?: string | null
          motivo_cancelacion_descarga?: string | null
          motivo_rechazo?: string | null
          nombre_chofer_proveedor?: string | null
          notas?: string | null
          numero_entrega: number
          numero_remision_proveedor?: string | null
          numero_sello_llegada?: string | null
          numero_talon?: string | null
          orden_compra_id: string
          origen_faltante?: boolean | null
          placas_vehiculo?: string | null
          productos_faltantes?: Json | null
          recepcion_finalizada_en?: string | null
          rechazada_en?: string | null
          rechazada_por?: string | null
          recibido_por?: string | null
          sin_sellos?: boolean | null
          status?: string
          status_conciliacion?: string | null
          trabajando_desde?: string | null
          trabajando_por?: string | null
          updated_at?: string
        }
        Update: {
          cancelacion_descripcion?: string | null
          cancelacion_firma_almacenista?: string | null
          cancelacion_firma_chofer?: string | null
          cancelacion_tipo?: string | null
          cantidad_bultos?: number
          comprobante_recepcion_url?: string | null
          conciliado_en?: string | null
          conciliado_por?: string | null
          created_at?: string
          datos_llegada_parcial?: Json | null
          descarga_cancelada_en?: string | null
          descarga_cancelada_por?: string | null
          devolucion_generada_id?: string | null
          fecha_entrega_real?: string | null
          fecha_programada?: string | null
          firma_almacenista?: string | null
          firma_almacenista_fecha?: string | null
          firma_chofer_conformidad?: string | null
          firma_chofer_conformidad_fecha?: string | null
          firma_chofer_diferencia?: string | null
          firma_chofer_diferencia_fecha?: string | null
          firma_chofer_rechazo?: string | null
          firma_chofer_sin_sellos?: string | null
          id?: string
          llegada_registrada_en?: string | null
          llegada_registrada_por?: string | null
          motivo_cancelacion_descarga?: string | null
          motivo_rechazo?: string | null
          nombre_chofer_proveedor?: string | null
          notas?: string | null
          numero_entrega?: number
          numero_remision_proveedor?: string | null
          numero_sello_llegada?: string | null
          numero_talon?: string | null
          orden_compra_id?: string
          origen_faltante?: boolean | null
          placas_vehiculo?: string | null
          productos_faltantes?: Json | null
          recepcion_finalizada_en?: string | null
          rechazada_en?: string | null
          rechazada_por?: string | null
          recibido_por?: string | null
          sin_sellos?: boolean | null
          status?: string
          status_conciliacion?: string | null
          trabajando_desde?: string | null
          trabajando_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_entregas_descarga_cancelada_por_fkey"
            columns: ["descarga_cancelada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_entregas_descarga_cancelada_por_fkey"
            columns: ["descarga_cancelada_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_entregas_devolucion_generada_id_fkey"
            columns: ["devolucion_generada_id"]
            isOneToOne: false
            referencedRelation: "devoluciones_proveedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_entregas_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_entregas_recibido_por_fkey"
            columns: ["recibido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_entregas_recibido_por_fkey"
            columns: ["recibido_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra_entregas_evidencias: {
        Row: {
          capturado_por: string | null
          created_at: string | null
          entrega_id: string
          fase: string
          id: string
          nombre_archivo: string | null
          ruta_storage: string
          tipo_evidencia: string
        }
        Insert: {
          capturado_por?: string | null
          created_at?: string | null
          entrega_id: string
          fase: string
          id?: string
          nombre_archivo?: string | null
          ruta_storage: string
          tipo_evidencia: string
        }
        Update: {
          capturado_por?: string | null
          created_at?: string | null
          entrega_id?: string
          fase?: string
          id?: string
          nombre_archivo?: string | null
          ruta_storage?: string
          tipo_evidencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_entregas_evidencias_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_cliente: {
        Row: {
          cliente_id: string
          comprobante_url: string | null
          created_at: string | null
          fecha_registro: string | null
          fecha_validacion: string | null
          forma_pago: string
          id: string
          monto_aplicado: number | null
          monto_total: number
          notas: string | null
          referencia: string | null
          registrado_por: string | null
          requiere_validacion: boolean | null
          status: string | null
          updated_at: string | null
          validado_por: string | null
        }
        Insert: {
          cliente_id: string
          comprobante_url?: string | null
          created_at?: string | null
          fecha_registro?: string | null
          fecha_validacion?: string | null
          forma_pago: string
          id?: string
          monto_aplicado?: number | null
          monto_total: number
          notas?: string | null
          referencia?: string | null
          registrado_por?: string | null
          requiere_validacion?: boolean | null
          status?: string | null
          updated_at?: string | null
          validado_por?: string | null
        }
        Update: {
          cliente_id?: string
          comprobante_url?: string | null
          created_at?: string | null
          fecha_registro?: string | null
          fecha_validacion?: string | null
          forma_pago?: string
          id?: string
          monto_aplicado?: number | null
          monto_total?: number
          notas?: string | null
          referencia?: string | null
          registrado_por?: string | null
          requiere_validacion?: boolean | null
          status?: string | null
          updated_at?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_cliente_detalle: {
        Row: {
          created_at: string | null
          factura_id: string
          id: string
          monto_aplicado: number
          pago_id: string
        }
        Insert: {
          created_at?: string | null
          factura_id: string
          id?: string
          monto_aplicado: number
          pago_id: string
        }
        Update: {
          created_at?: string | null
          factura_id?: string
          id?: string
          monto_aplicado?: number
          pago_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_detalle_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_detalle_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string
          created_at: string
          datos_fiscales_factura: Json | null
          deadline_dias_habiles: number | null
          dia_fijo_semanal: string | null
          factura_enviada_al_cliente: boolean
          factura_solicitada_por_cliente: boolean
          facturado: boolean
          fecha_entrega_estimada: string | null
          fecha_entrega_real: string | null
          fecha_factura_enviada: string | null
          fecha_pedido: string
          folio: string
          id: string
          impuestos: number | null
          notas: string | null
          numero_dia: number | null
          pagado: boolean
          peso_total_kg: number | null
          prioridad_entrega:
            | Database["public"]["Enums"]["delivery_priority"]
            | null
          requiere_factura: boolean
          saldo_pendiente: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          sucursal_id: string | null
          termino_credito: Database["public"]["Enums"]["credit_term"] | null
          total: number | null
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          datos_fiscales_factura?: Json | null
          deadline_dias_habiles?: number | null
          dia_fijo_semanal?: string | null
          factura_enviada_al_cliente?: boolean
          factura_solicitada_por_cliente?: boolean
          facturado?: boolean
          fecha_entrega_estimada?: string | null
          fecha_entrega_real?: string | null
          fecha_factura_enviada?: string | null
          fecha_pedido?: string
          folio: string
          id?: string
          impuestos?: number | null
          notas?: string | null
          numero_dia?: number | null
          pagado?: boolean
          peso_total_kg?: number | null
          prioridad_entrega?:
            | Database["public"]["Enums"]["delivery_priority"]
            | null
          requiere_factura?: boolean
          saldo_pendiente?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          sucursal_id?: string | null
          termino_credito?: Database["public"]["Enums"]["credit_term"] | null
          total?: number | null
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          datos_fiscales_factura?: Json | null
          deadline_dias_habiles?: number | null
          dia_fijo_semanal?: string | null
          factura_enviada_al_cliente?: boolean
          factura_solicitada_por_cliente?: boolean
          facturado?: boolean
          fecha_entrega_estimada?: string | null
          fecha_entrega_real?: string | null
          fecha_factura_enviada?: string | null
          fecha_pedido?: string
          folio?: string
          id?: string
          impuestos?: number | null
          notas?: string | null
          numero_dia?: number | null
          pagado?: boolean
          peso_total_kg?: number | null
          prioridad_entrega?:
            | Database["public"]["Enums"]["delivery_priority"]
            | null
          requiere_factura?: boolean
          saldo_pendiente?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          sucursal_id?: string | null
          termino_credito?: Database["public"]["Enums"]["credit_term"] | null
          total?: number | null
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "cliente_sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_acumulativos: {
        Row: {
          cliente_id: string
          correos_procesados: string[] | null
          created_at: string
          fecha_entrega: string
          id: string
          impuestos: number | null
          notas: string | null
          status: string
          subtotal: number | null
          sucursal_id: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          correos_procesados?: string[] | null
          created_at?: string
          fecha_entrega: string
          id?: string
          impuestos?: number | null
          notas?: string | null
          status?: string
          subtotal?: number | null
          sucursal_id?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          correos_procesados?: string[] | null
          created_at?: string
          fecha_entrega?: string
          id?: string
          impuestos?: number | null
          notas?: string | null
          status?: string
          subtotal?: number | null
          sucursal_id?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_acumulativos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_acumulativos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "cliente_sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_acumulativos_detalles: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          pedido_acumulativo_id: string
          precio_unitario: number
          producto_id: string
          subtotal: number
          unidades_manual: number | null
          verificado: boolean | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          pedido_acumulativo_id: string
          precio_unitario: number
          producto_id: string
          subtotal: number
          unidades_manual?: number | null
          verificado?: boolean | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          pedido_acumulativo_id?: string
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
          unidades_manual?: number | null
          verificado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_acumulativos_detalles_pedido_acumulativo_id_fkey"
            columns: ["pedido_acumulativo_id"]
            isOneToOne: false
            referencedRelation: "pedidos_acumulativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_acumulativos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_acumulativos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_detalles: {
        Row: {
          cantidad: number
          cantidad_original: number | null
          created_at: string
          es_cortesia: boolean | null
          fecha_ajuste_precio: string | null
          id: string
          kilos_totales: number | null
          linea_dividida_de: string | null
          notas_ajuste: string | null
          pedido_id: string
          precio_ajustado_por: string | null
          precio_original: number | null
          precio_unitario: number
          producto_id: string
          subtotal: number
          unidades_manual: number | null
        }
        Insert: {
          cantidad: number
          cantidad_original?: number | null
          created_at?: string
          es_cortesia?: boolean | null
          fecha_ajuste_precio?: string | null
          id?: string
          kilos_totales?: number | null
          linea_dividida_de?: string | null
          notas_ajuste?: string | null
          pedido_id: string
          precio_ajustado_por?: string | null
          precio_original?: number | null
          precio_unitario: number
          producto_id: string
          subtotal: number
          unidades_manual?: number | null
        }
        Update: {
          cantidad?: number
          cantidad_original?: number | null
          created_at?: string
          es_cortesia?: boolean | null
          fecha_ajuste_precio?: string | null
          id?: string
          kilos_totales?: number | null
          linea_dividida_de?: string | null
          notas_ajuste?: string | null
          pedido_id?: string
          precio_ajustado_por?: string | null
          precio_original?: number | null
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
          unidades_manual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_detalles_linea_dividida_de_fkey"
            columns: ["linea_dividida_de"]
            isOneToOne: false
            referencedRelation: "pedidos_detalles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_detalles_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_detalles_precio_ajustado_por_fkey"
            columns: ["precio_ajustado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_detalles_precio_ajustado_por_fkey"
            columns: ["precio_ajustado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_historial_cambios: {
        Row: {
          cambios: Json
          created_at: string
          id: string
          pedido_id: string
          tipo_cambio: string
          total_anterior: number | null
          total_nuevo: number | null
          usuario_id: string | null
        }
        Insert: {
          cambios?: Json
          created_at?: string
          id?: string
          pedido_id: string
          tipo_cambio: string
          total_anterior?: number | null
          total_nuevo?: number | null
          usuario_id?: string | null
        }
        Update: {
          cambios?: Json
          created_at?: string
          id?: string
          pedido_id?: string
          tipo_cambio?: string
          total_anterior?: number | null
          total_nuevo?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_historial_cambios_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean | null
          aplica_ieps: boolean
          aplica_iva: boolean
          bloqueado_venta: boolean | null
          categoria: string | null
          codigo: string
          codigo_sat: string | null
          contenido_empaque: string | null
          costo_promedio_ponderado: number | null
          created_at: string
          descripcion: string | null
          descripcion_promocion: string | null
          descuento_maximo: number | null
          es_promocion: boolean | null
          especificaciones: string | null
          fecha_ultima_compra: string | null
          fecha_ultima_fumigacion: string | null
          id: string
          maneja_caducidad: boolean | null
          marca: string | null
          nombre: string
          peso_kg: number | null
          piezas_por_unidad: number | null
          precio_compra: number
          precio_por_kilo: boolean
          precio_venta: number
          producto_base_id: string | null
          proveedor_preferido_id: string | null
          puede_tener_promocion: boolean | null
          requiere_fumigacion: boolean
          solo_uso_interno: boolean | null
          stock_actual: number
          stock_minimo: number
          ultimo_costo_compra: number | null
          unidad: Database["public"]["Enums"]["unit_type"]
          unidad_sat: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          aplica_ieps?: boolean
          aplica_iva?: boolean
          bloqueado_venta?: boolean | null
          categoria?: string | null
          codigo: string
          codigo_sat?: string | null
          contenido_empaque?: string | null
          costo_promedio_ponderado?: number | null
          created_at?: string
          descripcion?: string | null
          descripcion_promocion?: string | null
          descuento_maximo?: number | null
          es_promocion?: boolean | null
          especificaciones?: string | null
          fecha_ultima_compra?: string | null
          fecha_ultima_fumigacion?: string | null
          id?: string
          maneja_caducidad?: boolean | null
          marca?: string | null
          nombre: string
          peso_kg?: number | null
          piezas_por_unidad?: number | null
          precio_compra?: number
          precio_por_kilo?: boolean
          precio_venta?: number
          producto_base_id?: string | null
          proveedor_preferido_id?: string | null
          puede_tener_promocion?: boolean | null
          requiere_fumigacion?: boolean
          solo_uso_interno?: boolean | null
          stock_actual?: number
          stock_minimo?: number
          ultimo_costo_compra?: number | null
          unidad?: Database["public"]["Enums"]["unit_type"]
          unidad_sat?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          aplica_ieps?: boolean
          aplica_iva?: boolean
          bloqueado_venta?: boolean | null
          categoria?: string | null
          codigo?: string
          codigo_sat?: string | null
          contenido_empaque?: string | null
          costo_promedio_ponderado?: number | null
          created_at?: string
          descripcion?: string | null
          descripcion_promocion?: string | null
          descuento_maximo?: number | null
          es_promocion?: boolean | null
          especificaciones?: string | null
          fecha_ultima_compra?: string | null
          fecha_ultima_fumigacion?: string | null
          id?: string
          maneja_caducidad?: boolean | null
          marca?: string | null
          nombre?: string
          peso_kg?: number | null
          piezas_por_unidad?: number | null
          precio_compra?: number
          precio_por_kilo?: boolean
          precio_venta?: number
          producto_base_id?: string | null
          proveedor_preferido_id?: string | null
          puede_tener_promocion?: boolean | null
          requiere_fumigacion?: boolean
          solo_uso_interno?: boolean | null
          stock_actual?: number
          stock_minimo?: number
          ultimo_costo_compra?: number | null
          unidad?: Database["public"]["Enums"]["unit_type"]
          unidad_sat?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_producto_base_id_fkey"
            columns: ["producto_base_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_producto_base_id_fkey"
            columns: ["producto_base_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_proveedor_preferido_id_fkey"
            columns: ["proveedor_preferido_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_historial_costos: {
        Row: {
          costo_anterior: number | null
          costo_nuevo: number
          created_at: string | null
          fuente: string
          id: string
          notas: string | null
          producto_id: string
          proveedor_id: string | null
          referencia_id: string | null
          usuario_id: string | null
        }
        Insert: {
          costo_anterior?: number | null
          costo_nuevo: number
          created_at?: string | null
          fuente?: string
          id?: string
          notas?: string | null
          producto_id: string
          proveedor_id?: string | null
          referencia_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          costo_anterior?: number | null
          costo_nuevo?: number
          created_at?: string | null
          fuente?: string
          id?: string
          notas?: string | null
          producto_id?: string
          proveedor_id?: string | null
          referencia_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_historial_costos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_historial_costos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_historial_costos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_historial_estado: {
        Row: {
          activo_anterior: boolean
          activo_nuevo: boolean
          created_at: string
          id: string
          motivo: string | null
          producto_id: string
          usuario_id: string | null
        }
        Insert: {
          activo_anterior: boolean
          activo_nuevo: boolean
          created_at?: string
          id?: string
          motivo?: string | null
          producto_id: string
          usuario_id?: string | null
        }
        Update: {
          activo_anterior?: boolean
          activo_nuevo?: boolean
          created_at?: string
          id?: string
          motivo?: string | null
          producto_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_historial_estado_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_historial_estado_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_historial_precios: {
        Row: {
          created_at: string
          id: string
          precio_anterior: number
          precio_nuevo: number
          producto_id: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          precio_anterior: number
          precio_nuevo: number
          producto_id: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          precio_anterior?: number
          precio_nuevo?: number
          producto_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_historial_precios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_historial_precios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_revision_precio: {
        Row: {
          ajuste_aplicado: number | null
          costo_anterior: number
          costo_nuevo: number
          creado_por: string | null
          created_at: string | null
          id: string
          margen_actual_porcentaje: number | null
          margen_sugerido_porcentaje: number | null
          notas: string | null
          pendiente_ajuste: number | null
          precio_venta_actual: number
          precio_venta_sugerido: number
          producto_id: string
          resuelto_at: string | null
          resuelto_por: string | null
          status: string | null
        }
        Insert: {
          ajuste_aplicado?: number | null
          costo_anterior: number
          costo_nuevo: number
          creado_por?: string | null
          created_at?: string | null
          id?: string
          margen_actual_porcentaje?: number | null
          margen_sugerido_porcentaje?: number | null
          notas?: string | null
          pendiente_ajuste?: number | null
          precio_venta_actual: number
          precio_venta_sugerido: number
          producto_id: string
          resuelto_at?: string | null
          resuelto_por?: string | null
          status?: string | null
        }
        Update: {
          ajuste_aplicado?: number | null
          costo_anterior?: number
          costo_nuevo?: number
          creado_por?: string | null
          created_at?: string | null
          id?: string
          margen_actual_porcentaje?: number | null
          margen_sugerido_porcentaje?: number | null
          notas?: string | null
          pendiente_ajuste?: number | null
          precio_venta_actual?: number
          precio_venta_sugerido?: number
          producto_id?: string
          resuelto_at?: string | null
          resuelto_por?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_revision_precio_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_revision_precio_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_revision_precio_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_revision_precio_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_revision_precio_resuelto_por_fkey"
            columns: ["resuelto_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_revision_precio_resuelto_por_fkey"
            columns: ["resuelto_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_module: string | null
          last_seen: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          last_module?: string | null
          last_seen?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_module?: string | null
          last_seen?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proveedor_contactos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string | null
          es_principal: boolean | null
          id: string
          nombre: string
          proveedor_id: string
          puesto: string | null
          recibe_devoluciones: boolean | null
          recibe_logistica: boolean | null
          recibe_ordenes: boolean | null
          recibe_pagos: boolean | null
          telefono: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          es_principal?: boolean | null
          id?: string
          nombre: string
          proveedor_id: string
          puesto?: string | null
          recibe_devoluciones?: boolean | null
          recibe_logistica?: boolean | null
          recibe_ordenes?: boolean | null
          recibe_pagos?: boolean | null
          telefono: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          es_principal?: boolean | null
          id?: string
          nombre?: string
          proveedor_id?: string
          puesto?: string | null
          recibe_devoluciones?: boolean | null
          recibe_logistica?: boolean | null
          recibe_ordenes?: boolean | null
          recibe_pagos?: boolean | null
          telefono?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedor_contactos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedor_correos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string
          es_principal: boolean | null
          id: string
          nombre_contacto: string | null
          proposito: string | null
          proveedor_id: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email: string
          es_principal?: boolean | null
          id?: string
          nombre_contacto?: string | null
          proposito?: string | null
          proveedor_id: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string
          es_principal?: boolean | null
          id?: string
          nombre_contacto?: string | null
          proposito?: string | null
          proveedor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedor_correos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedor_creditos_pendientes: {
        Row: {
          cantidad: number
          created_at: string | null
          devolucion_id: string | null
          entrega_id: string | null
          fecha_aplicacion: string | null
          id: string
          monto_total: number
          motivo: string
          notas: string | null
          orden_compra_aplicada_id: string | null
          orden_compra_origen_id: string
          precio_unitario: number
          producto_id: string | null
          producto_nombre: string
          proveedor_id: string | null
          proveedor_nombre_manual: string | null
          resolucion_notas: string | null
          status: string
          tipo_resolucion: string | null
          updated_at: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          devolucion_id?: string | null
          entrega_id?: string | null
          fecha_aplicacion?: string | null
          id?: string
          monto_total: number
          motivo: string
          notas?: string | null
          orden_compra_aplicada_id?: string | null
          orden_compra_origen_id: string
          precio_unitario: number
          producto_id?: string | null
          producto_nombre: string
          proveedor_id?: string | null
          proveedor_nombre_manual?: string | null
          resolucion_notas?: string | null
          status?: string
          tipo_resolucion?: string | null
          updated_at?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          devolucion_id?: string | null
          entrega_id?: string | null
          fecha_aplicacion?: string | null
          id?: string
          monto_total?: number
          motivo?: string
          notas?: string | null
          orden_compra_aplicada_id?: string | null
          orden_compra_origen_id?: string
          precio_unitario?: number
          producto_id?: string | null
          producto_nombre?: string
          proveedor_id?: string | null
          proveedor_nombre_manual?: string | null
          resolucion_notas?: string | null
          status?: string
          tipo_resolucion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedor_creditos_pendientes_devolucion_id_fkey"
            columns: ["devolucion_id"]
            isOneToOne: false
            referencedRelation: "devoluciones_proveedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_creditos_pendientes_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_creditos_pendientes_orden_compra_aplicada_id_fkey"
            columns: ["orden_compra_aplicada_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_creditos_pendientes_orden_compra_origen_id_fkey"
            columns: ["orden_compra_origen_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_creditos_pendientes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_creditos_pendientes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_creditos_pendientes_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedor_factura_detalles: {
        Row: {
          cantidad_facturada: number
          created_at: string | null
          diferencia: number
          factura_id: string
          id: string
          precio_original_oc: number
          precio_unitario_facturado: number
          producto_id: string
          subtotal_facturado: number
        }
        Insert: {
          cantidad_facturada: number
          created_at?: string | null
          diferencia?: number
          factura_id: string
          id?: string
          precio_original_oc: number
          precio_unitario_facturado: number
          producto_id: string
          subtotal_facturado: number
        }
        Update: {
          cantidad_facturada?: number
          created_at?: string | null
          diferencia?: number
          factura_id?: string
          id?: string
          precio_original_oc?: number
          precio_unitario_facturado?: number
          producto_id?: string
          subtotal_facturado?: number
        }
        Relationships: [
          {
            foreignKeyName: "proveedor_factura_detalles_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "proveedor_facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_factura_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_factura_detalles_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedor_factura_entregas: {
        Row: {
          created_at: string
          entrega_id: string
          factura_id: string
          fecha_recepcion: string | null
          id: string
          notas: string | null
          recibido_por: string | null
          status: string
        }
        Insert: {
          created_at?: string
          entrega_id: string
          factura_id: string
          fecha_recepcion?: string | null
          id?: string
          notas?: string | null
          recibido_por?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          entrega_id?: string
          factura_id?: string
          fecha_recepcion?: string | null
          id?: string
          notas?: string | null
          recibido_por?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "proveedor_factura_entregas_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_factura_entregas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "proveedor_facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedor_facturas: {
        Row: {
          archivo_url: string | null
          comprobante_pago_url: string | null
          conciliacion_completada: boolean | null
          creado_por: string | null
          created_at: string
          diferencia_total: number | null
          fecha_factura: string
          fecha_pago: string | null
          id: string
          monto_total: number
          notas: string | null
          numero_factura: string
          orden_compra_id: string
          referencia_pago: string | null
          requiere_conciliacion: boolean | null
          status_pago: string
          tipo_pago: string
          updated_at: string
          uuid: string | null
        }
        Insert: {
          archivo_url?: string | null
          comprobante_pago_url?: string | null
          conciliacion_completada?: boolean | null
          creado_por?: string | null
          created_at?: string
          diferencia_total?: number | null
          fecha_factura?: string
          fecha_pago?: string | null
          id?: string
          monto_total?: number
          notas?: string | null
          numero_factura: string
          orden_compra_id: string
          referencia_pago?: string | null
          requiere_conciliacion?: boolean | null
          status_pago?: string
          tipo_pago?: string
          updated_at?: string
          uuid?: string | null
        }
        Update: {
          archivo_url?: string | null
          comprobante_pago_url?: string | null
          conciliacion_completada?: boolean | null
          creado_por?: string | null
          created_at?: string
          diferencia_total?: number | null
          fecha_factura?: string
          fecha_pago?: string | null
          id?: string
          monto_total?: number
          notas?: string | null
          numero_factura?: string
          orden_compra_id?: string
          referencia_pago?: string | null
          requiere_conciliacion?: boolean | null
          status_pago?: string
          tipo_pago?: string
          updated_at?: string
          uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedor_facturas_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedor_productos: {
        Row: {
          cantidad_lotes_default: number | null
          capacidad_vehiculo_bultos: number | null
          capacidad_vehiculo_kg: number | null
          codigo_proveedor: string | null
          costo_proveedor: number | null
          created_at: string
          dividir_en_lotes_recepcion: boolean | null
          es_capacidad_fija: boolean | null
          id: string
          permite_combinacion: boolean | null
          precio_por_kilo_compra: boolean | null
          producto_id: string
          proveedor_id: string
          tipo_vehiculo_estandar: string | null
          unidades_por_lote_default: number | null
          updated_at: string | null
        }
        Insert: {
          cantidad_lotes_default?: number | null
          capacidad_vehiculo_bultos?: number | null
          capacidad_vehiculo_kg?: number | null
          codigo_proveedor?: string | null
          costo_proveedor?: number | null
          created_at?: string
          dividir_en_lotes_recepcion?: boolean | null
          es_capacidad_fija?: boolean | null
          id?: string
          permite_combinacion?: boolean | null
          precio_por_kilo_compra?: boolean | null
          producto_id: string
          proveedor_id: string
          tipo_vehiculo_estandar?: string | null
          unidades_por_lote_default?: number | null
          updated_at?: string | null
        }
        Update: {
          cantidad_lotes_default?: number | null
          capacidad_vehiculo_bultos?: number | null
          capacidad_vehiculo_kg?: number | null
          codigo_proveedor?: string | null
          costo_proveedor?: number | null
          created_at?: string
          dividir_en_lotes_recepcion?: boolean | null
          es_capacidad_fija?: boolean | null
          id?: string
          permite_combinacion?: boolean | null
          precio_por_kilo_compra?: boolean | null
          producto_id?: string
          proveedor_id?: string
          tipo_vehiculo_estandar?: string | null
          unidades_por_lote_default?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedor_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_productos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          calle: string | null
          codigo_postal: string | null
          colonia: string | null
          created_at: string
          direccion: string | null
          email: string | null
          estado: string | null
          id: string
          municipio: string | null
          nombre: string
          nombre_comercial: string | null
          nombre_contacto: string | null
          notas: string | null
          numero_exterior: string | null
          numero_interior: string | null
          pais: string
          regimen_fiscal: string | null
          rfc: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          calle?: string | null
          codigo_postal?: string | null
          colonia?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          municipio?: string | null
          nombre: string
          nombre_comercial?: string | null
          nombre_contacto?: string | null
          notas?: string | null
          numero_exterior?: string | null
          numero_interior?: string | null
          pais?: string
          regimen_fiscal?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          calle?: string | null
          codigo_postal?: string | null
          colonia?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          municipio?: string | null
          nombre?: string
          nombre_comercial?: string | null
          nombre_contacto?: string | null
          notas?: string | null
          numero_exterior?: string | null
          numero_interior?: string | null
          pais?: string
          regimen_fiscal?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recepciones_evidencias: {
        Row: {
          capturado_por: string
          created_at: string
          id: string
          nombre_archivo: string
          notas: string | null
          orden_compra_entrega_id: string | null
          orden_compra_id: string | null
          ruta_storage: string
          tipo_evidencia: string
        }
        Insert: {
          capturado_por: string
          created_at?: string
          id?: string
          nombre_archivo: string
          notas?: string | null
          orden_compra_entrega_id?: string | null
          orden_compra_id?: string | null
          ruta_storage: string
          tipo_evidencia: string
        }
        Update: {
          capturado_por?: string
          created_at?: string
          id?: string
          nombre_archivo?: string
          notas?: string | null
          orden_compra_entrega_id?: string | null
          orden_compra_id?: string | null
          ruta_storage?: string
          tipo_evidencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "recepciones_evidencias_capturado_por_fkey"
            columns: ["capturado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepciones_evidencias_capturado_por_fkey"
            columns: ["capturado_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepciones_evidencias_orden_compra_entrega_id_fkey"
            columns: ["orden_compra_entrega_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepciones_evidencias_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      recepciones_participantes: {
        Row: {
          accion: string
          created_at: string | null
          empleado_id: string | null
          entrega_id: string
          id: string
          notas: string | null
          user_id: string
        }
        Insert: {
          accion: string
          created_at?: string | null
          empleado_id?: string | null
          entrega_id: string
          id?: string
          notas?: string | null
          user_id: string
        }
        Update: {
          accion?: string
          created_at?: string | null
          empleado_id?: string | null
          entrega_id?: string
          id?: string
          notas?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recepciones_participantes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepciones_participantes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepciones_participantes_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      resumenes_diarios: {
        Row: {
          created_at: string | null
          datos: Json
          enviado_en: string | null
          fecha: string
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          enviado_en?: string | null
          fecha: string
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          enviado_en?: string | null
          fecha?: string
          id?: string
        }
        Relationships: []
      }
      rutas: {
        Row: {
          almacenista_id: string | null
          ayudante_externo_id: string | null
          ayudante_id: string | null
          ayudantes_ids: string[] | null
          carga_completada: boolean | null
          carga_completada_en: string | null
          carga_completada_por: string | null
          carga_iniciada_en: string | null
          carga_iniciada_por: string | null
          cargado_por: string | null
          cargado_por_nombre: string | null
          chofer_id: string
          costo_ayudante_externo: number | null
          created_at: string
          distancia_total_km: number | null
          fase_carga: string | null
          fecha_hora_fin: string | null
          fecha_hora_inicio: string | null
          fecha_ruta: string
          firma_almacenista_carga: string | null
          firma_chofer_carga: string | null
          firma_chofer_carga_fecha: string | null
          folio: string
          hora_salida_sugerida: string | null
          id: string
          impresion_requerida: boolean | null
          kilometraje_final: number | null
          kilometraje_inicial: number | null
          kilometros_recorridos: number | null
          lleva_sellos: boolean | null
          notas: string | null
          numero_sello_salida: string | null
          peso_total_kg: number | null
          status: string | null
          tiempo_estimado_minutos: number | null
          tipo_ruta: string
          updated_at: string
          vehiculo_id: string | null
        }
        Insert: {
          almacenista_id?: string | null
          ayudante_externo_id?: string | null
          ayudante_id?: string | null
          ayudantes_ids?: string[] | null
          carga_completada?: boolean | null
          carga_completada_en?: string | null
          carga_completada_por?: string | null
          carga_iniciada_en?: string | null
          carga_iniciada_por?: string | null
          cargado_por?: string | null
          cargado_por_nombre?: string | null
          chofer_id: string
          costo_ayudante_externo?: number | null
          created_at?: string
          distancia_total_km?: number | null
          fase_carga?: string | null
          fecha_hora_fin?: string | null
          fecha_hora_inicio?: string | null
          fecha_ruta: string
          firma_almacenista_carga?: string | null
          firma_chofer_carga?: string | null
          firma_chofer_carga_fecha?: string | null
          folio: string
          hora_salida_sugerida?: string | null
          id?: string
          impresion_requerida?: boolean | null
          kilometraje_final?: number | null
          kilometraje_inicial?: number | null
          kilometros_recorridos?: number | null
          lleva_sellos?: boolean | null
          notas?: string | null
          numero_sello_salida?: string | null
          peso_total_kg?: number | null
          status?: string | null
          tiempo_estimado_minutos?: number | null
          tipo_ruta?: string
          updated_at?: string
          vehiculo_id?: string | null
        }
        Update: {
          almacenista_id?: string | null
          ayudante_externo_id?: string | null
          ayudante_id?: string | null
          ayudantes_ids?: string[] | null
          carga_completada?: boolean | null
          carga_completada_en?: string | null
          carga_completada_por?: string | null
          carga_iniciada_en?: string | null
          carga_iniciada_por?: string | null
          cargado_por?: string | null
          cargado_por_nombre?: string | null
          chofer_id?: string
          costo_ayudante_externo?: number | null
          created_at?: string
          distancia_total_km?: number | null
          fase_carga?: string | null
          fecha_hora_fin?: string | null
          fecha_hora_inicio?: string | null
          fecha_ruta?: string
          firma_almacenista_carga?: string | null
          firma_chofer_carga?: string | null
          firma_chofer_carga_fecha?: string | null
          folio?: string
          hora_salida_sugerida?: string | null
          id?: string
          impresion_requerida?: boolean | null
          kilometraje_final?: number | null
          kilometraje_inicial?: number | null
          kilometros_recorridos?: number | null
          lleva_sellos?: boolean | null
          notas?: string | null
          numero_sello_salida?: string | null
          peso_total_kg?: number | null
          status?: string | null
          tiempo_estimado_minutos?: number | null
          tipo_ruta?: string
          updated_at?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rutas_almacenista_id_fkey"
            columns: ["almacenista_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_almacenista_id_fkey"
            columns: ["almacenista_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_ayudante_externo_id_fkey"
            columns: ["ayudante_externo_id"]
            isOneToOne: false
            referencedRelation: "ayudantes_externos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_ayudante_id_fkey"
            columns: ["ayudante_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_ayudante_id_fkey"
            columns: ["ayudante_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_carga_completada_por_fkey"
            columns: ["carga_completada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_carga_completada_por_fkey"
            columns: ["carga_completada_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_carga_iniciada_por_fkey"
            columns: ["carga_iniciada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_carga_iniciada_por_fkey"
            columns: ["carga_iniciada_por"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      solicitudes_descuento: {
        Row: {
          cantidad_solicitada: number | null
          carrito_snapshot: Json | null
          cliente_id: string
          created_at: string | null
          descuento_maximo: number
          descuento_solicitado: number
          es_urgente: boolean | null
          id: string
          motivo: string | null
          pedido_id: string | null
          precio_aprobado: number | null
          precio_lista: number
          precio_solicitado: number
          producto_id: string
          respondido_at: string | null
          respondido_por: string | null
          respuesta_notas: string | null
          status: string | null
          sucursal_id: string | null
          total_pedido_estimado: number | null
          updated_at: string | null
          vendedor_id: string
        }
        Insert: {
          cantidad_solicitada?: number | null
          carrito_snapshot?: Json | null
          cliente_id: string
          created_at?: string | null
          descuento_maximo: number
          descuento_solicitado: number
          es_urgente?: boolean | null
          id?: string
          motivo?: string | null
          pedido_id?: string | null
          precio_aprobado?: number | null
          precio_lista: number
          precio_solicitado: number
          producto_id: string
          respondido_at?: string | null
          respondido_por?: string | null
          respuesta_notas?: string | null
          status?: string | null
          sucursal_id?: string | null
          total_pedido_estimado?: number | null
          updated_at?: string | null
          vendedor_id: string
        }
        Update: {
          cantidad_solicitada?: number | null
          carrito_snapshot?: Json | null
          cliente_id?: string
          created_at?: string | null
          descuento_maximo?: number
          descuento_solicitado?: number
          es_urgente?: boolean | null
          id?: string
          motivo?: string | null
          pedido_id?: string | null
          precio_aprobado?: number | null
          precio_lista?: number
          precio_solicitado?: number
          producto_id?: string
          respondido_at?: string | null
          respondido_por?: string | null
          respuesta_notas?: string | null
          status?: string | null
          sucursal_id?: string | null
          total_pedido_estimado?: number | null
          updated_at?: string | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_descuento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_descuento_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_descuento_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_descuento_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_stock_bajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_descuento_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "cliente_sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_descuento_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_descuento_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_venta_mostrador: {
        Row: {
          created_at: string | null
          factura_id: string | null
          fecha_entregado: string | null
          fecha_pagado: string | null
          fecha_procesado: string | null
          fecha_solicitud: string | null
          folio: string
          forma_pago: string | null
          id: string
          notas: string | null
          procesado_por: string | null
          productos_solicitados: Json
          referencia_pago: string | null
          solicitante_id: string | null
          status: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          factura_id?: string | null
          fecha_entregado?: string | null
          fecha_pagado?: string | null
          fecha_procesado?: string | null
          fecha_solicitud?: string | null
          folio: string
          forma_pago?: string | null
          id?: string
          notas?: string | null
          procesado_por?: string | null
          productos_solicitados?: Json
          referencia_pago?: string | null
          solicitante_id?: string | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          factura_id?: string | null
          fecha_entregado?: string | null
          fecha_pagado?: string | null
          fecha_procesado?: string | null
          fecha_solicitud?: string | null
          folio?: string
          forma_pago?: string | null
          id?: string
          notas?: string | null
          procesado_por?: string | null
          productos_solicitados?: Json
          referencia_pago?: string | null
          solicitante_id?: string | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_venta_mostrador_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_venta_mostrador_procesado_por_fkey"
            columns: ["procesado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_venta_mostrador_procesado_por_fkey"
            columns: ["procesado_por"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_venta_mostrador_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_venta_mostrador_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos: {
        Row: {
          activo: boolean
          anio: number | null
          capacidad_toneladas: number | null
          chofer_asignado_id: string | null
          cilindros: string | null
          clase_federal: string | null
          clase_tipo: string | null
          clave_vehicular: string | null
          color: string | null
          created_at: string
          dimensiones_alto: number | null
          dimensiones_ancho: number | null
          dimensiones_largo: number | null
          factura_fecha: string | null
          factura_folio: string | null
          factura_url: string | null
          factura_valor: number | null
          factura_vendedor: string | null
          id: string
          marca: string | null
          modelo: string | null
          nombre: string
          notas: string | null
          numero_ejes: number | null
          numero_llantas: number | null
          numero_motor: string | null
          numero_serie: string | null
          permiso_ruta: string | null
          peso_maximo_foraneo_kg: number
          peso_maximo_local_kg: number
          peso_vehicular_ton: number | null
          placa: string | null
          poliza_seguro_url: string | null
          poliza_seguro_vencimiento: string | null
          status: string
          tarjeta_circulacion_expedicion: string | null
          tarjeta_circulacion_url: string | null
          tarjeta_circulacion_vencimiento: string | null
          tipo: string
          tipo_combustible: string | null
          tipo_suspension: string | null
          tipo_tarjeta_circulacion: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          anio?: number | null
          capacidad_toneladas?: number | null
          chofer_asignado_id?: string | null
          cilindros?: string | null
          clase_federal?: string | null
          clase_tipo?: string | null
          clave_vehicular?: string | null
          color?: string | null
          created_at?: string
          dimensiones_alto?: number | null
          dimensiones_ancho?: number | null
          dimensiones_largo?: number | null
          factura_fecha?: string | null
          factura_folio?: string | null
          factura_url?: string | null
          factura_valor?: number | null
          factura_vendedor?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre: string
          notas?: string | null
          numero_ejes?: number | null
          numero_llantas?: number | null
          numero_motor?: string | null
          numero_serie?: string | null
          permiso_ruta?: string | null
          peso_maximo_foraneo_kg?: number
          peso_maximo_local_kg?: number
          peso_vehicular_ton?: number | null
          placa?: string | null
          poliza_seguro_url?: string | null
          poliza_seguro_vencimiento?: string | null
          status?: string
          tarjeta_circulacion_expedicion?: string | null
          tarjeta_circulacion_url?: string | null
          tarjeta_circulacion_vencimiento?: string | null
          tipo?: string
          tipo_combustible?: string | null
          tipo_suspension?: string | null
          tipo_tarjeta_circulacion?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          anio?: number | null
          capacidad_toneladas?: number | null
          chofer_asignado_id?: string | null
          cilindros?: string | null
          clase_federal?: string | null
          clase_tipo?: string | null
          clave_vehicular?: string | null
          color?: string | null
          created_at?: string
          dimensiones_alto?: number | null
          dimensiones_ancho?: number | null
          dimensiones_largo?: number | null
          factura_fecha?: string | null
          factura_folio?: string | null
          factura_url?: string | null
          factura_valor?: number | null
          factura_vendedor?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre?: string
          notas?: string | null
          numero_ejes?: number | null
          numero_llantas?: number | null
          numero_motor?: string | null
          numero_serie?: string | null
          permiso_ruta?: string | null
          peso_maximo_foraneo_kg?: number
          peso_maximo_local_kg?: number
          peso_vehicular_ton?: number | null
          placa?: string | null
          poliza_seguro_url?: string | null
          poliza_seguro_vencimiento?: string | null
          status?: string
          tarjeta_circulacion_expedicion?: string | null
          tarjeta_circulacion_url?: string | null
          tarjeta_circulacion_vencimiento?: string | null
          tipo?: string
          tipo_combustible?: string | null
          tipo_suspension?: string | null
          tipo_tarjeta_circulacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_chofer_asignado_id_fkey"
            columns: ["chofer_asignado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_chofer_asignado_id_fkey"
            columns: ["chofer_asignado_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos_checkups: {
        Row: {
          aceite_ok: boolean | null
          anticongelante_ok: boolean | null
          bateria_ok: boolean | null
          checklist_detalle: Json | null
          chofer_id: string | null
          cinturones_ok: boolean | null
          created_at: string | null
          direccion_ok: boolean | null
          escape_ok: boolean | null
          espejos_ok: boolean | null
          fallas_detectadas: string | null
          fecha_checkup: string | null
          firma_conductor: string | null
          firma_supervisor: string | null
          frenos_ok: boolean | null
          hora_inspeccion: string | null
          id: string
          kilometraje_final: number | null
          kilometraje_inicial: number | null
          limpiadores_ok: boolean | null
          llantas_ok: boolean | null
          luces_ok: boolean | null
          notas_resolucion: string | null
          notificado_en: string | null
          notificado_mecanico: boolean | null
          observaciones_golpes: string | null
          pdf_path: string | null
          prioridad: string | null
          realizado_por: string
          requiere_reparacion: boolean | null
          resuelto: boolean | null
          resuelto_en: string | null
          supervisor_id: string | null
          suspension_ok: boolean | null
          tiene_items_nn_fallados: boolean | null
          vehiculo_id: string
        }
        Insert: {
          aceite_ok?: boolean | null
          anticongelante_ok?: boolean | null
          bateria_ok?: boolean | null
          checklist_detalle?: Json | null
          chofer_id?: string | null
          cinturones_ok?: boolean | null
          created_at?: string | null
          direccion_ok?: boolean | null
          escape_ok?: boolean | null
          espejos_ok?: boolean | null
          fallas_detectadas?: string | null
          fecha_checkup?: string | null
          firma_conductor?: string | null
          firma_supervisor?: string | null
          frenos_ok?: boolean | null
          hora_inspeccion?: string | null
          id?: string
          kilometraje_final?: number | null
          kilometraje_inicial?: number | null
          limpiadores_ok?: boolean | null
          llantas_ok?: boolean | null
          luces_ok?: boolean | null
          notas_resolucion?: string | null
          notificado_en?: string | null
          notificado_mecanico?: boolean | null
          observaciones_golpes?: string | null
          pdf_path?: string | null
          prioridad?: string | null
          realizado_por: string
          requiere_reparacion?: boolean | null
          resuelto?: boolean | null
          resuelto_en?: string | null
          supervisor_id?: string | null
          suspension_ok?: boolean | null
          tiene_items_nn_fallados?: boolean | null
          vehiculo_id: string
        }
        Update: {
          aceite_ok?: boolean | null
          anticongelante_ok?: boolean | null
          bateria_ok?: boolean | null
          checklist_detalle?: Json | null
          chofer_id?: string | null
          cinturones_ok?: boolean | null
          created_at?: string | null
          direccion_ok?: boolean | null
          escape_ok?: boolean | null
          espejos_ok?: boolean | null
          fallas_detectadas?: string | null
          fecha_checkup?: string | null
          firma_conductor?: string | null
          firma_supervisor?: string | null
          frenos_ok?: boolean | null
          hora_inspeccion?: string | null
          id?: string
          kilometraje_final?: number | null
          kilometraje_inicial?: number | null
          limpiadores_ok?: boolean | null
          llantas_ok?: boolean | null
          luces_ok?: boolean | null
          notas_resolucion?: string | null
          notificado_en?: string | null
          notificado_mecanico?: boolean | null
          observaciones_golpes?: string | null
          pdf_path?: string | null
          prioridad?: string | null
          realizado_por?: string
          requiere_reparacion?: boolean | null
          resuelto?: boolean | null
          resuelto_en?: string | null
          supervisor_id?: string | null
          suspension_ok?: boolean | null
          tiene_items_nn_fallados?: boolean | null
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_checkups_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_checkups_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_checkups_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_checkups_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_checkups_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_checkups_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "empleados_vista_segura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_checkups_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos_mantenimientos: {
        Row: {
          created_at: string
          fecha_mantenimiento: string
          id: string
          kilometraje_actual: number
          kilometraje_proximo: number | null
          notas: string | null
          tipo_mantenimiento: string
          vehiculo_id: string
        }
        Insert: {
          created_at?: string
          fecha_mantenimiento?: string
          id?: string
          kilometraje_actual: number
          kilometraje_proximo?: number | null
          notas?: string | null
          tipo_mantenimiento: string
          vehiculo_id: string
        }
        Update: {
          created_at?: string
          fecha_mantenimiento?: string
          id?: string
          kilometraje_actual?: number
          kilometraje_proximo?: number | null
          notas?: string | null
          tipo_mantenimiento?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_mantenimientos_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos_verificaciones: {
        Row: {
          anio: number
          certificado_url: string | null
          created_at: string | null
          fecha_verificacion: string | null
          id: string
          notificado: boolean | null
          proximo_periodo_fin: string | null
          proximo_periodo_inicio: string | null
          resultado: string | null
          semestre: number | null
          updated_at: string | null
          vehiculo_id: string
        }
        Insert: {
          anio: number
          certificado_url?: string | null
          created_at?: string | null
          fecha_verificacion?: string | null
          id?: string
          notificado?: boolean | null
          proximo_periodo_fin?: string | null
          proximo_periodo_inicio?: string | null
          resultado?: string | null
          semestre?: number | null
          updated_at?: string | null
          vehiculo_id: string
        }
        Update: {
          anio?: number
          certificado_url?: string | null
          created_at?: string | null
          fecha_verificacion?: string | null
          id?: string
          notificado?: boolean | null
          proximo_periodo_fin?: string | null
          proximo_periodo_inicio?: string | null
          resultado?: string | null
          semestre?: number | null
          updated_at?: string | null
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_verificaciones_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      zonas: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          es_foranea: boolean | null
          id: string
          nombre: string
          region: Database["public"]["Enums"]["zona_region"] | null
          zonas_cercanas: string[] | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          es_foranea?: boolean | null
          id?: string
          nombre: string
          region?: Database["public"]["Enums"]["zona_region"] | null
          zonas_cercanas?: string[] | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          es_foranea?: boolean | null
          id?: string
          nombre?: string
          region?: Database["public"]["Enums"]["zona_region"] | null
          zonas_cercanas?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      empleados_vista_segura: {
        Row: {
          activo: boolean | null
          clabe_interbancaria: string | null
          contacto_emergencia_nombre: string | null
          contacto_emergencia_telefono: string | null
          created_at: string | null
          cuenta_bancaria: string | null
          curp: string | null
          direccion: string | null
          email: string | null
          estado_civil: string | null
          fecha_baja: string | null
          fecha_ingreso: string | null
          fecha_nacimiento: string | null
          id: string | null
          motivo_baja: string | null
          nivel_estudios: string | null
          nombre: string | null
          nombre_completo: string | null
          notas: string | null
          numero_dependientes: number | null
          numero_seguro_social: string | null
          periodo_pago: string | null
          primer_apellido: string | null
          puesto: string | null
          rfc: string | null
          segundo_apellido: string | null
          sueldo_bruto: number | null
          telefono: string | null
          tipo_sangre: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activo?: boolean | null
          clabe_interbancaria?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          created_at?: string | null
          cuenta_bancaria?: string | null
          curp?: string | null
          direccion?: string | null
          email?: string | null
          estado_civil?: string | null
          fecha_baja?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          id?: string | null
          motivo_baja?: string | null
          nivel_estudios?: string | null
          nombre?: string | null
          nombre_completo?: string | null
          notas?: string | null
          numero_dependientes?: number | null
          numero_seguro_social?: string | null
          periodo_pago?: string | null
          primer_apellido?: string | null
          puesto?: string | null
          rfc?: string | null
          segundo_apellido?: string | null
          sueldo_bruto?: number | null
          telefono?: string | null
          tipo_sangre?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activo?: boolean | null
          clabe_interbancaria?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          created_at?: string | null
          cuenta_bancaria?: string | null
          curp?: string | null
          direccion?: string | null
          email?: string | null
          estado_civil?: string | null
          fecha_baja?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          id?: string | null
          motivo_baja?: string | null
          nivel_estudios?: string | null
          nombre?: string | null
          nombre_completo?: string | null
          notas?: string | null
          numero_dependientes?: number | null
          numero_seguro_social?: string | null
          periodo_pago?: string | null
          primer_apellido?: string | null
          puesto?: string | null
          rfc?: string | null
          segundo_apellido?: string | null
          sueldo_bruto?: number | null
          telefono?: string | null
          tipo_sangre?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gmail_cuentas_segura: {
        Row: {
          access_token: string | null
          activo: boolean | null
          created_at: string | null
          email: string | null
          id: string | null
          nombre: string | null
          proposito: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: never
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          nombre?: string | null
          proposito?: string | null
          refresh_token?: never
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: never
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          nombre?: string | null
          proposito?: string | null
          refresh_token?: never
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      productos_stock_bajo: {
        Row: {
          codigo: string | null
          id: string | null
          nombre: string | null
          stock_actual: number | null
          stock_minimo: number | null
        }
        Insert: {
          codigo?: string | null
          id?: string | null
          nombre?: string | null
          stock_actual?: number | null
          stock_minimo?: number | null
        }
        Update: {
          codigo?: string | null
          id?: string | null
          nombre?: string | null
          stock_actual?: number | null
          stock_minimo?: number | null
        }
        Relationships: []
      }
      profiles_chat: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      agregar_devolucion_a_oc: {
        Args: { p_monto: number; p_oc_id: string }
        Returns: undefined
      }
      ajustar_costos_oc: {
        Args: { p_oc_id: string; p_productos: Json }
        Returns: undefined
      }
      calcular_costo_promedio_ponderado: {
        Args: { p_producto_id: string }
        Returns: number
      }
      check_chofer_client_access: {
        Args: { p_chofer_id: string; p_cliente_id: string }
        Returns: boolean
      }
      check_client_order_access: {
        Args: { p_pedido_cliente_id: string; p_user_id: string }
        Returns: boolean
      }
      conciliar_factura_proveedor: {
        Args: { p_factura_id: string; p_productos: Json }
        Returns: undefined
      }
      decrementar_lote: {
        Args: { p_cantidad: number; p_lote_id: string }
        Returns: undefined
      }
      es_participante_conversacion: {
        Args: { _conversacion_id: string; _user_id: string }
        Returns: boolean
      }
      es_vendedor_de_cliente: {
        Args: { _cliente_id: string }
        Returns: boolean
      }
      generar_folio_cotizacion: { Args: never; Returns: string }
      generar_folio_orden_compra: { Args: never; Returns: string }
      generar_folio_venta_mostrador: { Args: never; Returns: string }
      generar_notificaciones_fumigacion: { Args: never; Returns: undefined }
      get_cliente_id_for_user: { Args: { user_uuid: string }; Returns: string }
      get_user_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      incrementar_lote: {
        Args: { p_cantidad: number; p_lote_id: string }
        Returns: undefined
      }
      obtener_termino_credito: {
        Args: { p_cliente_id: string; p_producto_id: string }
        Returns: Database["public"]["Enums"]["credit_term"]
      }
      registrar_cobro_pedido: {
        Args: {
          p_cliente_id: string
          p_fecha_cheque?: string
          p_forma_pago: string
          p_monto: number
          p_notas?: string
          p_pedido_id: string
          p_referencia?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "vendedor"
        | "chofer"
        | "almacen"
        | "secretaria"
        | "cliente"
        | "contadora"
        | "gerente_almacen"
      conversation_type:
        | "individual"
        | "grupo_personalizado"
        | "grupo_puesto"
        | "broadcast"
      credit_term: "contado" | "8_dias" | "15_dias" | "30_dias" | "60_dias"
      delivery_priority:
        | "vip_mismo_dia"
        | "deadline"
        | "dia_fijo_recurrente"
        | "fecha_sugerida"
        | "flexible"
      order_status:
        | "borrador"
        | "por_autorizar"
        | "pendiente"
        | "en_ruta"
        | "entregado"
        | "cancelado"
        | "por_cobrar"
      preferencia_facturacion:
        | "siempre_factura"
        | "siempre_remision"
        | "variable"
      unit_type:
        | "kg"
        | "pieza"
        | "caja"
        | "bulto"
        | "costal"
        | "litro"
        | "churla"
        | "cubeta"
        | "balón"
        | "paquete"
      zona_region:
        | "cdmx_norte"
        | "cdmx_centro"
        | "cdmx_sur"
        | "cdmx_oriente"
        | "cdmx_poniente"
        | "edomex_norte"
        | "edomex_oriente"
        | "toluca"
        | "morelos"
        | "puebla"
        | "hidalgo"
        | "queretaro"
        | "tlaxcala"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "vendedor",
        "chofer",
        "almacen",
        "secretaria",
        "cliente",
        "contadora",
        "gerente_almacen",
      ],
      conversation_type: [
        "individual",
        "grupo_personalizado",
        "grupo_puesto",
        "broadcast",
      ],
      credit_term: ["contado", "8_dias", "15_dias", "30_dias", "60_dias"],
      delivery_priority: [
        "vip_mismo_dia",
        "deadline",
        "dia_fijo_recurrente",
        "fecha_sugerida",
        "flexible",
      ],
      order_status: [
        "borrador",
        "por_autorizar",
        "pendiente",
        "en_ruta",
        "entregado",
        "cancelado",
        "por_cobrar",
      ],
      preferencia_facturacion: [
        "siempre_factura",
        "siempre_remision",
        "variable",
      ],
      unit_type: [
        "kg",
        "pieza",
        "caja",
        "bulto",
        "costal",
        "litro",
        "churla",
        "cubeta",
        "balón",
        "paquete",
      ],
      zona_region: [
        "cdmx_norte",
        "cdmx_centro",
        "cdmx_sur",
        "cdmx_oriente",
        "cdmx_poniente",
        "edomex_norte",
        "edomex_oriente",
        "toluca",
        "morelos",
        "puebla",
        "hidalgo",
        "queretaro",
        "tlaxcala",
      ],
    },
  },
} as const
