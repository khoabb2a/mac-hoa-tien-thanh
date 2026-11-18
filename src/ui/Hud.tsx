import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { getLang, onLangChange, setLang, t } from '../i18n';
import type { ActionOutcome, Preview, Tool } from '../render/scene';
import { SPRITE_URL } from '../render/sprites';
import { BUILD_COST, BUILD_MENU, ROAD_COST } from '../sim/economy';
import type { SpeedIndex } from '../sim/time';
import type { World } from '../sim/world';

export interface HudActions {
  setTool: (tool: Tool) => void;
  confirm: () => ActionOutcome | null;
  setOverlay: (on: boolean) => void;
  setArt: (on: boolean) => void;
  exportSave: () => void;
  importSave: (file: File) => Promise<boolean>;
  newGame: () => void;
}

interface Props {
  world: World;
  selected: number | null;
  preview: Preview | null;
  actions: HudActions;
}

const NAV = ['build', 'zone', 'disciples', 'encounters', 'sect'] as const;
type NavKey = (typeof NAV)[number];
const NAV_GLYPH: Record<NavKey, string> = { build: '築', zone: '域', disciples: '徒', encounters: '緣', sect: '宗' };

/** HUD màn dọc một tay (GDD 9.2): thanh trên, chip nổi, thanh xác nhận, bảng cuộn trục, 5 nút dưới. */
export function Hud({ world, selected, preview, actions }: Props) {
  const [, force] = useState(0);
  const [overlay, setOverlay] = useState(false);
  const [art, setArt] = useState(true);
  const [newsIdx, setNewsIdx] = useState(0);
  const [panel, setPanel] = useState<'none' | 'build' | 'sect'>('none');
  const [tool, setToolState] = useState<Tool>({ kind: 'none' });
  const [toast, setToast] = useState<{ text: string; bad: boolean } | null>(null);
  const toastTimer = useRef<number>(0);

  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    const offW = world.subscribe(rerender);
    const offL = onLangChange(rerender);
    const tick = setInterval(rerender, 500);
    const news = setInterval(() => setNewsIdx((i) => (i + 1) % 3), 7000);
    return () => { offW(); offL(); clearInterval(tick); clearInterval(news); };
  }, [world]);

  const say = (text: string, bad = false) => {
    setToast({ text, bad });
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const chooseTool = (next: Tool) => {
    setToolState(next);
    actions.setTool(next);
    setPanel('none');
  };

  const onConfirm = () => {
    const r = actions.confirm();
    if (!r) return;
    if (!r.ok) return say(t(`reason.${r.reason}`), true);
    if (r.kind === 'build' && r.type) say(t('toast.built', { name: t(`building.${r.type}`), cost: r.cost }));
    else if (r.kind === 'road') say(t('toast.road', { cost: r.cost }));
    else if (r.kind === 'demolish') say(t('toast.demolished', { n: -r.cost }));
  };

  const onNav = (k: NavKey) => {
    if (k === 'build') return setPanel(panel === 'build' ? 'none' : 'build');
    if (k === 'sect') return setPanel(panel === 'sect' ? 'none' : 'sect');
    say(t('toast.soon'));
  };

  const c = world.clock;
  const coverage = Math.round(world.linhKhi.coverage * 100);
  const sel = selected === null ? null : world.grid.buildings.find((b) => b.id === selected) ?? null;
  const selQi = sel ? Math.round(world.linhKhi.building.get(sel.id) ?? 0) : 0;
  const setSpeed = (s: SpeedIndex) => { c.speed = s; force((n) => n + 1); };

  return (
    <div class="hud">
      <header class="topbar">
        <div class="stats">
          <Stat label={t('hud.linhThach')} value={world.linhThach.toLocaleString()} />
          <Stat label={t('hud.population')} value={String(world.population)} />
          <Stat label={t('hud.coverage')} value={`${coverage}%`} />
          <button class="lang" onClick={() => setLang(getLang() === 'vi' ? 'en' : 'vi')}>{t('lang.switch')}</button>
        </div>
        <div class="timebar">
          <span class="term">{t(`term.${c.termKey}`)} · {t('hud.year', { n: c.year })}</span>
          <div class="speeds">
            {([0, 1, 2] as SpeedIndex[]).map((s) => (
              <button class={c.speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>{t(`speed.${s}`)}</button>
            ))}
          </div>
        </div>
        <div class="news">{t(`news.${newsIdx}`)}</div>
      </header>

      {tool.kind === 'none' && panel === 'none' && (
        <>
          <button class="chip art" onClick={() => { const v = !art; setArt(v); actions.setArt(v); }}>
            <span class="glyph">{art ? '畫' : '模'}</span> {art ? t('view.art') : t('view.blockout')}
          </button>
          <button class={`chip eye ${overlay ? 'on' : ''}`} onClick={() => { const v = !overlay; setOverlay(v); actions.setOverlay(v); }}>
            <span class="glyph">眼</span> {t('overlay.thienNhan')}
          </button>
        </>
      )}

      {sel && tool.kind === 'none' && panel === 'none' && (
        <div class="card">
          <strong>{t(`building.${sel.type}`)}</strong>
          <div>{t('overlay.linhKhi')}: {selQi}</div>
          {sel.type !== 'tuLinhTran' && selQi < 20 && <p class="warn">{t('building.noLinhKhi', { name: t(`building.${sel.type}`) })}</p>}
        </div>
      )}

      {tool.kind === 'build' && <div class="crosshair" aria-hidden="true" />}

      {tool.kind !== 'none' && preview && (
        <ActionBar tool={tool} preview={preview} onConfirm={onConfirm} onDone={() => chooseTool({ kind: 'none' })} />
      )}

      {panel === 'build' && (
        <Sheet title={t('panel.build')} onClose={() => setPanel('none')}>
          <div class="grid">
            <Item glyph="路" name={t('tool.road')} cost={t('cost.perTile', { n: ROAD_COST })} onPick={() => chooseTool({ kind: 'road' })} />
            {BUILD_MENU.map((type) => (
              <Item
                img={SPRITE_URL[type] ? import.meta.env.BASE_URL + SPRITE_URL[type] : undefined}
                name={t(`building.${type}`)}
                cost={String(BUILD_COST[type])}
                disabled={world.linhThach < BUILD_COST[type]}
                onPick={() => chooseTool({ kind: 'build', type })}
              />
            ))}
            <Item glyph="拆" name={t('tool.demolish')} onPick={() => chooseTool({ kind: 'demolish' })} />
          </div>
        </Sheet>
      )}

      {panel === 'sect' && <SectPanel actions={actions} onClose={() => setPanel('none')} say={say} />}

      {toast && <div class={`toast ${toast.bad ? 'bad' : ''}`}>{toast.text}</div>}

      <nav class="bottombar">
        {NAV.map((k) => (
          <button
            class={(k === 'build' && (panel === 'build' || tool.kind !== 'none')) || (k === 'sect' && panel === 'sect') ? 'on' : ''}
            onClick={() => onNav(k)}
          >
            <span class="glyph">{NAV_GLYPH[k]}</span>
            <span>{t(`nav.${k}`)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function ActionBar({ tool, preview, onConfirm, onDone }: { tool: Tool; preview: Preview; onConfirm: () => void; onDone: () => void }) {
  let hint = '';
  let confirmLabel = t('action.confirm');
  if (tool.kind === 'build') hint = t('hint.build');
  if (tool.kind === 'road') {
    hint = preview.ready ? t('hint.roadReady') : preview.hasStart ? t('hint.roadEnd') : t('hint.roadStart');
    confirmLabel = t('action.confirmRoad');
  }
  if (tool.kind === 'demolish') {
    hint = t('hint.demolish');
    confirmLabel = t('action.confirmDemolish');
  }
  const title = tool.kind === 'build' ? t(`building.${tool.type}`) : t(`tool.${tool.kind}`);
  const bad = preview.ready && !preview.ok && !!preview.reason;
  return (
    <div class="actionbar">
      <div class="info">
        <strong>{title}</strong>
        {preview.cost > 0 && <span class="cost">石 {preview.cost}</span>}
        <div class={`status ${bad ? 'bad' : ''}`}>{bad ? t(`reason.${preview.reason}`) : hint}</div>
      </div>
      <div class="buttons">
        <button class="ghost" onClick={onDone}>{t('action.done')}</button>
        <button class="primary" disabled={!preview.ready || !preview.ok} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  return (
    <div class="sheet">
      <div class="sheet-head">
        <strong>{title}</strong>
        <button onClick={onClose} aria-label={t('panel.close')}>✕</button>
      </div>
      {children}
    </div>
  );
}

function Item(p: { glyph?: string; img?: string; name: string; cost?: string; disabled?: boolean; onPick: () => void }) {
  return (
    <button class="item" disabled={p.disabled} onClick={p.onPick}>
      <span class="thumb">{p.img ? <img src={p.img} alt="" /> : <span class="glyph">{p.glyph}</span>}</span>
      <span class="name">{p.name}</span>
      {p.cost && <span class="cost">石 {p.cost}</span>}
    </button>
  );
}

function SectPanel({ actions, onClose, say }: { actions: HudActions; onClose: () => void; say: (s: string, bad?: boolean) => void }) {
  const [armed, setArmed] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  return (
    <Sheet title={t('sect.title')} onClose={onClose}>
      <p class="note">{t('sect.autosave')}</p>
      <div class="rows">
        <button onClick={actions.exportSave}>{t('sect.export')}</button>
        <button onClick={() => file.current?.click()}>{t('sect.import')}</button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = (e.currentTarget as HTMLInputElement).files?.[0];
            if (f && !(await actions.importSave(f))) say(t('sect.importFail'), true);
          }}
        />
        <button class={armed ? 'danger' : ''} onClick={() => (armed ? actions.newGame() : setArmed(true))}>
          {armed ? t('sect.newGameConfirm') : t('sect.newGame')}
        </button>
      </div>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div class="stat">
      <span class="v">{value}</span>
      <span class="l">{label}</span>
    </div>
  );
}
