import React from 'react';
import { slots, partById, wheelById, SECTIONS, sectionOfSlot } from '../build.js';
import { held, nameOfItem, sizeOf, SIZE_NAME, used, CAPACITY, hasRack, packItems, carItems, boxItems, takeFromBox, holdItem, dropItem, stowInCar, takeFromCar, garageItems, storeInGarage, takeFromGarage, inGarageZone } from './items.js';
import { containerById, CONTAINER_RULES } from './loot.js';
import { DEF, planFit, planDetach, toolsHere, openCovers } from './workshop.js';
import { isFitted, missingToDrive } from '../rules/restore.js';
import { game, useGame, owns, priceOf, nameOf, catalogFor, buy, setUnlockAll, addCash, resetProgress } from './store.js';

export function TitleScreen({ onNew, onContinue, onDev }) {
  useGame();
  const [dev, setDev] = React.useState(false), [secret, setSecret] = React.useState(() => /[?&]dev/.test(location.search)), has = game.owned.has('car:bug');
  React.useEffect(() => { const k = e => { if (e.code === 'Backquote') setSecret(s => !s); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return <div className="title-screen">
    <div className="title-panel">
      <span className="eyebrow">A USED-CAR, BUILD-IT-YOURSELF STORY</span>
      <h1>PROJECT <b>BAJA</b></h1>
      <p>You have {'$2,500'}, a dusty lot at the edge of the desert, and a garage waiting to be filled. Find a car, then build it into something that can take the dunes.</p>
      <div className="menu">
        <button className="big" onClick={onNew}>▶ {has ? 'New game' : 'Start'}</button>
        {has && <button className="big" onClick={onContinue}>Continue — drive the Bug home</button>}
        {secret && <button onClick={() => setDev(d => !d)}>{dev ? 'Hide' : 'Show'} developer tools</button>}
        {secret && dev && <><button onClick={() => onDev('drive', 'test')}>Test Center (drive)</button><button onClick={() => onDev('drive', 'open')}>Open Desert race</button><button onClick={() => onDev('pro', 'test')}>Pro physics pad</button><button onClick={() => onDev('garage')}>Parts viewer / customizer</button>
          <label className="check"><input type="checkbox" checked={game.unlockAll} onChange={e => setUnlockAll(e.target.checked)} /> Unlock every part (testing)</label></>}
      </div>
    </div>
    <div className="title-foot">WASD walk · Mouse look · E interact · Esc menu</div>
  </div>;
}

export function DealerPanel({ onBuy, onDrive, onClose }) {
  useGame();
  const owned = game.owned.has('car:bug'), afford = game.cash >= 1800;
  const bar = (label, v) => <div className="cond"><span>{label}</span><i><b style={{ width: `${v}%` }} /></i></div>;
  return <div className="overlay"><div className="card dealer">
    <div className="shop-head"><h2>HONEST AL'S USED CARS</h2><span className="cash">${game.cash.toLocaleString()}</span><button onClick={onClose}>Back</button></div>
    <div className="dealer-cars">
      <div className="car-card">
        <h3>'71 Classic Bug</h3><small>"Runs. Mostly. Don't ask about the heater."</small>
        {bar('Paint', 38)}{bar('Interior', 31)}{bar('Engine', 55)}{bar('Frame', 72)}
        <p className="price">$1,800</p>
        {owned ? <button className="buy" onClick={onDrive}>Drive it home</button> : <button className="buy" disabled={!afford} onClick={onBuy}>{afford ? 'Buy the Bug' : 'Not enough cash'}</button>}
      </div>
      <div className="car-card locked">
        <h3>'78 Half-ton Pickup</h3><small>"Good bones, no motor. Another month, kid."</small>
        <p className="price">$2,300</p><button disabled>Not available yet</button>
      </div>
    </div>
    <p className="hint">You can afford one of the two. Whatever you buy goes into your garage, where you will build it yourself.</p>
  </div></div>;
}

export function LotMenu({ onResume, onExit }) {
  return <div className="overlay"><div className="card"><h2>PAUSED</h2><div className="menu"><button className="big" onClick={onResume}>Resume</button><button onClick={onExit}>Exit to title</button></div></div></div>;
}

export function PauseMenu({ onResume, onCustomize, onExit, onTeleport, teleports, fullscreen, onFullscreen }) {
  useGame();
  return <div className="overlay"><div className="card">
    <h2>PAUSED</h2>
    <div className="menu">
      <button className="big" onClick={onResume}>Resume</button>
      {game.dev && <button onClick={onCustomize}>Customize vehicle (testing)</button>}
      {teleports?.length > 0 && <div className="tp"><small>TELEPORT</small>{teleports.map(t => <button key={t.key} onClick={() => onTeleport(t.key)}>{t.key} · {t.name}</button>)}</div>}
      <button onClick={onFullscreen}>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>
      {game.dev && <label className="check"><input type="checkbox" checked={game.unlockAll} onChange={e => setUnlockAll(e.target.checked)} /> Unlock everything (testing)</label>}
      <div className="row"><span>Cash ${game.cash}</span>{game.dev && <><button onClick={() => addCash(1000)}>+ $1000</button><button onClick={resetProgress}>Reset progress</button></>}</div>
      <button onClick={onExit}>Exit to title</button>
    </div>
  </div></div>;
}

export function ShopPanel({ bodyId, build, previewOf, renderPreview, onBuy, onUnequip, onClose, story }) {
  useGame();
  const [tabSel, setTab] = React.useState('engine'), [sel, setSel] = React.useState(null);
  const cat = catalogFor(bodyId), slotLabel = Object.fromEntries(slots.map(s => [s.id, s.label]));
  const tabs = [...SECTIONS.filter(sec => cat.part.some(p => sectionOfSlot(p.slot) === sec.id)).map(sec => [sec.id, sec.label]), ['wheel', 'Tires'], ['rim', 'Rims']];
  const tab = tabs.some(t => t[0] === tabSel) ? tabSel : tabs[0][0], kindOfTab = tab === 'wheel' ? 'wheel' : tab === 'rim' ? 'rim' : 'part';
  const items = kindOfTab === 'part' ? cat.part.filter(p => sectionOfSlot(p.slot) === tab) : kindOfTab === 'wheel' ? cat.wheel : cat.rim;
  const cur = sel && sel.kind === kindOfTab && (kindOfTab !== 'part' || sectionOfSlot(partById[sel.id].slot) === tab) ? sel : null;
  const equipped = (kind, id) => (kind === 'part' ? build.parts[partById[id].slot] === id : kind === 'wheel' ? build.wheels === id : build.rim === id);
  const own = cur ? owns(cur.kind, cur.id) : false, price = cur ? priceOf(cur.kind, cur.id) : 0, isOn = cur ? equipped(cur.kind, cur.id) : false;
  const it = cur && cur.kind === 'part' ? partById[cur.id] : null;
  return <div className="overlay"><div className="card shop">
    <div className="shop-head"><h2>BAJA PARTS</h2><span className="cash">${game.cash}</span><button onClick={onClose}>Leave shop</button></div>
    <div className="shop-body">
      <div className="shop-side">
        <div className="shop-tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="shop-list">{items.map(x => {
          const o = owns(kindOfTab, x.id), on = equipped(kindOfTab, x.id);
          return <div key={x.id} className={`shop-row${cur?.id === x.id ? ' sel' : ''}`} onClick={() => setSel({ kind: kindOfTab, id: x.id })}>
            <span>{nameOf(kindOfTab, x.id, bodyId)}<small>{kindOfTab === 'part' ? `${slotLabel[x.slot] || x.slot}${x.perf?.topMph ? ` · +${x.perf.topMph} mph` : ''}` : kindOfTab === 'wheel' ? (x.grip?.note || 'Tire set') : 'Rim style'}</small></span>
            <em className={on ? 'tag on' : o ? 'tag' : 'price'}>{on ? 'EQUIPPED' : o ? 'OWNED' : `$${priceOf(kindOfTab, x.id)}`}</em></div>;
        })}</div>
      </div>
      <div className="shop-view">
        <div className="shop-stage">{renderPreview(cur ? previewOf(cur.kind, cur.id) : build, cur && cur.kind !== 'part')}</div>
        <div className="shop-info">
          {cur ? <>
            <div><strong>{nameOf(cur.kind, cur.id, bodyId)}</strong>{it?.perf && <small>{it.perf.topMph ? `+${it.perf.topMph} mph top speed` : ''}{it.perf.power ? ` · ${Math.round((it.perf.power - 1) * 100)}% more power` : ''}</small>}
              {cur.kind === 'wheel' && wheelById[cur.id]?.grip && <small>{wheelById[cur.id].grip.note}</small>}
              {cur.kind === 'rim' && <small>Shown on Rugged tires. Colour it in the customizer.</small>}</div>
            {story ? <button className="buy" disabled={game.cash < price} onClick={() => onBuy(cur.kind, cur.id)}>{game.cash < price ? `Need $${price}` : `Buy $${price} — boxed for pickup`}</button>
              : isOn ? <button onClick={() => onUnequip(cur.kind, cur.id)}>Unequip</button> : own ? <button className="buy" onClick={() => onBuy(cur.kind, cur.id, true)}>Equip</button>
              : <button className="buy" disabled={game.cash < price} onClick={() => onBuy(cur.kind, cur.id)}>{game.cash < price ? `Need $${price}` : `Buy $${price}`}</button>}
          </> : <small>Click an item to preview it on your car. Drag to rotate.</small>}
        </div>
      </div>
    </div>
    {game.unlockAll && <p className="hint">Everything is unlocked (testing). Untick "Unlock everything" in the pause menu to try real buying.</p>}
  </div></div>;
}

