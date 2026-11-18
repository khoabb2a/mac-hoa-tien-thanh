import { useEffect, useState } from 'preact/hooks';
import { getLang, onLangChange, setLang, t } from '../i18n';
import type { World } from '../sim/world';
import type { SpeedIndex } from '../sim/time';

interface Props {
  world: World;
  onOverlay: (on: boolean) => void;
  onArt: (on: boolean) => void;
  selected: number | null;
}

const NAV = ['build', 'zone', 'disciples', 'encounters', 'sect'] as const;
const NAV_GLYPH: Record<(typeof NAV)[number], string> = { build: '築', zone: '域', disciples: '徒', encounters: '緣', sect: '宗' };

/** HUD màn dọc một tay (GDD 9.2): thanh trên 3 chỉ số + Thời Luân, chip nổi, 5 nút dưới. */
export function Hud({ world, onOverlay, onArt, selected }: Props) {
  const [, force] = useState(0);
  const [overlay, setOverlay] = useState(false);
  const [art, setArt] = useState(true);
  const [newsIdx, setNewsIdx] = useState(0);

  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    const offW = world.subscribe(rerender);
    const offL = onLangChange(rerender);
    const tick = setInterval(rerender, 500);
    const news = setInterval(() => setNewsIdx((i) => (i + 1) % 3), 7000);
    return () => { offW(); offL(); clearInterval(tick); clearInterval(news); };
  }, [world]);

  const c = world.clock;
  const coverage = Math.round(world.linhKhi.coverage * 100);
  const sel = selected === null ? null : world.grid.buildings.find((b) => b.id === selected) ?? null;
  const selQi = sel ? Math.round(world.linhKhi.building.get(sel.id) ?? 0) : 0;

  const setSpeed = (s: SpeedIndex) => { c.speed = s; force((n) => n + 1); };
  const toggleOverlay = () => { const v = !overlay; setOverlay(v); onOverlay(v); };
  const toggleArt = () => { const v = !art; setArt(v); onArt(v); };

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

      <button class="chip art" onClick={toggleArt}>
        <span class="glyph">{art ? '畫' : '模'}</span> {art ? t('view.art') : t('view.blockout')}
      </button>

      <button class={`chip eye ${overlay ? 'on' : ''}`} onClick={toggleOverlay}>
        <span class="glyph">眼</span> {t('overlay.thienNhan')}
      </button>

      {sel && (
        <div class="card">
          <strong>{t(`building.${sel.type}`)}</strong>
          <div>{t('overlay.linhKhi')}: {selQi}</div>
          {sel.type !== 'tuLinhTran' && selQi < 20 && <p class="warn">{t('building.noLinhKhi', { name: t(`building.${sel.type}`) })}</p>}
        </div>
      )}

      <nav class="bottombar">
        {NAV.map((k) => (
          <button title={t('nav.soon')}>
            <span class="glyph">{NAV_GLYPH[k]}</span>
            <span>{t(`nav.${k}`)}</span>
          </button>
        ))}
      </nav>
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
