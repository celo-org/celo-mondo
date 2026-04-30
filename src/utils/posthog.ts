const EVM_ADDRESS_IN_PATH_RE = /0x[a-fA-F0-9]{40}/gi;
const REPLACEMENT = '[address]';

const SCRUBBED_URL_PROPS = ['$current_url', '$pathname', '$referrer', '$initial_referrer'] as const;

export function scrubAddressesFromUrl(url: string): string {
  return url.replace(EVM_ADDRESS_IN_PATH_RE, REPLACEMENT);
}

export function scrubEventUrlProperties(properties: Record<string, unknown>): void {
  for (const prop of SCRUBBED_URL_PROPS) {
    const value = properties[prop];
    if (typeof value === 'string') {
      properties[prop] = scrubAddressesFromUrl(value);
    }
  }
}
