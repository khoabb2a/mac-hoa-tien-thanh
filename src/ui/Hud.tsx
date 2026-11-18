import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { getLang, onLangChange, setLang, t } from '../i18n';
import type { ActionOutcome, Preview, Tool } from '../render/scene';
import { SPRITE_URL } from '../render/sprites';
import { BUILD_COST, BUILD_MENU, ROAD_COST } from '../sim/economy';
import { FENG_SHUI_BONUS } from '../sim/fengShui';
import { QUESTS, type QuestDef, type QuestUi } from '../sim/quests';
import type { SpeedIndex } from '../sim/time';
import type { World } from '../sim/world';
import { ZONE_COST, ZONES, type ZoneType } from '../sim/zones';

export interface HudActions {
  setTool: (tool: Tool) => void;
  setSpeed: (s: SpeedIndex) => void;
  confirm: () => ActionOutcome | null;
  setOverlay: (on: boolean) => void;
  setArt: (on: boolean) => void;
  exportSave: () => void;
  importSave: (file: File) => Promise<boolean>;
  newGame: () => void;
  /** Lướt camera tới ô và khoanh vòng (nút "Chỉ cho tôi"). */
  focusTile: (x: number, y: number) => void;
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
const ZONE_GLYPH: Record<ZoneType, string> = { cu: '居', thi: '市', dien: '田' };

/** HUD màn dọc một tay (GDD 9.2): thanh trên, chip nổi, thanh xác nhận, bảng cuộn trục, 5 nút dưới. */
export function Hud({ world, selected, preview, actions }: Props) {
  const [, force] = useState(0);
  const [overlay, setOverlay] = useState(false);
  const [art, setArt] = useState(true);
  const [newsIdx, setNewsIdx] = useState(0);
  const [panel, setPanel] = useState<'none' | 'build' | 'zone' | 'sect' | 'demand'>('none');
  const [tool, setToolState] = useState<Tool>({ kind: 'none' });
  const [toast, setToast] = useState<{ text: string; bad: boolean } | null>(null);
  const toastTimer = useRef<number>(0);
  const [tut, setTut] = useState<number | null>(() => (tutorialDone() ? null : 0));
  const [questOpen, setQuestOpen] = useState(false);
  const [pulse, setPulse] = useState<QuestUi | null>(null);
  const pulseTimer = useRef<number>(0);
  const lastQuest = useRef(world.questIndex);
  const [questFlash, setQuestFlash] = useState(false);

  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    const offW = world.subscribe(rerender);
    const offL = onLangChange(rerender);
    const tick = setInterval(rerender, 500);
    const news = setInterval(() => setNewsIdx((i) => (i + 1) % 3), 7000);
    return () => { offW(); offL(); clearInterval(tick); clearInterval(news); };
  }, [world]);

  const say = (text: string, bad = false, ms = 2600) => {
    setToast({ text, bad });
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  // Mừng khi Worker báo đã xong một Thiên Đạo Lệnh (chỉ số tăng trong ảnh chụp).
  useEffect(() => {
    if (world.questIndex > lastQuest.current) {
      const q = QUESTS[world.questIndex - 1];
      say(t('quest.completed', { name: t(`quest.${q.id}.title`), n: q.reward }), false, 4200);
      setQuestFlash(true);
      window.setTimeout(() => setQuestFlash(false), 2400);
    }
    lastQuest.current = world.questIndex;
  });

  const showMe = (q: QuestDef) => {
    setQuestOpen(false);
    if (q.focus.ui === 'eye' || q.focus.ui === 'demand') chooseTool({ kind: 'none' });
    else setPanel('none');
    if (q.focus.tile) actions.focusTile(q.focus.tile[0], q.focus.tile[1]);
    if (q.focus.ui) {
      setPulse(q.focus.ui);
      clearTimeout(pulseTimer.current);
      pulseTimer.current = window.setTimeout(() => setPulse(null), 5000);
    }
  };

  const endTutorial = () => {
    setTut(null);
    markTutorialDone();
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
    else if (r.kind === 'zone' && r.zone) say(t('toast.zoned', { n: r.tiles ?? 0, name: t(`zone.${r.zone}`), cost: r.cost }));
    else if (r.kind === 'demolish') say(t('toast.demolished', { n: -r.cost }));
  };

  const onNav = (k: NavKey) => {
    setQuestOpen(false);
    if (k === 'build') return setPanel(panel === 'build' ? 'none' : 'build');
    if (k === 'sect') return setPanel(panel === 'sect' ? 'none' : 'sect');
    if (k === 'zone') return setPanel(panel === 'zone' ? 'none' : 'zone');
    say(t('toast.soon'));
  };

  const c = world.clock;
  const coverage = Math.round(world.linhKhi.coverage * 100);
  const sel = selected === null ? null : world.grid.buildings.find((b) => b.id === selected) ?? null;
  const selQi = sel ? Math.round(world.linhKhi.building.get(sel.id) ?? 0) : 0;
  const setSpeed = (s: SpeedIndex) => { actions.setSpeed(s); force((n) => n + 1); };

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
              <button class={`${c.speed === s ? 'on' : ''} ${s === 2 && pulse === 'speed' ? 'pulse' : ''}`} onClick={() => setSpeed(s)}>{t(`speed.${s}`)}</button>
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
          <button class={`chip eye ${overlay ? 'on' : ''} ${pulse === 'eye' ? 'pulse' : ''}`} onClick={() => { const v = !overlay; setOverlay(v); actions.setOverlay(v); }}>
            <span class="glyph">眼</span> {t('overlay.thienNhan')}
          </button>
        </>
      )}

      {tool.kind === 'none' && (panel === 'none' || panel === 'demand') && (
        <DemandBars world={world} open={panel === 'demand'} pulse={pulse === 'demand'} onToggle={() => setPanel(panel === 'demand' ? 'none' : 'demand')} />
      )}

      <QuestPanel
        world={world}
        open={questOpen && tool.kind === 'none'}
        flash={questFlash}
        onToggle={() => { setQuestOpen(!questOpen); if (panel !== 'none') setPanel('none'); }}
        onShowMe={showMe}
      />

      {sel && tool.kind === 'none' && panel === 'none' && !questOpen && (
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

      {panel === 'zone' && (
        <Sheet title={t('panel.zone')} onClose={() => setPanel('none')}>
          <p class="note">{t('zone.note')}</p>
          <div class="grid">
            {ZONES.map((z) => (
              <Item glyph={ZONE_GLYPH[z]} swatch={z} name={t(`zone.${z}`)} cost={t('cost.perTile', { n: ZONE_COST })} onPick={() => chooseTool({ kind: 'zone', type: z })} />
            ))}
            <Item glyph="拆" name={t('zone.clear')} onPick={() => chooseTool({ kind: 'demolish' })} />
          </div>
        </Sheet>
      )}

      {panel === 'sect' && (
        <SectPanel
          actions={actions}
          onClose={() => setPanel('none')}
          say={say}
          onTutorial={() => { setPanel('none'); setQuestOpen(false); setTut(0); }}
        />
      )}

      {toast && <div class={`toast ${toast.bad ? 'bad' : ''}`}>{toast.text}</div>}

      <nav class="bottombar">
        {NAV.map((k) => (
          <button
            class={`${
              (k === 'build' && (panel === 'build' || tool.kind === 'build' || tool.kind === 'road')) ||
              (k === 'zone' && (panel === 'zone' || tool.kind === 'zone')) ||
              (k === 'sect' && panel === 'sect')
                ? 'on'
                : ''
            } ${pulse === k ? 'pulse' : ''}`}
            onClick={() => onNav(k)}
          >
            <span class="glyph">{NAV_GLYPH[k]}</span>
            <span>{t(`nav.${k}`)}</span>
          </button>
        ))}
      </nav>

      {tut !== null && (
        <Tutorial step={tut} onNext={() => (tut + 1 < TUT_TARGET.length ? setTut(tut + 1) : endTutorial())} onSkip={endTutorial} />
      )}
    </div>
  );
}

