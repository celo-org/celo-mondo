export enum WebhookProvider {
  Alchemy = 'alchemy',
  MultiBaas = 'multibaas',
}

export function getActiveWebhookProvider(): WebhookProvider {
  return (process.env.ACTIVE_WEBHOOK_PROVIDER as WebhookProvider) ?? WebhookProvider.MultiBaas;
}

export function isActiveWebhookProvider(provider: WebhookProvider): boolean {
  return getActiveWebhookProvider() === provider;
}
