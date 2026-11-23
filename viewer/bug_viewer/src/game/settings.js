// Player settings: kept in their own localStorage key (not in the save), so they apply to every save and survive a new game.
import { game, emit } from './store.js';

const KEY = 'baja-settings-v1';
export const SETTING_DEFAULTS = { creative: false, sens: 1, invertY: false, fov: 70, renderScale: 'auto', shadows: 'auto', screenHints: false, crosshair: true, showFps: true, speedUnit: 'mph', tempUnit: 'F' };
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
  { k: 'shadows', type: 'choice', label: 'Shadows', options: [['auto', 'Auto'], ['on', 'High'], ['low', 'Low'], ['off', 'Off']], note: 'Auto starts high and turns shadows down by itself if the game runs below about 28 fps.' },
  { sec: 'HUD' },
  { k: 'showFps', type: 'toggle', label: 'Show FPS counter' },
  { k: 'screenHints', type: 'toggle', label: 'Show key hints on screen', note: 'Off by default. Every key is listed under Controls (the tab above).' },
  { k: 'crosshair', type: 'toggle', label: 'Show crosshair' },
  { k: 'speedUnit', type: 'choice', label: 'Speed', options: [['mph', 'mph'], ['kph', 'km/h']] },
  { k: 'tempUnit', type: 'choice', label: 'Temperature', options: [['F', '°F'], ['C', '°C']], note: 'Used by the weather app and the engine temperature gauge.' },
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
/** The real map's layered terrain is expensive at device-pixel-ratio 2. Explicit settings still win. */
/** 'on' | 'low' | 'off'. Auto follows game.perfTier, which the Governor raises when frames are slow (0 high, 1 low, 2+ off). */
export const shadowMode = () => { const s = game.settings.shadows; return s === 'on' || s === 'low' || s === 'off' ? s : ['on', 'low', 'off', 'off'][Math.min(3, game.perfTier || 0)]; };
export const canvasDpr = (heavyWorld = false) => (game.settings.renderScale === 'auto' ? (heavyWorld ? 1 : [1, 2]) : game.settings.renderScale);
