// Release detection, "Save and update", and the save tools (save now / export / import) for the pause menu.
import React from 'react';
import { game, KEY, writeSave, say, emit, useGame, pruneOldCopies } from './store.js';
import { validateImport, parseVersionFile, isNewRelease, exportFilename } from './savefile.js';
import { parseSave } from './saveFormat.js';

export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
const FLAG = 'baja-resume';
const fake = () => { try { return /[?&]fakeupdate/.test(location.search); } catch { return false; } };

/** poll /version.json (never in dev, unless ?fakeupdate); sets game.updateReady, never reloads by itself */
export function startUpdateWatch() {
  if (typeof window === 'undefined') return;
  if (fake()) { game.updateReady = true; emit(); return; }
  if (import.meta.env.DEV) return;
  const check = async () => {
    if (game.updateReady) return;
    try {
      const r = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      if (isNewRelease(BUILD_ID, parseVersionFile(await r.text()))) { game.updateReady = true; emit(); }
    } catch {}
  };
  setInterval(check, 120000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.addEventListener('focus', check);
}

const store = () => { try { return localStorage; } catch { return null; } };
/** copy the current save aside before anything overwrites it; returns the backup key or null */
export function backupSave(tag = 'manual') {
  const ls = store(); if (!ls) return null;
  try { const raw = ls.getItem(KEY); if (!raw) return null; const k = `baja-save-backup-${tag}-${Date.now()}`; ls.setItem(k, raw); pruneOldCopies(); return k; } catch { return null; }
}
/** is there a real story save to lose? */
export const hasStorySave = () => { try { return parseSave(store()?.getItem(KEY)).status === 'ok' && !!game.owned.has('car:bug') && !!game.build; } catch { return false; } };
/** Title "New game": confirm, and back the old save up first. Returns false when the player says no. */
export function confirmNewGame() {
  if (!hasStorySave()) return true;
  if (!window.confirm('Starting a new game overwrites your save. A backup copy is kept. Continue?')) return false;
  backupSave('newgame'); return true;
}
/** should the page skip the title and go straight back into the game (after Save and update / import)? */
export function takeResumeFlag() {
  let f = false;
  try { f = sessionStorage.getItem(FLAG) === '1'; sessionStorage.removeItem(FLAG); } catch {}
  return f && !game.saveLocked && hasStorySave();
}
export function saveAndReload() {
  writeSave();
  try { sessionStorage.setItem(FLAG, '1'); } catch {}
  location.reload();
}

export function UpdateToast() {
  useGame();
  if (!game.updateReady || game.dev) return null;
  return <button className="update-toast" onClick={saveAndReload}>Update ready - Save and update<small style={{ display: "block", opacity: 0.7, fontWeight: 400 }}>Esc, then Save (phone)</small></button>;
}

export function SaveTools() {
  useGame();
  const [msg, setMsg] = React.useState(''), file = React.useRef(null);
  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
  const saveNow = () => { if (game.dev) return flash('Not saved (test session)'); if (game.saveLocked) return flash('Saving is turned off for this save'); writeSave(); flash('Saved'); };
  const doExport = () => {
    try {
      const raw = store()?.getItem(KEY); if (!raw) return flash('Nothing saved yet');
      writeSave();
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([store().getItem(KEY)], { type: 'application/json' })); a.download = exportFilename(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      flash('Exported');
    } catch { flash('Export failed'); }
  };
  const doImport = async e => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    const r = validateImport(await f.text());
    if (!r.ok) return flash(r.reason);
    if (!window.confirm('Importing replaces your current save. A backup copy is kept. Continue?')) return;
    if (!backupSave('import')) { if (store()?.getItem(KEY)) return flash('Could not back up your current save; import cancelled'); }
    try { game.saveLocked = false; store().setItem(KEY, r.text); sessionStorage.setItem(FLAG, '1'); game.live = false; location.reload(); }
    catch { flash('Could not write the imported save'); }
  };
  const [backups, setBackups] = React.useState(null);   // null = list hidden
  const listBackups = () => { const ls = store(), out = []; try { for (let i = 0; i < ls.length; i++) { const k = ls.key(i), m = /^baja-save-backup-(.+)-(\d+)$/.exec(k); if (m) out.push({ k, tag: m[1], t: +m[2] }); } } catch {} return out.sort((a, b) => b.t - a.t); };
  const restore = b => {
    const raw = store()?.getItem(b.k), r = raw && validateImport(raw);
    if (!r || !r.ok) return flash('That backup could not be read');
    if (!window.confirm('Restore this backup? Your current save is kept as a new backup first.')) return;
    if (!backupSave('restore') && store()?.getItem(KEY)) return flash('Could not back up your current save; restore cancelled');
    try { game.saveLocked = false; store().setItem(KEY, r.text); sessionStorage.setItem(FLAG, '1'); game.live = false; location.reload(); }
    catch { flash('Could not restore'); }
  };
  return <>
    {game.updateReady && <button className="big" onClick={saveAndReload}>Update ready - Save and update</button>}
    <button onClick={() => setBackups(backups ? null : listBackups())}>{backups ? 'Hide backups' : 'Backups'}</button>
    {backups && (backups.length ? backups.map(b => <button key={b.k} onClick={() => restore(b)}>Restore: {new Date(b.t).toLocaleString()} ({b.tag})</button>) : <small>No backups yet. One is made before updates, new games, imports and restores.</small>)}
    <button onClick={saveNow}>Save now{msg === 'Saved' ? ' - Saved' : ''}</button>
    <div className="row"><button onClick={doExport}>Export save</button><button onClick={() => file.current?.click()}>Import save</button></div>
    <input ref={file} type="file" accept=".json,application/json" hidden onChange={doImport} />
    {msg && msg !== 'Saved' && <small>{msg}</small>}
  </>;
}