export function HudOverlay() {
  useGame();
  return <>
    <div className="hud-top"><b>${game.cash.toLocaleString()}</b></div>
    {game.prompt && <div className="hud-prompt">{game.prompt}</div>}
    {game.toast && <div className="hud-toast">{game.toast.msg}</div>}
    {game.onFoot && <div className="hud-carry">{held() ? <>Hands: <b>{nameOfItem(held())}</b> ({SIZE_NAME[sizeOf(held().kind, held().id)]}) · G put down</> : 'Hands empty'} · Pack {used('pack')}/{CAPACITY.pack}<br />Car: cab {used('cab')}/{CAPACITY.cab}{hasRack() ? ` · roof ${used('roof')}/${CAPACITY.roof}` : ' · no roof rack'} · Tab inventory</div>}
  </>;
}

const Row = ({ it, children }) => <div className="inv-row"><span>{nameOfItem(it)}<small>{SIZE_NAME[sizeOf(it.kind, it.id)]}{it.spot === 'roof' ? ' · roof' : ''}</small></span><span className="inv-btns">{children}</span></div>;

/** what's inside a toolbox / chest / box / crate you just opened */
export function ContainerPanel({ id, onClose }) {
  useGame();
  const c = containerById[id], list = boxItems(id);
  return <div className="overlay"><div className="card inv"><h2>{CONTAINER_RULES[c.type].label.toUpperCase()}</h2>
    {list.length ? list.map(it => <Row key={it.uid} it={it}><button onClick={() => takeFromBox(it.uid)}>Take</button></Row>) : <p className="hint">Nothing (else) in here.</p>}
    <div className="menu">{list.length > 1 && <button onClick={() => list.forEach(it => takeFromBox(it.uid))}>Take all</button>}<button className="big" onClick={onClose}>Close (Esc)</button></div>
    <p className="hint">Small parts go in your pack. Anything bigger has to be carried in your hands, one at a time.</p></div></div>;
}

