import { signTex } from '../lot/CarLot.jsx';

/** Route and place boards share the photographed surfaces in assets/art/D. */
export function roadsideBoardTexture(name, subtitle, wood = false, onReady) {
  const texture = signTex([[name.toUpperCase(), name.length > 18 ? 38 : 48, wood ? '#473625' : '#f3ebd7'], [subtitle, 28, wood ? '#704f2f' : '#ead39d']], wood ? '#b79b71' : '#35533e', wood ? '#473625' : '#e8dec5', wood ? '#755b3a' : '#d8bd85');
  const g = texture.image.getContext('2d'), w = texture.image.width, h = texture.image.height;
  let seed = name.split('').reduce((n, ch) => n * 33 + ch.charCodeAt(0), 17) >>> 0;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  if (wood) for (let i = 0; i < 44; i++) {
    g.strokeStyle = `rgba(70,45,25,${0.025 + rand() * 0.035})`; g.lineWidth = 1 + rand() * 2;
    const y = rand() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (rand() - 0.5) * 4); g.stroke();
  }
  for (let i = 0; i < 360; i++) {
    g.fillStyle = wood ? `rgba(74,48,28,${rand() * 0.08})` : `rgba(215,194,146,${rand() * 0.1})`;
    g.fillRect(rand() * w, rand() * h, 1 + rand() * 4, 1 + rand() * 3);
  }
  texture.needsUpdate = true;
  const source = new Image();
  source.onload = () => {
    if (!texture.image) return;
    g.clearRect(0, 0, w, h);
    const crop = wood ? [1050, 205, 420, 218] : [1630, 232, 365, 175];
    g.drawImage(source, ...crop, 0, 0, w, h);
    g.fillStyle = wood ? 'rgba(220,195,155,0.19)' : 'rgba(22,56,38,0.28)'; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = wood ? 'rgba(234,215,180,0.7)' : 'rgba(21,43,27,0.9)'; g.shadowBlur = 3;
    g.font = `800 ${name.length > 18 ? 38 : 48}px Impact, 'Arial Black', sans-serif`;
    g.fillStyle = wood ? '#3c3024' : '#f1eee0'; g.fillText(name.toUpperCase(), w / 2, h * 0.38);
    g.font = "800 28px Impact, 'Arial Black', sans-serif";
    g.fillStyle = wood ? '#594330' : '#ece4d0'; g.fillText(subtitle, w / 2, h * 0.69);
    g.shadowBlur = 0;
    texture.needsUpdate = true;
    onReady?.();
  };
  source.src = '/images/baja-roadside-sign-surfaces.png';
  return texture;
}

export function raceSignTexture(name, series, finish = false, onReady) {
  return roadsideBoardTexture(name, `${series} - ${finish ? 'FINISH' : 'START'}`, series === 'MDR', onReady);
}
