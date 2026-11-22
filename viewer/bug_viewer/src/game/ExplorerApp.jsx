import React, { useState } from 'react';
import { useGame } from './store.js';
import { KINDS, progress } from './discoveries.js';
import { discoverables, foundMap } from './explorer.js';

const LABEL = { wreck: 'A wreck', race: 'A race course start', stop: 'A roadside stop' };
/** Phone: Explorer. What you have found, and a nudge for what you have not (a direction from a real town, never a pin). */
export default function ExplorerApp({ onBack }) {
  useGame();
  const list = discoverables(), found = foundMap(), prog = progress(list, found), [tab, setTab] = useState(KINDS.find(([k]) => prog.byKind[k])?.[0] || 'town');
  const rows = list.filter(d => d.kind === tab);
  return <div className="phone-soon"><h3>Explorer</h3>
    <small>{list.length ? `${prog.found} of ${prog.total} found. Drive, walk, look around: places are found by getting close.` : 'Nothing to find on this map.'}</small>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>{KINDS.filter(([k]) => prog.byKind[k]).map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} style={{ padding: '3px 7px', fontSize: 12 }} onClick={() => setTab(k)}>{l} {prog.byKind[k].found}/{prog.byKind[k].total}</button>)}</div>
    <div style={{ width: '100%', textAlign: 'left', fontSize: 12, maxHeight: 300, overflowY: 'auto', scrollbarWidth: 'none' }}>{rows.map(d => <div key={d.id} style={{ padding: '4px 0', borderBottom: '1px solid #ffffff18', opacity: found[d.id] ? 1 : 0.7 }}>
      {found[d.id] ? <><b>{d.name}</b></> : <><b>???</b> <small>{d.hint ? `${LABEL[d.kind] || 'Something'}, ${d.hint}` : 'Somewhere out there'}</small></>}
    </div>)}</div>
    <button onClick={onBack}>Back</button></div>;
}
