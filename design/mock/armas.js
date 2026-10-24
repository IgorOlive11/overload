/* sprites em pixel art com paleta: cada letra é uma cor */
function pixc(rows, pal, px){
  const W = Math.max(...rows.map(r => r.length)), H = rows.length; let r = '';
  rows.forEach((row, y) => { let x = 0; while (x < row.length){ const ch = row[x]; if (pal[ch]){ let e = x; while (e < row.length && row[e] === ch) e++; r += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${pal[ch]}"/>`; x = e; } else x++; } });
  return `<svg viewBox="0 0 ${W} ${H}" width="${W*px}" height="${H*px}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const SSG = {"idle": {"u": "@asset(armas/escopeta-idle.png)", "w": 95, "h": 66, "dx": 0}, "up1": {"u": "@asset(armas/escopeta-up1.png)", "w": 91, "h": 112, "dx": 18}, "up2": {"u": "@asset(armas/escopeta-up2.png)", "w": 71, "h": 112, "dx": 24}, "up3": {"u": "@asset(armas/escopeta-up3.png)", "w": 85, "h": 98, "dx": 30}, "dn1": {"u": "@asset(armas/escopeta-dn1.png)", "w": 64, "h": 68, "dx": 30}, "dn2": {"u": "@asset(armas/escopeta-dn2.png)", "w": 60, "h": 60, "dx": 40}, "dn3": {"u": "@asset(armas/escopeta-dn3.png)", "w": 110, "h": 26, "dx": 30}, "open0": {"u": "@asset(armas/escopeta-open0.png)", "w": 55, "h": 32, "dx": 40}, "fire1": {"u": "@asset(armas/escopeta-fire1.png)", "w": 95, "h": 76, "dx": 0}, "fire2": {"u": "@asset(armas/escopeta-fire2.png)", "w": 95, "h": 82, "dx": 0}, "shell": {"u": "@asset(armas/escopeta-shell.png)", "w": 88, "h": 47, "dx": -20}, "open": {"u": "@asset(armas/escopeta-open.png)", "w": 57, "h": 32, "dx": 40}, "ins": {"u": "@asset(armas/escopeta-ins.png)", "w": 65, "h": 38, "dx": 16}, "loaded": {"u": "@asset(armas/escopeta-loaded.png)", "w": 58, "h": 32, "dx": 40}, "close1": {"u": "@asset(armas/escopeta-close1.png)", "w": 121, "h": 36, "dx": 10}, "close2": {"u": "@asset(armas/escopeta-close2.png)", "w": 80, "h": 46, "dx": 12}};
const PISTOL = [{"u": "@asset(armas/pistola-0.png)", "w": 59, "h": 64, "cx": 34.5}, {"u": "@asset(armas/pistola-1.png)", "w": 82, "h": 84, "cx": 57.3}, {"u": "@asset(armas/pistola-2.png)", "w": 68, "h": 83, "cx": 41.2}, {"u": "@asset(armas/pistola-3.png)", "w": 63, "h": 83, "cx": 36.0}, {"u": "@asset(armas/pistola-4.png)", "w": 80, "h": 106, "cx": 52.5}];
const FLASH = pixc([
  '....Y..Y....',
  '.Y..YOOY..Y.',
  '..YOOWWOOY..',
  '.YOWWWWWWOY.',
  'YOWWWWWWWWOY',
  '.YOWWWWWWOY.',
  '..YOOWWOOY..',
  '.Y..YOOY..Y.'
], {Y:'#ffd23a', O:'#ff7a1a', W:'#fff6d8'}, 6);
/* ---------- armas: a pistola marca decisões, a escopeta comemora carga subindo ----------
   Sobe do pé da tela, atira no alvo, faz buracos com faíscas e volta. Um toque pula a animação. */
function weaponFx(kind, target, o){
  o = o || {};
  if (reduced || !target || !target.isConnected){ if (o.onHit) o.onHit(); if (o.onDone) o.onDone(); return () => {}; }
  document.querySelectorAll('.gunfx').forEach(x => x.dispatchEvent(new Event('pointerdown')));
  const Q = o.quick ? .6 : 1;
  const K = window.__animK || 1, timers = [], wait = (fn, t) => { timers.push(setTimeout(fn, t*K)); };
  const app = $('app'), fx = document.createElement('div'); fx.className = 'gunfx';
  fx.innerHTML = `<div class="gun"><img alt="" draggable="false"><div class="flash">${FLASH}</div></div>`; app.appendChild(fx);
  const tabs = document.querySelector('.tabs'), th = tabs && !tabs.hidden ? tabs.getBoundingClientRect().height : 0; fx.style.bottom = th + 'px';
  const gun = fx.querySelector('.gun'), img = gun.querySelector('img'), flash = fx.querySelector('.flash');
  const SP = kind === 'ssg' ? SSG : null, base = kind === 'ssg' ? SSG.idle : PISTOL[0];
  let sc = 3, yoff = 0, ended = false;
  const fw = () => fx.getBoundingClientRect().width;
  const place = () => {
    const fr = fx.getBoundingClientRect(), cr = target.getBoundingClientRect();
    sc = kind === 'ssg' ? (fr.width < 380 ? 2 : 2.3) : (fr.width < 380 ? 2.8 : 3.2);
    yoff = Math.min(base.h*sc*.45, Math.max(0, (cr.bottom - fr.top + 14) - (fr.height - base.h*sc)));
  };
  const frame = f => {
    f = typeof f === 'string' ? SP[f] : PISTOL[f];
    const cx = kind === 'ssg' ? f.w/2 - f.dx : f.cx;
    img.src = f.u; img.style.width = f.w*sc + 'px'; img.style.height = f.h*sc + 'px'; img.style.left = (fw()/2 - cx*sc) + 'px'; img.style.bottom = (-yoff) + 'px';
  };
  const muzzle = () => { const fr = fx.getBoundingClientRect(), b = kind === 'ssg' ? SSG.idle : PISTOL[4]; return {x:fr.width/2, y:fr.height + yoff - b.h*sc + (kind === 'ssg' ? 8 : 4)}; };
  /* impacto: buracos com faíscas no alvo; a escopeta espalha chumbo */
  const hit = (n, pellets) => {
    const fr = fx.getBoundingClientRect(), cr = target.getBoundingClientRect(), m = muzzle();
    const cx0 = o.aim ? o.aim() : null;
    const ax = cx0 ? cx0.x - cr.left : 24 + Math.random()*(cr.width - 48), ay = cx0 ? cx0.y - cr.top : 18 + Math.random()*(cr.height - 36);
    if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
    for (let q = 0; q < pellets; q++){
      const hx = Math.max(8, Math.min(cr.width - 8, ax + (pellets > 1 ? (Math.random() - .5)*Math.min(150, cr.width*.6) : 0)));
      const hy = Math.max(8, Math.min(cr.height - 8, ay + (pellets > 1 ? (Math.random() - .5)*Math.min(60, cr.height*.7) : 0)));
      const tx = cr.left + hx - fr.left, ty = cr.top + hy - fr.top, tr = document.createElement('i'); tr.className = 'tracer';
      tr.style.cssText = `left:${m.x}px;top:${m.y}px;width:${Math.hypot(tx - m.x, ty - m.y)}px;transform:rotate(${Math.atan2(ty - m.y, tx - m.x)}rad)`;
      fx.appendChild(tr); wait(() => tr.remove(), 90);
      const hole = document.createElement('i'); hole.className = 'bhole' + (pellets > 1 ? ' sm' : ''); hole.style.cssText = `left:${hx}px;top:${hy}px`; target.appendChild(hole);
      for (let z = 0; z < (pellets > 1 ? 2 : 5); z++){ const sp = document.createElement('i'); sp.className = 'spark'; sp.style.cssText = `left:${hx}px;top:${hy}px`; target.appendChild(sp);
        const a = Math.random()*Math.PI*2, d = 12 + Math.random()*18; sp.animate([{transform:'translate(0,0)', opacity:1}, {transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px)`, opacity:0}], {duration:260*K, easing:'steps(5,end)', fill:'forwards'}); }
    }
    const kick = pellets > 1 ? 9 : 5;
    target.animate([{transform:'translate(0,0)'}, {transform:`translate(${n % 2 ? -kick : kick}px,${kick/2}px)`}, {transform:'translate(0,0)'}], {duration:(pellets > 1 ? 180 : 120)*K, easing:'steps(3,end)'});
    app.animate([{transform:'translate(0,0)'}, {transform:`translate(${kick/2}px,-${kick/2}px)`}, {transform:`translate(-${kick/3}px,${kick/3}px)`}, {transform:'translate(0,0)'}], {duration:(pellets > 1 ? 160 : 90)*K, easing:'steps(3,end)'});
  };
  const finish = () => {
    if (ended) return; ended = true; timers.forEach(clearTimeout); fx.remove();
    if (o.onHit && !o.hitDone){ o.hitDone = true; o.onHit(); }
    if (o.onDone) o.onDone();
  };
  fx.addEventListener('pointerdown', finish);
  const T0 = o.delay || 0;
  wait(() => { place(); frame(kind === 'ssg' ? 'idle' : 0); gun.animate([{transform:'translateY(105%)'}, {transform:'translateY(0)'}], {duration:240*Q*K, easing:'steps(6,end)', fill:'forwards'}); }, T0);
  let tEnd;
  if (kind === 'ssg'){
    const tf = T0 + 380;
    wait(() => { frame('fire1'); hit(0, 7); if (o.onHit){ o.hitDone = true; o.onHit(); } }, tf);
    wait(() => frame('fire2'), tf + 70);
    const seq = ['idle','up1','up2','up3','dn1','dn2','dn3','open0','open','shell','ins','loaded','close1','close2','idle'];
    seq.forEach((f, q) => wait(() => frame(f), tf + 150 + q*75));
    tEnd = tf + 150 + seq.length*75 + 120;
  } else {
    const shots = Array.from({length:o.shots || 3}, (_, n) => T0 + 280*Q + n*300*Q);
    shots.forEach((t, n) => wait(() => {
      frame(4); [3,2,1,0].forEach((f, q) => wait(() => frame(f), 60*(q + 1)));
      const m = muzzle(); flash.style.left = m.x + 'px'; flash.style.top = m.y + 'px';
      flash.style.visibility = 'visible'; wait(() => { flash.style.visibility = 'hidden'; }, 70);
      hit(n, 1);
      if (n === shots.length - 1 && o.onHit){ o.hitDone = true; o.onHit(); }
    }, t));
    tEnd = shots[shots.length - 1] + 520*Q;
  }
  wait(() => gun.animate([{transform:'translateY(0)'}, {transform:'translateY(105%)'}], {duration:240*Q*K, easing:'steps(6,end)', fill:'forwards'}), tEnd);
  wait(finish, tEnd + 300*Q);
  return finish;
}
function filaAnim(){
  sStep = 2; bOpen = -1; renderSimple(); $('v-plano').scrollTop = 0;
  const box = $('bSimple'), card = box.querySelector('[data-s="sched"][data-v="sequencia"]');
  const done = () => { box.classList.remove('busy'); sStep = 3; renderSimple(); $('v-plano').scrollTop = 0; if (FRT.on) setTimeout(frBuildHint, 400);
    if (G && !reduced) G.fromTo('#bSimple > *', {x:24, opacity:0}, {x:0, opacity:1, duration:.3, stagger:.03, ease:'power2.out', clearProps:'opacity,transform'}); };
  const pick = () => { draft.schedule = 'sequencia'; autosave();
    box.querySelectorAll('[data-s="sched"]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === 'sequencia'))); if (card) card.classList.add('picking'); };
  if (reduced || !card){ pick(); done(); return; }
  box.classList.add('busy');
  requestAnimationFrame(() => reveal(card, 'center'));
  weaponFx('pistol', card, {delay:420, onHit:pick, onDone:done});
}
/* carga subiu: a escopeta estoura a carga antiga e revela a nova */
function blastKg(){
  const kj = $('cardBody') && $('cardBody').querySelector('.kgjump.armed'); if (!kj) return;
  const w = S.wk[S.steps[S.i].k]; w.blasted = true;
  const reveal2 = () => {
    kj.classList.remove('armed'); kj.classList.add('blown');
    const old = kj.querySelector('s'), r = old.getBoundingClientRect(), kr = kj.getBoundingClientRect();
    for (let q = 0; q < 12; q++){ const b = document.createElement('i'); b.className = 'shard'; b.style.cssText = `left:${r.left - kr.left + Math.random()*r.width}px;top:${r.top - kr.top + Math.random()*r.height}px`; kj.appendChild(b);
      const a = Math.random()*Math.PI*2, d = 20 + Math.random()*30; b.animate([{transform:'translate(0,0) rotate(0)', opacity:1}, {transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d + 20}px) rotate(${(Math.random() - .5)*180}deg)`, opacity:0}], {duration:520, easing:'steps(8,end)', fill:'forwards'}); }
    faceReact('grin');
  };
  if (reduced){ reveal2(); return; }
  weaponFx('ssg', kj, {delay:350, aim:() => { const r = kj.querySelector('s').getBoundingClientRect(); return {x:r.left + r.width/2, y:r.top + r.height/2}; }, onHit:reveal2});
}
$('shBody').addEventListener('click', e => {
  const b = e.target.closest('[data-fw]'); if (!b) return;
  closeInfo();
  switch (b.dataset.fw){
    case 'fila': filaAnim(); return;
    case 'fit': draft.days.forEach((d, i) => { d.off = b.dataset.v[i] !== '1'; }); draft.layer.goalN = Math.max(1, Math.min(5, trainIdx().length)); break;
    case 'swap': setDraft(fromTemplate(b.dataset.k, draft.days.map(d => !d.off))); break;
    case 'keep': sStep = 2; bOpen = -1; $('v-plano').scrollTop = 0; break;
  }
  autosave(); renderSimple();
});
function showRes(){
  const inp = $('sSearch'), res = $('sRes'); if (!inp || !res) return;
  const q = norm(inp.value.trim()), g = GROUPS.find(x => x[0] === sFilter);
  if (!q && !g){ res.innerHTML = ''; return; }
  const hits = Object.keys(LIB).filter(id => (!g || g[1].includes(LIB[id].m)) && (!q || norm(LIB[id].name).includes(q) || norm(LIB[id].m).includes(q))).slice(0, 8);
  res.innerHTML = hits.length ? hits.map(id => `<li><button data-sadd="${id}">${esc(LIB[id].name)}<small>${cap(LIB[id].m)} · ${EQ[LIB[id].eq].name}</small></button></li>`).join('') : '<li class="why" style="padding:8px 0">Nada na biblioteca com esse nome.</li>';
}
$('bSimple').addEventListener('input', e => { if (e.target.id === 'sSearch') showRes(); });
$('bSimple').addEventListener('click', e => {
  const a = e.target.closest('[data-sadd]'); if (!a) return;
  const arr = exArr(); arr.push(E(a.dataset.sadd, M2())); bOpen = arr.length - 1; sSet = 0; sFilter = ''; autosave(); renderSimple();
  const row = $('sList') && $('sList').lastElementChild; requestAnimationFrame(() => reveal(row, 'start'));
});

