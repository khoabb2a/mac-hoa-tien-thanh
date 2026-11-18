import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { getLang, setLang } from './i18n';
import { IsoScene } from './render/scene';
import { createDemoWorld } from './sim/world';
import { Hud } from './ui/Hud';
import './styles.css';

/** Máy yếu (iPhone SE 2020: 3 GB RAM) → mức đồ họa "Giản". */
function isLowEnd(): boolean {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const smallScreen = Math.min(screen.width, screen.height) <= 375;
  return (mem !== undefined && mem <= 3) || smallScreen;
}

setLang(getLang());
const world = createDemoWorld();
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const scene = new IsoScene(canvas, world, { low: isLowEnd() });

let selected: number | null = null;
let overlayOn = false;
const hudRoot = document.getElementById('hud')!;
const draw = () =>
  render(
    <Hud
      world={world}
      selected={selected}
      onOverlay={(on) => {
        overlayOn = on;
        scene.setOverlay(overlayOn);
      }}
    />,
    hudRoot,
  );
scene.setOnSelect((id) => {
  selected = id;
  draw();
});
draw();
scene.start();

registerSW({ immediate: true });
