import React from 'react';
import { createRoot } from 'react-dom/client';
import { MermaidDiagram as Current } from './baseline/MermaidDiagram.tsx';
import { MermaidDiagram as Candidate } from '../../src/platform/app/diagrams/MermaidDiagram.tsx';
import '../../src/platform/systems/studio/styles/theme.css';
import './style.css';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(host, phase) {
  for (let i = 0; i < 150; i++) {
    if (host.querySelector('figure')?.dataset.artifactPhase === phase) return;
    await wait(20);
  }
  throw new Error(`Lifecycle did not reach ${phase}: ${host.textContent}`);
}
const snapshot = host => {
  const clone = host.cloneNode(true);
  clone.querySelectorAll('style').forEach(n => n.remove());
  return { ...host.querySelector('figure')?.dataset, svg: Boolean(host.querySelector('svg')), text: clone.textContent };
};
window.lifecycleProbe = async engine => {
  const Component = engine === 'pele' ? Candidate : Current;
  const host = document.createElement('section');
  document.querySelector('main').append(host);
  const root = createRoot(host);
  const initial = 'flowchart LR\naccTitle: Lifecycle probe\naccDescr: Revision and recovery\nA[First] --> B[Ready]';
  root.render(React.createElement(Component, { source: initial }));
  await until(host, 'ready');
  const ready = snapshot(host);
  // Replace a source before inspecting the final committed revision.

  root.render(React.createElement(Component, { source: 'flowchart LR\nA[Obsolete] --> B[Old]' }));
  await wait(20);
  const stale = snapshot(host);
  root.render(React.createElement(Component, { source: 'flowchart LR\nA[Latest] --> B[Current]' }));
  await until(host, 'ready');
  await wait(120);
  const rapid = snapshot(host);
  root.render(React.createElement(Component, { source: 'flowchart LR\nA[unfinished' }));
  await until(host, 'error');
  const invalid = snapshot(host);
  root.render(React.createElement(Component, { source: initial }));
  await until(host, 'ready');
  const recovered = snapshot(host);
  document.documentElement.classList.toggle('dark');
  await wait(120);
  await until(host, 'ready');
  const theme = snapshot(host);

  root.render(React.createElement(Component, { source: 'flowchart LR\nA[Unmount] --> B[Done]' }));
  await wait(20);
  root.unmount();
  await wait(120);
  const unmounted = host.innerHTML === '';
  return { ready, stale, rapid, invalid, recovered, theme, unmounted };
};
