import React from 'react';
import { groupItems } from './invGroups.js';
import { FRESH, WEAR_PARTS, PART_NAME, partCost, serviced } from '../wear.js';
import { slots, partById, wheelById, SECTIONS, sectionOfSlot } from '../build.js';
import { VEHICLE_TYPES, FOR_SALE, activeType, vehicleType } from './fleet.js';
import { SUPPLIES, STORE_ITEMS, jobById, jobCheck } from './jobs.js';
import { sellable } from './sell.js';
import { BUYERS } from './market.js';
import { LETTER, BUILD_ITEMS, BUILD_CATS, buildById, garageClean, RECIPES, hasInGarage, TRAILER_UPGRADES, trailerHas, trailerWhy } from './home.js';
import { held, nameOfItem, sizeOf, SIZE_NAME, used, CAPACITY, packCap, hasRack, storageOf, packItems, carItems, boxItems, takeFromBox, holdItem, dropItem, stowInCar, takeFromCar, garageItems, storeInGarage, takeFromGarage, inGarageZone, vehiclesNear } from './items.js';
import { containerById, CONTAINER_RULES } from './loot.js';
import { matsText, shortOf, tallyText } from './materials.js';
import { DEF, planFit, planDetach, toolsHere, openCovers } from './workshop.js';
import { isFitted, missingToDrive } from '../rules/restore.js';
import { SaveTools } from './update.jsx';
import { game, useGame, owns, priceOf, nameOf, catalogFor, buy, setUnlockAll, addCash, resetProgress, say, save } from './store.js';

