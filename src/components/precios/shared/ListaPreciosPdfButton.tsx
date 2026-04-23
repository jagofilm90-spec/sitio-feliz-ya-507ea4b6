import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ListaPreciosPdfButtonProps {
  onClick: () => void;
  className?: string;
}

export function ListaPreciosPdfButton({ onClick, className }: ListaPreciosPdfButtonProps) {
  return (
    <Button size="sm" variant="outline" className={className} onClick={onClick}>
      <Download className="h-4 w-4 mr-1" /> PDF
    </Button>
  );
}
