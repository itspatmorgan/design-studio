/** @studio-id 3g4re0qa91m0q9y4 */
// @dialkit {"version":1,"published":true}
import { useBespokeControls } from '@module/dialkit';
import { LandingPage } from './_components/landing-page';

export default function LandingV2() {
  const hero = useBespokeControls('Hero design', {
    headingScale: [1, 0.75, 1.25, 0.01],
    descriptionScale: [1, 0.8, 1.2, 0.01],
    whitespaceScale: [1, 0.5, 1.5, 0.05],
  });
  const illustration = useBespokeControls('Illustration', {
    accent: { type: 'color', default: 'oklch(0.72 0.10 75)' },
    visible: true,
  });
  return <LandingPage version={2} tuning={{...hero, ...illustration}} />;
}
