import { Background } from 'src/components/open-graph/Background';
import { Mondo } from 'src/components/open-graph/MondoLogo';
import { Title } from 'src/components/open-graph/Title';

export function BasePage({ title }: { title: string }) {
  return (
    <Background>
      <Mondo baseSize={80} />
      <Title baseSize={80} text={title} />
    </Background>
  );
}
