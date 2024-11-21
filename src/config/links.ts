import { config } from 'src/config/config';

export const links = {
  home: 'https://mondo.celo.org',
  celo: 'https://celo.org',
  discord: 'https://discord.gg/celo',
  github: 'https://github.com/celo-org/celo-mondo',
  twitter: 'https://twitter.com/celo',
  docs: 'https://docs.celo.org',
  forum: 'https://forum.celo.org',
  governance: 'https://github.com/celo-org/governance',
  delegate: 'https://github.com/celo-org/celo-mondo/blob/main/src/config/delegates.json',
  // Explorers
  blockscout: 'https://explorer.celo.org',
  celoscan: config.isAlfajores ? 'https://alfajores.celoscan.io/' : 'https://celoscan.io',
  celoscanApi: config.isAlfajores
    ? 'https://api-alfajores.celoscan.io/api'
    : 'https://api.celoscan.io',
  // Auto-activation
  upstash: 'https://qstash.upstash.io/v2/publish',
};
