import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CreditCard, 
  Building2, 
  MapPin, 
  Car, 
  Baby, 
  FileCheck,
  File,
  Shield
} from "lucide-react";

interface DatosExtraidos {
  [key: string]: string | null | undefined;
}

interface DocumentoDetectado {
  tipo: string;
  nombre_documento: string;
  paginas: string;
  confianza: "alta" | "media" | "baja";
  datos_extraidos: DatosExtraidos;
  tipo_info?: {
    id: string;
    name: string;
    fields: string[];
  };
}

interface DocumentDetectionCardProps {
  documento: DocumentoDetectado;
  isSelected: boolean;
  onToggleSelect: () => void;
  selectedFields: string[];
  onToggleField: (field: string) => void;
}

const DOCUMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  constancia_situacion_fiscal: Building2,
  carta_seguro_social: Shield,
  ine: CreditCard,
  curp: CreditCard,
  comprobante_domicilio: MapPin,
  licencia_conducir: Car,
  acta_nacimiento: Baby,
  contrato_laboral: FileCheck,
  aviso_privacidad: FileText,
  otro: File,
};

const FIELD_LABELS: Record<string, string> = {
  rfc: "RFC",
  curp: "CURP",
  nombre_completo: "Nombre Completo",
  numero_seguro_social: "Número de Seguro Social",
  fecha_nacimiento: "Fecha de Nacimiento",
  direccion: "Dirección",
  calle: "Calle",
  numero_exterior: "Número Exterior",
  numero_interior: "Número Interior",
  colonia: "Colonia",
  codigo_postal: "Código Postal",
  municipio: "Municipio",
  estado: "Estado",
  sexo: "Sexo",
  lugar_nacimiento: "Lugar de Nacimiento",
  nombre_padre: "Nombre del Padre",
  nombre_madre: "Nombre de la Madre",
  numero_licencia: "Número de Licencia",
  fecha_vencimiento: "Fecha de Vencimiento",
  tipo_licencia: "Tipo de Licencia",
  fecha_contrato: "Fecha de Contrato",
  puesto: "Puesto",
  tipo_contrato: "Tipo de Contrato",
  regimen_fiscal: "Régimen Fiscal",
  clave_elector: "Clave de Elector",
};

const CONFIANZA_COLORS = {
  alta: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  media: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  baja: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function DocumentDetectionCard({
  documento,
  isSelected,
  onToggleSelect,
  selectedFields,
  onToggleField,
}: DocumentDetectionCardProps) {
  const Icon = DOCUMENT_ICONS[documento.tipo] || File;
  const datosExtraidos = documento.datos_extraidos || {};
  const camposConValor = Object.entries(datosExtraidos).filter(
    ([_, value]) => value !== null && value !== undefined && value !== ""
  );

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-primary' : 'opacity-75'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={isSelected} 
              onCheckedChange={onToggleSelect}
              id={`doc-${documento.tipo}-${documento.paginas}`}
            />
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">
              {documento.nombre_documento || documento.tipo_info?.name || documento.tipo}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Págs. {documento.paginas}
            </Badge>
            <Badge className={`text-xs ${CONFIANZA_COLORS[documento.confianza]}`}>
              {documento.confianza === 'alta' ? 'Alta' : documento.confianza === 'media' ? 'Media' : 'Baja'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {camposConValor.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Datos extraídos:</p>
            <div className="grid gap-2">
              {camposConValor.map(([campo, valor]) => (
                <div 
                  key={campo} 
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                >
                  <Checkbox 
                    checked={selectedFields.includes(campo)}
                    onCheckedChange={() => onToggleField(campo)}
                    id={`field-${documento.tipo}-${campo}`}
                    disabled={!isSelected}
                  />
                  <label 
                    htmlFor={`field-${documento.tipo}-${campo}`}
                    className={`flex-1 text-sm ${!isSelected ? 'opacity-50' : ''}`}
                  >
                    <span className="font-medium">{FIELD_LABELS[campo] || campo}:</span>{" "}
                    <span className="text-muted-foreground">{valor}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No se extrajeron datos de este documento
          </p>
        )}
      </CardContent>
    </Card>
  );
}
