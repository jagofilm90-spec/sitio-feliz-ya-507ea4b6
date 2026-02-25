import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, X } from "lucide-react";

interface CameraQrScannerProps {
  onScan: (decodedText: string) => void;
  active: boolean;
  onClose: () => void;
}

export const CameraQrScanner = ({ onScan, active, onClose }: CameraQrScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerId = useId().replace(/:/g, "-");
  const containerId = `qr-reader-${scannerId}`;

  useEffect(() => {
    if (!active) return;

    let isMounted = true;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    const onScanSuccess = (decodedText: string) => onScan(decodedText);

    const startScanner = async () => {
      setError(null);

      try {
        await scanner.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          () => {}
        );
        return;
      } catch {
        // Fallback para dispositivos/navegadores donde facingMode no resuelve cámara
      }

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!isMounted) return;
        if (cameras.length === 0) throw new Error("No cameras found");

        const preferredCamera =
          cameras.find((c) => /back|rear|trasera|environment/i.test(c.label)) || cameras[0];

        await scanner.start(
          preferredCamera.id,
          config,
          onScanSuccess,
          () => {}
        );
      } catch (err) {
        console.error("Camera error:", err);
        if (isMounted) {
          setError("No se pudo acceder a la cámara. Verifica permisos del navegador.");
        }
      }
    };

    void startScanner();

    return () => {
      isMounted = false;
      const currentScanner = scannerRef.current;
      scannerRef.current = null;

      if (currentScanner) {
        currentScanner
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              currentScanner.clear();
            } catch {
              // ignore cleanup errors
            }
          });
      }
    };
  }, [active, containerId, onScan]);

  if (!active) return null;

  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-primary/30 bg-black">
      <div className="flex items-center justify-between bg-background/90 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Camera className="h-4 w-4 text-primary" />
          Escáner de Cámara
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div id={containerId} className="w-full" style={{ minHeight: 280 }} />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-4">
          <div className="text-center space-y-2">
            <CameraOff className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
