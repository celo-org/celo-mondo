import { OpenGraphImage } from 'src/app/twitter-image';
import { Background } from 'src/components/open-graph/Background';
import { MondoWithSubText } from 'src/components/open-graph/MondoLogo';
import { Portrait } from 'src/components/open-graph/Portrait';
import { getDelegateeMetadata } from 'src/features/delegation/delegateeMetadata';

export { contentType, size } from 'src/app/twitter-image';
// export const runtime = 'edge';

export const alt = 'Delegate';

export default function Image({ params: { address } }: { params: { address: Address } }) {
  const metadata = getDelegateeMetadata();

  const { name, logoUri } = metadata[address];

  return OpenGraphImage({ children: <Delgatee name={name} address={address} logoUri={logoUri} /> });
}

function Delgatee({ name, logoUri, address }: { name: string; address: Address; logoUri: string }) {
  return (
    <Background direction="h">
      <MondoWithSubText baseSize={40} subText="Delegate" />
      <Portrait name={name} relativeImage={logoUri} address={address} />
    </Background>
  );
}
