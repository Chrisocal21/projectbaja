// Stage 3 feature flag: vehicle cargo placement is OFF unless the URL has ?placement=1 (then nothing else in the game changes).
export const PLACEMENT = typeof location !== 'undefined' && new URLSearchParams(location.search).get('placement') === '1';
