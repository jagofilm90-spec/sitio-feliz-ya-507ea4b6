import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";

/** Props for getCfdiStatusBadge */
export interface CfdiStatusBadgeProps {
  cfdi_estado: string | null;
  cfdi_error?: string | null;
}

/**
 * Renders a CFDI status badge based on cfdi_estado.
 * - timbrada: green (functional semaphore)
 * - cancelada: neutral gray
 * - error: red destructive with tooltip showing cfdi_error
 * - null/other: outline "Sin timbrar"
 */
export function getCfdiStatusBadge(cfdi_estado: string | null, cfdi_error?: string | null) {
  if (cfdi_estado === "timbrada") {
    return (
      <Badge className="gap-1 bg-green-500 hover:bg-green-600">
        <CheckCircle className="h-3 w-3" /> Timbrada
      </Badge>
    );
  }
  if (cfdi_estado === "cancelada") {
    return (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3 w-3" /> Cancelada
      </Badge>
    );
  }
  if (cfdi_estado === "error") {
    return (
      <Badge variant="destructive" className="gap-1" title={cfdi_error || undefined}>
        <AlertCircle className="h-3 w-3" /> Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" /> Sin timbrar
    </Badge>
  );
}
