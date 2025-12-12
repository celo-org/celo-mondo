'use client';

import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { PieChart } from 'react-minimal-pie-chart';
import { toast } from 'react-toastify';
import { Spinner } from 'src/components/animation/Spinner';
import { BackLink } from 'src/components/buttons/BackLink';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { TabHeaderButton } from 'src/components/buttons/TabHeaderButton';
import { HeatmapSquares } from 'src/components/charts/Heatmap';
import { sortAndCombineChartData } from 'src/components/charts/chartData';
import { Checkmark } from 'src/components/icons/Checkmark';
import { Circle } from 'src/components/icons/Circle';
import { Identicon } from 'src/components/icons/Identicon';
import { SlashIcon } from 'src/components/icons/Slash';
import { XIcon } from 'src/components/icons/XIcon';
import { Section } from 'src/components/layout/Section';
import { StatBox } from 'src/components/layout/StatBox';
import { SocialLogoLink } from 'src/components/logos/SocialLogo';
import { Amount, formatNumberString } from 'src/components/numbers/Amount';
import AddressLabel from 'src/components/text/AddressLabel';
import { CopyInline } from 'src/components/text/CopyInline';
import { ZERO_ADDRESS } from 'src/config/consts';
import { SocialLinkType } from 'src/config/types';
import { VALIDATOR_GROUPS } from 'src/config/validators';
import { useLockedBalance } from 'src/features/account/hooks';
import { useDelegateeHistory } from 'src/features/delegation/hooks/useDelegateeHistory';
import { useDequeuedProposalIds } from 'src/features/governance/hooks/useDequeuedProposalIds';
import { useStrategy } from 'src/features/staking/stCELO/hooks/useStCELO';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import ContributionBadge from 'src/features/validators/components/ContributionBadge';
import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { useValidatorStakers } from 'src/features/validators/useValidatorStakers';
import { getGroupStats } from 'src/features/validators/utils';
import { Color } from 'src/styles/Color';
import { tableClasses } from 'src/styles/common';
import { useIsMobile } from 'src/styles/mediaQueries';
import { shortenAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { useCopyHandler } from 'src/utils/clipboard';
import { usePageInvariant } from 'src/utils/navigation';
import { objLength } from 'src/utils/objects';
import { getDateTimeString, getHumanReadableTimeString } from 'src/utils/time';
import { useStakingMode } from 'src/utils/useStakingMode';
import useTabs from 'src/utils/useTabs';
import { isAddressEqual } from 'viem';
import { useAccount } from 'wagmi';

export default function Page({ address }: { address: Address }) {
  const { addressToGroup } = useValidatorGroups();
  const group = addressToGroup?.[address];

  usePageInvariant(!addressToGroup || group, '/', 'Validator group not found');

  return (
    <Section containerClassName="space-y-8 mt-4 lg:max-w-(--breakpoint-lg)">
      <HeaderSection group={group} />
      <StatSection group={group} />
      <DetailsSection group={group} />
    </Section>
  );
}

function HeaderSection({ group }: { group?: ValidatorGroup }) {
  const account = useAccount();
  const { ui, mode } = useStakingMode();
  const { group: stCELOStakingGroup } = useStrategy(account.address);
  const address = group?.address || ZERO_ADDRESS;
  const isMobile = useIsMobile();
  const metadata = VALIDATOR_GROUPS[address];
  const links = Object.entries(metadata?.links || {}) as Array<[SocialLinkType, string]>;

  const onClickAddress = useCopyHandler(group?.address);
  const onClickSlash = () => {
    if (group?.lastSlashed) {
      toast.info(`This group was last slashed on ${getDateTimeString(group.lastSlashed)}`);
    } else {
      toast.info('This group has never been slashed');
    }
  };

  const showTxModal = useTransactionModal();
  const onClickStake = () => {
    showTxModal(mode === 'CELO' ? TransactionFlowType.Stake : TransactionFlowType.ChangeStrategy, {
      group: address,
    });
  };
  const isActiveStrategy = stCELOStakingGroup && isAddressEqual(stCELOStakingGroup, address);

  return (
    <div>
      <BackLink href="/">Browse validators</BackLink>
      <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-40">
        <div className="flex items-center space-x-3 sm:space-x-6">
          <ValidatorGroupLogo address={address} size={isMobile ? 45 : 90} />
          <div>
            <h1 className="overflow-hidden text-ellipsis font-serif text-xl md:text-4xl">
              {group?.name || '...'}
            </h1>
            <div className="mt-2 flex items-center space-x-1.5 sm:space-x-3">
              <OutlineButton
                className="text-sm all:py-1 all:font-normal"
                onClick={onClickAddress}
                title="Copy"
              >
                {shortenAddress(address)}
              </OutlineButton>
              <OutlineButton
                className="text-sm all:py-1 all:font-normal"
                onClick={onClickSlash}
                title="Last slashed"
              >
                <div className="flex items-center space-x-1.5">
                  <SlashIcon width={14} height={14} />
                  <span>
                    {group?.lastSlashed
                      ? getHumanReadableTimeString(group.lastSlashed)
                      : 'Never slashed'}
                  </span>
                </div>
              </OutlineButton>
              {metadata?.communityContributor ? (
                <ContributionBadge
                  asButton
                  className="text-sm all:py-1 all:font-normal"
                  title="CELO Community contributor"
                />
              ) : null}
              {links.map(([type, href], i) => (
                <SocialLogoLink key={i} type={type} href={href} />
              ))}
            </div>
          </div>
        </div>
        <SolidButton
          onClick={onClickStake}
          className="w-full bg-primary text-primary-content sm:w-auto sm:px-7"
          disabled={isActiveStrategy}
        >
          {isActiveStrategy ? 'Already staking' : ui.action}
        </SolidButton>
      </div>
    </div>
  );
}

function StatSection({ group }: { group?: ValidatorGroup }) {
  return (
    <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-between sm:gap-8">
      <CapacityStatBox group={group} />
      <GovernanceStatBox group={group} />
    </div>
  );
}

function CapacityStatBox({ group }: { group?: ValidatorGroup }) {
  const capacityPercent = Math.min(
    BigNumber(group?.votes?.toString() || 0)
      .div(group?.capacity?.toString() || 1)
      .multipliedBy(100)
      .decimalPlaces(0)
      .toNumber(),
    100,
  );

  return (
    <StatBox header="Total staked" valueWei={group?.votes}>
      <div className="relative h-2 w-full border border-taupe-300 bg-taupe-100">
        <div
          className="absolute bottom-0 left-0 top-0 bg-accent"
          style={{ width: `${capacityPercent}%` }}
        ></div>
      </div>
      <div className="text-xs text-taupe-600">{`Maximum: ${formatNumberString(
        fromWei(group?.capacity),
      )} CELO`}</div>
    </StatBox>
  );
}

function GovernanceStatBox({ group }: { group?: ValidatorGroup }) {
  const { proposalToVotes, isLoading: isLoadingHistory } = useDelegateeHistory(group?.address);
  const { approvedProposals, isLoading: isLoadingCount } = useDequeuedProposalIds();
  const isLoading = isLoadingHistory || isLoadingCount;

  const { chartData, numVoted } = useMemo(() => {
    if (!proposalToVotes || !approvedProposals)
      return { chartData: Array(150).fill(false), numVoted: 0 };
    const chartData: boolean[] = [];
    for (const id of approvedProposals) {
      if (proposalToVotes[id]) chartData.push(true);
      else chartData.push(false);
    }
    return { chartData, numVoted: objLength(proposalToVotes) };
  }, [proposalToVotes, approvedProposals]);

  return (
    <StatBox header="Governance participation" className="relative" valueWei={null}>
      <HeatmapSquares data={chartData} className="max-w-2xl" />
      {isLoading && (
        <div className="absolute right-2 top-0">
          <Spinner size="xs" />
        </div>
      )}
      <div className="text-xs text-taupe-600">{`Voted on ${numVoted} / ${approvedProposals?.length || 0} proposals`}</div>
    </StatBox>
  );
}

// Disabled because all data sources for these rewards events have been flake
// function RewardsStatBox({ group }: { group?: ValidatorGroup }) {
//   const { rewardHistory, isLoading } = useGroupRewardHistory(group?.address, HEATMAP_SIZE);

//   const data = useMemo(() => {
//     const hasReward = Array(HEATMAP_SIZE).fill(false);
//     if (!rewardHistory?.length) return hasReward;
//     const startTimestamp = Date.now() - EPOCH_DURATION_MS * HEATMAP_SIZE;
//     for (let i = 0; i < rewardHistory.length; i++) {
//       if (rewardHistory[i].timestamp < startTimestamp) continue;
//       const epochIndex = Math.floor(
//         (rewardHistory[i].timestamp - startTimestamp) / EPOCH_DURATION_MS,
//       );
//       hasReward[epochIndex] = true;
//     }
//     return hasReward;
//   }, [rewardHistory]);

//   const heatmapStartDate = new Date(Date.now() - EPOCH_DURATION_MS * HEATMAP_SIZE);

//   return (
//     <StatBox header="Rewards distributed" className="relative" valueWei={null}>
//       <div className="flex justify-between text-xs">
//         <span>{heatmapStartDate.toLocaleDateString()}</span>
//         <span>Yesterday</span>
//       </div>
//       <HeatmapLines data={data} />
//       <div className="ml-px flex space-x-6">
//         <div className="flex items-center">
//           <div className="h-2 w-2 bg-green-500"></div>
//           <label className="ml-2 text-xs">Reward Paid</label>
//         </div>
//         <div className="flex items-center">
//           <div className="h-2 w-2 bg-gray-300"></div>
//           <label className="ml-2 text-xs">No Reward</label>
//         </div>
//       </div>
//       {isLoading && (
//         <div className="absolute right-2 top-0">
//           <Spinner size="xs" />
//         </div>
//       )}
//     </StatBox>
//   );
// }

function DetailsSection({ group }: { group?: ValidatorGroup }) {
  const { tab, onTabChange } = useTabs<'members' | 'stakers'>('members');

  return (
    <div>
      <div className="flex space-x-10 border-b border-taupe-300 pb-2">
        <TabHeaderButton
          isActive={tab === 'members'}
          onClick={() => onTabChange('members')}
          count={objLength(group?.members || {})}
        >
          <span className="text-sm">Group members</span>
        </TabHeaderButton>
        <TabHeaderButton
          isActive={tab === 'stakers'}
          onClick={() => onTabChange('stakers')}
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
          <h4 className="text-sm">Group Score</h4>
          <span className="mt-1 font-serif text-xl">{`${(groupStats.score * 100).toFixed(2)}%`}</span>
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
                <div className="flex items-center gap-x-2">
                  <Identicon address={member.address} size={24} />
                  <AddressLabel
                    address={member.address}
                    shortener={isMobile ? shortenAddress : (x) => x}
                  />
                </div>
              </td>
              <td className={tableClasses.td}>{`${(member.score * 100).toFixed(2)}%`}</td>
              <td className={tableClasses.td}>
                {member.status === ValidatorStatus.Elected ? (
                  <div className="badge badge-success gap-1 rounded-full bg-success text-sm">
                    <Checkmark width={14} height={14} />
                    Yes
                  </div>
                ) : (
                  <div className="badge badge-error gap-1 rounded-full bg-error text-sm">
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
  const { stakers, isLoading } = useValidatorStakers(group?.address);

  const chartData = useMemo(() => {
    if (isLoading) return null;
    if (!stakers.length) return [{ label: 'No Stakers', value: 1, color: Color.Grey }];
    const rawData = stakers.map(([address, amount]) => ({
      label: address,
      value: amount,
    }));
    return sortAndCombineChartData(rawData, 100);
  }, [stakers, isLoading]);

  if (isLoading || !chartData) {
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
              <tr key={data.label}>
                <td className={tableClasses.td}>
                  <div className="flex min-w-[150px] items-center gap-x-2">
                    <Circle fill={data.color} size={10} />
                    {data.label === 'Others' ? (
                      'Other stakers'
                    ) : (
                      <CopyInline
                        text={<AddressLabel address={data.label as Address} />}
                        textToCopy={data.label}
                      />
                    )}
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
            fontFamily: 'var(--font-alpina), serif',
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