/** Tab: hands, pack, and the car's storage when you're standing next to it */
export function InventoryPanel({ onClose }) {
  useGame();
  const h = held(), pack = packItems(), car = carItems(), near = game.nearCar, shed = inGarageZone(game.pos.x, game.pos.z), shelf = garageItems();
  const toShelf = it => shed && <button onClick={() => storeInGarage(it.uid)}>Shelve</button>;
  return <div className="overlay"><div className="card inv"><h2>INVENTORY</h2>
    <div className="inv-sec">HANDS</div>{h ? <Row it={h}>{near && <button onClick={() => stowInCar(h.uid)}>Put in car</button>}{toShelf(h)}<button onClick={() => dropItem(h.uid)}>Put down</button></Row> : <p className="hint">Empty</p>}
    <div className="inv-sec">PACK <span>{used('pack')}/{CAPACITY.pack} · small parts only</span></div>
    {pack.length ? pack.map(it => <Row key={it.uid} it={it}><button onClick={() => holdItem(it.uid)}>Hold</button>{near && <button onClick={() => stowInCar(it.uid)}>Put in car</button>}{toShelf(it)}<button onClick={() => dropItem(it.uid)}>Drop</button></Row>) : <p className="hint">Empty</p>}
    <div className="inv-sec">CAR <span>cab {used('cab')}/{CAPACITY.cab}{hasRack() ? ` · roof ${used('roof')}/${CAPACITY.roof}` : ' · fit a roof rack for more'}</span></div>
    {car.length ? car.map(it => <Row key={it.uid} it={it}>{near ? <><button onClick={() => takeFromCar(it.uid)}>Take</button>{toShelf(it)}</> : <small>walk to the car</small>}</Row>) : <p className="hint">Empty</p>}
    <div className="inv-sec">GARAGE SHELVES <span>{shelf.length} parts{shed ? '' : ' · only reachable in your garage'}</span></div>
    {shelf.length ? shelf.map(it => <Row key={it.uid} it={it}>{shed ? <button onClick={() => takeFromGarage(it.uid)}>Take</button> : <small>at the garage</small>}</Row>) : <p className="hint">Empty</p>}
    <div className="menu"><button className="big" onClick={onClose}>Close (Tab)</button></div></div></div>;
}

