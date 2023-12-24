'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { IconButton } from 'src/components/buttons/IconButton';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { TabHeaderButton } from 'src/components/buttons/TabHeaderButton';
import { TextLink } from 'src/components/buttons/TextLink';
import { ArrowIcon } from 'src/components/icons/Arrow';
import { Identicon } from 'src/components/icons/Identicon';
import { Section } from 'src/components/layout/Section';
import { Twitter } from 'src/components/logos/Twitter';
import { Web } from 'src/components/logos/Web';
import { ZERO_ADDRESS } from 'src/config/consts';
import { VALIDATOR_GROUPS } from 'src/config/validators';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { Color } from 'src/styles/Color';
import { useIsMobile } from 'src/styles/mediaQueries';
import { eqAddressSafe, shortenAddress } from 'src/utils/addresses';
import { fromWeiRounded } from 'src/utils/amount';
import { objLength } from 'src/utils/objects';

export const dynamicParams = true;

export default function Page({ params: { address } }: { params: { address: Address } }) {
  const router = useRouter();
  const { groups } = useValidatorGroups();
  const group = useMemo(
    () => groups?.find((g) => eqAddressSafe(g.address, address)),
    [address, groups],
  );
  useEffect(() => {
    if (groups && !group) {
      // Unknown / valid group address provided, return to staking home
      router.replace('/staking');
    }
  }, [group, groups, router]);

  return (
    <div className="space-y-12">
      <HeaderSection group={group} />
      <DetailsSection group={group} />
    </div>
  );
}

function HeaderSection({ group }: { group?: ValidatorGroup }) {
  const address = group?.address || ZERO_ADDRESS;
  const webUrl = VALIDATOR_GROUPS[address]?.url;
  const twitterUrl = VALIDATOR_GROUPS[address]?.twitter;

  return (
    <Section>
      <TextLink href="/staking" className="font-medium text-taupe-600">
        <div className="flex items-center">
          <ArrowIcon width={20} height={20} direction="w" fill={Color.Wood} />
          <span>Staking</span>
        </div>
      </TextLink>
      <div className="mt-6 flex w-full items-center justify-between gap-40">
        <div className="flex items-center space-x-6">
          <ValidatorGroupLogo address={address} size={90} />
          <div>
            <h1 className="font-serif text-4xl">{group?.name || '...'}</h1>
            <div className=" mt-2 flex items-center space-x-3">
              <OutlineButton className="all:border-black all:font-normal">
                {shortenAddress(address)}
              </OutlineButton>
              {webUrl && (
                <ExternalLink href={webUrl}>
                  <IconButton>
                    <Web height={24} width={24} />
                  </IconButton>
                </ExternalLink>
              )}
              {twitterUrl && (
                <ExternalLink href={twitterUrl}>
                  <IconButton>
                    <Twitter height={24} width={24} />
                  </IconButton>
                </ExternalLink>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-6">
          <SolidButton>Stake</SolidButton>
        </div>
      </div>
    </Section>
  );
}

function DetailsSection({ group }: { group?: ValidatorGroup }) {
  const [tab, setTab] = useState<'members' | 'stakers'>('members');

  return (
    <Section>
      <div className="flex justify-between space-x-7 pb-4">
        <TabHeaderButton
          isActive={tab === 'members'}
          onClick={() => setTab('members')}
          count={objLength(group?.members || {})}
        >
          Members
        </TabHeaderButton>
        <TabHeaderButton isActive={tab === 'stakers'} onClick={() => setTab('stakers')}>
          Stakers
        </TabHeaderButton>
      </div>
      {tab === 'members' && <Members group={group} />}
      {tab === 'stakers' && <Stakers group={group} />}
    </Section>
  );
}

function Members({ group }: { group?: ValidatorGroup }) {
  const isMobile = useIsMobile();
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className={styles.th}>Address</th>
          <th className={styles.th}>Score</th>
          <th className={styles.th}>Elected</th>
        </tr>
      </thead>
      <tbody>
        {Object.values(group?.members || {}).map((member) => (
          <tr key={member.address}>
            <td className={styles.td}>
              <div className="flex items-center">
                <Identicon address={member.address} size={28} />
                <span className="ml-2">
                  {isMobile ? shortenAddress(member.address) : member.address}
                </span>
              </div>
            </td>
            <td className={styles.td}>{fromWeiRounded(member.score, 22, 0) + '%'}</td>
            <td className={styles.td}>
              {member.status === ValidatorStatus.Elected ? 'Yes' : 'No'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Stakers({ group }: { group?: ValidatorGroup }) {
  return <div>{group?.address}</div>;
}

const styles = {
  th: 'text-left font-normal border-y border-taupe-300 px-6 py-3 min-w-[8rem] last:text-right',
  td: 'border-y border-taupe-300 px-4 py-3 last:text-right',
};
