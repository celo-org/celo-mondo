import { config } from 'src/config/config';

const github = 'https://github.com/celo-org/celo-mondo';
export const links = {
  home: 'https://mondo.celo.org',
  discord: 'https://discord.gg/celo',
  github,
  bug: github + '/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=',
  twitter: 'https://twitter.com/celo',
  docs: 'https://docs.celo.org',
  forum: 'https://forum.celo.org',
  governance: 'https://github.com/celo-org/governance',
  // Explorers
  celoscan: config.chain.testnet ? 'https://alfajores.celoscan.io/' : 'https://celoscan.io',
  celoscanApi: config.chain.testnet
    ? 'https://api-alfajores.celoscan.io/api'
    : 'https://api.celoscan.io',
  // Auto-activation
  upstash: 'https://qstash.upstash.io/v2/publish',
};