// ---------- Thiên Đạo Lệnh ----------

function QuestPanel(p: { world: World; open: boolean; flash: boolean; onToggle: () => void; onShowMe: (q: QuestDef) => void }) {
  const q = QUESTS[p.world.questIndex];
  const prog = q ? Math.min(q.progress(p.world), q.target) : 0;
  return (
    <div class="quest">
      <button class={`quest-pill ${p.flash ? 'flash' : ''}`} onClick={p.onToggle} aria-expanded={p.open}>
        <span class="seal glyph">令</span>
        <span class="qt">{q ? t(`quest.${q.id}.title`) : t('quest.label')}</span>
        {q && <span class="qp">{t('quest.progress', { a: Math.floor(prog), b: q.target })}</span>}
      </button>
      {p.open && (
        <div class="quest-card">
          <div class="qlabel">{t('quest.label')} · {Math.min(p.world.questIndex + 1, QUESTS.length)}/{QUESTS.length}</div>
          {q ? (
            <>
              <p>{t(`quest.${q.id}.desc`)}</p>
              <p class="qhint"><b>{t('quest.hint')}:</b> {t(`quest.${q.id}.hint`)}</p>
              <div class="qbar"><span style={{ width: `${(prog / q.target) * 100}%` }} /></div>
              <div class="qfoot">
                <span class="qreward">石 {t('quest.reward', { n: q.reward })}</span>
                {(q.focus.ui || q.focus.tile) && (
                  <button class="primary" onClick={() => p.onShowMe(q)}>{t('quest.showMe')}</button>
                )}
              </div>
            </>
          ) : (
            <p>{t('quest.allDone')}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- hướng dẫn mở đầu ----------

/** Phần tử được soi ở từng bước (null = không soi, thẻ ở giữa). */
const TUT_TARGET: Array<string | null> = [null, null, '.stats', '.speeds', '.chip.eye', '.demand-bars', '.bottombar', '.quest-pill'];
const TUT_KEY = 'mhtt.tutorialDone';

function tutorialDone(): boolean {
  try {
    return localStorage.getItem(TUT_KEY) === '1';
  } catch {
    return false;
  }
}
function markTutorialDone(): void {
  try {
    localStorage.setItem(TUT_KEY, '1');
  } catch {
    /* chế độ riêng tư: bỏ qua */
  }
}

function Tutorial({ step, onNext, onSkip }: { step: number; onNext: () => void; onSkip: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const sel = TUT_TARGET[step];
      const el = sel ? document.querySelector(sel) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);
  const last = step === TUT_TARGET.length - 1;
  // thẻ nằm phía đối diện phần tử được soi để không che nó
  const place = !rect ? 'mid' : rect.top + rect.height / 2 > window.innerHeight / 2 ? 'top' : 'bottom';
  const pad = 6;
  return (
    <div class="tut" role="dialog" aria-modal="true">
      {rect ? (
        <div class="tut-hole" style={{ left: `${rect.left - pad}px`, top: `${rect.top - pad}px`, width: `${rect.width + pad * 2}px`, height: `${rect.height + pad * 2}px` }} />
      ) : (
        <div class={`tut-dim ${step === 1 ? 'light' : ''}`} />
      )}
      <div class={`tut-card ${place}`}>
        <div class="tut-head">
          <span class="seal glyph">老</span>
          <strong>{t('tut.elder')}</strong>
          <span class="tut-step">{t('tut.step', { a: step + 1, b: TUT_TARGET.length })}</span>
        </div>
        <p>{t(`tut.${step}`)}</p>
        <div class="tut-buttons">
          {!last && <button class="ghost" onClick={onSkip}>{t('tut.skip')}</button>}
          <button class="primary" onClick={onNext}>{last ? t('tut.start') : t('tut.next')}</button>
        </div>
      </div>
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
  if (tool.kind === 'zone') {
    hint = preview.ready ? t('hint.zoneReady') : preview.hasStart ? t('hint.zoneEnd') : t('hint.zoneStart');
    confirmLabel = t('action.confirmZone');
  }
  const title =
    tool.kind === 'build' ? t(`building.${tool.type}`) : tool.kind === 'zone' ? t(`zone.${tool.type}`) : t(`tool.${tool.kind}`);
  const fs = preview.fengShui;
  const bad = preview.ready && !preview.ok && !!preview.reason;
  return (
    <div class="actionbar">
      <div class="info">
        <strong>{title}</strong>
        {preview.cost > 0 && <span class="cost">石 {preview.cost}</span>}
        <div class={`status ${bad ? 'bad' : ''}`}>{bad ? t(`reason.${preview.reason}`) : hint}</div>
        {fs && (
          <div class="fs">
            {t('fs.label')}: <b>{t(`fs.${fs.score}`)}</b>
            <span class={fs.back ? 'yes' : ''} title={t('fs.back')}>山</span>
            <span class={fs.water ? 'yes' : ''} title={t('fs.water')}>水</span>
            <span class={fs.vein ? 'yes' : ''} title={t('fs.vein')}>脈</span>
            {fs.score > 0 && <span class="bonus">{t('fs.bonus', { n: Math.round(fs.score * FENG_SHUI_BONUS * 100) })}</span>}
          </div>
        )}
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

function Item(p: { glyph?: string; img?: string; swatch?: ZoneType; name: string; cost?: string; disabled?: boolean; onPick: () => void }) {
  return (
    <button class="item" disabled={p.disabled} onClick={p.onPick}>
      <span class={`thumb ${p.swatch ? `swatch-${p.swatch}` : ''}`}>{p.img ? <img src={p.img} alt="" /> : <span class="glyph">{p.glyph}</span>}</span>
      <span class="name">{p.name}</span>
      {p.cost && <span class="cost">石 {p.cost}</span>}
    </button>
  );
}

function SectPanel({ actions, onClose, say, onTutorial }: { actions: HudActions; onClose: () => void; say: (s: string, bad?: boolean) => void; onTutorial: () => void }) {
  const [armed, setArmed] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  return (
    <Sheet title={t('sect.title')} onClose={onClose}>
      <p class="note">{t('sect.autosave')}</p>
      <div class="rows">
        <button onClick={onTutorial}>{t('sect.tutorial')}</button>
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

/** Tam Tài Khí (≈ thanh RCI của SimCity): ba cột mực Cư – Thị – Điền; lên = đang thiếu, xuống = đang thừa. */
function DemandBars({ world, open, pulse, onToggle }: { world: World; open: boolean; pulse: boolean; onToggle: () => void }) {
  const d = world.stats.demand;
  return (
    <div class="demand">
      {open && (
        <div class="demand-pop">
          <strong>{t('demand.title')}</strong>
          <div>{t('demand.residents', { n: world.stats.residents })}</div>
          <div>{t('demand.jobs', { a: world.stats.thiJobs, b: world.stats.dienJobs })}</div>
          <div>{t('demand.income', { n: world.lastIncome })}</div>
          <p class="note">{t('demand.help')}</p>
        </div>
      )}
      <button class={`demand-bars ${pulse ? 'pulse' : ''}`} onClick={onToggle} aria-label={t('demand.title')}>
        {ZONES.map((z) => {
          const v = d[z];
          const h = Math.round(Math.abs(v) * 26);
          return (
            <span class={`bar bar-${z}`}>
              <span class="track">
                <span class={`fill ${v >= 0 ? 'up' : 'down'}`} style={{ height: `${h}px` }} />
              </span>
              <span class="glyph">{ZONE_GLYPH[z]}</span>
            </span>
          );
        })}
      </button>
    </div>
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
