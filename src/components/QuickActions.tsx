import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShoppingCart, ClipboardList } from "lucide-react";

export function QuickActions() {
  const { isAdmin, isSecretaria } = useUserRoles();
  const navigate = useNavigate();

  // Count pending authorizations
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["quick-pending-auth"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("status", "por_autorizar");
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 30000,
    enabled: isAdmin || isSecretaria,
  });

  if (!isAdmin && !isSecretaria) return null;

  return (
    <div className="hidden md:flex items-center gap-1.5">
      {(isAdmin || isSecretaria) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 relative cursor-pointer"
          onClick={() => navigate("/pedidos")}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Autorizar
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="h-4 min-w-4 px-1 text-[10px] font-bold absolute -top-1 -right-1 flex items-center justify-center"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      )}

      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 cursor-pointer"
          onClick={() => navigate("/pedidos")}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Pedidos
        </Button>
      )}

      {isSecretaria && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 cursor-pointer"
          onClick={() => navigate("/compras")}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Compras
        </Button>
      )}
    </div>
  );
}
