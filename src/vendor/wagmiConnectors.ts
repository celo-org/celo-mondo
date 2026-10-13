// RainbowKit 2.x imports the `gemini` and `porto` connectors from
// `wagmi/connectors`, and wagmi 3.4.4+ no longer ships them. RainbowKit has not
// released a wagmi-v3-compatible version, so the bundlers resolve
// `wagmi/connectors` to this module instead: the real connectors plus inert
// stand-ins for the two removed factories. Mondo never lists the Gemini or
// Porto wallets, so the stand-ins are never invoked. Drop this file and the
// aliases in next.config.ts once RainbowKit supports wagmi v3.
export * from '@wagmi/connectors';

function removedConnector(name: string) {
  return () => {
    throw new Error(`The ${name} connector was removed from wagmi and is not available`);
  };
}

export const gemini = removedConnector('gemini');
export const porto = removedConnector('porto');
