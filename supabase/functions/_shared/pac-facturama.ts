import {
  PACProvider,
  PACConfig,
  TimbreRequest,
  TimbreResult,
  CancelacionRequest,
  CancelacionResult,
  SaldoResult,
} from "./pac-types.ts";

export class FacturamaAdapter implements PACProvider {
  readonly providerId = "facturama";
  readonly nombre = "Facturama";

  private getBaseUrl(modo: "sandbox" | "produccion"): string {
    return modo === "sandbox"
      ? "https://apisandbox.facturama.mx"
      : "https://api.facturama.mx";
  }

  private getAuthHeader(config: PACConfig): string {
    const username = config.credentials.username || "";
    const password = config.credentials.password || "";
    return `Basic ${btoa(`${username}:${password}`)}`;
  }

  async probarConexion(
    config: PACConfig
  ): Promise<{ exitoso: boolean; mensaje: string }> {
    try {
      const response = await fetch(
        `${this.getBaseUrl(config.modo)}/api-lite/account`,
        {
          method: "GET",
          headers: {
            Authorization: this.getAuthHeader(config),
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          exitoso: true,
          mensaje: `Conectado. RFC: ${data.Rfc || "N/A"}, Plan: ${data.Plan || "N/A"}`,
        };
      } else {
        const text = await response.text();
        return { exitoso: false, mensaje: `Error ${response.status}: ${text}` };
      }
    } catch (error) {
      return { exitoso: false, mensaje: `Error de red: ${error.message}` };
    }
  }

  async timbrar(config: PACConfig, request: TimbreRequest): Promise<TimbreResult> {
    try {
      const xmlBase64 = btoa(unescape(encodeURIComponent(request.xmlSinTimbrar)));

      const response = await fetch(
        `${this.getBaseUrl(config.modo)}/api-lite/3/cfdis`,
        {
          method: "POST",
          headers: {
            Authorization: this.getAuthHeader(config),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ Content: xmlBase64 }),
        }
      );

      const data = await response.json();

      if (response.ok && data.Complement?.TaxStamp?.Uuid) {
        return {
          exitoso: true,
          uuid: data.Complement.TaxStamp.Uuid,
          fechaTimbrado: data.Complement.TaxStamp.Date,
          selloSat: data.Complement.TaxStamp.SatSign,
          noCertificadoSAT: data.Complement.TaxStamp.SatCertNumber,
          xmlTimbrado: data.Content ? decodeURIComponent(escape(atob(data.Content))) : undefined,
          rawResponse: data,
        };
      } else {
        return {
          exitoso: false,
          codigoError: data.Code || `HTTP_${response.status}`,
          mensajeError: data.Message || JSON.stringify(data),
          detalles: data,
          rawResponse: data,
        };
      }
    } catch (error) {
      return {
        exitoso: false,
        codigoError: "NETWORK_ERROR",
        mensajeError: `Error de red: ${error.message}`,
      };
    }
  }

  async cancelar(
    config: PACConfig,
    request: CancelacionRequest
  ): Promise<CancelacionResult> {
    try {
      const response = await fetch(
        `${this.getBaseUrl(config.modo)}/api-lite/cfdis/${request.uuid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: this.getAuthHeader(config),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Motive: request.motivo,
            UuidReplacement: request.uuidSustituto || undefined,
          }),
        }
      );

      if (response.ok || response.status === 200) {
        const data = await response.json();
        return {
          exitoso: true,
          uuidCancelacion: data.Uuid || request.uuid,
          fechaCancelacion: new Date().toISOString(),
        };
      } else {
        const data = await response.json().catch(() => ({}));
        return {
          exitoso: false,
          codigoError: data.Code || `HTTP_${response.status}`,
          mensajeError: data.Message || "Error de cancelación",
        };
      }
    } catch (error) {
      return {
        exitoso: false,
        codigoError: "NETWORK_ERROR",
        mensajeError: error.message,
      };
    }
  }

  async consultarSaldo(config: PACConfig): Promise<SaldoResult> {
    try {
      const response = await fetch(
        `${this.getBaseUrl(config.modo)}/api-lite/account`,
        {
          method: "GET",
          headers: { Authorization: this.getAuthHeader(config) },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          timbresDisponibles: data.AvailableStamps ?? data.Credits ?? 999,
          timbresUsados: data.UsedStamps ?? 0,
          fechaConsulta: new Date().toISOString(),
        };
      }

      return { timbresDisponibles: 0, timbresUsados: 0, fechaConsulta: new Date().toISOString() };
    } catch {
      return { timbresDisponibles: 0, timbresUsados: 0, fechaConsulta: new Date().toISOString() };
    }
  }
}
