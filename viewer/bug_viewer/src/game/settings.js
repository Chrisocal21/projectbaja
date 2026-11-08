// Player settings: kept in their own localStorage key (not in the save), so they apply to every save and survive a new game.
import { game, emit } from './store.js';

const KEY = 'baja-settings-v1';
export const SETTING_DEFAULTS = { creative: false, sens: 1, invertY: false, fov: 70, renderScale: 'auto', keyHints: true, crosshair: true };
/** what the settings panel shows, in order. Every row here is wired to something real. */
export const SETTING_ROWS = [
  { sec: 'Gameplay' },
  { k: 'creative', type: 'toggle', label: 'Creative mode', note: "Building costs nothing. Anything built while it's on gives $0 back when you take it down." },
  { sec: 'Controls' },
  { k: 'sens', type: 'range', label: 'Mouse sensitivity', min: 0.3, max: 2.5, step: 0.05, fmt: v => `${v.toFixed(2)}×` },
  { k: 'invertY', type: 'toggle', label: 'Invert look up/down' },
  { sec: 'Video' },
  { k: 'fov', type: 'range', label: 'Field of view (on foot)', min: 55, max: 100, step: 1, fmt: v => `${v}°` },
  { k: 'renderScale', type: 'choice', label: 'Render resolution', options: [['auto', 'Auto'], [1, '100%'], [0.75, '75%'], [0.5, '50%']], note: 'Lower is faster on slow machines.' },
  { sec: 'HUD' },
  { k: 'keyHints', type: 'toggle', label: 'Show key hints' },
  { k: 'crosshair', type: 'toggle', label: 'Show crosshair' },
];

const load = () => { try { return { ...SETTING_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...SETTING_DEFAULTS }; } };
game.settings = load();
export const settings = () => game.settings;
export const creative = () => !!game.settings.creative;
export function setSetting(k, v) {
  game.settings = { ...game.settings, [k]: v };
  try { localStorage.setItem(KEY, JSON.stringify(game.settings)); } catch {}
  emit();
}
export function resetSettings() { game.settings = { ...SETTING_DEFAULTS }; try { localStorage.removeItem(KEY); } catch {} emit(); }
/** mouse-look multipliers: [x, y] */
export const lookScale = () => [game.settings.sens, game.settings.sens * (game.settings.invertY ? -1 : 1)];
/** Canvas dpr */
export const canvasDpr = () => (game.settings.renderScale === 'auto' ? [1, 2] : game.settings.renderScale);
