import ValidatorPage from 'src/features/staking/page';

type Params = { params: { address: Address } };
export const dynamicParams = true;

export default function Page({ params: { address } }: Params) {
  return <ValidatorPage address={address} />;
}
