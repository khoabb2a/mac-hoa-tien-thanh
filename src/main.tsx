import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { getLang, setLang } from './i18n';
import { clearGame, exportGame, loadGame, readSaveFile, saveGame } from './platform/save';
import { startSim } from './platform/simClient';
import { IsoScene, type Preview } from './render/scene';
import { createDemoWorld, World } from './sim/world';
import { Hud, type HudActions } from './ui/Hud';
import './styles.css';

/** Máy yếu (iPhone SE 2020: 3 GB RAM) → mức đồ họa "Giản". */
function isLowEnd(): boolean {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const smallScreen = Math.min(screen.width, screen.height) <= 375;
  return (mem !== undefined && mem <= 3) || smallScreen;
}

async function boot(): Promise<void> {
  setLang(getLang());

  let save = (await loadGame()) ?? createDemoWorld().toSave();
  try {
    World.fromSave(save);
  } catch {
    save = createDemoWorld().toSave(); // bản lưu hỏng hoặc khác phiên bản
  }
  // Mô phỏng chạy trong Web Worker (máy yếu không giật khi nhà mọc); không được thì chạy tại chỗ.
  const sim = await startSim(save);
  const world = sim.world;
  document.documentElement.dataset.sim = sim.mode;

  // Tự lưu: sau mỗi thay đổi (gom trong 1,5 giây), mỗi 20 giây, và khi rời app.
  let saveTimer = 0;
  let resetting = false; // khi chơi lại/nhập file: không để tự lưu ghi đè trước lúc tải lại trang
  const persist = () => {
    if (!resetting) void saveGame(world.toSave());
  };
  world.subscribe(() => {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persist, 1500);
  });
  setInterval(persist, 20_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const scene = new IsoScene(canvas, world, (a) => sim.act(a), { low: isLowEnd() });

  let selected: number | null = null;
  let preview: Preview | null = null;
  const hudRoot = document.getElementById('hud')!;

  const actions: HudActions = {
    setTool: (tool) => {
      selected = null;
      scene.setTool(tool);
      draw();
    },
    confirm: () => scene.confirm(),
    setSpeed: (s) => sim.act({ k: 'speed', speed: s }),
    setOverlay: (on) => scene.setOverlay(on),
    setArt: (on) => scene.setArtMode(on),
    exportSave: () => exportGame(world.toSave()),
    importSave: async (file) => {
      try {
        const data = await readSaveFile(file);
        World.fromSave(data); // kiểm tra hợp lệ trước khi ghi đè
        resetting = true;
        await saveGame(data);
        location.reload();
        return true;
      } catch {
        return false;
      }
    },
    focusTile: (x, y) => scene.focusTile(x, y),
    newGame: () => {
      resetting = true;
      void clearGame().then(() => location.reload());
    },
  };

  function draw(): void {
    render(<Hud world={world} selected={selected} preview={preview} actions={actions} />, hudRoot);
  }

  scene.setOnSelect((id) => {
    selected = id;
    draw();
  });
  scene.setOnPreview((p) => {
    preview = p;
    draw();
  });
  draw();
  scene.start();
  if (location.search.includes('debug')) {
    (window as unknown as { __debug: object }).__debug = {
      advance: (terms = 1) => sim.act({ k: 'debugAdvance', terms }),
      tile: (x: number, y: number) => scene.tileToScreen(x, y),
      stats: () => ({ ...world.stats, money: world.linhThach, quest: world.questIndex, coverage: world.linhKhi.coverage }),
      mode: sim.mode,
    };
  }
  registerSW({ immediate: true });
}

void boot();
