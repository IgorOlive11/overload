/* ---------- Plano: fase atual ---------- */
function renderPlan(){
  $('timeline').innerHTML = [1,2,3,4,5,6].map(w => `<div class="${w < 3 ? 'past' : w === 3 ? 'now' : ''}">S${w}</div>`).join('');
  const li = (list, k) => { const en = list[k], p = prepInfo(list, k); return `<li><span>${esc(LIB[en.id].name)}</span><span>2 × 8 a 12${p.n ? ` · ${p.n} preparo` : ''} · ${en.rest} s</span></li>`; };
  $('planA').innerHTML = PLAN.A.map((_, k) => li(PLAN.A, k)).join('');
  $('planB').innerHTML = PLAN.B.map((_, k) => li(PLAN.B, k)).join('');
}
let ideas = ['Trocar a flexora da sessão A pela cadeira adutora'];
try { const s = localStorage.getItem('overload-mock-ideas'); if (s){ const v = JSON.parse(s); if (Array.isArray(v)) ideas = v.filter(x => typeof x === 'string'); } } catch(e){}
function renderIdeas(){ $('ideas').innerHTML = ideas.map(t => `<li>${esc(t)}</li>`).join(''); }
$('ideaForm').addEventListener('submit', ev => {
  ev.preventDefault(); const v = $('ideaInput').value.trim(); if (!v) return;
  ideas.push(v); $('ideaInput').value = ''; renderIdeas();
  try { localStorage.setItem('overload-mock-ideas', JSON.stringify(ideas)); } catch(e){}
  if (G && !reduced) G.from('#ideas li:last-child', {x:-12, opacity:0, duration:.3});
});
document.querySelectorAll('[data-pv]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-pv]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  const build = b.dataset.pv === 'build';
  $('planCur').hidden = build || FRT.on; $('frPlan').hidden = build || !FRT.on; $('planBuild').hidden = !build; hideTip();
  if (FRT.on && !build) frPlan();
  if (build) renderPlanBuild();
  if (G && !reduced) G.fromTo(build ? '#planBuild > *' : '#planCur > *', {y:8, opacity:.3}, {y:0, opacity:1, duration:.3, stagger:.03, ease:'power2.out', clearProps:'opacity,transform'});
}));

