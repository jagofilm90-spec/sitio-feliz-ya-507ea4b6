import { CreditCard, ChevronRight, ChevronLeft, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PasoCreditoProps {
  terminoCredito: string;
  notas: string;
  clienteDefaultCredito: string;
  totales: { total: number; pesoTotalKg: number; totalUnidades: number };
  onTerminoCreditoChange: (term: string) => void;
  onNotasChange: (notas: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const CREDIT_OPTIONS = [
  { value: "contado", label: "Contado", description: "Pago inmediato al entregar" },
  { value: "8_dias", label: "8 días", description: "Crédito a 8 días naturales" },
  { value: "15_dias", label: "15 días", description: "Crédito a 15 días naturales" },
  { value: "30_dias", label: "30 días", description: "Crédito a 30 días naturales" },
  { value: "60_dias", label: "60 días", description: "Crédito a 60 días naturales" },
];

export function PasoCredito({
  terminoCredito,
  notas,
  clienteDefaultCredito,
  totales,
  onTerminoCreditoChange,
  onNotasChange,
  onNext,
  onBack,
}: PasoCreditoProps) {
  const isDifferentFromDefault = terminoCredito !== clienteDefaultCredito;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Condiciones de pago
        </h2>
        <p className="text-muted-foreground">
          Selecciona el plazo de crédito y agrega notas si es necesario
        </p>
      </div>

      {/* Order Summary Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{totales.totalUnidades} productos • {totales.pesoTotalKg.toLocaleString()} kg</span>
            <span className="font-bold text-lg text-primary">{formatCurrency(totales.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Credit Term Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Plazo de crédito
          {isDifferentFromDefault && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
              Diferente al default
            </Badge>
          )}
        </Label>
        <div className="grid gap-2">
          {CREDIT_OPTIONS.map((option) => {
            const isSelected = terminoCredito === option.value;
            const isDefault = clienteDefaultCredito === option.value;
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onTerminoCreditoChange(option.value)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                {isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Default cliente
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Different from default warning */}
      {isDifferentFromDefault && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Plazo diferente al configurado
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              El cliente tiene "{clienteDefaultCredito.replace('_', ' ')}" como plazo predeterminado. 
              Este pedido usará "{terminoCredito.replace('_', ' ')}".
            </p>
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="space-y-2">
        <Label className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Notas de entrega
          <span className="text-muted-foreground font-normal text-sm">(opcional)</span>
        </Label>
        <Textarea
          placeholder="Instrucciones especiales para la entrega, horarios, contacto..."
          value={notas}
          onChange={(e) => onNotasChange(e.target.value)}
          className="min-h-[100px] resize-none"
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} size="lg" className="h-12">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button 
          onClick={onNext} 
          size="lg"
          className="flex-1 h-12 font-semibold"
        >
          Revisar pedido
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
