import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("🚀 [MAIN] Iniciando aplicación...");
console.log("🚀 [MAIN] Timestamp:", new Date().toISOString());

const rootElement = document.getElementById("root");
console.log("🚀 [MAIN] Root element encontrado:", !!rootElement);

if (rootElement) {
  createRoot(rootElement).render(<App />);
  console.log("🚀 [MAIN] App renderizada correctamente");
} else {
  console.error("❌ [MAIN] ERROR: No se encontró el elemento root");
}
