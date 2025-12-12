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
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          costo_por_kilo?: number | null
          created_at?: string
          direccion?: string | null
          es_externa?: boolean
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          costo_por_kilo?: number | null
          created_at?: string
          direccion?: string | null
          es_externa?: boolean
          id?: string
          nombre?: string
          updated_at?: string
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
          created_at: string | null
          entrega_id: string
          id: string
          lote_id: string | null
          notas: string | null
          pedido_detalle_id: string
          updated_at: string | null
        }
        Insert: {
          cantidad_cargada?: number | null
          cantidad_solicitada: number
          cargado?: boolean | null
          cargado_en?: string | null
          cargado_por?: string | null
          created_at?: string | null
          entrega_id: string
          id?: string
          lote_id?: string | null
          notas?: string | null
          pedido_detalle_id: string
          updated_at?: string | null
        }
        Update: {
          cantidad_cargada?: number | null
          cantidad_solicitada?: number
          cargado?: boolean | null
          cargado_en?: string | null
          cargado_por?: string | null
          created_at?: string | null
          entrega_id?: string
          id?: string
          lote_id?: string | null
          notas?: string | null
          pedido_detalle_id?: string
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
            foreignKeyName: "carga_productos_pedido_detalle_id_fkey"
            columns: ["pedido_detalle_id"]
            isOneToOne: false
            referencedRelation: "pedidos_detalles"
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
      clientes: {
        Row: {
          activo: boolean | null
          codigo: string
          codigo_postal: string | null
          created_at: string
          csf_archivo_url: string | null
          deadline_dias_habiles_default: number | null
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
          id: string
          motivo_baja: string | null
          nivel_estudios: string | null
          nombre: string | null
          nombre_completo: string
          notas: string | null
          numero_dependientes: number | null
          numero_seguro_social: string | null
          periodo_pago: string | null
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
          id?: string
          motivo_baja?: string | null
          nivel_estudios?: string | null
          nombre?: string | null
          nombre_completo: string
          notas?: string | null
          numero_dependientes?: number | null
          numero_seguro_social?: string | null
          periodo_pago?: string | null
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
          id?: string
          motivo_baja?: string | null
          nivel_estudios?: string | null
          nombre?: string | null
          nombre_completo?: string
          notas?: string | null
          numero_dependientes?: number | null
          numero_seguro_social?: string | null
          periodo_pago?: string | null
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
          created_at: string
          entregado: boolean | null
          fecha_entrega: string | null
          firma_recibido: string | null
          id: string
          notas: string | null
          orden_entrega: number
          pedido_id: string
          ruta_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entregado?: boolean | null
          fecha_entrega?: string | null
          firma_recibido?: string | null
          id?: string
          notas?: string | null
          orden_entrega: number
          pedido_id: string
          ruta_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entregado?: boolean | null
          fecha_entrega?: string | null
          firma_recibido?: string | null
          id?: string
          notas?: string | null
          orden_entrega?: number
          pedido_id?: string
          ruta_id?: string
          updated_at?: string
        }
        Relationships: [
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
          created_at: string
          fecha_caducidad: string | null
          fecha_entrada: string
          fecha_ultima_fumigacion: string | null
          id: string
          lote_referencia: string | null
          notas: string | null
          orden_compra_id: string | null
          precio_compra: number
          producto_id: string
          updated_at: string
        }
        Insert: {
          bodega_id?: string | null
          cantidad_disponible?: number
          created_at?: string
          fecha_caducidad?: string | null
          fecha_entrada?: string
          fecha_ultima_fumigacion?: string | null
          id?: string
          lote_referencia?: string | null
          notas?: string | null
          orden_compra_id?: string | null
          precio_compra: number
          producto_id: string
          updated_at?: string
        }
        Update: {
          bodega_id?: string | null
          cantidad_disponible?: number
          created_at?: string
          fecha_caducidad?: string | null
          fecha_entrada?: string
          fecha_ultima_fumigacion?: string | null
          id?: string
          lote_referencia?: string | null
          notas?: string | null
          orden_compra_id?: string | null
          precio_compra?: number
          producto_id?: string
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
          tipo: string
          titulo: string
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
          tipo: string
          titulo: string
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
          tipo?: string
          titulo?: string
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
        ]
      }
      ordenes_compra: {
        Row: {
          autorizado_por: string | null
          creado_por: string
          created_at: string
          email_enviado_en: string | null
          email_leido_en: string | null
          entregas_multiples: boolean | null
          fecha_autorizacion: string | null
          fecha_entrega_programada: string | null
          fecha_entrega_real: string | null
          fecha_orden: string
          fecha_rechazo: string | null
          folio: string
          id: string
          impuestos: number
          motivo_devolucion: string | null
          motivo_rechazo: string | null
          notas: string | null
          proveedor_id: string
          rechazado_por: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          autorizado_por?: string | null
          creado_por: string
          created_at?: string
          email_enviado_en?: string | null
          email_leido_en?: string | null
          entregas_multiples?: boolean | null
          fecha_autorizacion?: string | null
          fecha_entrega_programada?: string | null
          fecha_entrega_real?: string | null
          fecha_orden?: string
          fecha_rechazo?: string | null
          folio: string
          id?: string
          impuestos?: number
          motivo_devolucion?: string | null
          motivo_rechazo?: string | null
          notas?: string | null
          proveedor_id: string
          rechazado_por?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          autorizado_por?: string | null
          creado_por?: string
          created_at?: string
          email_enviado_en?: string | null
          email_leido_en?: string | null
          entregas_multiples?: boolean | null
          fecha_autorizacion?: string | null
          fecha_entrega_programada?: string | null
          fecha_entrega_real?: string | null
          fecha_orden?: string
          fecha_rechazo?: string | null
          folio?: string
          id?: string
          impuestos?: number
          motivo_devolucion?: string | null
          motivo_rechazo?: string | null
          notas?: string | null
          proveedor_id?: string
          rechazado_por?: string | null
          status?: string
          subtotal?: number
          total?: number
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
      ordenes_compra_confirmaciones: {
        Row: {
          confirmado_en: string | null
          created_at: string
          id: string
          ip_address: string | null
          orden_compra_id: string
          user_agent: string | null
        }
        Insert: {
          confirmado_en?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          orden_compra_id: string
          user_agent?: string | null
        }
        Update: {
          confirmado_en?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          orden_compra_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_confirmaciones_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra_detalles: {
        Row: {
          cantidad_ordenada: number
          cantidad_recibida: number
          created_at: string
          id: string
          orden_compra_id: string
          precio_unitario_compra: number
          producto_id: string
          subtotal: number
        }
        Insert: {
          cantidad_ordenada: number
          cantidad_recibida?: number
          created_at?: string
          id?: string
          orden_compra_id: string
          precio_unitario_compra: number
          producto_id: string
          subtotal: number
        }
        Update: {
          cantidad_ordenada?: number
          cantidad_recibida?: number
          created_at?: string
          id?: string
          orden_compra_id?: string
          precio_unitario_compra?: number
          producto_id?: string
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
          cantidad_bultos: number
          created_at: string
          fecha_entrega_real: string | null
          fecha_programada: string | null
          id: string
          notas: string | null
          numero_entrega: number
          orden_compra_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cantidad_bultos: number
          created_at?: string
          fecha_entrega_real?: string | null
          fecha_programada?: string | null
          id?: string
          notas?: string | null
          numero_entrega: number
          orden_compra_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cantidad_bultos?: number
          created_at?: string
          fecha_entrega_real?: string | null
          fecha_programada?: string | null
          id?: string
          notas?: string | null
          numero_entrega?: number
          orden_compra_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_entregas_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
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
          fecha_factura_enviada: string | null
          fecha_pedido: string
          folio: string
          id: string
          impuestos: number | null
          notas: string | null
          peso_total_kg: number | null
          prioridad_entrega:
            | Database["public"]["Enums"]["delivery_priority"]
            | null
          requiere_factura: boolean
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          sucursal_id: string | null
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
          fecha_factura_enviada?: string | null
          fecha_pedido?: string
          folio: string
          id?: string
          impuestos?: number | null
          notas?: string | null
          peso_total_kg?: number | null
          prioridad_entrega?:
            | Database["public"]["Enums"]["delivery_priority"]
            | null
          requiere_factura?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          sucursal_id?: string | null
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
          fecha_factura_enviada?: string | null
          fecha_pedido?: string
          folio?: string
          id?: string
          impuestos?: number | null
          notas?: string | null
          peso_total_kg?: number | null
          prioridad_entrega?:
            | Database["public"]["Enums"]["delivery_priority"]
            | null
          requiere_factura?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          sucursal_id?: string | null
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
          created_at: string
          fecha_ajuste_precio: string | null
          id: string
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
          created_at?: string
          fecha_ajuste_precio?: string | null
          id?: string
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
          created_at?: string
          fecha_ajuste_precio?: string | null
          id?: string
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
      productos: {
        Row: {
          activo: boolean | null
          aplica_ieps: boolean
          aplica_iva: boolean
          categoria: string | null
          codigo: string
          codigo_sat: string | null
          created_at: string
          descripcion: string | null
          fecha_ultima_compra: string | null
          fecha_ultima_fumigacion: string | null
          id: string
          kg_por_unidad: number | null
          maneja_caducidad: boolean | null
          marca: string | null
          nombre: string
          precio_compra: number
          precio_por_kilo: boolean
          precio_venta: number
          presentacion: string | null
          proveedor_preferido_id: string | null
          requiere_fumigacion: boolean
          stock_actual: number
          stock_minimo: number
          ultimo_costo_compra: number | null
          unidad: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          aplica_ieps?: boolean
          aplica_iva?: boolean
          categoria?: string | null
          codigo: string
          codigo_sat?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_ultima_compra?: string | null
          fecha_ultima_fumigacion?: string | null
          id?: string
          kg_por_unidad?: number | null
          maneja_caducidad?: boolean | null
          marca?: string | null
          nombre: string
          precio_compra?: number
          precio_por_kilo?: boolean
          precio_venta?: number
          presentacion?: string | null
          proveedor_preferido_id?: string | null
          requiere_fumigacion?: boolean
          stock_actual?: number
          stock_minimo?: number
          ultimo_costo_compra?: number | null
          unidad?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          aplica_ieps?: boolean
          aplica_iva?: boolean
          categoria?: string | null
          codigo?: string
          codigo_sat?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_ultima_compra?: string | null
          fecha_ultima_fumigacion?: string | null
          id?: string
          kg_por_unidad?: number | null
          maneja_caducidad?: boolean | null
          marca?: string | null
          nombre?: string
          precio_compra?: number
          precio_por_kilo?: boolean
          precio_venta?: number
          presentacion?: string | null
          proveedor_preferido_id?: string | null
          requiere_fumigacion?: boolean
          stock_actual?: number
          stock_minimo?: number
          ultimo_costo_compra?: number | null
          unidad?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_proveedor_preferido_id_fkey"
            columns: ["proveedor_preferido_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
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
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proveedor_productos: {
        Row: {
          created_at: string
          id: string
          producto_id: string
          proveedor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          producto_id: string
          proveedor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          producto_id?: string
          proveedor_id?: string
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
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          nombre_contacto: string | null
          notas: string | null
          pais: string
          rfc: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          nombre_contacto?: string | null
          notas?: string | null
          pais?: string
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          nombre_contacto?: string | null
          notas?: string | null
          pais?: string
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
          orden_compra_id: string
          ruta_storage: string
          tipo_evidencia: string
        }
        Insert: {
          capturado_por: string
          created_at?: string
          id?: string
          nombre_archivo: string
          notas?: string | null
          orden_compra_id: string
          ruta_storage: string
          tipo_evidencia: string
        }
        Update: {
          capturado_por?: string
          created_at?: string
          id?: string
          nombre_archivo?: string
          notas?: string | null
          orden_compra_id?: string
          ruta_storage?: string
          tipo_evidencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "recepciones_evidencias_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      rutas: {
        Row: {
          ayudante_externo_id: string | null
          ayudante_id: string | null
          carga_completada: boolean | null
          carga_completada_en: string | null
          carga_completada_por: string | null
          chofer_id: string
          costo_ayudante_externo: number | null
          created_at: string
          distancia_total_km: number | null
          fecha_hora_fin: string | null
          fecha_hora_inicio: string | null
          fecha_ruta: string
          folio: string
          hora_salida_sugerida: string | null
          id: string
          kilometraje_final: number | null
          kilometraje_inicial: number | null
          kilometros_recorridos: number | null
          notas: string | null
          peso_total_kg: number | null
          status: string | null
          tiempo_estimado_minutos: number | null
          tipo_ruta: string
          updated_at: string
          vehiculo_id: string | null
        }
        Insert: {
          ayudante_externo_id?: string | null
          ayudante_id?: string | null
          carga_completada?: boolean | null
          carga_completada_en?: string | null
          carga_completada_por?: string | null
          chofer_id: string
          costo_ayudante_externo?: number | null
          created_at?: string
          distancia_total_km?: number | null
          fecha_hora_fin?: string | null
          fecha_hora_inicio?: string | null
          fecha_ruta: string
          folio: string
          hora_salida_sugerida?: string | null
          id?: string
          kilometraje_final?: number | null
          kilometraje_inicial?: number | null
          kilometros_recorridos?: number | null
          notas?: string | null
          peso_total_kg?: number | null
          status?: string | null
          tiempo_estimado_minutos?: number | null
          tipo_ruta?: string
          updated_at?: string
          vehiculo_id?: string | null
        }
        Update: {
          ayudante_externo_id?: string | null
          ayudante_id?: string | null
          carga_completada?: boolean | null
          carga_completada_en?: string | null
          carga_completada_por?: string | null
          chofer_id?: string
          costo_ayudante_externo?: number | null
          created_at?: string
          distancia_total_km?: number | null
          fecha_hora_fin?: string | null
          fecha_hora_inicio?: string | null
          fecha_ruta?: string
          folio?: string
          hora_salida_sugerida?: string | null
          id?: string
          kilometraje_final?: number | null
          kilometraje_inicial?: number | null
          kilometros_recorridos?: number | null
          notas?: string | null
          peso_total_kg?: number | null
          status?: string | null
          tiempo_estimado_minutos?: number | null
          tipo_ruta?: string
          updated_at?: string
          vehiculo_id?: string | null
        }
        Relationships: [
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_ayudante_id_fkey"
            columns: ["ayudante_id"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
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
            foreignKeyName: "rutas_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "profiles_chat"
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
          clabe_interbancaria?: never
          contacto_emergencia_nombre?: never
          contacto_emergencia_telefono?: never
          created_at?: string | null
          cuenta_bancaria?: never
          curp?: never
          direccion?: never
          email?: string | null
          estado_civil?: never
          fecha_baja?: never
          fecha_ingreso?: string | null
          fecha_nacimiento?: never
          id?: string | null
          motivo_baja?: never
          nivel_estudios?: never
          nombre?: string | null
          nombre_completo?: string | null
          notas?: never
          numero_dependientes?: never
          numero_seguro_social?: never
          periodo_pago?: never
          primer_apellido?: string | null
          puesto?: string | null
          rfc?: never
          segundo_apellido?: string | null
          sueldo_bruto?: never
          telefono?: string | null
          tipo_sangre?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activo?: boolean | null
          clabe_interbancaria?: never
          contacto_emergencia_nombre?: never
          contacto_emergencia_telefono?: never
          created_at?: string | null
          cuenta_bancaria?: never
          curp?: never
          direccion?: never
          email?: string | null
          estado_civil?: never
          fecha_baja?: never
          fecha_ingreso?: string | null
          fecha_nacimiento?: never
          id?: string | null
          motivo_baja?: never
          nivel_estudios?: never
          nombre?: string | null
          nombre_completo?: string | null
          notas?: never
          numero_dependientes?: never
          numero_seguro_social?: never
          periodo_pago?: never
          primer_apellido?: string | null
          puesto?: string | null
          rfc?: never
          segundo_apellido?: string | null
          sueldo_bruto?: never
          telefono?: string | null
          tipo_sangre?: never
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
          token_expires_at?: never
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
          token_expires_at?: never
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
          email?: never
          full_name?: string | null
          id?: string | null
          phone?: never
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          phone?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_chofer_client_access: {
        Args: { p_chofer_id: string; p_cliente_id: string }
        Returns: boolean
      }
      check_client_order_access: {
        Args: { p_pedido_cliente_id: string; p_user_id: string }
        Returns: boolean
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
      obtener_termino_credito: {
        Args: { p_cliente_id: string; p_producto_id: string }
        Returns: Database["public"]["Enums"]["credit_term"]
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
      conversation_type:
        | "individual"
        | "grupo_personalizado"
        | "grupo_puesto"
        | "broadcast"
      credit_term: "contado" | "8_dias" | "15_dias" | "30_dias"
      delivery_priority:
        | "vip_mismo_dia"
        | "deadline"
        | "dia_fijo_recurrente"
        | "fecha_sugerida"
        | "flexible"
      order_status:
        | "por_autorizar"
        | "pendiente"
        | "en_ruta"
        | "entregado"
        | "cancelado"
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
      ],
      conversation_type: [
        "individual",
        "grupo_personalizado",
        "grupo_puesto",
        "broadcast",
      ],
      credit_term: ["contado", "8_dias", "15_dias", "30_dias"],
      delivery_priority: [
        "vip_mismo_dia",
        "deadline",
        "dia_fijo_recurrente",
        "fecha_sugerida",
        "flexible",
      ],
      order_status: [
        "por_autorizar",
        "pendiente",
        "en_ruta",
        "entregado",
        "cancelado",
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
