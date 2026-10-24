/* ---------- Progresso ---------- */
function renderPhase(){
  $('phaseNum').textContent = `${phase.done} de ${phase.total}`;
  const w = (phase.done/phase.total*100).toFixed(1) + '%';
  if (G && !reduced) G.to('#phaseFill', {width:w, duration:.8, ease:'power2.out'}); else $('phaseFill').style.width = w;
}
function renderWeeks(){
  const rows = [['Sem 1',['done','done','bonus']], ['Sem 2',['done','done','bonus done']], ['Sem 3',['done','next','bonus']], ['Sem 4',['','','bonus']], ['Sem 5',['','','bonus']], ['Sem 6',['','','bonus']]];
  $('gridWeeks').innerHTML = rows.map((r, i) => `<span class="wk ${i === 2 ? 'now' : ''}">${r[0]}</span>` + r[1].map(c => `<div class="cell ${c}"></div>`).join('')).join('');
}
function spark(h, up){
  const W = 110, Hh = 40, min = Math.min(...h), max = Math.max(...h), rng = (max - min) || 1;
  const pts = h.map((v, i) => [i*(W/(h.length - 1)), Hh - 4 - ((v - min)/rng)*(Hh - 10)]);
  let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 1; i < pts.length; i++) d += ` H${pts[i][0]} V${pts[i][1]}`;
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${Hh}" aria-hidden="true"><path d="${d} V${Hh} H0 Z" fill="var(--accent-soft)"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${up ? 'var(--ok)' : 'var(--chalk)'}"/></svg>`;
}
function renderExProg(){
  if (FRT.on) return frProg();
  $('exProg').innerHTML = PLAN.A.concat(PLAN.B).map(en => {
    const h = H[en.id], L = LIB[en.id], s = suggestion(en);
    return `<div class="ex-prog"><span class="nm">${esc(L.name)}</span>${spark(h.hist, s.up)}<button class="tip pill${s.up ? ' up' : ''}" style="justify-self:start" data-tip="${esc(`Cargas das últimas 5 sessões: ${h.hist.map(fmt).join(', ')} kg. ` + s.why)}">${fmt(h.hist[h.hist.length - 1])} ${unitOf(L.eq)}</button></div>`;
  }).join('');
}
function initScroll(){
  if (!G || !window.ScrollTrigger || reduced) return;
  G.to('#pTitle', {scale:.72, ease:'none', scrollTrigger:{scroller:$('v-progresso'), start:0, end:120, scrub:true}});
}

