import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Navigation, Camera, CheckCircle, XCircle, ArrowLeft, Package } from "lucide-react";
import { useHojaChofer, useIniciarEntrega, useMarcarLlegada, useConfirmarEntrega, useEntregaFallida, useSubirFirma } from "@/hooks/useChoferApp";
import SignaturePad from "@/components/chofer/SignaturePad";
import { supabase } from "@/integrations/supabase/client";

export default function EntregaDetalle() {
  const { hojaId } = useParams<{ hojaId: string }>();
  const navigate = useNavigate();
  const { data: hoja, isLoading } = useHojaChofer(hojaId);
  const iniciar = useIniciarEntrega();
  const llegar = useMarcarLlegada();
  const confirmar = useConfirmarEntrega();
  const fallar = useEntregaFallida();
  const subirFirma = useSubirFirma();

  const [showPOD, setShowPOD] = useState(false);
  const [showFallida, setShowFallida] = useState(false);
  const [recibeNombre, setRecibeNombre] = useState("");
  const [recibeCargo, setRecibeCargo] = useState("");
  const [notas, setNotas] = useState("");
  const [firmaClienteUrl, setFirmaClienteUrl] = useState<string | null>(null);
  const [firmaChoferUrl, setFirmaChoferUrl] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [motivoFallida, setMotivoFallida] = useState("");
  const fotoRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <Layout><div className="p-6"><Skeleton className="h-40 w-full" /></div></Layout>;
  if (!hoja) return <Layout><div className="text-center py-12"><p>No encontrada</p></div></Layout>;

  const getGPS = (): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve({ lat: 0, lng: 0 })
      )
    );

  const handleIniciar = async () => {
    const gps = await getGPS();
    await iniciar.mutateAsync({ hojaId: hojaId!, ...gps });
  };

  const handleLlegada = async () => {
    const gps = await getGPS();
    await llegar.mutateAsync({ hojaId: hojaId!, ...gps });
  };

  const handleFoto = async (file: File) => {
    const path = `fotos/${hojaId}-${Date.now()}.${file.name.split(".").pop()}`;
    await supabase.storage.from("hojas-salida").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("hojas-salida").getPublicUrl(path);
    setFotoUrl(data.publicUrl);
  };

  const handleConfirmar = async () => {
    await confirmar.mutateAsync({
      hojaId: hojaId!,
      recibeNombre,
      recibeCargo,
      firmaClienteUrl: firmaClienteUrl || undefined,
      firmaChoferUrl: firmaChoferUrl || undefined,
      fotoHojaUrl: fotoUrl || undefined,
      notas: notas || undefined,
    });
    navigate("/chofer/mi-ruta");
  };

  const handleFallar = async () => {
    await fallar.mutateAsync({ hojaId: hojaId!, motivo: motivoFallida, notas });
    navigate("/chofer/mi-ruta");
  };

  const abrirMaps = () => {
    const dir = encodeURIComponent(hoja.cliente_direccion || "");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dir}`, "_blank");
  };

  const estadosSalir = ["surtida"];
  const estadosLlegada = ["en_transito"];
  const estadosPOD = ["en_transito"];

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="sticky top-0 bg-white border-b z-10 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/chofer/mi-ruta")} className="mb-1">
            <ArrowLeft className="mr-1 h-4 w-4" /> Mi ruta
          </Button>
          <h1 className="text-lg font-semibold">{hoja.cliente_razon_social}</h1>
          <p className="text-xs font-mono text-muted-foreground">{hoja.folio}</p>
        </div>

        <div className="p-4 space-y-4 pb-32">
          <Button onClick={abrirMaps} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white">
            <Navigation className="mr-2 h-5 w-5" /> Navegar con Google Maps
          </Button>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#c41e3a] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm">{hoja.cliente_direccion}</p>
                  {hoja.cliente_contacto_telefono && <p className="text-xs text-muted-foreground">Tel: {hoja.cliente_contacto_telefono}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2 flex items-center"><Package className="mr-2 h-4 w-4 text-[#c41e3a]" /> Productos</p>
              {(hoja.hojas_salida_lineas || []).map((l: any) => (
                <div key={l.id} className="flex justify-between text-sm border-b py-1 last:border-0">
                  <span className="truncate">{l.descripcion_producto}</span>
                  <span className="font-mono font-semibold flex-shrink-0">{l.cantidad_surtida} {l.unidad}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions by estado */}
          {estadosSalir.includes(hoja.estado) && (
            <Button onClick={handleIniciar} className="w-full h-14 bg-amber-600 hover:bg-amber-700" disabled={iniciar.isPending}>
              {iniciar.isPending ? "Iniciando..." : "Salir de bodega"}
            </Button>
          )}

          {estadosLlegada.includes(hoja.estado) && !hoja.chofer_llegada_at && (
            <Button onClick={handleLlegada} className="w-full h-14 bg-blue-600 hover:bg-blue-700" disabled={llegar.isPending}>
              <MapPin className="mr-2 h-5 w-5" /> He llegado al cliente
            </Button>
          )}

          {estadosPOD.includes(hoja.estado) && hoja.chofer_llegada_at && (
            <>
              <Button onClick={() => setShowPOD(true)} className="w-full h-14 bg-[#c41e3a] hover:bg-[#a01830] text-white">
                <CheckCircle className="mr-2 h-5 w-5" /> Completar entrega
              </Button>
              <Button onClick={() => setShowFallida(true)} variant="outline" className="w-full h-12 border-red-500 text-red-700">
                <XCircle className="mr-2 h-4 w-4" /> Entrega fallida
              </Button>
            </>
          )}

          {hoja.estado === "entregada" && (
            <Card className="border-green-500 bg-green-50">
              <CardContent className="p-4 text-center">
                <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-2" />
                <p className="font-medium text-green-900">Entregada</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* POD Dialog */}
        <Dialog open={showPOD} onOpenChange={setShowPOD}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Proof of Delivery</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Nombre de quien recibe*</Label>
                <Input value={recibeNombre} onChange={(e) => setRecibeNombre(e.target.value)} className="h-10" />
              </div>
              <div>
                <Label className="text-xs">Cargo (opcional)</Label>
                <Input value={recibeCargo} onChange={(e) => setRecibeCargo(e.target.value)} className="h-10" />
              </div>
              <SignaturePad label="Firma del cliente" onSave={async (d) => { const url = await subirFirma.mutateAsync({ hojaId: hojaId!, tipo: "cliente", dataUrl: d }); setFirmaClienteUrl(url); }} />
              <SignaturePad label="Mi firma (chofer)" onSave={async (d) => { const url = await subirFirma.mutateAsync({ hojaId: hojaId!, tipo: "chofer", dataUrl: d }); setFirmaChoferUrl(url); }} />
              <div>
                <Label className="text-xs">Foto hoja sellada</Label>
                <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFoto(e.target.files[0])} />
                <Button variant="outline" className="w-full h-12" onClick={() => fotoRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" /> {fotoUrl ? "Foto capturada" : "Tomar foto"}
                </Button>
                {fotoUrl && <img src={fotoUrl} className="mt-2 max-h-32 rounded border" alt="Hoja" />}
              </div>
              <div>
                <Label className="text-xs">Notas (opcional)</Label>
                <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="h-16" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPOD(false)}>Cancelar</Button>
              <Button onClick={handleConfirmar} disabled={!recibeNombre || confirmar.isPending} className="bg-[#c41e3a] hover:bg-[#a01830] text-white">
                {confirmar.isPending ? "Confirmando..." : "Confirmar entrega"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fallida Dialog */}
        <Dialog open={showFallida} onOpenChange={setShowFallida}>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-red-700">Entrega fallida</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Motivo*</Label>
                <Select value={motivoFallida} onValueChange={setMotivoFallida}>
                  <SelectTrigger><SelectValue placeholder="Selecciona motivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente_no_disponible">Cliente no disponible</SelectItem>
                    <SelectItem value="direccion_incorrecta">Dirección incorrecta</SelectItem>
                    <SelectItem value="producto_danado">Producto dañado</SelectItem>
                    <SelectItem value="cliente_rechazo">Cliente rechazó</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Notas</Label>
                <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFallida(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleFallar} disabled={!motivoFallida || fallar.isPending}>
                {fallar.isPending ? "Registrando..." : "Registrar fallida"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
