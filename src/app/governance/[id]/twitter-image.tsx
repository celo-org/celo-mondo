import { OpenGraphImage } from 'src/app/twitter-image';
import { Background } from 'src/components/open-graph/Background';
import { MondoWithSubText } from 'src/components/open-graph/MondoLogo';
import { ExtraLarge, Title } from 'src/components/open-graph/Title';
export { contentType, size } from 'src/app/twitter-image';
export const runtime = 'edge';

export const alt = 'Celo Governance';
export default function Image(props: { params: { id: string } }) {
  const id = props.params.id.toUpperCase();
  return OpenGraphImage({ children: <Proposal number={id} /> });
}

function Proposal({ number }: { number: string }) {
  return (
    <Background direction="h">
      <MondoWithSubText baseSize={40} subText="Stake" />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: 40,
        }}
      >
        <ExtraLarge text={`🗳️`} />
        <Title baseSize={40} text={`Vote ${number}`} />
      </div>
    </Background>
  );
}