/** blueprint §3.8: every slot, what's fitted, what's blocking, and fit/detach buttons that follow the same rules as doing it by hand */
export function WorkshopPanel({ build, onFit, onDetach, onDetachUpgrade, onCover, onClose }) {
  useGame();
  const fitted = id => isFitted(DEF, build, id), open = openCovers();
  const reach = [held(), ...packItems(), ...(game.nearCar ? carItems() : [])].filter(Boolean);
  const upgrades = Object.entries(build.parts).filter(([slot]) => slot !== 'engine');
  const need = missingToDrive(DEF, build);
  return <div className="overlay"><div className="card inv workshop"><h2>WORKSHOP — {DEF.name.toUpperCase()}</h2>
    <p className={need.length ? 'ws-bad' : 'ws-good'}>{need.length ? `Won't start. Missing: ${need.map(s => s.name.toLowerCase()).join(', ')}.` : 'Runs and drives.'} <small>Tools here: {[...toolsHere()].join(', ') || 'none'}</small></p>
    <div className="inv-sec">LIDS</div>
    {Object.entries(DEF.covers).map(([id, c]) => fitted(id) && <div key={id} className="inv-row"><span>{c.name[0].toUpperCase() + c.name.slice(1)}<small>{open.has(id) ? 'open' : 'shut'}</small></span><span className="inv-btns"><button onClick={() => onCover(id)}>{open.has(id) ? 'Close' : 'Open'}</button></span></div>)}
    <div className="inv-sec">PARTS</div>
    {DEF.slots.map(s => {
      const on = fitted(s.id), pd = on ? planDetach(s.id, build) : null, cand = !on && reach.map(it => ({ it, plan: planFit(it, build) })).find(x => x.plan.slotName && ((x.it.kind === 'stock' && (x.it.id === s.id || (s.wheel && x.it.id === 'wheel'))) || (s.id === 'engine' && x.it.kind === 'part' && partById[x.it.id]?.slot === 'engine')));
      const label = s.id === 'engine' && build.parts.engine ? partById[build.parts.engine].label : s.name;
      return <div key={s.id} className={`inv-row${on ? '' : ' ws-missing'}`}><span>{label}<small>{on ? 'fitted' : 'missing'}{['start', 'drive', 'steer', 'grip'].includes(s.fn) ? ' · needed to drive' : ''}{!on && !cand ? ' · find one' : ''}{pd && !pd.ok ? ` · ${pd.why}` : ''}{cand && !cand.plan.ok ? ` · ${cand.plan.why}` : ''}</small></span>
        <span className="inv-btns">{on ? <button disabled={!pd.ok && !pd.openCover} onClick={() => onDetach(s.id)}>Detach</button> : cand && <button disabled={!cand.plan.ok && !cand.plan.openCover} onClick={() => onFit(cand.it.uid)}>Fit{cand.it.loc === 'car' ? ' (from car)' : ''}</button>}</span></div>;
    })}
    {upgrades.length > 0 && <div className="inv-sec">BOLT-ONS</div>}
    {upgrades.map(([slot, id]) => <div key={slot} className="inv-row"><span>{nameOf('part', id, build.body)}<small>{slots.find(x => x.id === slot)?.label || slot}</small></span><span className="inv-btns"><button onClick={() => onDetachUpgrade(slot)}>Detach</button></span></div>)}
    {reach.filter(it => it.kind === 'part' && partById[it.id]?.slot !== 'engine' || it.kind === 'wheel' || it.kind === 'rim').map(it => { const plan = planFit(it, build); return <div key={it.uid} className="inv-row"><span>{nameOfItem(it)}<small>{it.loc === 'car' ? 'in the car' : it.loc === 'pack' ? 'in your pack' : 'in your hands'}{plan.ok ? '' : ` · ${plan.why}`}</small></span><span className="inv-btns"><button disabled={!plan.ok} onClick={() => onFit(it.uid)}>Fit</button></span></div>; })}
    <div className="menu"><button className="big" onClick={onClose}>Close (Esc)</button></div>
    <p className="hint">Parts come off into your hands or pack. Engines need the hoist and tires the jack, both in your garage. Covers can be opened here or at the car.</p></div></div>;
}

