/**
 * Environment configuration for the Photon messaging bridge.
 *
 * Credential env var names come straight from the spectrum-ts SDK's own
 * type definitions (node_modules/@spectrum-ts/core, @spectrum-ts/imessage,
 * @spectrum-ts/whatsapp-business) — see messaging/README.md for how each
 * one was verified.
 */

export type Channel = "imessage" | "whatsapp";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface ImessageClientConfig {
  address: string;
  token: string;
  phone: string;
}

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  appSecret?: string;
}

export interface Config {
  port: number;
  backendUrl: string;
  channel: Channel;
  /** Photon Cloud project credentials (Spectrum({projectId, projectSecret})). */
  projectId: string | undefined;
  projectSecret: string | undefined;
  /** Only used when channel === "imessage" and a self-hosted relay is configured. */
  imessageClient: ImessageClientConfig | undefined;
  /** Only used when channel === "whatsapp". */
  whatsapp: WhatsAppConfig | undefined;
  /** True only when everything required to attempt a live Spectrum() connection is present. */
  hasCredentials: boolean;
  inboundRetries: number;
  inboundRetryBaseMs: number;
}

export function loadConfig(): Config {
  const channel = (env("PHOTON_CHANNEL")?.toLowerCase() as Channel | undefined) ?? "imessage";
  const projectId = env("SPECTRUM_PROJECT_ID");
  const projectSecret = env("SPECTRUM_PROJECT_SECRET");

  const imessageAddress = env("PHOTON_IMESSAGE_ADDRESS");
  const imessageToken = env("PHOTON_IMESSAGE_TOKEN");
  const imessagePhone = env("PHOTON_IMESSAGE_PHONE");
  const imessageClient =
    imessageAddress && imessageToken && imessagePhone
      ? { address: imessageAddress, token: imessageToken, phone: imessagePhone }
      : undefined;

  const whatsappAccessToken = env("PHOTON_WHATSAPP_ACCESS_TOKEN");
  const whatsappPhoneNumberId = env("PHOTON_WHATSAPP_PHONE_NUMBER_ID");
  const whatsappAppSecret = env("PHOTON_WHATSAPP_APP_SECRET");
  const whatsapp =
    whatsappAccessToken && whatsappPhoneNumberId
      ? {
          accessToken: whatsappAccessToken,
          phoneNumberId: whatsappPhoneNumberId,
          ...(whatsappAppSecret ? { appSecret: whatsappAppSecret } : {}),
        }
      : undefined;

  // Spectrum() itself always needs projectId/projectSecret (Photon Cloud
  // project auth) regardless of which provider is configured. The channel's
  // own config (imessageClient / whatsapp) is additionally required when
  // that channel needs non-cloud-hosted credentials (whatsapp always does;
  // imessage's `clients` field is optional — omitting it means "use the
  // Photon Cloud-hosted iMessage number for this project").
  const hasCredentials = Boolean(
    projectId && projectSecret && (channel !== "whatsapp" || whatsapp),
  );

  return {
    port: envInt("PORT", 8787),
    backendUrl: env("BACKEND_URL") ?? "http://localhost:8000",
    channel,
    projectId,
    projectSecret,
    imessageClient,
    whatsapp,
    hasCredentials,
    inboundRetries: envInt("PHOTON_INBOUND_RETRIES", 4),
    inboundRetryBaseMs: envInt("PHOTON_INBOUND_RETRY_BASE_MS", 300),
  };
}
