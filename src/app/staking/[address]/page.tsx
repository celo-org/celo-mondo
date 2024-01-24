'use client';

import BigNumber from 'bignumber.js';
import { useMemo, useState } from 'react';
import { PieChart } from 'react-minimal-pie-chart';
import { toast } from 'react-toastify';
import { Spinner } from 'src/components/animation/Spinner';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { IconButton } from 'src/components/buttons/IconButton';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { TabHeaderButton } from 'src/components/buttons/TabHeaderButton';
import { TextLink } from 'src/components/buttons/TextLink';
import { HeatmapLines } from 'src/components/charts/Heatmap';
import { ArrowIcon } from 'src/components/icons/Arrow';
import { Checkmark } from 'src/components/icons/Checkmark';
import { Circle } from 'src/components/icons/Circle';
import { Identicon } from 'src/components/icons/Identicon';
import { SlashIcon } from 'src/components/icons/Slash';
import { XIcon } from 'src/components/icons/XIcon';
import { Section } from 'src/components/layout/Section';
import { StatBox } from 'src/components/layout/StatBox';
import { Twitter } from 'src/components/logos/Twitter';
import { Web } from 'src/components/logos/Web';
import { Amount, formatNumberString } from 'src/components/numbers/Amount';
import { EPOCH_DURATION_MS, ZERO_ADDRESS } from 'src/config/consts';
import { VALIDATOR_GROUPS } from 'src/config/validators';
import { useLockedBalance } from 'src/features/account/hooks';
import { useStore } from 'src/features/store';
import { TxModalType } from 'src/features/transactions/types';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { useGroupRewardHistory } from 'src/features/validators/useGroupRewardHistory';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { useValidatorStakers } from 'src/features/validators/useValidatorStakers';
import { getGroupStats } from 'src/features/validators/utils';
import { Color } from 'src/styles/Color';
import { tableClasses } from 'src/styles/common';
import { useIsMobile } from 'src/styles/mediaQueries';
import { shortenAddress } from 'src/utils/addresses';
import { fromWei, fromWeiRounded } from 'src/utils/amount';
import { useCopyHandler } from 'src/utils/clipboard';
import { usePageInvariant } from 'src/utils/navigation';
import { objLength } from 'src/utils/objects';
import { getDateTimeString, getHumanReadableTimeString } from 'src/utils/time';

const HEATMAP_SIZE = 50;

export const dynamicParams = true;

export default function Page({ params: { address } }: { params: { address: Address } }) {
  const { addressToGroup } = useValidatorGroups();
  const group = addressToGroup?.[address];

  usePageInvariant(!addressToGroup || group, '/', 'Validator group not found');

  return (
    <Section containerClassName="space-y-8 mt-4">
      <>
        <HeaderSection group={group} />
        <StatSection group={group} />
        <DetailsSection group={group} />
      </>
    </Section>
  );
}

function HeaderSection({ group }: { group?: ValidatorGroup }) {
  const address = group?.address || ZERO_ADDRESS;
  const webUrl = VALIDATOR_GROUPS[address]?.url;
  const twitterUrl = VALIDATOR_GROUPS[address]?.twitter;

  const onClickAddress = useCopyHandler(group?.address);
  const onClickSlash = () => {
    if (group?.lastSlashed) {
      toast.info(`This group was last slashed on ${getDateTimeString(group.lastSlashed)}`);
    } else {
      toast.info('This group has never been slashed');
    }
  };

  const setTxModal = useStore((state) => state.setTransactionModal);
  const onClickStake = () => {
    setTxModal({ type: TxModalType.Stake, props: { defaultGroup: address } });
  };

  return (
    <div>
      <TextLink href="/" className="font-medium text-taupe-600">
        <div className="flex items-center text-sm">
          <ArrowIcon width={20} height={20} direction="w" fill={Color.Wood} />
          <span>Browse Validators</span>
        </div>
      </TextLink>
      <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-40">
        <div className="flex items-center space-x-3 sm:space-x-6">
          <ValidatorGroupLogo address={address} size={90} />
          <div>
            <h1 className="font-serif text-4xl">{group?.name || '...'}</h1>
            <div className="mt-2 flex items-center space-x-1.5 sm:space-x-3">
              <OutlineButton
                className="all:py-1 all:font-normal"
                onClick={onClickAddress}
                title="Copy"
              >
                {shortenAddress(address)}
              </OutlineButton>
              <OutlineButton
                className="all:py-1 all:font-normal"
                onClick={onClickSlash}
                title="Last slashed"
              >
                <div className="flex items-center space-x-1.5">
                  <SlashIcon width={14} height={14} />
                  <span>
                    {group?.lastSlashed ? getHumanReadableTimeString(group.lastSlashed) : 'Never'}
                  </span>
                </div>
              </OutlineButton>
              {webUrl && (
                <ExternalLink href={webUrl}>
                  <IconButton>
                    <Web height={18} width={18} />
                  </IconButton>
                </ExternalLink>
              )}
              {twitterUrl && (
                <ExternalLink href={twitterUrl}>
                  <IconButton>
                    <Twitter height={18} width={18} />
                  </IconButton>
                </ExternalLink>
              )}
            </div>
          </div>
        </div>
        <SolidButton onClick={onClickStake} className="w-full sm:w-auto sm:px-7">
          Stake
        </SolidButton>
      </div>
    </div>
  );
}

