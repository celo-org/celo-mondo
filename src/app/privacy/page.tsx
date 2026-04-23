import type { Metadata } from 'next';
import Link from 'next/link';
import { A_Blank } from 'src/components/buttons/A_Blank';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Celo Mondo collects, uses, and protects your data.',
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 font-serif text-xl font-semibold sm:text-2xl">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-5 font-semibold">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 leading-relaxed text-gray-700">{children}</p>;
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="border border-gray-200 px-3 py-2 align-top">{children}</td>;
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: April 2026</p>
      <p className="mt-1 text-sm text-gray-500">
        Applies to:{' '}
        <A_Blank href="https://mondo.celo.org" className="underline">
          mondo.celo.org
        </A_Blank>
      </p>

      {/* 1 */}
      <H2>1. Who we are</H2>
      <P>
        Celo Mondo (<code>mondo.celo.org</code>) is an open-source staking and governance interface
        for the Celo blockchain, maintained by Celo Org. Source code is publicly available at{' '}
        <A_Blank href="https://github.com/celo-org/celo-mondo" className="underline">
          github.com/celo-org/celo-mondo
        </A_Blank>
        .
      </P>

      {/* 2 */}
      <H2>2. What data we collect and why</H2>

      <H3>2.1 Usage analytics (PostHog)</H3>
      <P>
        We use PostHog (hosted in the EU at <code>eu.i.posthog.com</code>) to understand how the
        application is used. PostHog is configured with the following privacy settings:
      </P>
      <ul className="mb-3 list-disc space-y-1 pl-5 text-gray-700">
        <li>
          <strong>No persistent identity profiles.</strong> PostHog never creates a profile tied to
          you across sessions.
        </li>
        <li>
          <strong>Session-scoped only.</strong> All PostHog state is stored in{' '}
          <code>sessionStorage</code>, which is cleared when you close the tab. There are no
          analytics cookies.
        </li>
        <li>
          <strong>No IP address.</strong> Your IP address is deleted from every event before it
          leaves your browser.
        </li>
        <li>
          <strong>Wallet addresses scrubbed from URLs.</strong> Any EVM address in page URLs,
          referrers, and pathnames is replaced with <code>[address]</code> before being sent to
          PostHog.
        </li>
        <li>
          <strong>Wallet dialogs excluded.</strong> The wallet connection dialog is excluded from
          autocapture.
        </li>
        <li>
          <strong>Text and attributes masked in autocapture.</strong> Text content and HTML
          attributes are not captured by autocapture events.
        </li>
        <li>
          <strong>Session replay input masking.</strong> Input fields are masked by default in
          session recordings. Other on-screen content (text, amounts, addresses) is visible in
          replays and is used solely for product improvement.
        </li>
      </ul>
      <P>
        PostHog receives page views, page-leave events, clicks on UI elements (autocapture), session
        recordings (with input fields masked), and the custom events listed below. All events are
        anonymous.
      </P>
      <Table>
        <thead>
          <tr>
            <Th>Event</Th>
            <Th>Properties sent</Th>
          </tr>
        </thead>
        <tbody>
          {[
            ['bridge_clicked', 'Bridge name'],
            ['wallet_connected', 'Wallet type (e.g. "MetaMask")'],
            ['wallet_disconnected', '(none)'],
            ['stake_completed', 'Action type, CELO amount, validator group address'],
            ['lock_completed', 'Action type, CELO amount'],
            ['vote_completed', 'Proposal ID, vote type'],
            ['upvote_completed', 'Proposal ID'],
            ['delegate_completed', 'Action type, delegation percentage'],
            ['account_created', '(none)'],
            ['nav_clicked', 'Navigation item label'],
            ['mode_toggled', 'Mode (CELO / stCELO)'],
            ['proposal_viewed', 'Proposal ID, stage'],
            ['proposal_filter_changed', 'Filter value'],
            ['vote_button_clicked', 'Proposal ID, vote type'],
            ['validator_group_viewed', 'Validator group address and name'],
            ['stake_button_clicked', 'Validator group address (optional)'],
            ['stake_menu_clicked', 'Action type, validator group address'],
            ['delegatee_viewed', 'Delegatee address and name'],
            ['delegate_button_clicked', 'Delegatee address (optional)'],
            ['register_delegatee_clicked', '(none)'],
            ['external_link_clicked', 'URL, context'],
          ].map(([event, props]) => (
            <tr key={event}>
              <Td>
                <code>{event}</code>
              </Td>
              <Td>{props}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <P>
        <strong>Your own wallet address is never included in any analytics event.</strong> Validator
        group addresses and delegatee addresses that appear in some events are public on-chain
        addresses.
      </P>

      <H3>2.2 Internal analytics database</H3>
      <P>
        Every analytics event listed in §2.1 is also stored in our own PostgreSQL database. Each
        record contains a random session ID (a UUIDv4 scoped to your browser tab session), the event
        name, event properties, and a timestamp. No wallet address, IP address, or persistent
        cross-session identifier is stored.
      </P>

      <H3>2.3 Geo-restriction check</H3>
      <P>
        When you connect a wallet, your request is sent to our <code>/police</code> endpoint. This
        uses Vercel&apos;s geo-enrichment headers to determine your country and region (ISO 3166
        codes). No IP address is stored — only the country/region is logged transiently. Access is
        blocked (HTTP 451) for visitors from North Korea, Iran, Cuba, Syria, and Russian-occupied
        territories of Ukraine (Crimea, Luhansk, Donetsk) as required by applicable sanctions law.
      </P>

      <H3>2.4 OFAC sanctions screening</H3>
      <P>
        When you connect a wallet, your wallet address is checked against the OFAC Specially
        Designated Nationals list. This check is performed entirely in your browser — your wallet
        address is never sent to any external server for this purpose. The sanctions list is
        downloaded from a public GitHub URL and cached in your browser&apos;s{' '}
        <code>localStorage</code> for 24 hours.
      </P>

      <H3>2.5 Celo name resolution (namespace.ninja)</H3>
      <P>
        To display human-readable names next to wallet addresses in the UI, displayed wallet
        addresses are sent to a GraphQL endpoint operated by Namespace (
        <code>celo-indexer-reader.namespace.ninja</code>). This is a read-only lookup. Resolved
        names are cached in your browser&apos;s <code>localStorage</code> (key:{' '}
        <code>celonames_cache</code>) with no expiry. Only addresses actively displayed in the UI
        are queried.
      </P>

      <H3>2.6 Staking auto-activation (Upstash)</H3>
      <P>
        When you stake CELO, a delayed activation job is scheduled via Upstash QStash. The following
        data is sent to Upstash: your wallet address, the validator group address, and the
        transaction hash. This data is used solely to trigger the required on-chain{' '}
        <code>activateForAccount</code> call approximately 24 hours after staking. Upstash is
        governed by the{' '}
        <A_Blank href="https://upstash.com/trust/privacy.pdf" className="underline">
          Upstash Privacy Policy
        </A_Blank>
        .
      </P>

      <H3>2.7 stCELO Cloud Functions</H3>
      <P>
        For stCELO <code>withdraw</code> and <code>claim</code> operations, your wallet address is
        sent as <code>beneficiary</code> to a Celo-operated Cloud Function at{' '}
        <code>us-central1-staked-celo-bot.cloudfunctions.net</code>. This is used to trigger the
        relevant on-chain transaction on your behalf.
      </P>

      <H3>2.8 Wallet connection (WalletConnect / RainbowKit)</H3>
      <P>
        Wallet connectivity is handled by RainbowKit and WalletConnect. When connecting via
        WalletConnect, session data (wallet type, chain ID, connection session) is relayed through
        WalletConnect&apos;s servers. This is governed by the{' '}
        <A_Blank href="https://walletconnect.com/privacy" className="underline">
          WalletConnect Privacy Policy
        </A_Blank>
        .
      </P>

      <H3>2.9 Delegate registration</H3>
      <P>
        If you choose to register as a governance delegate, you submit your name, wallet address,
        image, website, Twitter handle, and bio. This data is submitted as a pull request to the
        public{' '}
        <A_Blank href="https://github.com/celo-org/governance" className="underline">
          celo-org/governance
        </A_Blank>{' '}
        GitHub repository and becomes publicly visible.
      </P>

      {/* 3 */}
      <H2>3. What we do not collect</H2>
      <ul className="mb-3 list-disc space-y-1 pl-5 text-gray-700">
        <li>
          <strong>Your wallet address</strong> is never sent to PostHog, stored in our analytics
          database, or logged server-side.
        </li>
        <li>
          <strong>Private keys or seed phrases</strong> — the application never requests, handles,
          or transmits these.
        </li>
        <li>
          <strong>Cookies</strong> — no cookies are set by this application. PostHog is configured
          to use <code>sessionStorage</code> instead of cookies.
        </li>
        <li>
          <strong>Cross-session tracking</strong> — session identifiers are stored only in{' '}
          <code>sessionStorage</code> and are cleared when you close the tab.
        </li>
      </ul>

      {/* 4 */}
      <H2>4. Local storage used by this application</H2>
      <Table>
        <thead>
          <tr>
            <Th>Storage</Th>
            <Th>Key</Th>
            <Th>Contents</Th>
            <Th>Cleared</Th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              'sessionStorage',
              'analytics_session_id',
              'Random UUIDv4 (anonymous session token)',
              'On tab close',
            ],
            ['sessionStorage', 'PostHog SDK state', 'Anonymous PostHog SDK data', 'On tab close'],
            ['sessionStorage', 'mode', 'Staking mode preference (CELO / stCELO)', 'On tab close'],
            [
              'localStorage',
              'celonames_cache',
              'Map of wallet address → Celo name',
              'Manual clear only',
            ],
            ['localStorage', 'OFAC list URL', 'Cached OFAC sanctions address list', '24-hour TTL'],
            ['localStorage', 'theme', 'UI theme preference (dark/light)', 'Manual clear only'],
          ].map(([storage, key, contents, cleared]) => (
            <tr key={key}>
              <Td>
                <code>{storage}</code>
              </Td>
              <Td>
                <code>{key}</code>
              </Td>
              <Td>{contents}</Td>
              <Td>{cleared}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* 5 */}
      <H2>5. Third-party processors summary</H2>
      <Table>
        <thead>
          <tr>
            <Th>Processor</Th>
            <Th>Data sent</Th>
            <Th>Purpose</Th>
            <Th>Region</Th>
          </tr>
        </thead>
        <tbody>
          {[
            ['PostHog', 'Anonymous usage events, page views', 'Product analytics', 'EU'],
            ['WalletConnect', 'Wallet session metadata', 'Wallet connection relay', 'Global'],
            [
              'Namespace (namespace.ninja)',
              'Wallet addresses displayed in UI',
              'Celo name resolution',
              'Unknown',
            ],
            ['Upstash', 'Wallet address, tx hash', 'Staking auto-activation queue', 'Global'],
            ['stCELO Cloud Functions', 'Wallet address', 'stCELO protocol operations', 'US (GCP)'],
            [
              'GitHub (Octokit)',
              'Name, address, bio (delegate registration only)',
              'Governance delegate registry',
              'Global',
            ],
          ].map(([processor, data, purpose, region]) => (
            <tr key={processor}>
              <Td>{processor}</Td>
              <Td>{data}</Td>
              <Td>{purpose}</Td>
              <Td>{region}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* 6 */}
      <H2>6. Your rights</H2>
      <P>
        Depending on your jurisdiction you may have the right to access, correct, or delete data we
        hold about you. Because our analytics data is stored against a random per-session UUID (not
        linked to your identity), we are generally unable to locate records for a specific
        individual. For any privacy requests, contact us via the GitHub repository at{' '}
        <A_Blank href="https://github.com/celo-org/celo-mondo/issues" className="underline">
          github.com/celo-org/celo-mondo/issues
        </A_Blank>
        .
      </P>

      {/* 7 */}
      <H2>7. Changes to this policy</H2>
      <P>
        We will update this policy when the data practices of the application change. The &quot;Last
        updated&quot; date at the top will reflect the most recent revision. Changes are traceable
        in the git history of the repository.
      </P>

      <div className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-500">
        <Link href="/" className="underline">
          ← Back to Celo Mondo
        </Link>
      </div>
    </main>
  );
}
