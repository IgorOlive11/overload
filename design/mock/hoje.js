/* ---------- Hoje ---------- */
let nextType = 'A';
const other = t => t === 'A' ? 'B' : 'A';
function renderSlots(el, done, goal, bonus){
  const check = pix(PIXI.check, 20);
  let h = '';
  for (let i = 0; i < goal; i++) h += `<div class="slot ${i < done ? 'done' : ''}" aria-label="${i < done ? 'Sessão feita' : 'Sessão pendente'}">${i < done ? check : i + 1}</div>`;
  h += `<div class="slot bonus ${bonus ? 'done' : ''}" aria-label="Bônus">${bonus ? check : pix(PIXI.skey, 14)}</div>`;
  h += `<div class="week-count num">${Math.min(done, goal)}<small> de ${goal}</small></div>`;
  el.innerHTML = h;
}
function renderProgList(el, list){
  el.innerHTML = list.map(en => {
    const L = LIB[en.id], s = suggestion(en), eq = L.eq;
    return `<div class="prog"><span class="name">${esc(L.name)}<small>${EQ[eq].name}</small></span><button class="tip delta ${s.up ? 'up' : 'hold'}" data-tip="${esc(s.why)}">${s.kg == null ? 'carga na hora' : `${fmt(s.kg)} ${unitOf(eq)}, ${s.up ? '+' + fmt(INC[eq]) : 'mantém'}`}</button></div>`;
  }).join('');
}
const SC = {
  ok:   {face:10, s:'', btn:'Começar sessão '},
  miss1:{face:8,  s:'Faltou na quinta. A sessão de hoje é obrigatória: o que conta é aparecer.', btn:'Começar sessão '},
  miss2:{face:7,  s:'15 dias fora. Nada zerou: a força se mantém nesse intervalo, então a carga continua a mesma e hoje a meta é o começo da faixa.', btn:'Recomeçar pela sessão '},
  miss3:{face:7,  s:'Um mês fora. O Doomguy também volta do inferno: depois de quatro semanas a força começa a cair, então a carga vem 10% mais leve.', btn:'Recomeçar pela sessão '}
};
/* dias desde o último treino em cada cenário; a força se mantém até cerca de 4 semanas parado */
const GAP = {ok:0, miss1:3, miss2:15, miss3:30};
const backKg = (en, eq) => { const L = lastOf(en), g = GAP[scenario]; return g >= 28 ? roundEq(L.kg * .9, eq) : L.kg; };
let scenario = 'ok';
function renderRule(){
  if (FRT.on) return frHome();
  const c = SC[scenario];
  setFace('homeFace', c.face);
  $('ruleText').hidden = !c.s; $('ruleText').textContent = c.s;
  $('startBtn').textContent = c.btn + nextType;
  showHome3D(true);
}
document.querySelectorAll('[data-sc]').forEach(b => b.addEventListener('click', () => {
  scenario = b.dataset.sc;
  document.querySelectorAll('[data-sc]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  renderRule();
}));
function showHome3D(animate){
  if (FRT.on) return frHome();
  const list = PLAN[nextType], en = list[0], L = LIB[en.id], s = suggestion(en);
  const away = GAP[scenario] >= 15, kg = away ? backKg(en, L.eq) : s.kg;
  $('homeKg').textContent = fmt(kg); $('homeU').textContent = unitOf(L.eq); $('homeCap').textContent = L.name;
  $('homeLoad').dataset.tip = `${L.name}, ${EQ[L.eq].what}. ` + (away ? (GAP[scenario] >= 28 ? 'Volta depois de mais de 4 semanas: 10% mais leve.' : 'Volta depois de uma pausa curta: mesma carga da última vez, mirando o começo da faixa.') : s.why);
  $('nextMeta').textContent = `${list.length} exercícios, cerca de ${estimate(list)} min`;
  const ups = list.filter(e => suggestion(e).up).map(e => `${LIB[e.id].name}: ${fmt(lastOf(e).kg)} para ${fmt(suggestion(e).kg)} kg`);
  $('upsCount').textContent = ups.length ? `${ups.length} ${ups.length > 1 ? 'cargas sobem' : 'carga sobe'}` : 'cargas mantidas';
  $('upsTip').dataset.tip = ups.length ? 'Chegaram ao topo da faixa em todas as séries, sem passar da reserva combinada, na última vez. ' + ups.join('. ') + '.' : 'Nenhum exercício chegou ao topo da faixa em todas as séries na última vez.';
  show3D('stageHome', en.id, kg, animate);
}

