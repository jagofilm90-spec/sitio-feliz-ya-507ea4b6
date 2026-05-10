// ============================================
// PAC PROVIDER INTERFACE
// Estándar para cualquier PAC certificado SAT
// Patrón: Strategy Pattern (Gang of Four)
// ============================================

export interface CSDCredentials {
  certificadoBase64: string;
  llaveBase64: string;
  passwordCSD: string;
}

export interface PACCredentials {
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  csd?: CSDCredentials;
}

export interface PACConfig {
  providerId: string;
  modo: "sandbox" | "produccion";
  rfcEmisor: string;
  razonSocialEmisor: string;
  regimenFiscalEmisor: string;
  credentials: PACCredentials;
}

export interface TimbreRequest {
  cartaPorteId: string;
  xmlSinTimbrar: string;
}

export interface TimbreResult {
  exitoso: boolean;
  uuid?: string;
  fechaTimbrado?: string;
  selloSat?: string;
  noCertificadoSAT?: string;
  selloCFD?: string;
  cadenaOriginal?: string;
  xmlTimbrado?: string;
  pdfBase64?: string;
  codigoError?: string;
  mensajeError?: string;
  detalles?: any;
  rawResponse?: any;
}

export interface CancelacionRequest {
  uuid: string;
  motivo: "01" | "02" | "03" | "04";
  uuidSustituto?: string;
}

export interface CancelacionResult {
  exitoso: boolean;
  uuidCancelacion?: string;
  fechaCancelacion?: string;
  codigoError?: string;
  mensajeError?: string;
}

export interface SaldoResult {
  timbresDisponibles: number;
  timbresUsados: number;
  fechaConsulta: string;
}

export interface PACProvider {
  readonly providerId: string;
  readonly nombre: string;
  probarConexion(config: PACConfig): Promise<{ exitoso: boolean; mensaje: string }>;
  timbrar(config: PACConfig, request: TimbreRequest): Promise<TimbreResult>;
  cancelar(config: PACConfig, request: CancelacionRequest): Promise<CancelacionResult>;
  consultarSaldo(config: PACConfig): Promise<SaldoResult>;
}
