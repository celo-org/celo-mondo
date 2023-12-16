import { SolidButton } from 'src/components/buttons/SolidButton';
import { Card } from 'src/components/layout/Card';
import { Section } from 'src/components/layout/Section';

export default function Index() {
  return (
    <div className="space-y-8">
      <HeroSection />
      <ListSection />
    </div>
  );
}

function HeroSection() {
  return (
    <Section className="bg-purple-500 text-white">
      <div className="my-10 flex items-center justify-between gap-20 lg:gap-x-40 xl:gap-x-80">
        <div className="flex w-80 flex-col space-y-6">
          <h1 className="font-serif text-4xl">Discover Validators</h1>
          <p>Stake your CELO with validators to start earning rewards immediately.</p>
          <SolidButton>{`Stake and earn up to 6%`}</SolidButton>
        </div>
        <div className="hidden grid-cols-2 grid-rows-2 gap-10 border border-white/20 p-6 md:grid">
          <HeroStat label="Staking APY" value="6%" />
          <HeroStat label="Validators Groups" value="100" />
          <HeroStat label="Elected Minimum Votes" value="12345" />
          <HeroStat label="Total Staked CELO" value="1234567" />
        </div>
      </div>
    </Section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <label>{label}</label>
      <div className="mt-1 font-serif text-3xl">{value}</div>
    </div>
  );
}

function ListSection() {
  return (
    <Section>
      <Card>TODO</Card>
    </Section>
  );
}
