/* ---------- simulação de primeiro acesso ----------
   Conta nova de aluno: sem histórico, sem protocolo, semana e fase zeradas. Sair da simulação recarrega o mock.
   A conta pode ser criada muito antes do primeiro treino: a semana de ajuste, a meta semanal e a regra de
   nunca faltar duas vezes só começam a contar no primeiro treino. */
const FRT = {on:false, name:'', email:'', day:0, dow0:(new Date().getDay() + 6) % 7, first:null, lastDay:null, sessions:[], next:0, weekDone:0, total:0, seen:{}, adjust:7, idx:0};
const DIAS_TXT = d => d === 1 ? '1 dia' : d + ' dias';
const dowOf = d => (FRT.dow0 + d) % 7;
const whenTxt = d => d === FRT.day ? 'hoje' : d === FRT.day + 1 ? 'amanhã' : DAYN[dowOf(d)].toLowerCase();
const adjLeft = () => FRT.first == null ? FRT.adjust : Math.max(0, FRT.adjust - (FRT.day - FRT.first));
const weekNo = () => FRT.first == null ? 1 : Math.floor((FRT.day - FRT.first) / 7) + 1;
function frStart(){
  FRT.on = true; Object.keys(H).forEach(k => delete H[k]);
  week.done = 0; phase.done = 0; scenario = 'ok';
  draft = blankDraft(); sStep = 0; adv = false; bOpen = -1;
  document.querySelector('.tabs').classList.add('four');
  $('bAdv').hidden = true;
  $('frBar').hidden = false; $('scBar').hidden = true;
  frLayer('signup');
}
/* qual treino cabe hoje: na fila, o próximo da fila; no dia fixo, o treino do dia da semana, ou o próximo dia de treino */
function frToday(){
  const n = FRT.sessions.length; if (!n) return null;
  const doneToday = FRT.lastDay === FRT.day;
  if (draft.schedule === 'sequencia'){
    const s = FRT.sessions[FRT.next];
    return {s, idx:FRT.next, today:!doneToday, at:doneToday ? FRT.day + 1 : FRT.day, doneToday};
  }
  for (let d = FRT.day + (doneToday ? 1 : 0); d < FRT.day + 8; d++){
    const i = FRT.sessions.findIndex(x => x.day === dowOf(d));
    if (i >= 0) return {s:FRT.sessions[i], idx:i, today:d === FRT.day, at:d, doneToday};
  }
  return null;
}
function frSess(){ const t = frToday(); return t && t.s; }
/* ---------- camada de entrada: cadastro, confirmação de e-mail, boas-vindas, primeira fase ---------- */
function pwScore(p){ let n = 0; if (p.length >= 8) n++; if (p.length >= 12) n++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++; if (/\d/.test(p)) n++; if (/[^A-Za-z0-9]/.test(p)) n++; return Math.min(4, n); }
const PW = [[7,'Muito fraca'],[8,'Fraca'],[9,'Razoável'],[10,'Forte'],[13,'Muito forte']];
function frLayer(page){
  const L = $('frLayer'); L.hidden = false; L.dataset.page = page;
  let h = '';
  if (page === 'signup') h = `<div class="frbox"><div class="mark">Overload</div><h2 class="frh">Criar conta</h2>
    <form id="frForm" class="col" novalidate>
      <label class="frf"><span>Nome</span><input class="field" id="frName" autocomplete="name" required></label>
      <label class="frf"><span>E-mail</span><input class="field" id="frEmail" type="email" autocomplete="email" required></label>
      <label class="frf"><span>Senha</span><input class="field" id="frPw" type="password" autocomplete="new-password" minlength="8" required></label>
      <div class="pwm" id="pwm" aria-live="polite"><img class="face" id="pwFace" src="${FACE[7]}" width="24" height="37" alt=""><div class="pwbar"><i id="pwBar"></i></div><small id="pwTxt">Pelo menos 8 caracteres</small></div>
      <label class="frf"><span>Confirmar senha</span><input class="field" id="frPw2" type="password" autocomplete="new-password" required></label>
      <p class="frerr" id="frErr" role="alert"></p>
      <button class="btn btn-primary" type="submit">Criar conta</button>
    </form>
    <button class="linkbtn frexit" data-fr="exit">Sair da simulação</button></div>`;
  if (page === 'mail') h = `<div class="frbox"><div class="mark">Overload</div><h2 class="frh">Confirme seu e-mail</h2>
    <p class="why">Mandamos um link para <b>${esc(FRT.email)}</b>. Abra o e-mail e toque no botão para entrar.</p>
    <div class="mailcard" aria-label="Prévia do e-mail de confirmação"><small>De: Overload · Para: ${esc(FRT.email)}</small>
      <b>Bem-vindo ao inferno, ${esc(FRT.name)}</b><p>Falta um passo para começar a primeira missão: confirme que este e-mail é seu.</p>
      <button class="btn btn-primary" data-fr="confirm">Confirmar e-mail</button></div>
    <button class="linkbtn" data-fr="resend">Reenviar o e-mail</button>
    <button class="linkbtn frexit" data-fr="exit">Sair da simulação</button></div>`;
  if (page === 'welcome') h = `<div class="frbox frwel"><div class="mark">Overload</div>
    <img class="face welface" id="welFace" src="${FACE[13]}" width="96" height="149" alt="Doom face">
    <h2 class="frh">Episódio 1 · Missão 1</h2>
    <p class="why">Conta criada, ${esc(FRT.name)}. Antes do primeiro treino, o Doomguy mostra como o app funciona e monta o protocolo com você.</p>
    <button class="btn btn-primary" data-fr="tour">Começar</button></div>`;
  if (page === 'phase'){
    const goal = draft.layer.goalN;
    h = `<div class="frbox"><img class="face" src="${FACE[10]}" width="48" height="74" alt=""><h2 class="frh">Sua primeira fase</h2>
      <ul class="frlist">
        <li><b>Tudo começa no seu primeiro treino.</b> Pode ser hoje ou daqui a uns dias: até lá nada conta como falta.</li>
        <li><b>Meta de ${goal} ${goal > 1 ? 'treinos' : 'treino'} por semana.</b> Em qualquer dia: o que conta é aparecer.</li>
        <li><b>Semana de ajuste.</b> Nos 7 dias depois do primeiro treino você mexe no protocolo à vontade, porque é quando aparece exercício que não cabe na sua academia.</li>
        <li><b>Depois, a fase trava por 6 semanas.</b> Ideias de mudança ficam anotadas para a próxima fase, assim o corpo tem tempo de responder.</li>
        <li><b>Nunca faltar duas vezes.</b> Perdeu um treino, o próximo vira obrigatório.</li>
        <li><b>${draft.schedule === 'sequencia' ? 'Treinos em fila.' : 'Cada treino no seu dia.'}</b> ${draft.schedule === 'sequencia' ? 'Se faltar, você faz o que ficou para trás.' : 'Se faltar, aquele treino volta na semana seguinte.'}</li>
      </ul>
      <button class="btn btn-primary" data-fr="go">Bora</button></div>`;
  }
  L.innerHTML = h; L.scrollTop = 0;
  if (G && !reduced) G.fromTo('#frLayer .frbox > *', {y:12, opacity:0}, {y:0, opacity:1, duration:.35, stagger:.05, ease:'power2.out', clearProps:'all'});
  if (page === 'signup'){ $('frName').focus({preventScroll:true}); wireSignup(); }
  if (page === 'welcome' && !reduced) $('welFace').classList.add('talk');
}
function wireSignup(){
  const pw = $('frPw');
  pw.addEventListener('input', () => { const n = pwScore(pw.value), p = PW[n]; $('pwFace').src = FACE[p[0]]; $('pwBar').style.width = (pw.value ? (n + 1) * 20 : 0) + '%'; $('pwBar').dataset.n = n; $('pwTxt').textContent = pw.value.length < 8 ? `Faltam ${8 - pw.value.length} caracteres` : p[1]; });
  $('frForm').addEventListener('submit', e => {
    e.preventDefault();
    const nm = $('frName').value.trim(), em = $('frEmail').value.trim(), a = $('frPw').value, b = $('frPw2').value;
    const err = !nm ? 'Diga seu nome.' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) ? 'Esse e-mail não parece válido.' : a.length < 8 ? 'A senha precisa de pelo menos 8 caracteres.' : a !== b ? 'As senhas não são iguais.' : '';
    $('frErr').textContent = err; if (err) return;
    FRT.name = nm.split(' ')[0]; FRT.email = em; frLayer('mail');
  });
}
$('frLayer').addEventListener('click', e => {
  const b = e.target.closest('[data-fr]'); if (!b) return;
  switch (b.dataset.fr){
    case 'exit': location.reload(); return;
    case 'resend': toast('E-mail reenviado', `Confira a caixa de entrada de ${FRT.email}.`, 10); return;
    case 'confirm': frLayer('welcome'); return;
    case 'tour': $('frLayer').hidden = true; frHome(); go('hoje'); setTimeout(tourApp, 350); return;
    case 'go': {
      $('frLayer').hidden = true; document.querySelector('[data-pv="cur"]').click(); frHome(); go('hoje');
      const t = frToday();
      setTimeout(() => hint('today', {target:'#startBtn', face:10, lock:true, text: t.today
        ? `Pronto. Seu primeiro treino é ${t.s.name}. Em cada exercício eu pergunto a carga, porque ainda não sei sua força. A partir do segundo treino, eu sugiro.`
        : `Pronto. Hoje é descanso no seu protocolo, e o primeiro treino é ${t.s.name}, ${whenTxt(t.at)}. Se quiser começar hoje, pode: nada conta até o primeiro treino.`}), 400);
      return;
    }
  }
});
document.querySelectorAll('[data-fr="start"]').forEach(b => b.addEventListener('click', frStart));
$('frBar').addEventListener('click', e => {
  const b = e.target.closest('[data-frb]'); if (!b) return;
  if (b.dataset.frb === 'exit') location.reload();
  if (b.dataset.frb === 'day'){
    FRT.day++;
    if (FRT.first != null && (FRT.day - FRT.first) % 7 === 0) FRT.weekDone = 0;
    frHome(); if (view === 'plano') frPlan();
    const left = adjLeft();
    toast(`${DAYN[dowOf(FRT.day)]}, dia ${FRT.day + 1} da conta`, FRT.first == null ? 'Ainda sem o primeiro treino: nada conta como falta até lá.' : left > 0 ? `Semana de ajuste: faltam ${DIAS_TXT(left)}.` : 'A semana de ajuste acabou e a fase está travada.', 10);
  }
});
/* ---------- telas do app para a conta nova ---------- */
function frHome(){
  $('mapChip').innerHTML = `Episódio <b>1</b> · Missão <b>${FRT.total + 1}</b>`; $('mapChip').dataset.tip = FRT.total ? `Fase 1 do protocolo, sessão ${FRT.total + 1}.` : 'Primeira missão da fase 1.';
  setFace('homeFace', 10);
  const t = frToday(), goal = draft.layer.goalN || 3;
  renderSlots($('weekSlots'), FRT.weekDone, goal, false);
  $('ruleText').hidden = true;
  if (!t){
    $('nextTitle').textContent = 'Sem protocolo ainda'; $('nextMeta').textContent = 'Monte o seu no Plano';
    $('upsCount').textContent = 'primeira missão'; $('upsTip').dataset.tip = 'Os treinos aparecem aqui depois que o protocolo for montado.';
    $('startBtn').textContent = 'Montar protocolo';
    $('homeKg').textContent = '?'; $('homeU').textContent = ''; $('homeCap').textContent = 'Primeira missão';
    $('homeLoad').dataset.tip = 'Aqui aparece a carga do primeiro exercício do próximo treino.';
    show3D('stageHome', 'hack', 40, false); return;
  }
  const s = t.s, en = s.list[0], L = LIB[en.id], sg = suggestion(en), kg = sg.kg != null ? sg.kg : DEFKG[L.eq];
  const ups = s.list.filter(e => suggestion(e).up), fresh = s.list.filter(e => !lastOf(e)).length;
  $('nextTitle').textContent = t.today ? 'Próxima: ' + s.name : t.doneToday ? 'Treino de hoje feito' : 'Hoje é descanso';
  $('nextMeta').textContent = t.today ? `${s.list.length} exercícios, cerca de ${estimate(s.list)} min` : `Próximo: ${s.name}, ${whenTxt(t.at)}`;
  $('upsCount').textContent = fresh === s.list.length ? 'carga na hora' : ups.length ? `${ups.length} ${ups.length > 1 ? 'cargas sobem' : 'carga sobe'}` : 'cargas mantidas';
  $('upsTip').dataset.tip = fresh === s.list.length ? 'Primeira vez nesses exercícios: o app pergunta a carga de cada um e guarda como referência.' : ups.map(e => `${LIB[e.id].name}: ${fmt(lastOf(e).kg)} para ${fmt(suggestion(e).kg)} ${unitOf(LIB[e.id].eq)}`).join('. ') || 'Nenhum exercício chegou ao topo da faixa em todas as séries.';
  if (!t.today){
    $('ruleText').hidden = false;
    $('ruleText').textContent = t.doneToday ? `Descanse. ${s.name} fica para ${whenTxt(t.at)}.` : FRT.first == null ? 'Sua fase começa no primeiro treino, então pular hoje não conta como falta.' : `Descanso no seu protocolo. Se der vontade, dá para adiantar ${s.name}.`;
  }
  $('homeKg').textContent = sg.kg != null ? fmt(kg) : '?'; $('homeU').textContent = sg.kg != null ? unitOf(L.eq) : ''; $('homeCap').textContent = L.name;
  $('homeLoad').dataset.tip = sg.kg != null ? `${L.name}. ${sg.why}` : `${L.name}: primeira vez. A carga é perguntada no começo do exercício.`;
  $('startBtn').textContent = t.today ? 'Começar ' + s.name : t.doneToday ? `Adiantar ${s.name}` : `Treinar hoje mesmo assim`;
  $('startBtn').classList.toggle('btn-ghost', !t.today); $('startBtn').classList.toggle('btn-primary', t.today);
  $('idleTitle').textContent = 'Cargas de ' + s.name; renderProgList($('progList'), s.list); $('startBtn2').textContent = 'Começar ' + s.name;
  show3D('stageHome', en.id, kg, false);
}
function frProg(){
  const box = $('frProg');
  if (!FRT.total){
    box.innerHTML = `<div class="card empty"><img class="face" src="${FACE[9]}" width="48" height="74" alt=""><h3>Nada por aqui ainda</h3>
      <p>Depois do primeiro treino aparecem a presença da semana, as conquistas e a carga de cada exercício.</p>
      <button class="btn btn-primary" data-frgo="${FRT.sessions.length ? 'hoje' : 'build'}">${FRT.sessions.length ? 'Ver o primeiro treino' : 'Montar protocolo'}</button></div>`;
    return;
  }
  const exs = []; FRT.sessions.forEach(s => s.list.forEach(e => { if (H[e.id] && !exs.find(x => x.id === e.id)) exs.push(e); }));
  box.innerHTML = `<p class="lead">Fase 1, semana ${weekNo()}. Você fez <b class="num">${FRT.total}</b> ${FRT.total > 1 ? 'treinos' : 'treino'} e a meta desta semana é <b class="num">${draft.layer.goalN}</b>.</p>
    <div class="card"><h3>Conquistas</h3><div class="ach">
      <div><img class="face" src="${FACE[9]}" alt="" width="36" height="56"><b>Primeira missão</b><span>primeiro treino</span></div>
      <div class="lock"><img class="face" src="${FACE[10]}" alt="" width="36" height="56"><b>Habitué</b><span>5 treinos, faltam ${Math.max(0, 5 - FRT.total)}</span></div>
      <div class="lock"><img class="face" src="${FACE[10]}" alt="" width="36" height="56"><b>Sem desculpa</b><span>2 semanas seguidas na meta</span></div></div></div>
    <div class="card"><h3>Carga por exercício</h3>${exs.map(e => { const h = H[e.id]; return `<div class="ex-prog"><span class="nm">${esc(LIB[e.id].name)}</span>${h.hist.length > 1 ? spark(h.hist, suggestion(e).up) : '<small class="why">1 sessão</small>'}<span class="pill">${fmt(h.hist[h.hist.length - 1])} ${unitOf(LIB[e.id].eq)}</span></div>`; }).join('')}</div>`;
}
function frPlan(){
  const box = $('frPlan');
  if (!FRT.sessions.length){
    box.innerHTML = `<div class="card empty"><img class="face" src="${FACE[8]}" width="48" height="74" alt=""><h3>Você ainda não tem protocolo</h3><p>Escolha um modelo pronto ou monte do zero. Leva poucos minutos.</p><button class="btn btn-primary" data-frgo="build">Montar protocolo</button></div>`;
    return;
  }
  const left = adjLeft(), wk = weekNo(), nx = frToday();
  const adj = FRT.first == null ? `<div class="card adjust"><h3>Semana de ajuste</h3><p>Começa no seu primeiro treino e dura 7 dias. Até lá, e durante ela, troque o que precisar: um exercício que sua academia não tem, um dia que não encaixa.</p><button class="btn btn-ghost" data-frgo="edit">Ajustar protocolo</button></div>`
    : left > 0 ? `<div class="card adjust"><h3>Semana de ajuste</h3><p>Faltam ${DIAS_TXT(left)} para a fase travar. Até lá, troque o que precisar: um exercício que sua academia não tem, um dia que não encaixa.</p><button class="btn btn-ghost" data-frgo="edit">Ajustar protocolo</button></div>`
    : `<div class="card"><div class="lock">${pix(PIXI.lock, 26)}<h3>Travado até a semana 7</h3></div><p class="why">A semana de ajuste acabou. Ideias de mudança ficam para a próxima fase.</p></div>`;
  box.innerHTML = `<div class="timeline">${[1,2,3,4,5,6].map(w => `<div class="${w < wk ? 'past' : w === wk ? 'now' : ''}">S${w}</div>`).join('')}</div>${adj}
    ${FRT.sessions.map((s, i) => `<details class="card" ${nx && i === nx.idx ? 'open' : ''}><summary><h3>${esc(s.name)}${nx && i === nx.idx ? ' · próximo' : ''}</h3></summary><ul class="plan-list">${s.list.map((e, k) => `<li><span>${esc(LIB[e.id].name)}</span><span>${exShort(s.list, k)}</span></li>`).join('')}</ul></details>`).join('')}`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-frgo]'); if (!b) return;
  const t = b.dataset.frgo;
  if (t === 'hoje') go('hoje');
  if (t === 'build' || t === 'edit'){ go('plano'); if (t === 'edit'){ sStep = 3; } document.querySelector('[data-pv="build"]').click(); }
});
function frSaved(){
  FRT.sessions = trainIdx().map(i => ({name:draft.names[i] || DAYN[i], day:i, list:dayList(draft.days[i])}));
  if (FRT.next >= FRT.sessions.length) FRT.next = 0;
  if (FRT.seen.saved){ toast('Protocolo ajustado', FRT.first == null ? 'A semana de ajuste começa no primeiro treino.' : `Ainda faltam ${DIAS_TXT(adjLeft())} de semana de ajuste.`, 10, true); frPlan(); frHome(); document.querySelector('[data-pv="cur"]').click(); return; }
  FRT.seen.saved = true; frLayer('phase');
}
function frStartToday(){ const t = frToday(); if (!t) return false; FRT.idx = t.idx; startSession(t.s.list, t.s.name); return true; }
