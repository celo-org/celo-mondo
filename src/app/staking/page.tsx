'use client';
import { useMemo } from 'react';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Card } from 'src/components/layout/Card';
import { Section } from 'src/components/layout/Section';
import { Amount } from 'src/components/numbers/Amount';
import { useValidatorGroups } from 'src/features/validators/hooks';
import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { bigIntMin } from 'src/utils/math';

export default function Index() {
  const { groups, totalVotes } = useValidatorGroups();
  return (
    <div className="space-y-8">
      <HeroSection totalVotes={totalVotes} groups={groups} />
      <ListSection groups={groups} />
    </div>
  );
}

function HeroSection({ totalVotes, groups }: { totalVotes?: bigint; groups?: ValidatorGroup[] }) {
  const minVotes = useMemo(() => {
    if (!groups?.length) return 0n;
    let min = BigInt(1e40);
    for (const g of groups) {
      const numElectedMembers = Object.values(g.members).filter(
        (m) => m.status === ValidatorStatus.Elected,
      ).length;
      if (!numElectedMembers) continue;
      const votesPerMember = g.votes / BigInt(numElectedMembers);
      min = bigIntMin(min, votesPerMember);
    }
    return min;
  }, [groups]);

  return (
    <Section className="bg-purple-500 text-white">
      <div className="my-10 flex items-center justify-between gap-20 lg:gap-x-40 xl:gap-x-80">
        <div className="flex w-80 flex-col space-y-6">
          <h1 className="font-serif text-4xl">Discover Validators</h1>
          <p>Stake your CELO with validators to start earning rewards immediately.</p>
          <SolidButton>{`Stake and earn up to 6%`}</SolidButton>
        </div>
        <div className="hidden grid-cols-2 grid-rows-2 gap-10 border border-white/20 p-6 md:grid">
          <HeroStat label="Staking APY" text="6%" />
          <HeroStat label="Validators Groups" text={groups?.length || 0} />
          <HeroStat label="Elected Minimum Votes" amount={minVotes} />
          <HeroStat label="Total Staked CELO" amount={totalVotes} />
        </div>
      </div>
    </Section>
  );
}

function HeroStat({
  label,
  text,
  amount,
}: {
  label: string;
  text?: string | number;
  amount?: bigint;
}) {
  return (
    <div className="flex flex-col">
      <label>{label}</label>
      {!!text && <div className="mt-1 font-serif text-3xl">{text}</div>}
      {!!amount && (
        <Amount valueWei={amount} className="mt-1 text-3xl" decimals={0} showSymbol={false} />
      )}
    </div>
  );
}

function ListSection({ groups }: { groups?: ValidatorGroup[] }) {
  return (
    <Section>
      <Card>
        <div className="space-y-4">
          {groups?.map((g) => <div key={g.address}>{JSON.stringify(g)}</div>)}
        </div>
      </Card>
    </Section>
  );
}
