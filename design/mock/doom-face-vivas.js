/* fogo do Doom (o algoritmo da versão de PlayStation), em baixa resolução e ampliado sem suavização */
(() => {
  const cv = $('fireCv'); if (!cv || !cv.getContext) return;
  const W = cv.width, H = cv.height, ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), px = new Uint8Array(W*H);
  const P = [[7,7,7],[31,7,7],[47,15,7],[71,15,7],[87,23,7],[103,31,7],[119,31,7],[143,39,7],[159,47,7],[175,63,7],[191,71,7],[199,71,7],[223,79,7],[223,87,7],[223,87,7],[215,95,7],[215,103,15],[207,111,15],[207,119,15],[207,127,15],[207,135,23],[199,135,23],[199,143,23],[199,151,31],[191,159,31],[191,159,31],[191,167,39],[191,167,39],[191,175,47],[183,175,47],[183,183,47],[183,183,55],[207,207,111],[223,223,159],[239,239,199],[255,255,255]];
  const top = P.length - 1;
  for (let x = 0; x < W; x++) px[(H - 1)*W + x] = top;
  const step = () => {
    for (let x = 0; x < W; x++) for (let y = 1; y < H; y++){
      const src = y*W + x, p = px[src];
      if (!p){ px[src - W] = 0; continue; }
      const r = (Math.random()*3.99) | 0, dst = src - r + 1;
      px[Math.max(0, dst - W)] = Math.max(0, p - (r & 1));
    }
    for (let i = 0; i < W*H; i++){ const c = P[px[i]], o = i*4; img.data[o] = c[0]; img.data[o+1] = c[1]; img.data[o+2] = c[2]; img.data[o+3] = px[i] ? 255 : 0; }
    ctx.putImageData(img, 0, 0);
  };
  if (reduced){ for (let i = 0; i < 80; i++) step(); return; }
  let last = 0;
  const loop = t => { if (!document.hidden && t - last > 50){ last = t; step(); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();
/* Doom faces vivas: olham para os lados de vez em quando; reagem ao esforço e à progressão */
(() => {
  if (reduced) return;
  const glance = () => {
    const faces = [...document.querySelectorAll('.app img.face')].filter(f => f.offsetParent && !f.closest('.rcard:not(.act)'));
    if (faces.length){ const f = faces[(Math.random()*faces.length) | 0]; f.classList.add('look-l'); setTimeout(() => f.classList.remove('look-l'), 500 + Math.random()*700); }
    setTimeout(glance, 900 + Math.random()*1800);
  };
  setTimeout(glance, 1200);
})();
function faceReact(kind){
  if (reduced) return;
  document.querySelectorAll('.rcard.act img.face, #toastFace').forEach(f => { f.classList.remove('hurt', 'grin'); void f.offsetWidth; f.classList.add(kind); setTimeout(() => f.classList.remove(kind), 800); });
}


