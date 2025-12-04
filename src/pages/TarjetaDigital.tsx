import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share2, Download, Phone, Mail, MapPin, Globe } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import logoAlmasa from "@/assets/logo-almasa.png";

interface UserProfile {
  full_name: string;
  email: string;
  phone: string | null;
}

interface Empleado {
  puesto: string;
}

const TarjetaDigital = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: empleadoData } = await supabase
        .from("empleados")
        .select("puesto")
        .eq("user_id", user.id)
        .single();

      if (empleadoData) {
        setEmpleado(empleadoData);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${profile?.full_name} - ALMASA`,
      text: `${profile?.full_name}\n${empleado?.puesto || "ALMASA"}\n📧 ${profile?.email}\n📞 ${profile?.phone || ""}\n🌐 almasa.com.mx`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(shareData.text);
      toast.success("Información copiada al portapapeles");
    }
  };

  const handleDownload = async () => {
    const cardElement = document.getElementById("business-card");
    if (!cardElement) return;

    try {
      const canvas = await html2canvas(cardElement, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
      });
      
      const link = document.createElement("a");
      link.download = `tarjeta-${profile?.full_name?.replace(/\s+/g, "-").toLowerCase() || "almasa"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Tarjeta descargada");
    } catch (error) {
      console.error("Error downloading card:", error);
      toast.error("Error al descargar la tarjeta");
    }
  };

  const handleSaveContact = () => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${profile?.full_name || "ALMASA"}
ORG:ABARROTES LA MANITA, S.A. DE C.V.
TITLE:${empleado?.puesto || ""}
TEL;TYPE=WORK,VOICE:${profile?.phone || "+52 55 1234 5678"}
EMAIL:${profile?.email || "contacto@almasa.com.mx"}
URL:https://almasa.com.mx
ADR;TYPE=WORK:;;Melchor Campo #59;Ciudad de México;;México
END:VCARD`;

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${profile?.full_name?.replace(/\s+/g, "-").toLowerCase() || "contacto"}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Contacto guardado");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center">
        <div className="animate-pulse text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex flex-col items-center justify-center p-4">
      {/* Digital Business Card */}
      <div 
        id="business-card"
        className="w-full max-w-sm"
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 shadow-2xl rounded-3xl border-0">
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-red-700 to-red-600 px-6 pt-8 pb-12 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-lg flex items-center justify-center">
                <img src={logoAlmasa} alt="ALMASA" className="w-12 h-12 object-contain" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-wide">ALMASA</h1>
                <p className="text-red-200 text-xs">Abarrotes La Manita, S.A. de C.V.</p>
              </div>
            </div>
          </div>

          {/* Profile Section */}
          <div className="px-6 -mt-6 relative z-10">
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {profile?.full_name || "Nombre del Empleado"}
              </h2>
              <p className="text-red-600 font-medium text-sm mb-4">
                {empleado?.puesto || "ALMASA"}
              </p>

              <div className="space-y-3">
                {profile?.email && (
                  <a 
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-3 text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <Mail className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-sm">{profile.email}</span>
                  </a>
                )}

                {profile?.phone && (
                  <a 
                    href={`tel:${profile.phone}`}
                    className="flex items-center gap-3 text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <Phone className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-sm">{profile.phone}</span>
                  </a>
                )}

                <a 
                  href="https://almasa.com.mx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-600 hover:text-red-600 transition-colors"
                >
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                    <Globe className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-sm">almasa.com.mx</span>
                </a>

                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-sm">Ciudad de México, México</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 text-center">
            <p className="text-xs text-gray-400">Comercializadora de Abarrotes</p>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6 w-full max-w-sm">
        <Button
          onClick={handleSaveContact}
          className="flex-1 bg-white text-red-700 hover:bg-gray-100 shadow-lg"
        >
          <Download className="h-4 w-4 mr-2" />
          Guardar
        </Button>
        <Button
          onClick={handleDownload}
          className="flex-1 bg-white/20 text-white hover:bg-white/30 border border-white/30"
        >
          <Download className="h-4 w-4 mr-2" />
          Imagen
        </Button>
        <Button
          onClick={handleShare}
          className="flex-1 bg-white text-red-700 hover:bg-gray-100 shadow-lg"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </Button>
      </div>

      {/* Back to App */}
      <Button
        variant="ghost"
        className="mt-6 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => window.history.back()}
      >
        ← Volver al sistema
      </Button>
    </div>
  );
};

export default TarjetaDigital;
