// Salvage terms (PURE, loads under node): a wreck or donor is somebody's, so stripping it is not free. Each one carries a posted salvage fee.
// The first time you try to pull a part the game tells you the fee; trying again with the cash pays it and the wreck is yours to strip.
// No owners are named here: the notice just says the fee. Project fields: salvagePaid (true once paid), salvageOffered (true once you were told).
export const FEES = { 1: 25, 2: 60 };   // the two yard donors (projects.js DONORS: the barn's shell, the warehouse's running gear)
export const ROADSIDE_FEE = 35;         // any roadside wreck
export const feeOf = p => (p && FEES[p.uid]) || ROADSIDE_FEE;
export const isFree = p => !p || !!p.salvagePaid || p.id === 'bug';
/** may this part come off? -> { allow, charge, offered, msg } ; `offered`: set the project's salvageOffered flag */
export function salvageGate(p, cash) {
  if (isFree(p)) return { allow: true, charge: 0, offered: false, msg: '' };
  const fee = feeOf(p);
  if (!p.salvageOffered) return { allow: false, charge: 0, offered: true, msg: `A salvage notice is stuck to the ${p.name || 'wreck'}: $${fee} buys the right to strip it. Try again to pay.` };
  if (cash < fee) return { allow: false, charge: 0, offered: false, msg: `The salvage fee is $${fee} and you have $${Math.floor(cash)}.` };
  return { allow: true, charge: fee, offered: false, msg: `Paid the $${fee} salvage fee. It is yours to strip.` };
}
