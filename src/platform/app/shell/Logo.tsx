// The app's mark, shown at the top of the rail. It is filled with the current text colour, so it is dark
// in light mode and light in dark mode with nothing to switch. To use your own, replace the paths below
// (and public/favicon.svg, which carries the same shapes for the browser tab).
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='12.48 12 25.03 24' fill='currentColor' aria-hidden='true' {...props}>
      <path d='M21.3943 12H12.48V36H21.3943V12Z' />
      <path d='M23.7944 12H25.5087C28.6913 12 31.7436 13.2643 33.994 15.5147C36.2444 17.7652 37.5087 20.8174 37.5087 24C37.5087 27.1826 36.2444 30.2348 33.994 32.4853C31.7436 34.7357 28.6913 36 25.5087 36H23.7944V12Z' />
    </svg>
  );
}
