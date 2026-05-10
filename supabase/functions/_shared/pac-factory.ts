import { PACProvider } from "./pac-types.ts";
import { FacturamaAdapter } from "./pac-facturama.ts";

export class PACFactory {
  static createProvider(providerId: string): PACProvider {
    switch (providerId) {
      case "facturama":
        return new FacturamaAdapter();
      // Future:
      // case 'finkok': return new FinkokAdapter();
      // case 'sw_sapien': return new SWSapienAdapter();
      default:
        throw new Error(`PAC provider '${providerId}' no implementado`);
    }
  }

  static getProvidersDisponibles(): string[] {
    return ["facturama"];
  }
}
