/** @studio-id aa1q57swhwgk759f */
// @dialkit {"version":1,"published":true}
import { useBespokeControls } from '@module/dialkit';
import { LandingPage } from './_components/landing-page';

export default function LandingV1() {
  const hero = useBespokeControls('Hero design', {
    headingScale: [1, 0.75, 1.25, 0.01],
    descriptionScale: [1, 0.8, 1.2, 0.01],
    whitespaceScale: [1, 0.5, 1.5, 0.05],
  });
  return <LandingPage version={1} tuning={{...hero}} />;
}