function StatSection({ group }: { group?: ValidatorGroup }) {
  const { rewardHistory, isLoading } = useGroupRewardHistory(group?.address, HEATMAP_SIZE);

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

  const capacityPercent = Math.min(
    BigNumber(group?.votes?.toString() || 0)
      .div(group?.capacity?.toString() || 1)
      .multipliedBy(100)
      .decimalPlaces(0)
      .toNumber(),
    100,
  );

  const heatmapStartDate = new Date(Date.now() - EPOCH_DURATION_MS * HEATMAP_SIZE);

  return (
    <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
      <StatBox header="Total staked" valueWei={group?.votes}>
        <div className="relative h-2 w-full border border-taupe-300 bg-taupe-100">
          <div
            className="absolute bottom-0 left-0 top-0 bg-purple-500"
            style={{ width: `${capacityPercent}%` }}
          ></div>
        </div>
        <div className="text-xs text-taupe-600">{`Maximum: ${formatNumberString(
          fromWei(group?.capacity),
        )} CELO`}</div>
      </StatBox>
      <StatBox header="Rewards distributed" className="relative">
        <div className="flex justify-between text-xs">
          <span>{heatmapStartDate.toLocaleDateString()}</span>
          <span>Yesterday</span>
        </div>
        <HeatmapLines data={data} />
        <div className="ml-px flex space-x-6">
          <div className="flex items-center">
            <div className="h-2 w-2 bg-green-500"></div>
            <label className="ml-2 text-xs">Reward Paid</label>
          </div>
          <div className="flex items-center">
            <div className="h-2 w-2 bg-gray-300"></div>
            <label className="ml-2 text-xs">No Reward</label>
          </div>
        </div>
        {isLoading && (
          <div className="absolute right-2 top-0">
            <Spinner size="xs" />
          </div>
        )}
      </StatBox>
    </div>
  );
}

function DetailsSection({ group }: { group?: ValidatorGroup }) {
  const [tab, setTab] = useState<'members' | 'stakers'>('members');

  return (
    <div>
      <div className="flex space-x-10 border-b border-taupe-300 pb-4">
        <TabHeaderButton
          isActive={tab === 'members'}
          onClick={() => setTab('members')}
          count={objLength(group?.members || {})}
        >
          <span className="text-sm">Group members</span>
        </TabHeaderButton>
        <TabHeaderButton
          isActive={tab === 'stakers'}
          onClick={() => setTab('stakers')}
          count={getStakersHeaderCount(group)}
        >
          <span className="text-sm">Stakers</span>
        </TabHeaderButton>
      </div>
      {tab === 'members' && <Members group={group} />}
      {tab === 'stakers' && <Stakers group={group} />}
    </div>
  );
}

function Members({ group }: { group?: ValidatorGroup }) {
  const isMobile = useIsMobile();
  const groupStats = getGroupStats(group);

  const { lockedBalance } = useLockedBalance(group?.address);

  return (
    <>
      <div className="mt-4 flex items-center space-x-8">
        <div className="flex flex-col">
          <h4 className="text-sm">Elected</h4>
          <span className="mt-1 font-serif text-xl">{`${groupStats.numElected} / ${groupStats.numMembers}`}</span>
        </div>
        <div className="flex flex-col">
          <h4 className="text-sm">Average Score</h4>
          <span className="mt-1 font-serif text-xl">{`${groupStats.avgScore.toFixed(2)}%`}</span>
        </div>
        <div className="flex flex-col">
          <h4 className="text-sm">Locked CELO</h4>
          <Amount className="mt-1 text-xl" valueWei={lockedBalance} />
        </div>
      </div>
      <table className="mt-2 w-full">
        <thead>
          <tr>
            <th className={tableClasses.th}>Address</th>
            <th className={tableClasses.th}>Score</th>
            <th className={tableClasses.th}>Elected</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(group?.members || {}).map((member) => (
            <tr key={member.address}>
              <td className={tableClasses.td}>
                <div className="flex items-center">
                  <Identicon address={member.address} size={28} />
                  <span className="ml-2">
                    {isMobile ? shortenAddress(member.address) : member.address}
                  </span>
                </div>
              </td>
              <td className={tableClasses.td}>{fromWeiRounded(member.score, 22, 0) + '%'}</td>
              <td className={tableClasses.td}>
                {member.status === ValidatorStatus.Elected ? (
                  <div className="badge badge-success gap-1 rounded-full bg-green-500 text-sm">
                    <Checkmark width={14} height={14} />
                    Yes
                  </div>
                ) : (
                  <div className="badge badge-error gap-1 rounded-full bg-red-400 text-sm">
                    <XIcon width={14} height={10} />
                    No
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
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
        <Spinner size="lg" />
      </div>
    );
  }
  return (
    <div className="relative flex flex-col items-center justify-between gap-10 md:flex-row md:gap-16 md:pt-4">
      <div className="flex-1 self-stretch">
        <table className="w-full">
          <thead>
            <tr>
              <th className={tableClasses.th}>Address</th>
              <th className={tableClasses.th}>Percent</th>
              <th className={tableClasses.th}>Value</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((data) => (
              <tr key={data.title}>
                <td className={tableClasses.td}>
                  <div className="flex items-center space-x-2">
                    <Circle fill={data.color} size={10} />
                    <span>
                      {data.title === 'Others' ? 'Other stakers' : shortenAddress(data.title)}
                    </span>
                  </div>
                </td>
                <td className={tableClasses.td}>
                  {((data.value / fromWei(group?.votes || 1)) * 100).toFixed(2) + '%'}
                </td>
                <td className={tableClasses.td}>{formatNumberString(data.value)}</td>
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

const PIE_CHART_COLORS = [
  Color.Forest,
  Color.Citrus,
  Color.Lotus,
  Color.Lavender,
  Color.Sky,
  Color.Grey,
];
