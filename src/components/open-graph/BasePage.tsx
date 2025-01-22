import { Background } from 'src/components/open-graph/Background';
import { Mondo } from 'src/components/open-graph/MondoLogo';
import { Title } from 'src/components/open-graph/Title';

export function BasePage({ title }: { title: string }) {
  const textSize = title.length > 12 ? 50 : 80;
  return (
    <Background>
      <Mondo baseSize={80} />
      <Title baseSize={textSize} text={title} />
    </Background>
  );
}
