/* ---------- o Doomguy guia: balão de fala, rosto que fala, destaque que acompanha a rolagem ---------- */
let gQ = null, gI = 0, gType = 0, gTalk = 0, gTarget = null, gRaf = 0, gStep = null;
const GERL = {7:'4 a 6', 8:'2 a 3', 9:'1', 10:'Falha'};
function gPlace(){
  const g = $('guide'), sp = $('gSpot'), a = $('app').getBoundingClientRect();
  /* se a tela foi redesenhada, o destaque procura o elemento de novo */
  if (gTarget && !gTarget.isConnected && gStep && typeof gStep.target === 'string') gTarget = document.querySelector(gStep.target);
  if (gTarget && gTarget.isConnected && !sp.hidden){
    const r0 = gTarget.getBoundingClientRect(); let rt = r0.top, rb = r0.bottom;
    /* o destaque fica dentro da área visível da tela: não passa por cima do topo, da barra de Voltar e Próximo nem das abas */
    const scr = gTarget.closest('.screen');
    if (scr){ const sr = scr.getBoundingClientRect(), nav = scr.querySelector('.snav'); let lim = sr.bottom - 6; if (nav && !nav.contains(gTarget)) lim = Math.min(lim, nav.getBoundingClientRect().top - 6); rt = Math.max(rt, sr.top + 6); rb = Math.min(rb, lim); }
    const r = {left:r0.left, width:r0.width, top:rt, bottom:rb, height:Math.max(0, rb - rt)};
    sp.style.visibility = r.height < 8 ? 'hidden' : 'visible';
    Object.assign(sp.style, {left:(r.left - a.left - 6) + 'px', top:(r.top - a.top - 6) + 'px', width:(r.width + 12) + 'px', height:(r.height + 12) + 'px'});
    /* o balão vai para o lado onde cabe, sem cobrir o destaque */
    const gh = g.offsetHeight, tabs = document.querySelector('.tabs').getBoundingClientRect().height, top = r.top - a.top, bot = r.bottom - a.top, room = a.height - tabs - 8;
    let y;
    if (room - bot - 14 >= gh) y = bot + 14;
    else if (top - 14 - 8 >= gh) y = top - 14 - gh;
    else y = (top + bot) / 2 > a.height / 2 ? 8 : room - gh;
    g.style.top = Math.max(8, Math.min(room - gh, y)) + 'px'; g.style.bottom = 'auto';
    g.classList.toggle('below', y >= bot);
  } else if (gStep){
    const tabs = document.querySelector('.tabs').getBoundingClientRect().height;
    g.style.top = gStep.pos === 'top' ? '64px' : 'auto'; g.style.bottom = gStep.pos === 'top' ? 'auto' : (tabs + 12) + 'px'; g.classList.remove('below');
  }
}
function gLoop(){ cancelAnimationFrame(gRaf); const f = () => { if ($('guide').hidden) return; gPlace(); gRaf = requestAnimationFrame(f); }; gRaf = requestAnimationFrame(f); }
function guideShow(st, last){
  const g = $('guide'); gStep = st;
  if (st.view && st.view !== view) go(st.view);
  const t = typeof st.target === 'function' ? st.target() : st.target && document.querySelector(st.target);
  g.hidden = false;
  $('gNext').textContent = st.btn || (last ? 'Entendi' : 'Próximo'); $('gSkip').hidden = true; $('gNext').disabled = true;
  $('gMini').innerHTML = st.faces ? `<div class="gscale">${st.faces.map(f => `<span><img class="face" src="${FACE[f]}" width="28" height="43" alt=""><small>${GERL[f]}</small></span>`).join('')}</div><div class="gaxis"><span>mais leve</span><span>falha</span></div>` : '';
  /* todo balão trava a tela: a pessoa só mexe depois do Entendi */
  const sp = $('gSpot'), lock = true;
  $('gBlock').hidden = !lock; sp.classList.toggle('dim', lock);
  gTarget = t && st.spot !== false ? t : null; sp.hidden = !gTarget;
  if (gTarget && st.reveal !== false) gTarget.scrollIntoView({block:'center', behavior:reduced ? 'auto' : 'smooth'});
  gPlace(); gLoop();
  /* texto letra por letra; o rosto alterna enquanto fala */
  const txt = st.text, el = $('gText'), face = $('gFace'); let n = 0;
  clearInterval(gType); clearInterval(gTalk); el.textContent = '';
  const fa = st.face || 10, fb = fa === 13 ? 10 : fa === 7 ? 8 : fa + (fa < 10 ? 1 : -1);
  face.src = FACE[fa];
  /* cerca de 33 letras por segundo; o botão só libera quando o texto termina */
  const PER = window.__gPer || 30, ready = () => { $('gNext').disabled = false; if (G && !reduced) G.fromTo('#gNext', {scale:.9}, {scale:1, duration:.2, ease:'back.out(3)'}); };
  if (reduced){ el.textContent = txt; setTimeout(ready, txt.length * PER); }
  else {
    let alt = false; gTalk = setInterval(() => { alt = !alt; face.src = FACE[alt ? fb : fa]; face.classList.toggle('chomp', alt); }, 160);
    gType = setInterval(() => { n += 1; el.textContent = txt.slice(0, n); if (n >= txt.length){ clearInterval(gType); clearInterval(gTalk); face.src = FACE[fa]; face.classList.remove('chomp'); ready(); } gPlace(); }, PER);
    if (G) G.fromTo('#guide .gbub', {scale:.85, opacity:0, transformOrigin:'24px 50%'}, {scale:1, opacity:1, duration:.25, ease:'back.out(2)'});
  }
}
function guideClose(){ clearInterval(gType); clearInterval(gTalk); cancelAnimationFrame(gRaf); $('guide').hidden = true; $('gSpot').hidden = true; $('gBlock').hidden = true; gTarget = null; gStep = null; }
function guideDone(){ guideClose(); const q = gQ; gQ = null; if (q && q.done) q.done(); }
function tour(steps, done){ gQ = {steps, done}; gI = 0; guideShow(steps[0], steps.length === 1); }
/* dica de primeira vez: aparece uma vez por conta; com lock, a tela só volta a responder depois do Entendi */
function hint(key, st){
  if (!FRT.on || FRT.seen[key] || gQ) return; FRT.seen[key] = true;
  gQ = {steps:[Object.assign({hint:true}, st)], done:st.done}; gI = 0; guideShow(gQ.steps[0], true);
}
$('gNext').onclick = () => {
  const st = gQ && gQ.steps[gI];
  if ($('gNext').disabled) return;
  if (st && st.after) st.after();
  if (!gQ || gI >= gQ.steps.length - 1) return guideDone();
  gI++; guideShow(gQ.steps[gI], gI === gQ.steps.length - 1);
};
$('gSkip').onclick = () => { const q = gQ; gQ = null; guideClose(); if (q && q.done) q.done(); };

