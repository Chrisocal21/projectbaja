// Reputation and regulars (PURE, loads under node). Doing odd jobs well makes the place known: a better standing pays a little more,
// sends customers sooner, and a customer who keeps coming back becomes a regular. No timers, nobody leaves angry (jobs.js: "no stress").
// home.rep 0..100, home.regulars { who: visits }. PROPOSAL numbers, tune by feel.
export const REP_MAX = 100, REP_PER_JOB = 2, REGULAR_AT = 3;
export const STANDINGS = [[60, 'the place to go'], [30, 'trusted'], [10, 'known'], [0, 'unknown']];
export const repOf = home => Math.max(0, Math.min(REP_MAX, home?.rep | 0));
export const visitsOf = (home, who) => home?.regulars?.[who] | 0;
export const standing = rep => STANDINGS.find(([min]) => rep >= min)[1];
export const isRegular = (home, who) => visitsOf(home, who) >= REGULAR_AT;
/** what a job pays: the base, plus up to 25% for standing, plus 10% from a regular */
export const payFor = (base, home, who) => Math.round(base * (1 + Math.min(0.25, repOf(home) / 400) + (isRegular(home, who) ? 0.1 : 0)));
/** the next customer comes sooner as the place gets known: up to 30% shorter wait */
export const gapScale = home => 1 - Math.min(0.3, repOf(home) / 300);
/** after a job: the new rep and visits, and a line when something changed */
export function afterJob(home, who) {
  const before = standing(repOf(home)), rep = Math.min(REP_MAX, repOf(home) + REP_PER_JOB), visits = visitsOf(home, who) + 1;
  const note = visits === REGULAR_AT ? `${who} is a regular now.` : standing(rep) !== before ? `The place is ${standing(rep)} now.` : '';
  return { rep, regulars: { ...(home?.regulars || {}), [who]: visits }, note };
}
