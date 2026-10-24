/* ---------- Plano: montagem simples, em passos, para quem está começando ---------- */
let sImp = false, sPending = null;
/* importação no montador: mostra o relatório e só usa o arquivo depois de confirmar */
function sReport(text){
  let res; const box = $('sCsvRep');
  try { res = parseCsv(text); } catch(err){ sPending = null; box.innerHTML = `<p class="report w">${esc(err.message)}</p>`; $('bSimple').querySelector('[data-s="impuse"]').disabled = true; return; }
  sPending = res;
  box.innerHTML = `<ul class="report"><li>${esc(res.ok)}</li>${res.warn.map(w => `<li class="w">${esc(w)}</li>`).join('')}</ul>`;
  $('bSimple').querySelector('[data-s="impuse"]').disabled = false;
}
let adv = false, sStep = 0, sFilter = '', undoEx = null, undoT = 0, sSess = 0, sSet = 0, sAdv = false;
/* séries dos modelos: a primeira deixa 2 a 3 na reserva e a última 1, porque a hipertrofia cresce perto da falha
   e iniciantes tendem a subestimar o quanto sobrou; isolados de máquina com série única vão até a falha com técnica perfeita */
const C2 = rr => [N(8, rr || [6,8]), N(9, rr || [6,8])], Mc2 = () => [N(8,[8,10]), N(9,[8,10])], M2 = () => [N(8,[10,12]), N(9,[10,12])], M3 = () => [N(8,[10,12]), N(8,[10,12]), N(9,[10,12])], I1 = () => [N(10,[10,12])];
const ISO = 90;   /* descanso dos isolados: acima de 90 segundos não há ganho claro */
const Ei = (id, sets) => E(id, sets, 'auto', null, ISO);
const offDay = () => ({off:true, ex:[]});
const vezes = n => `${n} ${n === 1 ? 'vez' : 'vezes'}`;
/* modelos de baixo volume: pelo menos 4 séries semanais por grupo muscular, contando meia série para o músculo acessório.
   Cada modelo é uma fila de treinos; os dias marcados recebem os treinos em ordem. */
