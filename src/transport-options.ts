import type { Dispatcher } from 'undici';

/**
 * Immutable transport options for configuring HTTP connections.
 */
export interface TransportOptions {
  defaultHeaders?: Record<string, string>;
  caCertPath?: string;
  insecure?: boolean;
  proxyUrl?: string;
}

/**
 * Builds an undici dispatcher (Agent or ProxyAgent) from transport options.
 *
 * Returns undefined if no custom TLS or proxy settings are needed.
 */
export async function buildDispatcher(
  transportOptions?: TransportOptions,
): Promise<Dispatcher | undefined> {
  if (
    !transportOptions?.insecure &&
    !transportOptions?.caCertPath &&
    !transportOptions?.proxyUrl
  ) {
    return undefined;
  }

  const connectOpts: Record<string, unknown> = {};
  if (transportOptions.insecure) {
    connectOpts.rejectUnauthorized = false;
  }
  if (transportOptions.caCertPath) {
    const { readFileSync } = await import('node:fs');
    const tls = await import('node:tls');
    const customCa = readFileSync(transportOptions.caCertPath, 'utf-8');
    connectOpts.ca = [...(tls.rootCertificates ?? []), customCa];
  }
  if (transportOptions.proxyUrl) {
    const { ProxyAgent } = await import('undici');
    const proxyOpts: { uri: string; requestTls?: Record<string, unknown> } = {
      uri: transportOptions.proxyUrl,
    };
    if (Object.keys(connectOpts).length > 0) {
      proxyOpts.requestTls = connectOpts;
    }
    return new ProxyAgent(proxyOpts);
  } else {
    const { Agent } = await import('undici');
    return new Agent({ connect: connectOpts });
  }
}
