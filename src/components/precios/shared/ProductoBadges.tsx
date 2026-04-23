import { Badge } from "@/components/ui/badge";

interface PromocionBadgeProps {
  es_promocion?: boolean | null;
  inline?: boolean;
}

export function PromocionBadge({ es_promocion, inline }: PromocionBadgeProps) {
  if (!es_promocion) return null;
  return (
    <Badge variant="secondary" className={`text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 shrink-0${inline ? " ml-1 inline-flex" : ""}`}>
      PROMO
    </Badge>
  );
}

interface ImpuestoBadgesProps {
  aplica_iva?: boolean | null;
  aplica_ieps?: boolean | null;
  showDash?: boolean;
}

export function ImpuestoBadges({ aplica_iva, aplica_ieps, showDash }: ImpuestoBadgesProps) {
  if (!aplica_iva && !aplica_ieps) {
    return showDash ? <span className="text-[9px] text-muted-foreground">—</span> : null;
  }
  return (
    <>
      {aplica_iva && (
        <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-blue-300 text-blue-600 shrink-0">IVA</Badge>
      )}
      {aplica_ieps && (
        <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-orange-300 text-orange-600 shrink-0">IEPS</Badge>
      )}
    </>
  );
}
