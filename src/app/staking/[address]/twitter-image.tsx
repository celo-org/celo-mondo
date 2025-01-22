import { accountsABI } from '@celo/abis';
import { OpenGraphImage } from 'src/app/twitter-image';
import { Background } from 'src/components/open-graph/Background';
import { MondoWithSubText } from 'src/components/open-graph/MondoLogo';
import { Portrait } from 'src/components/open-graph/Portrait';
import { Addresses } from 'src/config/contracts';
import { VALIDATOR_GROUPS } from 'src/config/validators';
import { createCeloPublicClient } from 'src/utils/client';
export { contentType, size } from 'src/app/twitter-image';

export const alt = 'Stake';
// cant use wagmi here as this is serverside
async function fetchName(address: Address) {
  const client = createCeloPublicClient();
  const accountName = await client.readContract({
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'getName',
    args: [address],
  });
  return accountName;
}

export default async function Image({ params }: { params: { address: Address } }) {
  const name = await fetchName(params.address);
  const group = VALIDATOR_GROUPS[params.address];
  const logo = group?.logo;
  return OpenGraphImage({
    children: <Validator name={name} imagePath={logo} address={params.address} />,
  });
}

function Validator({
  name,
  imagePath,
  address,
}: {
  name: string;
  imagePath: string;
  address: Address;
}) {
  return (
    <Background direction="h">
      <MondoWithSubText baseSize={40} subText="Stake" />
      <Portrait name={name} relativeImage={imagePath} address={address} />
    </Background>
  );
}
