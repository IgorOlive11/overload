/* ---------- navegação ---------- */
let view = 'hoje';
function go(v){
  if (v === view) return;
  const from = $('v-'+view), to = $('v-'+v);
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === v)));
  from.hidden = true; to.hidden = false; to.scrollTop = 0; hideTip();
  if (G && !reduced) G.fromTo(to.children, {y:10, opacity:.35}, {y:0, opacity:1, duration:.32, stagger:.03, ease:'power2.out', clearProps:'opacity,transform'});
  view = v;
  drawRest();
  if (B3.ok) B3.run(v === 'hoje' || (v === 'treino' && S.active));
  if (v === 'hoje'){ mountCanvas('stageHome'); showHome3D(false); }
  if (v === 'treino' && S.active) renderSession(0);
  if (FRT.on){ if (v === 'progresso') frProg(); if (v === 'plano'){ frPlan(); $('planCur').hidden = true; $('frPlan').hidden = !$('planBuild').hidden; } }
  if (v === 'progresso' && window.ScrollTrigger) ScrollTrigger.refresh();
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.v)));

/* ---------- tooltips: hover e foco no desktop, toque no celular ---------- */
const tipBox = $('tipBox'); let tipFor = null;
function showTip(el){
  const text = el.dataset.tip; if (!text) return;
  tipFor = el; tipBox.textContent = text; tipBox.hidden = false;
  document.querySelectorAll('[aria-expanded="true"].tip').forEach(b => b.setAttribute('aria-expanded', 'false'));
  el.setAttribute('aria-expanded', 'true');
  const host = $('app').getBoundingClientRect(), r = el.getBoundingClientRect(), w = Math.min(280, host.width - 32);
  tipBox.style.width = w + 'px';
  const x = Math.min(Math.max(r.left + r.width/2 - w/2, host.left + 16), host.right - 16 - w) - host.left;
  const below = r.bottom + tipBox.offsetHeight + 12 < host.bottom - 60;
  const y = below ? r.bottom - host.top + 10 : r.top - host.top - tipBox.offsetHeight - 10;
  tipBox.classList.toggle('above', !below);
  tipBox.style.left = x + 'px'; tipBox.style.top = y + 'px';
  tipBox.style.setProperty('--ax', Math.max(12, Math.min(w - 22, r.left + r.width/2 - host.left - x - 5)) + 'px');
  if (G && !reduced) G.fromTo(tipBox, {opacity:0, y:below ? -4 : 4}, {opacity:1, y:0, duration:.18, ease:'power2.out'});
}
function hideTip(){ tipBox.hidden = true; if (tipFor) tipFor.setAttribute('aria-expanded', 'false'); tipFor = null; }
const hoverable = window.matchMedia('(hover:hover)').matches;
document.addEventListener('pointerover', e => { if (!hoverable) return; const t = e.target.closest('.tip'); if (t && t.dataset.tip) showTip(t); });
document.addEventListener('pointerout', e => { if (!hoverable) return; const t = e.target.closest('.tip'); if (t && !t.contains(e.relatedTarget)) hideTip(); });
document.addEventListener('focusin', e => { const t = e.target.closest('.tip'); if (t && t.dataset.tip && t.matches(':focus-visible')) showTip(t); });
document.addEventListener('focusout', e => { if (e.target.closest('.tip')) hideTip(); });
document.addEventListener('click', e => {
  const t = e.target.closest('.tip');
  if (t && t.dataset.tip && !t.closest('.rir')){ if (tipFor === t) hideTip(); else showTip(t); return; }
  if (!t) hideTip();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
document.querySelectorAll('.screen').forEach(sc => sc.addEventListener('scroll', hideTip, {passive:true}));

