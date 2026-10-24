/* ---------- Plano: montagem de protocolo (rascunho da fase 2, a partir do v3 semana 1) ---------- */
const DAYS = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
const DAYN = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const E = (id, sets, prep, acc, rest) => ({id, sets, prep: prep === undefined ? 'auto' : prep, acc: acc || LIB[id].acc.slice(), rest: rest || null, prepRest:null});
const MR = () => T('MUSCLE_ROUND'), RP = () => T('REST_PAUSE');
function seedDraft(){
  return {schedule:'semana', rest:120, prepRest:40, layer:{phase:true, weeks:6, goal:true, goalN:4, never2:true}, days:[
    {off:false, ex:[E('dev',[N(8,[5,9]),N(9,[6,10])],'auto',['PEITO']), E('elev',[N(10,[6,10]),MR()]), E('sup',[N(9,[5,9]),N(9,[6,10])],2,['TRÍCEPS']), E('paral',[N(9,[5,9]),N(9,[6,10])],2,['OMBROS']), E('pul',[N(9,[5,9]),N(10,[8,12])])]},
    {off:false, ex:[E('hack',[N(8,[5,9]),N(9,[6,10])],'auto',['ADUTORES']), E('extr',[N(9,[6,10]),MR()]), E('stiff',[N(8,[5,9]),N(9,[6,10])],'auto',['GLÚTEOS']), E('flex',[N(9,[6,10]),MR()]), E('pants',[N(10,[6,10]),RP()],1)]},
    {off:false, ex:[E('pux',[N(8,[6,10]),N(9,[5,9])],'auto',['BÍCEPS']), E('tbar',[N(8,[8,12]),N(9,[6,10])],'auto',['OMBROS']), E('pullo',[N(9,[6,10]),MR()]), E('crucr',[N(9,[6,10])]), E('scott',[N(9,[5,9]),RP()])]},
    {off:false, ex:[E('adut',[N(9,[6,10])],1,null,60), E('leg45',[N(8,[6,10]),N(9,[5,9])],'auto',null,60), E('ext',[N(8,[6,10]),MR()],1,null,60), E('flexpe',[N(8,[6,10]),N(9,[5,9])],'auto',null,60), E('pantp',[MR()],1,null,60)]},
    {off:false, ex:[E('dev',[N(8,[6,10]),N(9,[5,9])],'auto',['PEITO'],60), E('pecfly',[N(8,[6,10]),N(9,[5,9])],2,null,60), E('elev',[MR()],0,null,60), E('puxf',[N(8,[6,10]),N(9,[5,9])],'auto',['BÍCEPS'],60), E('crucr',[N(9,[6,10])],0,null,60), E('pul',[N(8,[6,10]),N(9,[5,9])],1,null,60), E('scott',[N(8,[6,10]),N(9,[5,9])],1,null,60)]},
    {off:true, ex:[]}, {off:true, ex:[]}
  ]};
}
const validDraft = d => d && Array.isArray(d.days) && d.days.length === 7 && d.layer && d.days.every(x => Array.isArray(x.ex) && x.ex.every(e => LIB[e.id] && Array.isArray(e.sets) && e.sets.length && e.sets.every(z => TYPES[z.type])));
let draft = seedDraft(), bDay = 0, bOpen = -1;
try { const s = localStorage.getItem('overload-mock-draft2'); if (s){ const d = JSON.parse(s); if (validDraft(d)) draft = d; } } catch(e){}
const RR = [[4,6],[6,8],[8,10],[10,12]];
const dayList = day => day.ex.map(e => Object.assign({}, e, {rest: e.rest || draft.rest, prepRest: e.prepRest || draft.prepRest}));
const setsTxt = sets => { const c = {}; sets.forEach(s => { c[s.type] = (c[s.type] || 0) + 1; }); return Object.keys(c).map(t => `${c[t]} ${TYPES[t].label.toLowerCase()}`).join(' + '); };
const SCHED_WHY = {
  semana:'Cada treino fica no seu dia. Se você faltar, aquele treino só volta na semana seguinte.',
  sequencia:'Os dias são o plano da semana. Se você faltar, o app oferece o treino pendente antes do próximo, então a falta não pula exercício.'
};
function setRow(s, k, j, total){
  const typeSel = `<select data-b="type" data-k="${k}" data-j="${j}" aria-label="Tipo da série ${j + 1}">${Object.keys(TYPES).map(t => `<option value="${t}" ${t === s.type ? 'selected' : ''}>${TYPES[t].label}</option>`).join('')}</select>`;
  const ger = s.type === 'NORMAL'
    ? `<select data-b="ger" data-k="${k}" data-j="${j}" aria-label="Reserva da série ${j + 1}">${[7,8,9,10,11,12,13].map(g => `<option value="${g}" ${g === s.ger ? 'selected' : ''}>${GER[g].rv}</option>`).join('')}</select>`
    : `<span class="fx tip" tabindex="0" data-tip="${esc(`${GER[TYPES[s.type].ger].t}: ${GER[TYPES[s.type].ger].rv.toLowerCase()}. ${TYPES[s.type].desc}`)}">${GER[TYPES[s.type].ger].rv}</span>`;
  const rr = s.type === 'NORMAL'
    ? `<select data-b="rr" data-k="${k}" data-j="${j}" aria-label="Repetições da série ${j + 1}">${(RR.some(r => s.rr && r[0] === s.rr[0] && r[1] === s.rr[1]) ? RR : RR.concat([s.rr])).map(r => `<option value="${r.join('-')}" ${s.rr && r[0] === s.rr[0] && r[1] === s.rr[1] ? 'selected' : ''}>${rrTxt(r)}</option>`).join('')}</select>`
    : `<span class="fx">${TYPES[s.type].fx}</span>`;
  return `<div class="bset"><button class="grip" data-drag="set" data-k="${k}" data-j="${j}" aria-label="Arrastar série ${j + 1}. Setas do teclado também movem.">${ICON.grip}</button>${typeSel}${ger}${rr}<button class="x" data-b="delset" data-k="${k}" data-j="${j}" aria-label="Remover série ${j + 1}" ${total === 1 ? 'disabled' : ''}>${ICON.x}</button></div>`;
}
const restOpts = (cur, def, opts) => `<option value="" ${!cur ? 'selected' : ''}>Padrão (${def} s)</option>` + opts.map(v => `<option value="${v}" ${cur === v ? 'selected' : ''}>${v} s</option>`).join('');
function exRow(list, k){
  const en = list[k], raw = exArr()[k], L = LIB[en.id], p = prepInfo(list, k), open = k === bOpen;
  const sum = `${cap(L.m)} · ${setsTxt(en.sets)} · ${p.n} preparo${p.locked ? ', travado' : ''} · descanso ${en.rest} s`;
  let h = `<li class="bex"><div class="hd"><button class="grip" data-drag="ex" data-k="${k}" aria-label="Arrastar ${esc(L.name)}. Setas do teclado também movem.">${ICON.grip}</button>
    <button class="nm" data-b="open" data-k="${k}" aria-expanded="${open}"><b>${esc(L.name)}</b><small>${sum}</small></button><span class="no num">${k + 1}</span></div>`;
  if (open){
    h += `<div class="bed">
      ${en.sets.map((s, j) => setRow(s, k, j, en.sets.length)).join('')}
      <button class="linkbtn" data-b="addset" data-k="${k}">Adicionar série</button>
      <div class="brest">
        <label>Descanso entre séries<select data-b="rest" data-k="${k}">${restOpts(raw.rest, draft.rest, [60,90,120,150,180])}</select></label>
        <label>Descanso no preparo<select data-b="prest" data-k="${k}">${restOpts(raw.prepRest, draft.prepRest, [30,40,60])}</select></label>
      </div>
      <label class="lblsel">Séries de preparo<select data-b="prep" data-k="${k}"><option value="auto" ${!p.locked ? 'selected' : ''}>Automático (${p.auto})</option>${[0,1,2,3].map(n => `<option value="${n}" ${p.locked && p.n === n ? 'selected' : ''}>Travar em ${n}</option>`).join('')}</select></label>
      <p class="why">${esc(p.why)}</p>
      <span class="lbl">Músculos acessórios</span>
      <div class="chips">${MUSCLES.filter(m => m !== L.m).map(m => `<button data-b="acc" data-k="${k}" data-m="${m}" aria-pressed="${accOf(en).includes(m)}">${cap(m)}</button>`).join('')}</div>
      <p class="why">${EQ[L.eq].name}: ${EQ[L.eq].what}.${L.eq === 'pilha' ? ` Pilha desta máquina: ${stackMax(en.id)} kg.` : ''}</p>
      <button class="linkbtn" data-b="del" data-k="${k}">Remover exercício</button>
    </div>`;
  }
  return h + '</li>';
}
function renderBuilder(focusSel){
  if (!adv){ renderSimple(focusSel); return; }
  const day = draft.days[bDay], list = dayList(day);
  $('bExport').hidden = false; $('bIntro').hidden = false;
  $('bSave').textContent = 'Salvar rascunho';
  if (!$('bDiscard').dataset.armed) $('bDiscard').textContent = 'Descartar rascunho';
  $('bSched').value = draft.schedule; $('bSchedWhy').textContent = SCHED_WHY[draft.schedule];
  $('bDays').innerHTML = draft.days.map((d, i) => `<button data-day="${i}" class="${d.off ? 'off' : ''}" aria-pressed="${i === bDay}" aria-label="${DAYN[i]}${d.off ? ', descanso' : d.ex.length ? `, ${d.ex.length} exercícios` : ', vazio'}">${DAYS[i]}<small>${d.off ? 'desc.' : d.ex.length ? d.ex.length + ' ex.' : 'vazio'}</small></button>`).join('');
  $('bDayName').textContent = DAYN[bDay];
  $('bOff').setAttribute('aria-checked', String(day.off));
  $('bList').hidden = day.off; $('bAdd').hidden = day.off; $('bClear').hidden = day.off || !day.ex.length;
  if (day.off) $('bSum').innerHTML = `<span>Dia de descanso.${day.ex.length ? ` Os ${day.ex.length} exercícios deste dia ficam guardados e voltam se você desligar o descanso.` : ''}</span>`;
  else if (list.length){
    const st = buildSteps(list), valid = st.filter(s => s.kind === 'WORK').length, preps = st.filter(s => s.kind === 'PREP').length, min = estimate(list);
    $('bSum').innerHTML = `<button class="tip pill${min > 50 ? ' warn' : ' up'}" data-tip="${esc('Estimativa com 35 segundos por série normal, 20 por preparo, 75 por rest-pause, 120 por muscle round, o descanso de cada exercício e 75 segundos de troca entre exercícios.' + (min > 50 ? ' Passa dos 50 minutos que costumam te tirar da academia.' : ''))}">cerca de ${min} min</button><span>${list.length} exercícios, ${valid} séries válidas, ${preps} de preparo</span>`;
  } else $('bSum').innerHTML = '<span>Dia vazio. Adicione um exercício pela busca abaixo ou marque como descanso.</span>';
  $('bRest').value = String(draft.rest); $('bPrepRest').value = String(draft.prepRest);
  $('bList').innerHTML = day.off ? '' : list.map((_, k) => exRow(list, k)).join('');
  $('bTest').disabled = day.off || !list.length; $('bTest').textContent = `Testar ${DAYN[bDay].toLowerCase()}`;
  const ly = draft.layer;
  document.querySelectorAll('[data-l]').forEach(b => b.setAttribute('aria-checked', String(!!ly[b.dataset.l])));
  $('lWeeks').value = String(ly.weeks); $('lWeeks').disabled = !ly.phase;
  $('lGoal').value = String(ly.goalN); $('lGoal').disabled = !ly.goal;
  renderVol();
  if (focusSel){ const f = document.querySelector(focusSel); if (f) f.focus({preventScroll:true}); }
}
function renderVol(){
  const v = {}; MUSCLES.forEach(m => { v[m] = 0; });
  draft.days.forEach(d => { if (d.off) return; d.ex.forEach(e => { const n = e.sets.length; v[LIB[e.id].m] += n; accOf(e).forEach(a => { v[a] += .5*n; }); }); });
  const MAX = 20;
  $('bVol').innerHTML = MUSCLES.map(m => `<span class="m">${cap(m)}</span><div class="trk"><i class="${v[m] < 4 ? 'low' : ''}" style="width:${Math.min(100, v[m]/MAX*100)}%"></i><span class="med" style="left:${4/MAX*100}%"></span></div><span class="v">${fmt(v[m])}</span>`).join('');
}
function focusKey(el){ const b = el.dataset.b, k = el.dataset.k, j = el.dataset.j, m = el.dataset.m; return `[data-b="${b}"]` + (k !== undefined ? `[data-k="${k}"]` : '') + (j !== undefined ? `[data-j="${j}"]` : '') + (m ? `[data-m="${m}"]` : ''); }
function moveItem(kind, k, from, to){
  const ex = exArr();
  const arr = kind === 'ex' ? ex : ex[k].sets;
  if (to < 0 || to >= arr.length || to === from) return;
  const [it] = arr.splice(from, 1); arr.splice(to, 0, it);
  if (kind === 'ex'){ if (bOpen === from) bOpen = to; else if (from < bOpen && to >= bOpen) bOpen--; else if (from > bOpen && to <= bOpen) bOpen++; }
  renderBuilder(kind === 'ex' ? `[data-drag="ex"][data-k="${to}"]` : `[data-drag="set"][data-k="${k}"][data-j="${to}"]`);
}
/* arrastar para reordenar, como na v1 (exercícios e séries); setas do teclado como alternativa */
const bListDown = e => {
  const h = e.target.closest('[data-drag]'); if (!h) return;
  const kind = h.dataset.drag, sel = kind === 'ex' ? '.bex' : '.bset', item = h.closest(sel);
  const items = [...item.parentElement.children].filter(x => x.matches(sel)), from = items.indexOf(item);
  const rects = items.map(x => x.getBoundingClientRect()), y0 = e.clientY;
  const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0, sh = rects[from].height + gap;
  let to = from;
  try { h.setPointerCapture(e.pointerId); } catch(err){}
  item.classList.add('dragging'); e.preventDefault(); document.body.classList.add('dragmode');
  const move = ev => {
    const dy = ev.clientY - y0, cy = rects[from].top + rects[from].height/2 + dy;
    item.style.transform = `translateY(${dy}px)`;
    to = from; rects.forEach((r, i) => { const mid = r.top + r.height/2; if (i < from && cy < mid) to = Math.min(to, i); if (i > from && cy > mid) to = Math.max(to, i); });
    items.forEach((x, i) => { if (x === item) return; let s = 0; if (from < to && i > from && i <= to) s = -sh; if (from > to && i < from && i >= to) s = sh; x.style.transform = s ? `translateY(${s}px)` : ''; });
  };
  const up = () => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    items.forEach(x => { x.style.transform = ''; }); item.classList.remove('dragging'); document.body.classList.remove('dragmode');
    if (to !== from) moveItem(kind, +h.dataset.k, from, to);
  };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
};
$('bList').addEventListener('pointerdown', e => dragFold(e, () => renderBuilder(), 'bList'));
document.addEventListener('selectstart', e => { if (document.body.classList.contains('dragmode')) e.preventDefault(); });
const bListKey = e => {
  const h = e.target.closest('[data-drag]'); if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const kind = h.dataset.drag, k = +h.dataset.k, from = kind === 'ex' ? k : +h.dataset.j;
  moveItem(kind, k, from, from + (e.key === 'ArrowUp' ? -1 : 1));
};
$('bList').addEventListener('keydown', bListKey);
const bListClick = e => {
  const b = e.target.closest('button[data-b]'); if (!b || b.disabled) return;
  const day = {ex:exArr()}, k = +b.dataset.k, en = day.ex[k];
  switch (b.dataset.b){
    case 'open': bOpen = bOpen === k ? -1 : k; renderBuilder(`[data-b="open"][data-k="${k}"]`); return;
    case 'addset': en.sets.push(Object.assign({}, en.sets[en.sets.length - 1])); break;
    case 'delset': en.sets.splice(+b.dataset.j, 1); break;
    case 'acc': { const a = accOf(en).slice(), m = b.dataset.m, i = a.indexOf(m); if (i >= 0) a.splice(i, 1); else a.push(m); en.acc = a; break; }
    case 'del': day.ex.splice(k, 1); bOpen = -1; renderBuilder(); return;
  }
  renderBuilder(focusKey(b));
};
$('bList').addEventListener('click', bListClick);
const bListChange = e => {
  const s = e.target.closest('select[data-b]'); if (!s) return;
  const en = exArr()[+s.dataset.k], j = +s.dataset.j;
  if (s.dataset.b === 'type'){ const t = s.value; en.sets[j] = t === 'NORMAL' ? N(10, [8,10]) : T(t); }
  if (s.dataset.b === 'ger') en.sets[j].ger = +s.value;
  if (s.dataset.b === 'rr') en.sets[j].rr = s.value.split('-').map(Number);
  if (s.dataset.b === 'prep') en.prep = s.value === 'auto' ? 'auto' : +s.value;
  if (s.dataset.b === 'rest') en.rest = s.value ? +s.value : null;
  if (s.dataset.b === 'prest') en.prepRest = s.value ? +s.value : null;
  renderBuilder(focusKey(s));
};
$('bList').addEventListener('change', bListChange);
$('bDays').addEventListener('click', e => {
  const b = e.target.closest('button[data-day]'); if (!b) return;
  bDay = +b.dataset.day; bOpen = -1; $('bSearch').value = ''; $('bRes').innerHTML = ''; renderBuilder();
});
$('bOff').onclick = () => { const d = draft.days[bDay]; d.off = !d.off; bOpen = -1; renderBuilder(); };
$('bSched').addEventListener('change', e => { draft.schedule = e.target.value; renderBuilder(); });
$('bRest').addEventListener('change', e => { draft.rest = +e.target.value; renderBuilder(); });
$('bPrepRest').addEventListener('change', e => { draft.prepRest = +e.target.value; renderBuilder(); });
document.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { draft.layer[b.dataset.l] = !draft.layer[b.dataset.l]; renderBuilder(); }));
$('lWeeks').addEventListener('change', e => { draft.layer.weeks = +e.target.value; });
$('lGoal').addEventListener('change', e => { draft.layer.goalN = +e.target.value; });
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
$('bSearch').addEventListener('input', e => {
  const q = norm(e.target.value.trim());
  if (!q){ $('bRes').innerHTML = ''; return; }
  const hits = Object.keys(LIB).filter(id => norm(LIB[id].name).includes(q) || norm(LIB[id].m).includes(q) || norm(EQ[LIB[id].eq].name).includes(q)).slice(0, 6);
  $('bRes').innerHTML = hits.length ? hits.map(id => `<li><button data-add="${id}">${esc(LIB[id].name)}<small>${cap(LIB[id].m)} · ${EQ[LIB[id].eq].name}</small></button></li>`).join('') : '<li class="why" style="padding:8px 0">Nada na biblioteca com esse nome.</li>';
});
$('bRes').addEventListener('click', e => {
  const b = e.target.closest('button[data-add]'); if (!b) return;
  const day = draft.days[bDay];
  day.ex.push(E(b.dataset.add, [N(10), N(10)]));
  bOpen = day.ex.length - 1; $('bSearch').value = ''; $('bRes').innerHTML = '';
  renderBuilder(`[data-b="open"][data-k="${bOpen}"]`);
  const row = $('bList').lastElementChild; if (row) row.scrollIntoView({block:'nearest', behavior:reduced ? 'auto' : 'smooth'});
});
function armed(btn, label, fn){
  if (btn.dataset.armed){ clearTimeout(btn._t); delete btn.dataset.armed; btn.textContent = label; fn(); return; }
  btn.dataset.armed = '1'; btn.textContent = 'Toque de novo para confirmar';
  btn._t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = label; }, 4000);
}
$('bClear').onclick = () => armed($('bClear'), 'Limpar este dia', () => { draft.days[bDay].ex = []; bOpen = -1; renderBuilder(); toast(`${DAYN[bDay]} limpa`, 'Os exercícios deste dia foram removidos do rascunho.', 8); });
$('bDiscard').onclick = () => armed($('bDiscard'), 'Descartar rascunho', () => {
  try { localStorage.removeItem('overload-mock-draft2'); } catch(e){}
  draft = seedDraft(); bDay = 0; bOpen = -1; renderBuilder();
  toast('Rascunho descartado', 'A montagem voltou ao ponto de partida do v3.', 8);
});
$('bTest').onclick = () => { const day = draft.days[bDay]; if (day.off || !day.ex.length) return; startSession(dayList(day), 'Teste: ' + DAYN[bDay].toLowerCase(), {demo:true}); };
$('bSave').onclick = () => {
  let ok = true;
  try { localStorage.setItem('overload-mock-draft2', JSON.stringify(draft)); } catch(e){ ok = false; }
  toast(ok ? 'Rascunho salvo' : 'Não deu para salvar aqui', ok ? 'Fica guardado para o fim da fase 1. A fase atual continua travada.' : 'Este navegador bloqueou o armazenamento. O rascunho continua nesta aba.', ok ? 9 : 8);
};


