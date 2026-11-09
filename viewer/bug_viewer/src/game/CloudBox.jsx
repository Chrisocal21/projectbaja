// Account + cloud save (optional). Guests never see an error: this only appears in the phone Save screen.
// Manual and explicit: Upload / Download. Nothing is overwritten without a question. Cloud works on the deployed site only.
import React, { useState } from 'react';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { game, KEY, writeSave, say } from './store.js';
import { backupSave, FLAG } from './update.jsx';
import { validateImport } from './savefile.js';
import { decideSync, summarize, autoDecision } from './cloudsync.js';

const LAST = 'baja-cloud-last';   // the save time this device last synced with the cloud
const getLast = () => { try { const v = localStorage.getItem(LAST); return v == null ? null : +v; } catch { return null; } };
const setLast = t => { try { localStorage.setItem(LAST, String(t)); } catch {} };

const ls = () => { try { return localStorage; } catch { return null; } };
const when = t => new Date(t).toLocaleString();

function CloudTools() {
  const { getToken } = useAuth();
  const [msg, setMsg] = useState('');
  const call = async (method, body) => {
    const token = await getToken();
    const r = await fetch('/api/save', { method, headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body });
    if (!r.ok && r.status !== 404) throw new Error(String(r.status));
    return r;
  };
  const upload = async () => {
    if (game.dev) return setMsg('Cloud is off in test sessions.');
    if (game.saveLocked) return setMsg('Saving is turned off for this save.');
    try {
      setMsg('Working...'); writeSave();
      const local = ls()?.getItem(KEY), ls1 = summarize(local);
      const cr = await call('GET'); const cloud = cr.status === 404 ? null : await cr.text(), cs = summarize(cloud);
      const d = decideSync(ls1, cs);
      if (d === 'refuse') return setMsg('The cloud save is from a newer game. Update the game first.');
      if (d === 'nothing') return setMsg('Nothing to upload yet.');
      if (d === 'same') return setMsg('Cloud already has this save.');
      if (d === 'ask' && !window.confirm(`The cloud save is from ${when(cs.savedAt)}; this device's is ${when(ls1.savedAt)}. Replace the cloud save with this device's? (The old cloud save is kept as a backup.)`)) return setMsg('Cancelled.');
      await call('PUT', local); setLast(ls1.savedAt); setMsg('Uploaded to the cloud.');
    } catch { setMsg('Cloud not reachable. Your save is still safe on this device.'); }
  };
  const download = async () => {
    if (game.dev) return setMsg('Cloud is off in test sessions.');
    try {
      setMsg('Working...');
      const cr = await call('GET'); if (cr.status === 404) return setMsg('No cloud save yet.');
      const v = validateImport(await cr.text()); if (!v.ok) return setMsg(v.reason);
      const mine = summarize(ls()?.getItem(KEY));
      if (mine && !window.confirm(`Replace this device's save (${when(mine.savedAt)}) with the cloud save (${when(v.savedAt)})? This device's save is kept as a backup first.`)) return setMsg('Cancelled.');
      if (!backupSave('cloud') && ls()?.getItem(KEY)) return setMsg('Could not back up your current save; download cancelled.');
      setLast(v.savedAt); game.saveLocked = false; ls().setItem(KEY, v.text); sessionStorage.setItem(FLAG, '1'); game.live = false; location.reload();
    } catch { setMsg('Cloud not reachable. Your save is still safe on this device.'); }
  };
  return <div><div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}><button onClick={upload}>Upload to cloud</button><button onClick={download}>Download from cloud</button></div>{msg && <small>{msg}</small>}</div>;
}

export function AccountBox() {
  return <div style={{ margin: '8px 0' }}><small>Account (optional): sign in to keep a copy of your save in the cloud</small>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', margin: '6px 0' }}>
      <Show when="signed-out"><SignInButton mode="modal"><button>Sign in</button></SignInButton><SignUpButton mode="modal"><button>Sign up</button></SignUpButton></Show>
      <Show when="signed-in"><UserButton /></Show>
    </div>
    <Show when="signed-in"><CloudTools /></Show></div>;
}

/**
 * Quiet automatic upload (PROPOSAL): while signed in, every minute, send this device's newest save to the cloud, but only when the cloud
 * still holds what this device last synced (see autoDecision). Anything else is left for the player in the phone Save screen.
 * Mounted once, outside the game; does nothing for guests, test sessions or a locked save.
 */
export function CloudAuto() {
  const { isSignedIn, getToken } = useAuth();
  React.useEffect(() => {
    if (!isSignedIn) return;
    let busy = false, stop = false;
    const tick = async () => {
      if (busy || stop || game.dev || game.saveLocked || document.hidden) return;
      busy = true;
      try {
        const local = ls()?.getItem(KEY), ls1 = summarize(local); if (!ls1) return;
        const token = await getToken(), h = { authorization: `Bearer ${token}` };
        const cr = await fetch('/api/save?meta=1', { headers: h });
        if (!cr.ok && cr.status !== 404) return;
        const cs = cr.status === 404 ? null : await cr.json();
        const d = autoDecision(ls1, cs, getLast());
        if (d === 'conflict') { if (!game.cloudNoted) { game.cloudNoted = true; say('Cloud save differs from this device. Open the phone, Save, to choose.'); } return; }
        if (d !== 'upload') return;
        const pr = await fetch('/api/save', { method: 'PUT', headers: { ...h, 'content-type': 'application/json' }, body: local });
        if (pr.ok) setLast(ls1.savedAt);
      } catch { /* offline: try again next minute */ } finally { busy = false; }
    };
    const id = setInterval(tick, 60000), first = setTimeout(tick, 8000);
    return () => { stop = true; clearInterval(id); clearTimeout(first); };
  }, [isSignedIn, getToken]);
  return null;
}
