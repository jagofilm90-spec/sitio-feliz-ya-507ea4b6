import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoAlmasa from "@/assets/logo-almasa.png";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <img src={logoAlmasa} alt="ALMASA" className="h-20 mx-auto" />
        <h1 className="text-4xl font-bold text-foreground">404 — Página no encontrada</h1>
        <p className="text-lg text-muted-foreground">La página que buscas no existe o fue movida</p>
        <Button variant="default" size="lg" onClick={() => navigate("/auth")}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