/** a lifted-off body shell sitting in the yard */
export function ShellPanel({ uid, onFit, onScrap, onClose }) {
  useGame();
  const it = game.items.find(i => i.uid === uid); if (!it) return null;
  const plan = game.build ? planFit(it, game.build) : { ok: false, why: '' };
  return <div className="overlay"><div className="card inv"><h2>{nameOfItem(it).toUpperCase()}</h2>
    <p className="hint">A bare body shell. Too big to carry — it needs a trailer to go anywhere. Lower it back onto the chassis with the garage hoist, or sell it for scrap.</p>
    <div className="menu">
      <button className="big" disabled={!plan.ok} onClick={() => onFit(uid)}>Lower it onto the chassis{plan.ok ? '' : ` — ${plan.why}`}</button>
      <button onClick={() => onScrap(uid)}>Scrap it ($150)</button>
      <button onClick={onClose}>Leave it</button>
    </div></div></div>;
}

/** Dusty's corner store */
export function StorePanel({ onBuy, onClose }) {
  useGame();
  const row = (what, label, price, note) => <div key={what} className="inv-row"><span>{label}<small>{note}</small></span><span className="inv-btns"><button disabled={game.cash < price} onClick={() => onBuy(what, price)}>${price}</button></span></div>;
  return <div className="overlay"><div className="card inv"><div className="shop-head"><h2>DUSTY'S CORNER STORE</h2><span className="cash">${game.cash.toLocaleString()}</span></div>
    {row('stock:battery', '12V car battery', 60, 'small · fits in your pack')}
    {row('tool:wrench', 'Wrench', 15, 'small · bolts most things on and off')}
    {row('tool:jack', 'Floor jack', 90, 'large · change tires anywhere')}
    {row('wash', 'Hand wash & wax', 120, 'cleans up the paint a bit')}
    <div className="menu"><button className="big" onClick={onClose}>Leave (Esc)</button></div></div></div>;
}
