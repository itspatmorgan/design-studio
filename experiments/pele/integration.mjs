import React from 'react';
import { createRoot } from 'react-dom/client';
import { MermaidDiagram } from '../../src/platform/app/diagrams/MermaidDiagram.tsx';
const source =
  'flowchart LR\naccTitle: Integration diagram\naccDescr: Font and container checks\nA[An exceptionally wide label to measure] --> B[Ready]';
let root;
const box = document.createElement('div');
box.style.cssText = 'width:768px;height:600px;display:flex;flex-direction:column';
document.querySelector('#cases').append(box);
window.integration = {
  source,
  mount(props = {}) {
    root = createRoot(box);
    root.render(React.createElement(MermaidDiagram, { source, ...props }));
  },
  sourceChange(next) {
    root.render(React.createElement(MermaidDiagram, { source: next }));
  },
  width(value) {
    box.style.width = `${value}px`;
  },
  hidden(value) {
    box.style.display = value ? 'none' : 'flex';
  },
  family(value) {
    box.style.fontFamily = value;
  },
  unmount() {
    root.unmount();
  },
};
