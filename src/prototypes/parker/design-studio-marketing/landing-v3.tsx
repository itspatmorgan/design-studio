/** @studio-id d1y03hesw480egfc */
// @dialkit {"version":1,"published":true}
import { useBespokeControls } from '@module/dialkit';
import { LandingPage } from './_components/landing-page';

export default function LandingV3() {
  const hero = useBespokeControls('Hero design', {
    headingScale: [1, 0.75, 1.25, 0.01],
    descriptionScale: [1, 0.8, 1.2, 0.01],
    whitespaceScale: [1, 0.5, 1.5, 0.05],
  });
  const illustration = useBespokeControls('Illustration', {
    accent: { type: 'color', default: 'oklch(0.72 0.10 75)' },
    visible: true,
  });
  return <LandingPage version={3} tuning={{...hero, ...illustration}} />;
}
