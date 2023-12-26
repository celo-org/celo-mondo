'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PieChart } from 'react-minimal-pie-chart';
import { Spinner } from 'src/components/animation/Spinner';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { IconButton } from 'src/components/buttons/IconButton';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { TabHeaderButton } from 'src/components/buttons/TabHeaderButton';
import { TextLink } from 'src/components/buttons/TextLink';
import { HeatmapSquares } from 'src/components/charts/Heatmap';
import { ArrowIcon } from 'src/components/icons/Arrow';
import { Circle } from 'src/components/icons/Circle';
import { Identicon } from 'src/components/icons/Identicon';
import { Section } from 'src/components/layout/Section';
import { Twitter } from 'src/components/logos/Twitter';
import { Web } from 'src/components/logos/Web';
import { formatNumberString } from 'src/components/numbers/Amount';
import { EPOCH_DURATION_MS, ZERO_ADDRESS } from 'src/config/consts';
import { VALIDATOR_GROUPS } from 'src/config/validators';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { useGroupRewardHistory } from 'src/features/validators/useGroupRewardHistory';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { useValidatorStakers } from 'src/features/validators/useValidatorStakers';
import { Color } from 'src/styles/Color';
import { useIsMobile } from 'src/styles/mediaQueries';
import { eqAddressSafe, shortenAddress } from 'src/utils/addresses';
import { fromWei, fromWeiRounded } from 'src/utils/amount';
import { useCopyHandler } from 'src/utils/clipboard';
import { objLength } from 'src/utils/objects';

const HEATMAP_SIZE = 100;

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
    <Section>
      <div className="space-y-8 px-2">
        <HeaderSection group={group} />
        <HeatmapSection group={group} />
        <DetailsSection group={group} />
      </div>
    </Section>
  );
}

function HeaderSection({ group }: { group?: ValidatorGroup }) {
  const address = group?.address || ZERO_ADDRESS;
  const webUrl = VALIDATOR_GROUPS[address]?.url;
  const twitterUrl = VALIDATOR_GROUPS[address]?.twitter;

  const onClickAddress = useCopyHandler(group?.address);

  return (
    <div>
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
              <OutlineButton className="all:border-black all:font-normal" onClick={onClickAddress}>
                {shortenAddress(address)}
              </OutlineButton>
              {webUrl && (
                <ExternalLink href={webUrl}>
                  <IconButton>
                    <Web height={22} width={22} />
                  </IconButton>
                </ExternalLink>
              )}
              {twitterUrl && (
                <ExternalLink href={twitterUrl}>
                  <IconButton>
                    <Twitter height={22} width={22} />
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
    </div>
  );
}

function HeatmapSection({ group }: { group?: ValidatorGroup }) {
  const { rewardHistory } = useGroupRewardHistory(group?.address, HEATMAP_SIZE);

  const data = useMemo(() => {
    const hasReward = Array(HEATMAP_SIZE).fill(false);
    if (!rewardHistory?.length) return hasReward;
    const startTimestamp = Date.now() - EPOCH_DURATION_MS * HEATMAP_SIZE;
    for (let i = 0; i < rewardHistory.length; i++) {
      if (rewardHistory[i].timestamp < startTimestamp) continue;
      const epochIndex = Math.floor(
        (rewardHistory[i].timestamp - startTimestamp) / EPOCH_DURATION_MS,
      );
      hasReward[epochIndex] = true;
    }
    return hasReward;
  }, [rewardHistory]);

  return (
    <div className="space-y-2 border border-taupe-300 p-2">
      <h3>Reward payments (last 100 days)</h3>
      <HeatmapSquares data={data} rows={4} columns={25} />
      <div className="ml-px flex space-x-10">
        <div className="flex items-center">
          <div className="bg-green-700 h-3 w-3"></div>
          <label className="ml-2 text-sm">Reward Paid</label>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 bg-gray-400"></div>
          <label className="ml-2 text-sm">No Reward</label>
        </div>
      </div>
    </div>
  );
}

function DetailsSection({ group }: { group?: ValidatorGroup }) {
  const [tab, setTab] = useState<'members' | 'stakers'>('members');

  return (
    <div>
      <div className="flex justify-between space-x-7 pb-4">
        <TabHeaderButton
          isActive={tab === 'members'}
          onClick={() => setTab('members')}
          count={objLength(group?.members || {})}
        >
          Members
        </TabHeaderButton>
        <TabHeaderButton
          isActive={tab === 'stakers'}
          onClick={() => setTab('stakers')}
          count={getStakersHeaderCount(group)}
        >
          Stakers
        </TabHeaderButton>
      </div>
      {tab === 'members' && <Members group={group} />}
      {tab === 'stakers' && <Stakers group={group} />}
    </div>
  );
}

function Members({ group }: { group?: ValidatorGroup }) {
  const isMobile = useIsMobile();
  return (
    <table className="relative -mt-px w-full border-t border-taupe-300">
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
  const { stakers } = useValidatorStakers(group?.address);

  const chartData = useMemo(() => {
    if (!stakers) return null;
    if (!objLength(stakers)) return [{ title: 'No Stakers', value: 1, color: Color.Grey }];
    let sortedStakers = Object.entries(stakers).sort((a, b) => b[1] - a[1]);
    if (sortedStakers.length > 5) {
      const topStakers = sortedStakers.slice(0, 5);
      const otherStakers = sortedStakers.slice(5);
      sortedStakers = [
        ...topStakers,
        ['Others', otherStakers.reduce((acc, cur) => acc + cur[1], 0)],
      ];
    }
    return sortedStakers.map(([address, amount], i) => {
      return { title: address, value: amount, color: PIE_CHART_COLORS[i] };
    });
  }, [stakers]);

  if (!chartData?.length) {
    return (
      <div className="flex items-center justify-center p-20">
        <Spinner />
      </div>
    );
  }
  return (
    <div className="relative -mt-px flex flex-col items-center justify-between gap-12 border-t border-taupe-300 md:flex-row md:gap-16 md:pt-6">
      <div className="flex-1 self-stretch">
        <table className="w-full">
          <thead>
            <tr>
              <th className={styles.th}>Address</th>
              <th className={styles.th}>Value</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((data) => (
              <tr key={data.title}>
                <td className={styles.td}>
                  <div className="flex items-center space-x-2">
                    <Circle fill={data.color} size={10} />
                    <span>
                      {data.title === 'Others' ? 'Other stakers' : shortenAddress(data.title)}
                    </span>
                  </div>
                </td>
                <td className={styles.td}>{formatNumberString(data.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-1">
        <PieChart
          data={chartData}
          lineWidth={10}
          animate
          label={() => formatNumberString(fromWei(group?.votes))}
          labelStyle={{
            fontSize: '10px',
            fontFamily: "'Garamond', 'serif'",
          }}
          labelPosition={0}
        />
      </div>
    </div>
  );
}

function getStakersHeaderCount(group?: ValidatorGroup) {
  if (!group?.votes) return '0';
  if (group.votes < 20000) return '1';
  else return '10+';
}

const styles = {
  th: 'text-sm font-normal border-b border-taupe-300 md:min-w-[8rem] py-3 px-6 first:pl-0 last:pr-0 text-center first:text-left last:text-right',
  td: 'text-sm border-y border-taupe-300 py-3 px-6 first:pl-0 last:pr-0 text-center first:text-left last:text-right',
};

const PIE_CHART_COLORS = [
  Color.Forest,
  Color.Citrus,
  Color.Lotus,
  Color.Lavender,
  Color.Sky,
  Color.Grey,
];
