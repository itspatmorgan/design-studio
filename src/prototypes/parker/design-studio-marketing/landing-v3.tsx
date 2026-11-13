/** @studio-id d1y03hesw480egfc */
import { useDialKit } from '@module/dialkit';
import { LandingPage } from './_components/landing-page';

// An example of DialKit: the hero's type and layout are dials. Tune them in the panel, then save them to code to keep them.
export default function LandingV3() {
  const hero = useDialKit('Hero', {
    titleScale: [1, 0.6, 1.6, 0.05],
    leading: [1.04, 0.9, 1.3, 0.01],
    copyColumn: [1.2, 0.6, 2, 0.1],
    gap: [40, 0, 96, 4],
  });
  return <LandingPage version={3} hero={hero} />;
}
