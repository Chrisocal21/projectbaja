// Placement cargo is ON for everyone. Add ?placement=0 to switch it off (debug only).
export const PLACEMENT = typeof location !== 'undefined' && new URLSearchParams(location.search).get('placement') !== '0';
