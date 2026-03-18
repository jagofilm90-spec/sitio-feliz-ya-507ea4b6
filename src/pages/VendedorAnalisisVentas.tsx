import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VendedorVentasChart } from "@/components/vendedor/VendedorVentasChart";
import logoAlmasa from "@/assets/logo-almasa.png";

const VendedorAnalisisVentas = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/vendedor")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img 
              src={logoAlmasa} 
              alt="ALMASA" 
              className="h-10 object-contain"
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Análisis de Ventas
              </h1>
              <p className="text-sm text-muted-foreground">
                Estadísticas y tendencias de tus ventas
              </p>
            </div>
          </div>
        </div>

        {/* Chart Component */}
        <VendedorVentasChart />
      </main>
    </div>
  );
};

export default VendedorAnalisisVentas;