const TEMPLATES = {
  ul:{name:'Superior e inferior', sub:'4 dias por semana. Cada parte do corpo treina 2 vezes.', targets:[4], def:[0,1,3,4],
    why:'Nele, cada parte do corpo treina 2 vezes por semana, com pelo menos um dia de descanso antes de repetir.',
    parts:{cima:n => `a parte de cima treina ${vezes(n)}`, baixo:n => `a parte de baixo treina ${vezes(n)}`},
    cycle:() => [
      {name:'Superior A', part:'cima', ex:[E('sup',C2()),E('pux',C2()),E('dev',Mc2()),Ei('elev',I1()),Ei('pul',I1()),Ei('scott',M2())]},
      {name:'Inferior A', part:'baixo', ex:[E('hack',C2()),E('stiff',C2([8,10])),Ei('ext',I1()),Ei('pants',M2())]},
      {name:'Superior B', part:'cima', ex:[E('supH',C2()),E('tbar',C2()),Ei('pecfly',M2()),Ei('crucr',I1()),Ei('paral',I1()),Ei('scott',I1())]},
      {name:'Inferior B', part:'baixo', ex:[E('leg45',C2()),Ei('flex',M2()),Ei('extr',I1()),Ei('adut',I1()),Ei('pantp',M2())]}]},
  ppl:{name:'Empurrar, puxar e pernas', sub:'3 dias por semana. Em 6 dias, o ciclo roda 2 vezes.', targets:[3,6], def:[0,2,4],
    why:'Nele, cada treino trabalha uma parte diferente do corpo, e a mesma parte sempre descansa pelo menos um dia antes de voltar.',
    parts:{emp:n => `empurrar entra ${vezes(n)}`, pux:n => `puxar entra ${vezes(n)}`, per:n => `pernas entra ${vezes(n)}`},
    cycle:() => [
      {name:'Empurrar', part:'emp', ex:[E('sup',C2()),E('dev',Mc2()),Ei('pecfly',M2()),Ei('elev',I1()),Ei('pul',M2()),Ei('paral',I1())]},
      {name:'Puxar', part:'pux', ex:[E('pux',C2()),E('tbar',Mc2()),Ei('crucr',I1()),Ei('scott',M3())]},
      {name:'Pernas', part:'per', ex:[E('hack',C2()),E('stiff',C2([8,10])),Ei('ext',M2()),Ei('flex',M2()),Ei('pantp',M2()),Ei('pants',M2())]}]}
};
const blankDraft = () => ({schedule:'semana', rest:120, prepRest:40, layer:{phase:true, weeks:6, goal:true, goalN:3, never2:true}, days:Array.from({length:7}, offDay), names:['','','','','','',''], cycle:null});
function fromTemplate(k, mask){
  const T = TEMPLATES[k], d = blankDraft();
  d.days.forEach((x, i) => { x.off = mask ? !mask[i] : !T.def.includes(i); });
  d.tpl = k; d.cycle = T.cycle(); d.layer.goalN = Math.max(1, Math.min(5, d.days.filter(x => !x.off).length));
  return d;
}
const trainIdx = t => (t || draft.days.map(d => !d.off)).map((v, i) => v ? i : -1).filter(i => i >= 0);
/* os dias marcados recebem os treinos da fila em ordem; a fila recomeça quando acaba */
function syncDays(){
  const c = draft.cycle; if (!c) return; let n = 0;
  if (!draft.names) draft.names = ['','','','','','',''];
  draft.days.forEach((d, i) => { if (d.off){ d.ex = []; draft.names[i] = ''; } else { const ss = c[n % c.length]; d.ex = clone(ss.ex); draft.names[i] = ss.name; n++; } });
}
/* volta do modo avançado: o que foi editado no primeiro dia de cada treino vira o treino da fila */
function pullBack(){
  const c = draft.cycle; if (!c) return;
  c.forEach(ss => { const i = draft.days.findIndex((d, j) => !d.off && draft.names[j] === ss.name); if (i >= 0) ss.ex = clone(draft.days[i].ex); });
}
const exArr = () => (!adv && draft.cycle) ? draft.cycle[sSess].ex : draft.days[bDay].ex;
const dayName = i => DAYN[i] + (draft.names && draft.names[i] ? ` · ${draft.names[i]}` : '');
/* mesma parte do corpo em dois dias seguidos, simulando 3 semanas (no dia fixo a semana se repete, então domingo e segunda contam) */
function restConflicts(mode, t){
  const c = draft.cycle; t = t || trainIdx(); if (!c || !t.length) return [];
  const seq = []; let n = 0;
  for (let w = 0; w < 3; w++) t.forEach((i, k) => { seq.push({abs:w*7 + i, s: mode === 'sequencia' ? n++ % c.length : k % c.length}); });
  const out = [];
  for (let q = 1; q < seq.length; q++){ const a = seq[q-1], b = seq[q]; if (b.abs - a.abs === 1 && c[a.s].part === c[b.s].part){ const key = `${DAYN[a.abs % 7].toLowerCase()} e ${DAYN[b.abs % 7].toLowerCase()}`; if (!out.includes(key)) out.push(key); } }
  return out;
}
function bestMask(target){
  const cur = draft.days.map(d => !d.off), X = cur.filter(Boolean).length; let best = null;
  for (let m = 0; m < 128; m++){
    const on = [0,1,2,3,4,5,6].map(i => !!(m >> i & 1)); if (on.filter(Boolean).length !== target) continue;
    if (X > target ? on.some((v, i) => v && !cur[i]) : on.some((v, i) => !v && cur[i])) continue;
    const t = trainIdx(on), gaps = t.map((d, q) => ((t[(q + 1) % t.length] - d + 7) % 7) || 7);
    const sc = [restConflicts('semana', t).length, -Math.min(...gaps), Math.max(...gaps)];
    const better = !best || sc[0] < best.sc[0] || (sc[0] === best.sc[0] && (sc[1] < best.sc[1] || (sc[1] === best.sc[1] && sc[2] < best.sc[2])));
    if (better) best = {on, sc};
  }
  return best && best.on;
}
const needsWarn = () => { const c = draft.cycle, T = TEMPLATES[draft.tpl], X = trainIdx().length; if (!c || !T || !X) return false; if (X === 7) return true; if (draft.schedule === 'sequencia') return restConflicts('sequencia').length > 0; return !fits(); };
const fits = () => { const c = draft.cycle, T = TEMPLATES[draft.tpl], X = trainIdx().length; return !c || !T || !X || (T.targets.includes(X) && !restConflicts(draft.schedule).length); };
function fitWarn(){
  const c = draft.cycle, T = TEMPLATES[draft.tpl]; if (!c || !T) return '';
  const t = trainIdx(), X = t.length, n = c.length; if (!X || !needsWarn()) return '';
  const target = T.targets.reduce((a, b) => Math.abs(b - X) < Math.abs(a - X) ? b : a);
  let h = `<div class="fitw" role="status"><b>Você marcou ${X} ${X > 1 ? 'dias' : 'dia'}, e este modelo foi feito para ${T.targets.join(' ou ')}.</b><p>${T.why}</p>`;
  if (X === 7) h += '<p>Com os 7 dias marcados, não sobra nenhum dia de descanso na semana. Vale deixar pelo menos um.</p>';
  const fila = restConflicts('sequencia', t);
  h += `<p><b>${draft.schedule === 'sequencia' ? 'Você já está em fila.' : 'Sugestão: seguir em fila.'}</b> Os treinos seguem em ordem nos dias marcados e recomeçam quando acabam${fila.length ? `, mas a mesma parte do corpo ainda treinaria em dias seguidos (${joinPt(fila)})` : ', então nenhuma parte do corpo treina em dois dias seguidos'}.${X > target && X < 7 ? ' Com mais dias, o volume da semana sobe um pouco.' : X < target ? ' Com menos dias, a volta completa leva mais de uma semana.' : ''}</p>
    <ul class="fitl">${t.map((i, k) => `<li><span>${DAYS[i]}</span>${esc(c[k % n].name)}</li>`).join('')}<li class="nx">Na semana seguinte, começa por ${esc(c[X % n].name)}.</li></ul>`;
  if (draft.schedule === 'semana'){
    const cnt = {}, seen = new Set(); Object.keys(T.parts).forEach(p => { cnt[p] = 0; });
    t.forEach((_, k) => { cnt[c[k % n].part]++; seen.add(k % n); });
    const miss = c.filter((_, s) => !seen.has(s)).map(ss => ss.name), fixed = restConflicts('semana', t);
    const uneven = new Set(Object.values(cnt)).size > 1;
    if (uneven || miss.length || fixed.length) h += `<p>Se cada treino ficar preso no seu dia, ${[uneven ? 'toda semana ' + joinPt(Object.keys(T.parts).map(p => T.parts[p](cnt[p]))) : '', miss.length ? `${joinPt(miss)} nunca ${miss.length > 1 ? 'entrariam' : 'entraria'} na semana` : '', fixed.length ? `a mesma parte do corpo treinaria em dias seguidos (${joinPt(fixed)})` : ''].filter(Boolean).join(', e ')}.</p>`;
  }
  const best = bestMask(target), diff = best ? trainIdx(X > target ? draft.days.map((d, i) => !d.off && !best[i]) : best.map((v, i) => v && draft.days[i].off)) : [];
  h += '<div class="acts">' + (draft.schedule === 'semana' ? '<button class="btn btn-primary" data-fw="fila">Usar a fila</button>' : '');
  if (best && diff.length) h += `<button class="btn btn-ghost" data-fw="fit" data-v="${best.map(v => v ? 1 : 0).join('')}">${X > target ? `Voltar para ${target} dias: tirar ${joinPt(diff.map(i => DAYN[i].toLowerCase()))}` : `Completar ${target} dias: incluir ${joinPt(diff.map(i => DAYN[i].toLowerCase()))}`}</button>`;
  if (draft.tpl === 'ul' && X === 3) h += '<button class="btn btn-ghost" data-fw="swap" data-k="ppl">Trocar para Empurrar, puxar e pernas</button>';
  return h + '<button class="linkbtn" data-fw="keep">Seguir com estes dias</button></div></div>';
}
const RRP = [{rr:[4,6], t:'Força', s:'4 a 6'}, {rr:[6,8], t:'Mais peso', s:'6 a 8'}, {rr:[8,10], t:'Equilíbrio', s:'8 a 10'}, {rr:[10,12], t:'Mais reps', s:'10 a 12'}];
const TSHORT = {NORMAL:'Faixa de repetições e quanto sobra', REST_PAUSE:'Até a falha, pausa curta e mais um bloco', MUSCLE_ROUND:'Até 6 blocos de 4 com pausas curtas'};
const GROUPS = [['Peito',['PEITO']],['Costas',['COSTAS']],['Ombros',['OMBROS']],['Bíceps',['BÍCEPS']],['Tríceps',['TRÍCEPS']],['Pernas',['QUADRÍCEPS','POSTERIOR','GLÚTEOS','ADUTORES']],['Panturrilha',['PANTURRILHA']]];
function setDraft(d){ draft = d; bOpen = -1; sSess = 0; sSet = 0; const t = trainIdx(); bDay = t.length ? t[0] : 0; }
function autosave(){ if (FRT.on) return; try { localStorage.setItem('overload-mock-draft2', JSON.stringify(draft)); } catch(e){} }
/* séries: todas iguais por padrão; "cada série de um jeito" abre uma aba por série (na v1 era uma lista com um modal por série) */
const MIX = new WeakSet();
const sameSet = (a, b) => a.type === b.type && (a.type !== 'NORMAL' || (a.rr[0] === b.rr[0] && a.rr[1] === b.rr[1] && a.ger === b.ger));
const sameShape = (a, b) => a.type === b.type && (a.type !== 'NORMAL' || (a.rr[0] === b.rr[0] && a.rr[1] === b.rr[1]));
/* escada: todas as séries iguais, menos a última, que deixa uma faixa a menos na reserva */
const ladder = en => { const z = en.sets, n = z.length; return n > 1 && z[0].type === 'NORMAL' && z.every(x => sameShape(x, z[0])) && z.slice(0, -1).every(x => x.ger === z[0].ger) && z[n-1].ger === z[0].ger + 1; };
const uniform = en => en.sets.every(x => sameSet(x, en.sets[0])) || ladder(en);
const setLadder = (en, g, on) => { en.sets.forEach((x, j) => { if (x.type === 'NORMAL') x.ger = on && j === en.sets.length - 1 && g < 10 ? g + 1 : g; }); };
const isMix = en => en.sets.length > 1 && (MIX.has(en) || !uniform(en));
const scopeOf = en => isMix(en) ? [Math.min(sSet, en.sets.length - 1)] : en.sets.map((_, j) => j);
const setShort = s => s.type !== 'NORMAL' ? TYPES[s.type].label.toLowerCase() : `${rrTxt(s.rr)}, ${s.ger >= 10 ? GER[s.ger].rv.toLowerCase() : 'sobrando ' + GER[s.ger].rv.replace(' na reserva', '')}`;
const restTxt = r => r >= 60 ? (r % 60 ? fmt(r/60) + ' min' : r/60 + ' min') : r + ' s';
/* resumo pelo total, que é o número que quem vem do "4 × 10 a 12" compara: aquecimento + séries válidas */
function exShort(list, k){
  const en = list[k], z = en.sets, n = z.length, a = z[0], p = prepInfo(list, k).n;
  const dots = `<span class="sdots" aria-hidden="true">${'<i class="w"></i>'.repeat(p)}${'<i></i>'.repeat(n)}</span>`;
  const sets = uniform(en) ? (a.type === 'NORMAL' ? rrTxt(a.rr) : TYPES[a.type].label.toLowerCase()) : z.map(x => x.type === 'NORMAL' ? rrTxt(x.rr) : TYPES[x.type].label.toLowerCase()).join(' + ');
  const head = p ? `${p + n} séries: ${p} de aquecimento + ${n} ${n > 1 ? 'válidas' : 'válida'}` : `${n} ${n > 1 ? 'séries válidas' : 'série válida'}`;
  return `${dots}${head} · ${sets}`;
}
function exSum(en){
  const n = en.sets.length;
  const lt = en.sets[n - 1], t = uniform(en) ? `${n} ${n > 1 ? 'séries' : 'série'} de ${setShort(en.sets[0])}${ladder(en) ? `, a última ${lt.ger >= 10 ? GER[lt.ger].rv.toLowerCase() : 'com ' + GER[lt.ger].rv}` : ''}` : en.sets.map((s, j) => `${j ? 'série' : 'Série'} ${j + 1}: ${setShort(s)}`).join('; ');
  return `${t} · descanso ${restTxt(en.rest || draft.rest)}`;
}
function bedH(list, k){
  const h = exRow(list, k), i = h.indexOf('<div class="bed">'); if (i < 0) return '';
  return h.slice(i, h.lastIndexOf('</li>')).replace(/<div class="bset">[\s\S]*?<\/div>/g, '').replace(/<button class="linkbtn" data-b="(addset|del)"[^>]*>[^<]*<\/button>/g, '');
}
function sExRow(list, k){
  const en = exArr()[k], L = LIB[en.id], open = k === bOpen;
  let h = `<li class="bex"><div class="hd"><button class="grip" data-drag="ex" data-k="${k}" aria-label="Arrastar ${esc(L.name)}">${ICON.grip}</button>
    <button class="nm" data-b="open" data-k="${k}" aria-expanded="${open}"><b>${esc(L.name)}</b><small>${exShort(list, k)}</small></button><button class="x sdel" data-s="del" data-k="${k}" aria-label="Remover ${esc(L.name)}">${ICON.x}</button></div>`;
  if (open){
    const mix = isMix(en), sc = scopeOf(en), s0 = en.sets[sc[0]], many = en.sets.length > 1;
    const which = mix ? ` na série ${sc[0] + 1}` : many ? ' por série' : '';
    const pre = s0.type === 'NORMAL' && !RRP.some(p => p.rr[0] === s0.rr[0] && p.rr[1] === s0.rr[1]) ? RRP.concat([{rr:s0.rr, t:'Do protocolo', s:rrTxt(s0.rr)}]) : RRP;
    const pi = prepInfo(list, k), lv = pct => pct < .65 ? 'leve' : pct < .8 ? 'médio' : 'quase';
    const flow = `<div class="grp"><span class="lbl">Como fica no treino</span><ol class="flow">${RAMPS[pi.n].map(r => `<li class="w"><b>Preparo</b><span>${lv(r[0])}, ${Math.round(r[0]*100)}% · ${r[1]}</span></li>`).join('')}${en.sets.map((x, j) => `<li><b>Série ${j + 1}</b><span>${x.type === 'NORMAL' ? `${rrTxt(x.rr)} · ${x.ger >= 10 ? 'até a falha' : 'reserva ' + GER[x.ger].rv.replace(' na reserva', '')}` : TYPES[x.type].label}</span></li>`).join('')}</ol>
      <p class="why">${pi.n ? `Preparo é o aquecimento: séries leves que o app coloca sozinho antes das válidas. ${pi.why}` : `Sem aquecimento aqui. ${pi.why}`} Séries válidas são as que vão perto da falha e contam para a carga subir.</p></div>`;
    h += `<div class="sed" id="sed${k}">
      ${flow}
      <div class="srow2"><span class="lbl">Quantas séries</span><div class="stepper mini" role="group" aria-label="Quantas séries"><button data-s="n-" data-k="${k}" aria-label="Menos uma série" ${many ? '' : 'disabled'}>${ICON.minus}</button><div class="val"><b class="num">${en.sets.length}</b></div><button data-s="n+" data-k="${k}" aria-label="Mais uma série">${ICON.plus}</button></div></div>
      ${many ? `<div class="grp"><div class="seg2" role="group" aria-label="Como são as séries"><button data-s="mix" data-k="${k}" data-v="0" aria-pressed="${!mix}">Todas iguais</button><button data-s="mix" data-k="${k}" data-v="1" aria-pressed="${mix}">Cada série de um jeito</button></div></div>` : ''}
      ${mix ? `<div class="stabs" role="tablist" aria-label="Séries">${en.sets.map((s, j) => `<button role="tab" data-s="sset" data-k="${k}" data-v="${j}" aria-selected="${j === sc[0]}"><b>Série ${j + 1}</b><small>${s.type === 'NORMAL' ? rrTxt(s.rr) : TYPES[s.type].label}</small></button>`).join('')}</div>` : ''}
      ${s0.type === 'NORMAL' ? `<div class="grp"><span class="lbl">Repetições${which}</span><div class="rrp" style="grid-template-columns:repeat(${pre.length},1fr)">${pre.map(p => `<button data-s="rr" data-k="${k}" data-v="${p.rr.join('-')}" aria-pressed="${s0.rr[0] === p.rr[0] && s0.rr[1] === p.rr[1]}"><b>${p.s}</b><small>${p.t}</small></button>`).join('')}</div></div>
      <div class="grp"><span class="lbl">Quanto deixar na reserva${which}</span><div class="sobra">${[7,8,9,10].map(g => `<button data-s="ger" data-k="${k}" data-v="${g}" aria-pressed="${s0.ger === g}" aria-label="${GER[g].rv}">${faceImg(g, 24)}<small>${{7:'4 a 6', 8:'2 a 3', 9:'1', 10:'Falha'}[g]}</small></button>`).join('')}</div>
      ${!mix && many && s0.ger < 10 ? `<button class="switch" role="switch" data-s="ladder" data-k="${k}" aria-checked="${ladder(en)}"><span class="kn"></span>Última série com ${GER[s0.ger + 1].rv.toLowerCase()}</button>` : ''}</div>`
      : `<div class="report"><b>${TYPES[s0.type].label}${mix ? ` na série ${sc[0] + 1}` : ''}.</b> ${esc(TYPES[s0.type].desc)}</div>`}
      <details class="advx" ${sAdv ? 'open' : ''}><summary>Opções avançadas</summary>
        <span class="lbl">Tipo ${mix ? `da série ${sc[0] + 1}` : many ? 'das séries' : 'da série'}</span>
        <div class="rrp tps">${['NORMAL','REST_PAUSE','MUSCLE_ROUND'].map(t => `<button data-s="type" data-k="${k}" data-v="${t}" aria-pressed="${s0.type === t}"><b>${TYPES[t].label}</b><small>${TSHORT[t]}</small></button>`).join('')}</div>
        ${bedH(list, k)}</details>
    </div>`;
  }
  return h + '</li>';
}
function stepbar(){
  const st = ['Dias','Se faltar','Exercícios','Revisão'];
  return `<ol class="stepbar">${st.map((t, i) => `<li><button data-s="go" data-v="${i + 1}" aria-current="${sStep === i + 1 ? 'step' : 'false'}" aria-label="Passo ${i + 1}: ${t}" ${i + 1 > 1 && !trainIdx().length ? 'disabled' : ''}><b>${i + 1}</b><span>${t}</span></button></li>`).join('')}</ol>`;
}
function weeklyAlerts(){
  const v = {}; MUSCLES.forEach(m => { v[m] = 0; });
  draft.days.forEach(d => { if (d.off) return; d.ex.forEach(e => { v[LIB[e.id].m] += e.sets.length; accOf(e).forEach(a => { v[a] += .5*e.sets.length; }); }); });
  const out = [];
  GROUPS.forEach(([g, ms]) => { const n = ms.reduce((a, m) => a + v[m], 0); if (n === 0) out.push(`${g} não tem nenhuma série na semana.`); else if (n < 4) out.push(`${g} soma ${fmt(n)} ${n === 1 ? 'série' : 'séries'} na semana, abaixo das 4 que o protocolo usa como mínimo.`); });
  trainIdx().forEach(i => { const d = draft.days[i]; if (!d.ex.length) out.push(`${DAYN[i]} está marcada como treino, mas não tem exercício.`); else { const m = estimate(dayList(d)); if (m > 60) out.push(`${DAYN[i]} passa de 60 minutos (cerca de ${m}).`); } });
  if (draft.cycle){ const r = restConflicts(draft.schedule); if (r.length) out.push(`A mesma parte do corpo treina em dias seguidos (${joinPt(r)}).`); }
  return out;
}
const DET_REST = $('bRestDet'), DET_LAYER = $('bLayerDet');
function renderSimple(focusSel){
  syncDays();
  const box = $('bSimple'), c = draft.cycle;
  let h = '';
  if (sStep === 0 && sImp){
    h = `<h3 class="sh">Importar protocolo</h3><p class="why">O arquivo vira um rascunho. Nada muda no seu protocolo até você revisar e salvar.</p>
      <label class="filebtn">Escolher arquivo<input type="file" id="sCsvFile" aria-label="Escolher arquivo CSV" accept=".csv,text/csv"></label>
      <details><summary class="linkbtn" style="display:inline-flex;align-items:center">Ou cole o conteúdo do CSV</summary><div class="col" style="gap:8px;margin-top:8px"><label class="sr" for="sCsvPaste">Conteúdo do CSV</label><textarea class="field" id="sCsvPaste" placeholder="semana,dia,descanso_seg,..."></textarea><button class="btn btn-ghost" data-s="impread">Ler CSV</button></div></details>
      <div id="sCsvRep"></div>
      <div class="snav"><button class="btn btn-ghost" data-s="impback">Voltar</button><button class="btn btn-primary" data-s="impuse" ${sPending ? '' : 'disabled'}>Usar como rascunho</button></div>`;
  }
  else if (sStep === 0){
    const nT = trainIdx().length, nE = draft.days.reduce((a, d) => a + (d.off ? 0 : d.ex.length), 0);
    h = `<h3 class="sh">Como quer começar?</h3>
      ${Object.keys(TEMPLATES).map(k => `<button class="pick" data-s="tpl" data-k="${k}"><b>${TEMPLATES[k].name}</b><span>${TEMPLATES[k].sub} Baixo volume: poucas séries, bem feitas. O aquecimento entra sozinho antes das séries que valem.</span></button>`).join('')}
      <button class="pick" data-s="zero"><b>Montar do zero</b><span>Você escolhe os dias e cada exercício.</span></button>
      <button class="pick" data-s="imp"><b>Importar um CSV</b><span>Alguém montou o protocolo para você? Escolha o arquivo e revise antes de usar.</span></button>
      ${nE ? `<button class="pick ghost" data-s="cont"><b>Continuar o rascunho</b><span>${nT} dias de treino e ${nE} exercícios já montados.</span></button>` : ''}`;
  }
  else if (sStep === 1){
    const t = trainIdx();
    h = stepbar() + `<h3 class="sh">Em quais dias você vai treinar?</h3><p class="why">Toque nos dias de treino. Os outros viram descanso.</p>
      <div class="days sdaypick">${draft.days.map((d, i) => `<button data-s="day" data-i="${i}" class="${d.off ? 'off' : ''}" aria-pressed="${!d.off}">${DAYS[i]}<small>${d.off ? 'descanso' : 'treino'}</small></button>`).join('')}</div>
      <p class="lead">${t.length ? `${t.length} ${t.length > 1 ? 'dias' : 'dia'} de treino por semana.` : 'Nenhum dia escolhido ainda.'}</p>`;
  }
  else if (sStep === 2){
    const rec = c && !fits();
    h = stepbar() + `<h3 class="sh">E se você faltar um dia?</h3>
      <button class="pick" data-s="sched" data-v="semana" aria-pressed="${draft.schedule === 'semana'}"><b>Pulo aquele treino</b><span>Cada treino fica no seu dia. Faltou na terça: na quinta você faz o treino de quinta.</span></button>
      <button class="pick" data-s="sched" data-v="sequencia" aria-pressed="${draft.schedule === 'sequencia'}"><b>Faço o que ficou para trás</b><span>Os treinos seguem uma fila. Faltou na terça: na quinta você faz o de terça, e o resto anda uma casa.</span>${rec ? '<em class="tag">Recomendado para os dias que você marcou</em>' : ''}</button>`;
  }
  else if (sStep === 3){
    const t = trainIdx();
    let tabs, head;
    if (c){
      sSess = Math.min(sSess, c.length - 1);
      tabs = c.map((ss, s) => { const ds = t.filter((_, k) => k % c.length === s).map(i => DAYS[i].toLowerCase()); return `<button data-s="sess" data-i="${s}" aria-selected="${s === sSess}">${esc(ss.name)}<small>${ds.length ? joinPt(ds) : 'semana seguinte'}</small></button>`; }).join('');
      head = c[sSess].name;
    } else {
      if (t.indexOf(bDay) < 0) bDay = t[0];
      tabs = t.map(i => `<button data-s="sday" data-i="${i}" aria-selected="${i === bDay}">${DAYS[i]}<small>${draft.days[i].ex.length} ex.</small></button>`).join('');
      head = dayName(bDay);
    }
    const list = dayList({ex:exArr()});
    h = stepbar() + `<div class="sdays" role="tablist" aria-label="${esc(head)}">${tabs}</div>
      ${undoEx ? `<div class="undo"><span>${esc(LIB[undoEx.en.id].name)} saiu do treino.</span><button data-s="undo">Desfazer</button></div>` : ''}
      ${list.length ? `<ol class="blist" id="sList">${list.map((_, k) => sExRow(list, k)).join('')}</ol>` : '<p class="why">Nenhum exercício neste treino ainda. Escolha abaixo.</p>'}
      <div class="sadd"><span class="lbl">Adicionar exercício</span><div class="chips">${GROUPS.map(([g]) => `<button data-s="flt" data-v="${g}" aria-pressed="${sFilter === g}">${g}</button>`).join('')}</div>
      <label class="sr" for="sSearch">Buscar exercício</label><input class="field" id="sSearch" placeholder="Ou busque pelo nome" autocomplete="off"><ul class="results" id="sRes"></ul></div>`;
  }
  else {
    const al = weeklyAlerts();
    h = stepbar() + `<h3 class="sh">Revisão</h3>
      ${c && draft.schedule === 'sequencia' ? '<p class="why">Esta é a primeira semana. Como os treinos seguem em fila, a semana seguinte continua de onde esta parou.</p>' : ''}
      ${trainIdx().map(i => { const d = draft.days[i], l = dayList(d), sets = l.reduce((a, e) => a + e.sets.length, 0), preps = l.reduce((a, e, k) => a + prepInfo(l, k).n, 0); return `<div class="rvday"><div><b>${esc(dayName(i))}</b><small>${l.length} ${l.length === 1 ? 'exercício' : 'exercícios'} · ${sets} ${sets === 1 ? 'série válida' : 'séries válidas'} e ${preps} de preparo · cerca de ${estimate(l)} min, contando o aquecimento</small></div>${l.length ? `<button class="endbtn" data-s="test" data-i="${i}">Testar</button>` : ''}</div>`; }).join('')}
      <div class="report">${al.length ? `<b>Vale olhar antes de salvar</b><ul>${al.map(a => `<li class="w">${esc(a)}</li>`).join('')}</ul>` : '<b>Tudo certo.</b> Todos os grupos musculares aparecem na semana, nenhuma parte do corpo treina em dias seguidos e nenhum dia passa de 60 minutos.'}</div>
      <div class="rvexp"><button class="btn btn-ghost" data-s="export">Exportar CSV</button><p class="why">Para mandar o protocolo para alguém: a pessoa importa o arquivo no Plano da própria conta.</p></div>
      <details class="card" id="sCfg"><summary><h3>Configurações do protocolo</h3></summary><p>Já vêm prontas. Só mude se souber o que quer.</p><div id="sCfgIn"></div></details>`;
  }
  if (sStep >= 1) h += `<div class="snav">${sStep > 1 ? '<button class="btn btn-ghost" data-s="prev">Voltar</button>' : '<button class="btn btn-ghost" data-s="home">Início</button>'}${sStep < 4 ? `<button class="btn btn-primary" data-s="next" ${sStep === 1 && !trainIdx().length ? 'disabled' : ''}>Próximo</button>` : `<button class="btn btn-primary" data-s="save">${st ? 'Publicar para ' + esc(st.name) : 'Salvar protocolo'}</button>`}</div>`;
  box.innerHTML = h;
  if (sStep === 4){ const cf = $('sCfgIn'); cf.appendChild(DET_REST); cf.appendChild(DET_LAYER); DET_REST.open = true; DET_LAYER.open = true; syncCfg(); }
  if (focusSel){ const f = box.querySelector(focusSel); if (f) f.focus({preventScroll:true}); }
}
function syncCfg(){
  $('bRest').value = String(draft.rest); $('bPrepRest').value = String(draft.prepRest);
  const ly = draft.layer; document.querySelectorAll('[data-l]').forEach(b => b.setAttribute('aria-checked', String(!!ly[b.dataset.l])));
  $('lWeeks').value = String(ly.weeks); $('lWeeks').disabled = !ly.phase; $('lGoal').value = String(ly.goalN); $('lGoal').disabled = !ly.goal;
}
function renderPlanBuild(){
  $('bAdv').setAttribute('aria-checked', String(adv));
  $('bSimple').hidden = adv; $('bAdvWrap').hidden = !adv;
  if (adv){ const vol = $('bVolDet'); vol.parentNode.insertBefore(DET_REST, vol); vol.parentNode.insertBefore(DET_LAYER, vol); DET_REST.open = false; DET_LAYER.open = false; }
  renderBuilder();
  if (G && !reduced) G.fromTo('#planBuild > *', {y:6, opacity:.4}, {y:0, opacity:1, duration:.25, stagger:.02, ease:'power2.out', clearProps:'opacity,transform'});
}
$('bAdv').onclick = () => { if (adv) pullBack(); else syncDays(); adv = !adv; renderPlanBuild(); };
$('bSimple').addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('advx')) sAdv = e.target.open; }, true);
$('bSimple').addEventListener('click', e => {
  const ob = e.target.closest('[data-b]');
  if (ob){ const op = ob.dataset.b === 'open', k0 = +ob.dataset.k;
    if (op){
      const cur = $('sed' + bOpen);
      const go = () => { sSet = 0; sAdv = false; bListClick({target:ob}); autosave(); if (bOpen === k0) openAnim(k0); };
      if (cur && bOpen === k0 && G && !reduced){ G.to(cur, {height:0, opacity:0, paddingBottom:0, duration:.2, ease:'power2.in', onComplete:go}); return; }
      go(); return;
    }
    bListClick(e); autosave(); return; }
  const b = e.target.closest('[data-s]'); if (!b || b.disabled) return;
  const arr = sStep === 3 ? exArr() : null, k = +b.dataset.k, en = arr && arr[k];
  switch (b.dataset.s){
    case 'tpl': setDraft(fromTemplate(b.dataset.k)); sStep = 1; break;
    case 'zero': setDraft(blankDraft()); sStep = 1; break;
    case 'imp': sImp = true; sPending = null; break;
    case 'impback': sImp = false; sPending = null; break;
    case 'impread': { const t = $('sCsvPaste').value.trim(); if (t) sReport(t); return; }
    case 'impuse': if (!sPending) return; setDraft(sPending.draft); sPending = null; sImp = false; sStep = 4; toast('CSV importado', 'Ficou como rascunho. Revise e salve para usar.', 10); break;
    case 'export': saveFile('protocolo_overload.csv', toCsv(draft)); toast('CSV exportado', 'Quem receber o arquivo importa no Plano da própria conta.', 10); return;
    case 'cont': sStep = 1; break;
    case 'home': sStep = 0; break;
    case 'go': sStep = +b.dataset.v; bOpen = -1; break;
    case 'next': if (sStep === 1 && needsWarn()){ openFit(); return; } sStep = Math.min(4, sStep + 1); bOpen = -1; break;
    case 'prev': sStep = Math.max(1, sStep - 1); bOpen = -1; break;
    case 'day': { const d = draft.days[+b.dataset.i]; d.off = !d.off; draft.layer.goalN = Math.max(1, Math.min(5, trainIdx().length)); break; }
    case 'sched': draft.schedule = b.dataset.v; break;
    case 'sday': bDay = +b.dataset.i; bOpen = -1; undoEx = null; break;
    case 'sess': sSess = +b.dataset.i; bOpen = -1; undoEx = null; break;
    case 'n-': if (en.sets.length > 1){ const lad = ladder(en); en.sets.pop(); if (lad) setLadder(en, en.sets[0].ger, en.sets.length > 1); sSet = Math.min(sSet, en.sets.length - 1); } break;
    case 'n+': { const lad = ladder(en); en.sets.push(Object.assign({}, en.sets[en.sets.length - 1])); if (lad) setLadder(en, en.sets[0].ger, true); if (isMix(en)) sSet = en.sets.length - 1; break; }
    case 'mix': if (b.dataset.v === '1'){ MIX.add(en); sSet = 0; } else { const src = en.sets[Math.min(sSet, en.sets.length - 1)]; en.sets = en.sets.map(() => Object.assign({}, src)); MIX.delete(en); MIX.delete(arr[k]); } break;
    case 'sset': sSet = +b.dataset.v; break;
    case 'rr': { const rr = b.dataset.v.split('-').map(Number); scopeOf(en).forEach(j => { if (en.sets[j].type === 'NORMAL') en.sets[j].rr = rr; }); break; }
    case 'ger': if (!isMix(en)) setLadder(en, +b.dataset.v, ladder(en)); else scopeOf(en).forEach(j => { if (en.sets[j].type === 'NORMAL') en.sets[j].ger = +b.dataset.v; }); break;
    case 'ladder': setLadder(en, en.sets[0].ger, !ladder(en)); break;
    case 'type': { const t = b.dataset.v, mixed = isMix(en); scopeOf(en).forEach(j => { if (en.sets[j].type !== t) en.sets[j] = t === 'NORMAL' ? N(8,[8,10]) : T(t); }); if (mixed) MIX.add(en); break; }
    case 'del': { const row = b.closest('.bex'); weaponFx('pistol', row, {shots:1, quick:true, onHit:() => setTimeout(() => {
      clearTimeout(undoT); undoEx = {sess:sSess, day:bDay, k, en:arr.splice(k, 1)[0]}; bOpen = -1; undoT = setTimeout(() => { if (undoEx && sStep === 3){ undoEx = null; renderSimple(); } }, 6000);
      autosave(); renderSimple(); requestAnimationFrame(() => reveal($('bSimple').querySelector('.undo'))); }, 160)}); return; }
    case 'undo': if (undoEx){ const to = draft.cycle ? draft.cycle[undoEx.sess].ex : draft.days[undoEx.day].ex; to.splice(undoEx.k, 0, undoEx.en); sSess = undoEx.sess; bDay = undoEx.day; bOpen = undoEx.k; undoEx = null; clearTimeout(undoT); } break;
    case 'flt': sFilter = sFilter === b.dataset.v ? '' : b.dataset.v; renderSimple(); showRes(); requestAnimationFrame(() => reveal($('sRes').children.length ? $('sRes') : $('bSimple').querySelector('.sadd'))); return;
    case 'test': { const d = draft.days[+b.dataset.i]; startSession(dayList(d), 'Teste: ' + DAYN[+b.dataset.i].toLowerCase(), {demo:true}); return; }
    case 'save': weaponFx('pistol', b, {shots:2, quick:true, onDone:() => FRT.on ? frSaved() : $('bSave').click()}); return;
  }
  const act = b.dataset.s; autosave(); renderSimple(b.dataset.k !== undefined && b.dataset.s !== 'del' ? `[data-s="${b.dataset.s}"][data-k="${b.dataset.k}"]${b.dataset.v ? `[data-v="${b.dataset.v}"]` : ''}` : null); if (sStep === 3 && sFilter) showRes();
  if (['next','prev','go','tpl','zero','cont','home'].includes(act)){ $('v-plano').scrollTop = 0; if (FRT.on) setTimeout(frBuildHint, 300); }
  if (act === 'del') requestAnimationFrame(() => reveal($('bSimple').querySelector('.undo')));
  if (act === 'undo') requestAnimationFrame(() => reveal($('sList') && $('sList').children[bOpen], 'start'));
  if (act === 'sset' || act === 'mix' || act === 'type') requestAnimationFrame(() => reveal($('bSimple').querySelector('.sed')));
});
$('bSimple').addEventListener('change', e => {
  if (e.target.id === 'sCsvFile'){ const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { sReport(String(rd.result)); e.target.value = ''; }; rd.readAsText(f); return; } if (e.target.closest('select[data-b]')){ bListChange(e); autosave(); } });
