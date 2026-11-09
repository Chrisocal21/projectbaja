// Pure helpers for save export / import and release detection (no localStorage, no DOM: loads under node).
import { parseSave, FORMAT, CURRENT } from './saveFormat.js';

const pad = n => String(n).padStart(2, '0');
/** projectbaja-main-2026-11-08.baja-save.json */
export const exportFilename = (d = new Date(), slot = 'main') => `projectbaja-${slot}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.baja-save.json`;

/** compare two save versions: -1 older, 0 same, 1 newer than this game understands */
export const compareVersion = (v, current = CURRENT) => (v < current ? -1 : v > current ? 1 : 0);

/**
 * Validate the text of an imported file. Only a real enveloped save (format baja-save) is accepted;
 * corrupt and newer-than-this-game files are refused with a reason for the player.
 */
export function validateImport(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, reason: 'That file is empty.' };
  let j; try { j = JSON.parse(text); } catch { return { ok: false, reason: 'That file is not a save (it is not valid JSON).' }; }
  if (!j || j.format !== FORMAT) return { ok: false, reason: 'That file is not a Project Baja save file.' };
  const r = parseSave(text);
  if (r.status === 'newer') return { ok: false, reason: 'That save is from a newer version of the game. Update the game first.' };
  if (r.status !== 'ok') return { ok: false, reason: 'That save is damaged and cannot be read.' };
  return { ok: true, from: r.from, savedAt: j.savedAt, text };
}

/** parse the body of /version.json; null when it is anything else (a SPA fallback page, an error) */
export function parseVersionFile(text) {
  try { const j = JSON.parse(text); return j && typeof j.id === 'string' && j.id ? j.id : null; } catch { return null; }
}
/** a newer release is out when the deployed id is known and differs from the one this page was built with */
export const isNewRelease = (mine, deployed) => !!deployed && !!mine && mine !== 'dev' && deployed !== mine;