export function TitleScreen({ onNew, onContinue, onDev, onSettings, onWiki }) {
  useGame();
  const [dev, setDev] = React.useState(false), [secret, setSecret] = React.useState(() => /[?&]dev(&|$|=)/.test(location.search) || /[?&]dev/.test(location.search)), has = game.owned.has('car:bug');
  React.useEffect(() => { const k = e => { if (e.code === 'Backquote') setSecret(s => !s); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return <div className="title-screen">
    <div className="title-panel">
      <div className="title-sign-lockup">
        <img className="title-sign" src="/images/project-baja-sign.svg" alt="Project:Baja" />
        <img className="title-sign-buggy" src="/images/baja-buggy-cutout.png" alt="" />
      </div>
      <span className="eyebrow">GRANDPA LEFT YOU A GARAGE. NOW MAKE IT GO FAST.</span>
      <div className="menu">
        <button className="big" onClick={onNew}>▶ {has ? 'New game' : 'Start'}</button>
        {has && game.build && <button className="big" onClick={onContinue}>Continue</button>}
        <button onClick={onSettings}>Settings</button>
        <button onClick={onWiki}>Game index</button>
        {secret && <button onClick={() => setDev(d => !d)}>{dev ? 'Hide' : 'Show'} developer tools</button>}
        {secret && dev && <><button onClick={() => onDev('drive', 'county')}>Baja County (free drive)</button><button onClick={() => onDev('drive', 'border')}>Real border map (dev, WIP)</button><button onClick={() => onDev('drive', 'test')}>Test Center (drive)</button><button onClick={() => onDev('drive', 'open')}>Open Desert race</button><button onClick={() => onDev('pro', 'test')}>Pro physics pad</button><button onClick={() => onDev('garage')}>Parts viewer / customizer</button>
          <label className="check"><input type="checkbox" checked={game.unlockAll} onChange={e => setUnlockAll(e.target.checked)} /> Unlock every part (testing)</label></>}
      </div>
    </div>
    <div className="title-foot">WASD walk · Mouse look · E interact · Esc menu</div>
  </div>;
}

export function DealerPanel({ onBuy, onClose }) {
  useGame();
  const bar = (label, v) => <div key={label} className="cond"><span>{label}</span><i><b style={{ width: `${v}%` }} /></i></div>;
  return <div className="overlay"><div className="card dealer">
    <div className="shop-head"><h2>HONEST AL'S USED CARS</h2><span className="cash">${game.cash.toLocaleString()}</span><button onClick={onClose}>Back</button></div>
    <div className="dealer-cars">{FOR_SALE.map(({ id }) => { const t = VEHICLE_TYPES[id], mine = !!game.fleet[id], sellable = !!t.dims;
      return <div key={id} className={`car-card${sellable ? '' : ' locked'}`}>
        <h3>{t.name}</h3><small>"{t.pitch}"</small>
        {Object.entries(t.condition).map(([k, v]) => bar(k, v))}
        <p className="price">${t.price.toLocaleString()}</p>
        {mine ? <button disabled>Yours — parked out front</button> : !sellable ? <button disabled>Not for sale yet</button>
          : <button className="buy" disabled={game.cash < t.price} onClick={() => onBuy(id)}>{game.cash < t.price ? `Need $${t.price.toLocaleString()}` : `Buy the ${t.name}`}</button>}
      </div>; })}</div>
    <p className="hint">The Bug can't haul an engine or a set of big tires. A truck can — load the bed with F, then drive it home.</p>
  </div></div>;
}

/** grandpa's letter, left on the workbench */
export function LetterPanel({ onClose }) {
  return <div className="overlay"><div className="card letter">
    {LETTER.map((l, i) => <p key={i} className={i === 0 || i === LETTER.length - 1 ? 'sig' : ''}>{l}</p>)}
    <div className="menu"><button className="big" onClick={onClose}>Fold it up (Esc)</button></div></div></div>;
}

export function LotMenu({ onResume, onExit }) {
  return <div className="overlay"><div className="card"><h2>PAUSED</h2><div className="menu"><button className="big" onClick={onResume}>Resume</button><button onClick={onExit}>Exit to title</button></div></div></div>;
}

export function PauseMenu({ onResume, onSettings, onWiki, onUpgrades, onCustomize, onExit, onTeleport, teleports, fullscreen, onFullscreen }) {
  useGame();
  return <div className="overlay"><div className="card">
    <h2>PAUSED</h2>
    <div className="menu">
      <button className="big" onClick={onResume}>Resume</button>
      {game.onFoot && <button onClick={onUpgrades}>Upgrades (U)</button>}
      <button onClick={onWiki}>Game index (I)</button>
      <button onClick={onSettings}>Settings{game.settings?.creative ? ' · creative mode on' : ''}</button>
      {game.dev && <button onClick={onCustomize}>Customize vehicle (testing)</button>}
      {teleports?.length > 0 && <div className="tp"><small>TELEPORT</small>{teleports.map(t => <button key={t.key} onClick={() => onTeleport(t.key)}>{t.key} · {t.name}</button>)}</div>}
      <SaveTools />
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

const Row = ({ it, n = 1, children }) => <div className="inv-row"><span>{nameOfItem(it)}{n > 1 && <b> ×{n}</b>}<small>{SIZE_NAME[sizeOf(it.kind, it.id)]}{it.spot === 'roof' ? ' · roof' : it.spot === 'bed' ? ' · bed' : ''}</small></span><span className="inv-btns">{children}</span></div>;

const grouped = list => groupItems(list, nameOfItem);

/** what's inside a toolbox / chest / box / crate you just opened */
export function ContainerPanel({ id, onClose }) {
  useGame();
  const c = containerById[id], list = boxItems(id);
  return <div className="overlay"><div className="card inv"><h2>{CONTAINER_RULES[c.type].label.toUpperCase()}</h2>
    {list.length ? grouped(list).map(({ key, it, n }) => <Row key={key} it={it} n={n}><button onClick={() => takeFromBox(it.uid)}>Take{n > 1 ? ' one' : ''}</button></Row>) : <p className="hint">Nothing (else) in here.</p>}
    <div className="menu">{list.length > 1 && <button onClick={() => list.forEach(it => takeFromBox(it.uid))}>Take all</button>}<button className="big" onClick={onClose}>Close (Esc)</button></div>
    <p className="hint">Small parts go in your pack. Anything bigger has to be carried in your hands, one at a time.</p></div></div>;
}

/** Tab: hands, pack, the storage of every vehicle you are standing at (the one you drive and any you left parked), the garage shelves */
export function InventoryPanel({ onClose }) {
  return <div className="overlay"><div className="card inv"><h2>INVENTORY</h2><InventoryBody /><div className="menu"><button className="big" onClick={onClose}>Close (Tab)</button></div></div></div>;
}
/** hands, pack, car storage, scrap and garage backstock: lives in the phone (Tab) */
export function InventoryBody() {
  useGame();
  const h = held(), pack = packItems(), vehs = vehiclesNear(), shed = inGarageZone(game.pos.x, game.pos.z), shelf = garageItems();
  const shown = [game.active, ...vehs.filter(v => v !== game.active)];   // the one you drive is always listed; parked ones appear when you walk up to them
  const toShelf = it => shed && <button onClick={() => storeInGarage(it.uid)}>Shelve in backstock</button>;
  const putIn = it => vehs.map(v => <button key={v} onClick={() => stowInCar(it.uid, v)}>{vehs.length > 1 ? `Put in ${vehicleType(v).name}` : 'Put in car'}</button>);
  return <>
    <div className="inv-sec">HANDS</div>{h ? <Row it={h}>{putIn(h)}{toShelf(h)}<button onClick={() => dropItem(h.uid)}>Put down</button></Row> : <p className="hint">Empty</p>}
    <div className="inv-sec">PACK <span>{used('pack')}/{packCap()} · small and medium things</span></div>
    {pack.length ? grouped(pack).map(({ key, it, n }) => <Row key={key} it={it} n={n}><button onClick={() => holdItem(it.uid)}>Hold</button>{putIn(it)}{toShelf(it)}<button onClick={() => dropItem(it.uid)}>Drop</button></Row>) : <p className="hint">Empty</p>}
    {shown.map(v => { const t = vehicleType(v), near = vehs.includes(v), list = carItems(v);
      return <React.Fragment key={v}>
        <div className="inv-sec">{t.name.toUpperCase()} <span>{Object.entries(storageOf(v)).map(([k, s]) => `${s.label} ${used(k, v)}/${s.cap}`).join(' · ')}{v === 'bug' && !hasRack() ? ' · fit a roof rack for more' : ''}</span></div>
        {list.length ? grouped(list).map(({ key, it, n }) => <Row key={key} it={it} n={n}>{near ? <><button onClick={() => takeFromCar(it.uid)}>Take</button>{toShelf(it)}</> : <small>walk to it</small>}</Row>) : <p className="hint">Empty</p>}
      </React.Fragment>; })}
    <div className="inv-sec">MATERIALS <span>{tallyText(game.mats)}</span></div>
    <div className="inv-sec">STORAGE ROOM · BACKSTOCK <span>{shelf.length} items{shed ? '' : ' · only reachable in your garage'}</span></div>
    {shelf.length ? grouped(shelf).map(({ key, it, n }) => <Row key={key} it={it} n={n}>{shed ? <button onClick={() => takeFromGarage(it.uid)}>Take</button> : <small>at the garage</small>}</Row>) : <p className="hint">Empty</p>}
  </>;
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
export function StorePanel({ onBuy, onSell, onClose, buyer = 'dusty' }) {
  useGame();
  const sells = sellable(buyer), yard = buyer !== 'dusty';
  const row = (what, label, price, note) => <div key={what} className="inv-row"><span>{label}<small>{note}</small></span><span className="inv-btns"><button disabled={game.cash < price} onClick={() => onBuy(what, price)}>${price}</button></span></div>;
  return <div className="overlay"><div className="card inv"><div className="shop-head"><h2>{yard ? BUYERS[buyer].name.toUpperCase() : (game.storeTitle || "DUSTY'S CORNER STORE")}</h2><span className="cash">${game.cash.toLocaleString()}</span></div>
    {!yard && <><p className="hint">To buy something, take it off a shelf and press E here to pay.</p>{STORE_ITEMS.filter(r => r[0] === 'wash').map(r => row(...r))}</>}
    <div className="inv-sec">SELL TO {BUYERS[buyer].short.toUpperCase()} <span>{sells.length ? 'what you are carrying · prices follow how much they already hold' : 'nothing you are carrying interests them'}</span></div>
    {sells.map(({ it, value, word }) => <div key={it.uid} className="inv-row"><span>{nameOfItem(it)}<small>{word}</small></span><span className="inv-btns"><button onClick={() => onSell(it.uid, buyer)}>Sell ${value}</button></span></div>)}
    <div className="menu"><button className="big" onClick={onClose}>Leave (Esc)</button></div></div></div>;
}

/** a shop out on the map: a barn, a junkyard, an off-road store or a gas-station mart. Each has its own shelf (game/roadShop.js); what you buy leaves it. */
export function RoadShopPanel({ title, shelf, buyer, onBuy, onShip, onSell, onClose }) {
  useGame();
  const sells = sellable(buyer);
  return <div className="overlay"><div className="card inv"><div className="shop-head"><h2>{title}</h2><span className="cash">${game.cash.toLocaleString()}</span></div>
    <div className="inv-sec">FOR SALE <span>{shelf.theme}{shelf.soldCount ? ' · ' + shelf.soldCount + ' already gone' : ''}</span></div>
    {shelf.rows.length ? shelf.rows.map(r => <div key={r.id} className="inv-row"><span>{r.label}<small>{r.note}</small></span><span className="inv-btns"><button disabled={game.cash < r.price} onClick={() => onBuy(r)}>${r.price}</button>{r.ship && onShip && <button disabled={game.cash < r.price + r.ship.fee} title={`Delivered to Walt's garage in about ${r.ship.hours} hours`} onClick={() => onShip(r)}>Deliver ${r.price + r.ship.fee}</button>}</span></div>) : <p className="hint">Nothing left on the shelves.</p>}
    <div className="inv-sec">SELL TO {BUYERS[buyer].short.toUpperCase()} <span>{sells.length ? 'what you are carrying' : 'nothing you are carrying interests them'}</span></div>
    {sells.map(({ it, value, word }) => <div key={it.uid} className="inv-row"><span>{nameOfItem(it)}<small>{word}</small></span><span className="inv-btns"><button onClick={() => onSell(it.uid, buyer)}>Sell ${value}</button></span></div>)}
    <div className="menu"><button className="big" onClick={onClose}>Leave (Esc)</button></div></div></div>;
}

/** the workbench: fabricate parts from scrap metal (needs the shop tools you've built) */
export function FabPanel({ onMake, onDev, onClose }) {
  useGame();
  return <div className="overlay"><div className="card inv"><h2>WORKBENCH</h2>
    <p className="hint">You have: <b>{tallyText(game.mats)}</b>. Shop tools: welder {hasInGarage('welder') ? '✓' : '✗'} · tube bender {hasInGarage('bender') ? '✓' : '✗'} (build them with B).</p>
    <p className="hint">Racks and shelves are built where they stand now: B, pick one, put its blueprint down, bring the materials, then hold left click on it with the wrench.</p>
    <p className="hint">With the angle grinder in your hands, close this and hold left click at the bench to cut scrap into steel. Take a crate apart with the wrench, or a drum with the grinder: aim at it and hold left click.</p>
    {RECIPES.map(r => { const tools = r.tools.every(hasInGarage), short = matsText(shortOf(game.mats, r.mats)), done = r.id === 'shockHoops' && game.build?.fab?.hoops;
      return <div key={r.id} className="inv-row"><span>{r.name}<small>{matsText(r.mats)}{r.tools.length ? ` · needs ${r.tools.map(t => buildById[t].name.toLowerCase()).join(' + ')}` : ''} · {r.note}</small></span>
      <span className="inv-btns"><button disabled={!tools || !!short || done} onClick={() => onMake(r.id)}>{done ? 'Done' : !tools ? 'Need tools' : short ? `Need ${short}` : 'Make'}</button></span></div>; })}
    <WearService />
    <div className="menu">{game.dev && <button onClick={onDev}>Customizer (testing)</button>}<button className="big" onClick={onClose}>Close (Esc)</button></div></div></div>;
}

/** the bench also services the vehicle you drive: shocks, tires, alignment, engine; cheap, and only what is worn */
function WearService() {
  useGame();
  const w = game.home?.wear?.[game.active] || FRESH(), fix = p => { const c = partCost(w, p); if (!c) return; if (game.cash < c) return say('Not enough cash.'); addCash(-c, 'Service: ' + PART_NAME[p]); game.home = { ...game.home, wear: { ...(game.home.wear || {}), [game.active]: serviced(w, p) } }; save(); say(PART_NAME[p] + ' done.'); };
  return <div><h3>SERVICE YOUR VEHICLE</h3>{WEAR_PARTS.map(p => <div key={p} className="inv-row"><span>{PART_NAME[p]}<small>{w[p] < 0.02 ? 'like new' : w[p] < 0.3 ? 'a little worn' : w[p] < 0.6 ? 'worn' : 'worn out'}</small></span><span className="inv-btns"><button disabled={!partCost(w, p)} onClick={() => fix(p)}>{partCost(w, p) ? '$' + partCost(w, p) : 'Fine'}</button></span></div>)}</div>;
}

/** a customer with a small job */
export function JobPanel({ onDo, onClose }) {
  useGame();
  const j = game.job && jobById[game.job.id]; if (!j) return null;
  const c = jobCheck(j);
  return <div className="overlay"><div className="card inv"><h2>{j.title.toUpperCase()}</h2>
    <p><b>{j.who}:</b> "{j.ask}"</p>
    <p className={c.ok ? 'ws-good' : 'ws-bad'}>{c.ok ? `You've got what it needs. Pays $${j.pay}.` : `${c.why} Pays $${j.pay}.`}</p>
    <div className="menu"><button className="big" disabled={!c.ok} onClick={onDo}>Do the job (+${j.pay})</button><button onClick={onClose}>In a bit (Esc)</button></div>
    <p className="hint">No rush — they'll wait. Supplies are at Dusty's store in Dry Wells.</p></div></div>;
}

/** grandpa's trailer: fix it up to live in */
export function TrailerPanel({ onUpgrade, onSleep, onClose }) {
  useGame();
  return <div className="overlay"><div className="card inv"><h2>GRANDPA'S TRAILER</h2>
    <p className="hint">A 1966 single-wide. Musty, leaky, yours.</p>
    {TRAILER_UPGRADES.map(u => <div key={u.id} className="inv-row"><span>{u.name}<small>{u.note}</small></span><span className="inv-btns">{trailerHas(u.id) ? <small>done</small> : <button disabled={!!trailerWhy(u.id)} title={trailerWhy(u.id)} onClick={() => onUpgrade(u.id)}>${u.price}</button>}</span></div>)}
    <div className="menu"><button className="big" disabled={!trailerHas('roof')} onClick={onSleep}>{trailerHas('roof') ? 'Sleep until morning' : 'Sleep (patch the roof first)'}</button><button onClick={onClose}>Leave (Esc)</button></div></div></div>;
}