/* abrir um exercício: o editor cresce a partir da linha e a tela acompanha */
function openAnim(k){
  const sed = $('sed' + k), row = sed && sed.closest('.bex'); if (!sed) return;
  if (G && !reduced) G.fromTo(sed, {height:0, opacity:0}, {height:'auto', opacity:1, duration:.3, ease:'power2.out', clearProps:'height,opacity', onComplete:() => reveal(row, 'start')});
  else requestAnimationFrame(() => reveal(row, 'start'));
}
/* arrastar um exercício fecha os detalhes antes, sem a linha sair de baixo do dedo */
function dragFold(e, rerender, listId){
  const h = e.target.closest('[data-drag]'); if (!h) return;
  if (h.dataset.drag !== 'ex' || bOpen < 0){ bListDown(e); return; }
  const k = h.dataset.k, sc = $('v-plano'), y0 = h.closest('.bex').getBoundingClientRect().top;
  bOpen = -1; rerender();
  const g2 = $(listId) && $(listId).querySelector(`[data-drag="ex"][data-k="${k}"]`); if (!g2) return;
  sc.scrollTop += g2.closest('.bex').getBoundingClientRect().top - y0;
  /* o que a rolagem não conseguiu compensar vira deslocamento inicial: a linha vai para baixo do dedo no primeiro movimento */
  const left = g2.closest('.bex').getBoundingClientRect().top - y0;
  bListDown({target:g2, clientY:e.clientY + left, pointerId:e.pointerId, preventDefault:() => e.preventDefault()});
}
$('bSimple').addEventListener('pointerdown', e => { if (e.target.closest('[data-drag]')) dragFold(e, () => renderSimple(), 'sList'); });
$('bSimple').addEventListener('keydown', e => { if (e.target.closest('[data-drag]')) bListKey(e); });
/* aviso de dias num modal; "Usar a fila" mostra o passo 2 sendo marcado e segue para o passo 3 */
function openFit(){
  const X = trainIdx().length, T = TEMPLATES[draft.tpl], hi = Math.max(...T.targets), lo = Math.min(...T.targets);
  $('shT').textContent = X === 7 ? 'Sem dia de descanso' : T.targets.includes(X) ? 'Descanso entre treinos' : X > hi || (X > lo && T.targets.length === 1) ? 'Mais dias que o modelo' : X < lo ? 'Menos dias que o modelo' : 'Dias diferentes do modelo';
  $('shBody').innerHTML = fitWarn();
  sheetIn(); $('shX').focus({preventScroll:true});
}
/* rolagem: mostra o que importa agora, descontando a barra fixa de Voltar e Próximo */
function reveal(el, pos){
  const sc = $('v-plano'); if (!el || !sc) return;
  const r = el.getBoundingClientRect(), c = sc.getBoundingClientRect(), nav = sc.querySelector('.snav'), navH = nav ? nav.getBoundingClientRect().height + 8 : 0;
  const bottom = c.bottom - navH - 8; let d = 0;
  if (pos === 'start') d = r.top - c.top - 12;
  else if (pos === 'center') d = r.top - c.top - Math.max(12, (bottom - c.top - r.height) / 2);
  else if (r.bottom > bottom) d = Math.min(r.bottom - bottom, r.top - c.top - 12); else if (r.top < c.top + 8) d = r.top - c.top - 12;
  if (Math.abs(d) > 2) sc.scrollTo({top:sc.scrollTop + d, behavior:reduced ? 'auto' : 'smooth'});
}
