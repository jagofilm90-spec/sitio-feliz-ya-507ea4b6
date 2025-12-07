// Force rebuild: 2025-12-07T15:01:00
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("🚀 [MAIN] Iniciando aplicación...");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ [MAIN] No se encontró el elemento root");
} else {
  console.log("✅ [MAIN] Elemento root encontrado, montando App...");
  createRoot(rootElement).render(<App />);
  console.log("✅ [MAIN] App montada exitosamente");
}
