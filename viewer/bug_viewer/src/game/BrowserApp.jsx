// The phone's Internet app as a browser (Chris, Nov 27, "think GTA phone"): an address bar, a home page of bookmarked sites, and each site its own
// store with its own look. Sites and rules: game/web.js; buying: game/webShop.js. The parts store and Al's lot are the phone's existing apps,
// passed in from Phone.jsx (`parts`, `als`) so nothing is drawn twice. Names, addresses and layout are PROPOSALs.
import { tallyText } from './materials.js';
import React, { useState } from 'react';
import { game, useGame } from './store.js';
import { WEB_SITES, siteById, SUPPLY_BUNDLES, SUPPLY_DELIVERY, SELLER_DROP, listingTotal } from './web.js';
import { buyBundle, buyListing, todaysBoard, boardHoursLeft } from './webShop.js';

export default function BrowserApp({ onBack, parts, als, start = null }) {
  useGame();
  const [site, setSite] = useState(start), s = site && siteById[site];
  return <div className="web">
    <div className="web-bar">
      <button title="Back" onClick={() => (site ? setSite(null) : onBack())}>‹</button>
      <div className="web-url"><span className="web-lock">●</span>{s ? s.url : 'home'}</div>
      <button title="Home" onClick={() => setSite(null)}>⌂</button>
    </div>
    <div className="web-page">
      {!s ? <WebHome open={setSite} />
        : <>
          <div className="web-head" style={{ background: s.color }}><b>{s.name}</b><small>{s.blurb}</small></div>
          {site === 'parts' ? <div className="web-embed">{parts}</div>
            : site === 'als' ? <div className="web-embed">{als}</div>
            : site === 'supply' ? <SupplySite />
            : <ClassifiedSite />}
        </>}
    </div>
    <button className="web-close" onClick={onBack}>Close browser</button>
  </div>;
}

function WebHome({ open }) {
  return <div className="web-home">
    <div className="web-hello"><b>Bookmarks</b><small>Cash ${game.cash.toLocaleString()}</small></div>
    <div className="web-tiles">{WEB_SITES.map(s => <button key={s.id} className="web-tile" style={{ '--c': s.color }} onClick={() => open(s.id)}>
      <span className="web-dot">{s.name[0]}</span><b>{s.name}</b><small>{s.blurb}</small><i>{s.url}</i></button>)}</div>
  </div>;
}

function SupplySite() {
  return <div className="web-body">
    <p className="web-note">Delivered to Walt's garage door, about the same time as a parts order. Delivery ${SUPPLY_DELIVERY}.</p>
    {SUPPLY_BUNDLES.map(b => <div key={b.id} className="web-row"><span><b>{b.name}</b><small>{b.note} · ${(b.price / b.n).toFixed(2)} a piece</small></span>
      <button disabled={game.dev || game.cash < b.price + SUPPLY_DELIVERY} onClick={() => buyBundle(b.id)}>${b.price}</button></div>)}
    <p className="web-note">You have: {tallyText(game.mats)}</p>
  </div>;
}

function ClassifiedSite() {
  const board = todaysBoard(), left = Math.ceil(boardHoursLeft());
  return <div className="web-body">
    <p className="web-note">New posts in about {left} game hour{left === 1 ? '' : 's'}. Junk lots are dropped at Walt's door (+${SELLER_DROP} gas money); parts are boxed at the pickup area.</p>
    {board.length ? board.map(l => <div key={l.id} className="web-post">
      <div className="web-post-top"><b>{l.title}</b><span className="web-price">${l.price}</span></div>
      <small>{l.town} · {l.hoursAgo} h ago{l.type === 'part' ? ` · new $${l.newPrice}` : ''}</small>
      <p>"{l.say}"</p>
      <button disabled={game.dev || game.cash < listingTotal(l)} onClick={() => buyListing(l.id)}>{game.cash < listingTotal(l) ? 'Not enough cash' : `Buy · $${listingTotal(l)}`}</button>
    </div>) : <p className="web-note">Nothing posted right now. Check back tomorrow.</p>}
  </div>;
}