$('gBlock').addEventListener('pointerdown', e => { e.preventDefault(); const b = $('guide').querySelector('.gbub'); b.animate([{transform:'translateX(0)'}, {transform:'translateX(-4px)'}, {transform:'translateX(4px)'}, {transform:'translateX(0)'}], {duration:200, easing:'steps(4,end)'}); });
window.addEventListener('resize', () => { if (!$('guide').hidden) gPlace(); });
/* tour do app e da metodologia, logo depois do cadastro */
function tourApp(){
  tour([
    {view:'hoje', face:13, pos:'bottom', text:`Fala, ${FRT.name}! Eu sou o Doomguy. Vou te mostrar o Overload em poucos passos e depois a gente monta o seu protocolo.`},
    {target:'#stageHome', face:10, text:'Aqui no Hoje fica só o próximo treino, com a carga do primeiro exercício em 3D. Nada de escolher entre vinte opções.'},
    {target:'#homeLoad', face:9, text:'O método é sobrecarga progressiva: você repete a mesma carga até chegar ao topo da faixa em todas as séries. Aí a carga sobe sozinha no treino seguinte.'},
    {target:'#homeFaceBtn', face:8, faces:[7,8,9,10], text:'Depois de cada série você me diz quanto sobrou no tanque. Cada cara minha é um nível. Quanto mais perto da falha, mais estímulo, mas sem perder a técnica.'},
    {target:'#weekSlots', face:10, text:'Cada treino feito vira uma keycard. A meta é por semana, em qualquer dia. O que conta é aparecer, não fazer dias seguidos.'},
    {target:'.tabs [data-v="progresso"]', face:9, text:'Em Progresso você vê a presença e a carga subindo em cada exercício.'},
    {target:'.tabs [data-v="plano"]', face:13, btn:'Montar protocolo', text:'E no Plano mora o seu protocolo. Bora montar o seu agora.'}
  ], () => { go('plano'); sStep = 0; document.querySelector('[data-pv="build"]').click(); setTimeout(frBuildHint, 300); });
}
function frBuildHint(){
  if (!FRT.on) return;
  const H1 = {
    0:['b0', {target:'#bSimple .pick', face:10, text:'Se está começando, use um modelo pronto. Os dois são de baixo volume: poucas séries, bem feitas, e treinos de 30 a 45 minutos.'}],
    1:['b1', {target:'#bSimple .sdaypick', face:9, text:'Toque nos dias em que você vai treinar. Se marcar mais ou menos dias que o modelo, eu te mostro como fica a divisão.'}],
    2:['b2', {target:'#bSimple .pick[data-v="sequencia"]', face:8, text:'Isso decide o que acontece quando você falta. Na fila, nenhum treino se perde.'}],
    3:['b3', {target:'#sList > li', face:10, reveal:false, text:'Repare que cada exercício mostra o total de séries. Os quadradinhos vazados são o aquecimento, que eu coloco sozinho com cargas leves. Os cheios são as séries que valem. No 4 × 10 a 12 que muita gente faz, as primeiras séries já são aquecimento: aqui elas viram preparo e ficam separadas. Toque num exercício para ver como fica.'}],
    4:['b4', {target:'#bSimple .report', face:13, text:'Aqui eu confiro tudo: volume de cada músculo, tempo de cada dia e descanso entre partes do corpo. Se estiver certo, é só salvar.'}]
  }[sStep];
  if (H1) hint(H1[0], H1[1]);
}
/* dicas dentro do treino, uma vez por conta; travam a tela até o Entendi */
function frCardHint(){
  const st = S.steps[S.i]; if (!st) return;
  if (st.kind === 'CALIB' && S.wk[st.k].plan.mode === 'wq') hint('wq', {lock:true, target:'#cardBody .qbox', face:9, text:'Primeira vez neste exercício, então eu ainda não sei sua força. Escolha uma carga que dê para fazer a faixa deixando a reserva que eu pedi. Se errar, tudo bem: no próximo treino eu corrijo.'});
  else if (st.kind === 'PREP') hint('prep', {lock:true, target:'#cardBody', face:10, text:'Isto é preparo: séries leves para aquecer o músculo. Não contam como série válida e não precisam ir perto da falha.'});
  else if (st.kind === 'WORK' && st.set.type === 'NORMAL') hint('ger', {lock:true, target:'#cardBody .gersel', face:8, faces:[7,8,9,10], text:'Série válida. Quando terminar, me diga quanto sobrou: é com isso que eu decido se a carga sobe. Seja honesto, iniciante costuma achar que sobrou menos do que sobrou.'});
}
/* depois da primeira série válida, o Doomguy solta a pessoa no treino */
function frAfterWork(){
  if (!FRT.on || !FRT.seen.ger || FRT.seen.rhythm) return;
  setTimeout(() => hint('rhythm', {lock:true, pos:'top', spot:false, face:13, text:'Isso! Agora é com você: mesmo ritmo até o fim. Carga, repetições, quanto sobrou e descanso. Eu fico de olho e só volto a falar quando tiver novidade.'}), 700);
}
function frFinish(early){
  const n = FRT.sessions.length, done = FRT.sessions[FRT.idx];
  if (FRT.first == null) FRT.first = FRT.day;
  FRT.total++; FRT.weekDone++; FRT.lastDay = FRT.day;
  if (draft.schedule === 'sequencia') FRT.next = (FRT.idx + 1) % n;
  const goal = draft.layer.goalN, t = frToday();
  $('doneEyebrow').textContent = `${done.name} concluída`;
  renderSlots($('weekSlotsDone'), FRT.weekDone, goal, false);
  $('nextCardTitle').textContent = t ? `Próxima: ${t.s.name}, ${whenTxt(t.at)}.` + (draft.schedule === 'sequencia' ? ' De preferência com um dia de intervalo.' : '') : '';
  const first = FRT.total === 1;
  $('achRow').hidden = !first || early;
  if (first){ $('achRow').querySelector('b').textContent = 'Primeira missão'; $('achRow').querySelector('.tip').dataset.tip = 'O primeiro treino concluído. As conquistas premiam presença e carga subindo, nunca dias seguidos.';
    $('nextUps').innerHTML = '<p class="next-meta">Cargas guardadas como referência para o próximo treino:</p>' + done.list.map(e => { const h = H[e.id]; return h ? `<div class="prog"><span class="name">${esc(LIB[e.id].name)}</span><span class="delta hold">${fmt(h.last.kg)} ${unitOf(LIB[e.id].eq)}</span></div>` : ''; }).join(''); }
  frHome();
  setTimeout(() => hint('done', {lock:true, target:'#weekSlotsDone', face:13, text:first ? `Primeira missão cumprida, ${FRT.name}! Guardei a carga de cada exercício e a semana de ajuste começou hoje. No próximo treino eu já sugiro a carga, e quando você bater o topo da faixa, ela sobe.` : 'Mais uma keycard.'}), 2600);
}

