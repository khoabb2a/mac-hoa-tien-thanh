import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { getLang, setLang } from './i18n';
import { clearGame, exportGame, loadGame, readSaveFile, saveGame } from './platform/save';
import { startSim } from './platform/simClient';
import { RegionScene, type RegionPick } from './render/regionScene';
import { IsoScene, type Preview } from './render/scene';
import { stateAt } from './sim/expedition';
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
  // Ghi thất bại (bộ nhớ đầy, chế độ riêng tư chặn IndexedDB...): báo một lần mỗi đợt lỗi, ván vẫn chơi tiếp.
  let saveOk = true;
  let saveFailed = 0;
  const persist = async () => {
    if (resetting) return;
    const ok = await saveGame(world.toSave());
    if (!ok && saveOk) {
      saveFailed++;
      draw();
    }
    saveOk = ok;
  };
  world.subscribe(() => {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => void persist(), 1500);
  });
  setInterval(() => void persist(), 20_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void persist();
  });

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const scene = new IsoScene(canvas, world, (a) => sim.act(a), { low: isLowEnd() });

  let selected: number | null = null;
  let lot: [number, number] | null = null;
  // Bản đồ vùng (mốc 1): dùng chung renderer, IsoScene nhường vẽ và thao tác khi đang xem vùng.
  const region = new RegionScene(scene.renderer, canvas, world);
  let view: 'home' | 'region' = 'home';
  let regionPick: RegionPick = null;
  let squadSel = world.squads[0]?.id ?? 1;
  region.setSelected(squadSel);
  const setView = (v: 'home' | 'region') => {
    view = v;
    region.active = v === 'region';
    scene.setExternal(v === 'region' ? region : null);
    if (v === 'home') region.setPreview(null);
    regionPick = null;
    draw();
  };
  region.setOnPick((p) => {
    regionPick = p;
    if (p?.k === 'squad') squadSel = p.id;
    region.setSelected(squadSel);
    draw();
  });
  let preview: Preview | null = null;
  const hudRoot = document.getElementById('hud')!;

  const actions: HudActions = {
    setTool: (tool) => {
      selected = null;
      lot = null;
      scene.setTool(tool);
      draw();
    },
    confirm: () => scene.confirm(),
    setSpeed: (s) => sim.act({ k: 'speed', speed: s }),
    setOverlay: (on) => scene.setOverlay(on),
    setArt: (on) => scene.setArtMode(on),
    exportSave: () => exportGame(world.toSave()),
    importSave: async (file) => {
      let data;
      try {
        data = await readSaveFile(file);
        World.fromSave(data); // kiểm tra hợp lệ trước khi ghi đè
      } catch {
        return 'invalid';
      }
      resetting = true;
      if (!(await saveGame(data))) {
        // không ghi được: giữ nguyên ván đang chơi, không tải lại trang
        resetting = false;
        return 'storage';
      }
      location.reload();
      return 'ok';
    },
    focusTile: (x, y, ring) => scene.focusTile(x, y, ring),
    setGuide: (tiles) => scene.setGuide(tiles),
    setView,
    selectSquad: (id) => {
      squadSel = id;
      regionPick = { k: 'squad', id };
      region.setSelected(id);
      const sq = world.squads.find((q) => q.id === id);
      if (sq) {
        const p = stateAt(sq, world.region, world.clock.elapsed).pos;
        region.focus(p[0], p[1]);
      }
      draw();
    },
    dispatch: (target) => {
      const r = sim.act({ k: 'dispatch', squad: squadSel, target });
      if (r.ok) regionPick = { k: 'squad', id: squadSel };
      draw();
      return r;
    },
    setRegionPreview: (pts) => region.setPreview(pts),
    newGame: () => {
      resetting = true;
      void clearGame().then(() => location.reload());
    },
  };

  function draw(): void {
    render(
      <Hud
        world={world}
        selected={selected}
        lot={lot}
        preview={preview}
        saveFailed={saveFailed}
        view={view}
        regionPick={regionPick}
        squadSel={squadSel}
        actions={actions}
      />,
      hudRoot,
    );
  }

  scene.setOnSelect((id) => {
    selected = id;
    draw();
  });
  scene.setOnLot((tile) => {
    lot = tile;
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
      tile: (x: number, y: number) => (view === 'region' ? region.tileToScreen(x, y) : scene.tileToScreen(x, y)),
      squads: () => JSON.parse(JSON.stringify(world.squads)),
      focus: (x: number, y: number) => region.focus(x, y),
      nodes: () => world.region.nodes.map((n) => ({ ...n })),
      stats: () => ({ ...world.stats, money: world.linhThach, quest: world.questIndex, coverage: world.linhKhi.coverage }),
      mode: sim.mode,
    };
  }
  registerSW({ immediate: true });
}

void boot();
