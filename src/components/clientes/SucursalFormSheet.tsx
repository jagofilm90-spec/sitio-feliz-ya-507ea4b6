import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, FileText, ChevronDown, ChevronUp, MapPin, Pencil } from "lucide-react";
import GoogleMapsAddressAutocomplete from "@/components/GoogleMapsAddressAutocomplete";
import { useState, useEffect } from "react";

interface Zona {
  id: string;
  nombre: string;
}

interface SucursalFormData {
  nombre: string;
  codigo_sucursal: string;
  direccion: string;
  zona_id: string;
  telefono: string;
  contacto: string;
  notas: string;
  horario_entrega: string;
  restricciones_vehiculo: string;
  dias_sin_entrega: string;
  no_combinar_pedidos: boolean;
  es_rosticeria: boolean;
  rfc: string;
  razon_social: string;
  direccion_fiscal: string;
  email_facturacion: string;
}

interface SucursalFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: SucursalFormData;
  setFormData: (data: SucursalFormData) => void;
  zonas: Zona[];
  isEditing: boolean;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const SucursalFormSheet = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  zonas,
  isEditing,
  onSave,
  onCancel,
}: SucursalFormSheetProps) => {
  const [mostrarDatosFiscales, setMostrarDatosFiscales] = useState(
    !!(formData.rfc || formData.razon_social)
  );
  const [editandoDireccion, setEditandoDireccion] = useState(!formData.direccion);

  // Reset editing mode when sheet opens with new data
  useEffect(() => {
    setEditandoDireccion(!formData.direccion);
    setMostrarDatosFiscales(!!(formData.rfc || formData.razon_social));
  }, [open, formData.direccion, formData.rfc, formData.razon_social]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(e);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Editar Sucursal" : "Nueva Sucursal"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Modifica los datos de la sucursal"
              : "Agrega una nueva ubicación de entrega"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="suc_codigo">Código</Label>
              <Input
                id="suc_codigo"
                value={formData.codigo_sucursal}
                onChange={(e) =>
                  setFormData({ ...formData, codigo_sucursal: e.target.value })
                }
                placeholder="Ej: 41"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suc_nombre">Nombre *</Label>
              <Input
                id="suc_nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: La Joya"
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suc_zona">Zona de Entrega</Label>
            <Select
              value={formData.zona_id}
              onValueChange={(value) =>
                setFormData({ ...formData, zona_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona zona" />
              </SelectTrigger>
              <SelectContent>
                {zonas.map((zona) => (
                  <SelectItem key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suc_direccion">Dirección de Entrega</Label>
            {formData.direccion && !editandoDireccion ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm leading-relaxed break-words">
                    {formData.direccion}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditandoDireccion(true)}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Cambiar dirección
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <GoogleMapsAddressAutocomplete
                  id="suc_direccion"
                  value={formData.direccion}
                  onChange={(value) => {
                    setFormData({ ...formData, direccion: value });
                    if (value) setEditandoDireccion(false);
                  }}
                  placeholder="Buscar dirección..."
                />
                {formData.direccion && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditandoDireccion(false)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="suc_contacto">Contacto</Label>
              <Input
                id="suc_contacto"
                value={formData.contacto}
                onChange={(e) =>
                  setFormData({ ...formData, contacto: e.target.value })
                }
                placeholder="Nombre"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suc_telefono">Teléfono</Label>
              <Input
                id="suc_telefono"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                placeholder="Teléfono"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Restricciones de Entrega */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Restricciones de Entrega
            </h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Horario de Entrega</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={formData.horario_entrega?.split(" - ")[0] || ""}
                    onChange={(e) => {
                      const horaFin =
                        formData.horario_entrega?.split(" - ")[1] || "";
                      const nuevoHorario = horaFin
                        ? `${e.target.value} - ${horaFin}`
                        : e.target.value;
                      setFormData({ ...formData, horario_entrega: nuevoHorario });
                    }}
                    className="w-28"
                  />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input
                    type="time"
                    value={formData.horario_entrega?.split(" - ")[1] || ""}
                    onChange={(e) => {
                      const horaInicio =
                        formData.horario_entrega?.split(" - ")[0] || "";
                      const nuevoHorario = horaInicio
                        ? `${horaInicio} - ${e.target.value}`
                        : `- ${e.target.value}`;
                      setFormData({ ...formData, horario_entrega: nuevoHorario });
                    }}
                    className="w-28"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Días sin Entrega</Label>
                <div className="flex flex-wrap gap-2">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia, idx) => {
                    const diasCompletos = [
                      "Lunes",
                      "Martes",
                      "Miércoles",
                      "Jueves",
                      "Viernes",
                      "Sábado",
                    ];
                    const diaCompleto = diasCompletos[idx];
                    const diasSeleccionados =
                      formData.dias_sin_entrega
                        ?.split(",")
                        .filter((d) => d.trim()) || [];
                    const isChecked = diasSeleccionados.includes(diaCompleto);
                    return (
                      <div key={dia} className="flex items-center space-x-1">
                        <Checkbox
                          id={`dia_${dia}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            let nuevosDias: string[];
                            if (checked) {
                              nuevosDias = [...diasSeleccionados, diaCompleto];
                            } else {
                              nuevosDias = diasSeleccionados.filter(
                                (d) => d !== diaCompleto
                              );
                            }
                            setFormData({
                              ...formData,
                              dias_sin_entrega: nuevosDias.join(","),
                            });
                          }}
                        />
                        <Label
                          htmlFor={`dia_${dia}`}
                          className="text-xs font-normal cursor-pointer"
                        >
                          {dia}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Vehículos Permitidos</Label>
                <div className="flex flex-wrap gap-2">
                  {["Camioneta", "Urvan", "Rabón", "Tortón", "Tráiler"].map(
                    (vehiculo) => {
                      const vehiculosPermitidos =
                        formData.restricciones_vehiculo
                          ?.split(",")
                          .filter((v) => v.trim()) || [];
                      const isChecked = vehiculosPermitidos.includes(vehiculo);
                      return (
                        <div
                          key={vehiculo}
                          className="flex items-center space-x-1"
                        >
                          <Checkbox
                            id={`vehiculo_${vehiculo}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              let nuevosVehiculos: string[];
                              if (checked) {
                                nuevosVehiculos = [
                                  ...vehiculosPermitidos,
                                  vehiculo,
                                ];
                              } else {
                                nuevosVehiculos = vehiculosPermitidos.filter(
                                  (v) => v !== vehiculo
                                );
                              }
                              setFormData({
                                ...formData,
                                restricciones_vehiculo: nuevosVehiculos.join(","),
                              });
                            }}
                          />
                          <Label
                            htmlFor={`vehiculo_${vehiculo}`}
                            className="text-xs font-normal cursor-pointer"
                          >
                            {vehiculo}
                          </Label>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suc_no_combinar"
                  checked={formData.no_combinar_pedidos}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      no_combinar_pedidos: checked === true,
                    })
                  }
                />
                <Label
                  htmlFor="suc_no_combinar"
                  className="text-sm font-normal cursor-pointer"
                >
                  No combinar pedidos
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suc_es_rosticeria"
                  checked={formData.es_rosticeria}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      es_rosticeria: checked === true,
                    })
                  }
                />
                <Label
                  htmlFor="suc_es_rosticeria"
                  className="text-sm font-normal cursor-pointer"
                >
                  🍗 Es Rosticería
                </Label>
              </div>
            </div>
          </div>

          {/* Datos Fiscales Opcionales */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setMostrarDatosFiscales(!mostrarDatosFiscales)}
              className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors"
            >
              <FileText className="h-4 w-4" />
              Datos Fiscales (opcional)
              {mostrarDatosFiscales ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {mostrarDatosFiscales && (
              <div className="space-y-3 mt-3 pl-2 border-l-2 border-primary/20">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="suc_rfc" className="text-sm">
                      RFC
                    </Label>
                    <Input
                      id="suc_rfc"
                      value={formData.rfc}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rfc: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="RFC"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suc_razon_social" className="text-sm">
                      Razón Social
                    </Label>
                    <Input
                      id="suc_razon_social"
                      value={formData.razon_social}
                      onChange={(e) =>
                        setFormData({ ...formData, razon_social: e.target.value })
                      }
                      placeholder="Razón social"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suc_direccion_fiscal" className="text-sm">
                    Dirección Fiscal
                  </Label>
                  <Input
                    id="suc_direccion_fiscal"
                    value={formData.direccion_fiscal}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        direccion_fiscal: e.target.value,
                      })
                    }
                    placeholder="Dirección fiscal"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suc_email_facturacion" className="text-sm">
                    Email Facturación
                  </Label>
                  <Input
                    id="suc_email_facturacion"
                    type="email"
                    value={formData.email_facturacion}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email_facturacion: e.target.value,
                      })
                    }
                    placeholder="Email para facturas"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="suc_notas" className="text-sm">
              Notas
            </Label>
            <Textarea
              id="suc_notas"
              value={formData.notas}
              onChange={(e) =>
                setFormData({ ...formData, notas: e.target.value })
              }
              placeholder="Observaciones..."
              rows={2}
            />
          </div>

          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? "Actualizar" : "Crear"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
