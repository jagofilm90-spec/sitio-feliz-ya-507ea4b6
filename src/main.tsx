import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error });
};

// Global promise rejection handler
window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
};

const rootElement = document.getElementById("root");

if (rootElement) {
  try {
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error('Fatal error initializing app:', error);
    rootElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 24px;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
        background: #f8fafc;
      ">
        <div style="
          background: white;
          padding: 32px;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          max-width: 400px;
        ">
          <h1 style="color: #dc2626; margin: 0 0 16px 0; font-size: 24px;">
            Error al cargar la aplicación
          </h1>
          <p style="color: #64748b; margin: 0 0 24px 0; font-size: 14px;">
            Ocurrió un error inesperado. Por favor recarga la página para intentar de nuevo.
          </p>
          <button 
            onclick="window.location.reload()" 
            style="
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              cursor: pointer;
              font-weight: 500;
            "
          >
            Recargar página
          </button>
        </div>
      </div>
    `;
  }
} else {
  console.error('Root element not found');
}
