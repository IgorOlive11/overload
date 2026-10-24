/* ---------- sessão: reel de passos (calibração ou sugestão, preparo e séries válidas) ---------- */
const S = {active:false};
let iT = null;
const clockTxt = s => String(Math.floor(s/60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
function tick(){ $('hClock').textContent = clockTxt(Math.floor((Date.now() - S.t0)/1000)); }
function startSession(list, title, opts){
  opts = opts || {};
  stopRest(); clearInterval(iT);
  Object.assign(S, {active:true, list:list.map(e => Object.assign({}, e)), title, demo:!!opts.demo, i:0, view:0, valid:0, preps:0, ups:0, t0:Date.now(), type:null, res:{}, skipped:{}, snap:{}, C:null});
  S.steps = buildSteps(S.list);
  S.wk = S.list.map(en => { const pl = planFor(en, S.demo); return {kg:pl.kg, plan:pl, up:false, done:false}; });
  $('sessIdle').hidden = true; $('sessDone').hidden = true; $('sessLive').hidden = false; $('v-treino').classList.add('live');
  $('sessName').textContent = title; $('liveDot').hidden = false;
  $('skipEx').hidden = !S.demo;
  $('endEarly').querySelector('span').textContent = S.demo ? 'Sair' : 'Encerrar';
  clearInterval(S.timer); S.timer = setInterval(tick, 1000); tick();
  go('treino'); renderSession(0);
}
const prepKg = (k, pct) => roundEq(S.wk[k].kg * pct, LIB[S.list[k].id].eq);
const workIdx = k => S.steps.map((s, i) => s.k === k && s.kind === 'WORK' ? i : -1).filter(i => i >= 0);
const modeOf = i => i === S.i ? 'live' : i < S.i ? 'edit' : 'fut';
function kgView(){
  const i = S.view, st = S.steps[i];
  if ((st.kind === 'CALIB' || st.kind === 'PREP') && S.C && S.C.ph.kg != null) return S.C.ph.kg;
  return S.res[i] && S.res[i].kg != null ? S.res[i].kg : S.wk[st.k].kg;
}
function gerOf(st){ if (st.kind === 'PREP') return 7; const s = st.kind === 'WORK' ? st.set : S.list[st.k].sets[0]; return s.type === 'NORMAL' ? s.ger : TYPES[s.type].ger; }
function showStep3D(animate){
  if (!S.active || !S.C) return;
  const st = S.steps[S.view], id = S.list[st.k].id, eq = LIB[id].eq, kg = kgView();
  const kgEl = $('sessKg'); if (!kgEl) return;
  kgEl.textContent = fmt(kg); $('sessU').textContent = unitOf(eq);
  show3D('stageSess', id, kg, animate);
}
const numIn = (act, val, dec) => `<input data-in="${act}" value="${val}" inputmode="${dec ? 'decimal' : 'numeric'}" ${dec ? '' : 'pattern="[0-9]*"'} autocomplete="off" enterkeyhint="done">`;
const stepperH = (act, val, unit, label, dec) => `<div class="stepper" role="group" aria-label="${label}"><button data-act="${act}-" aria-label="Diminuir ${label.toLowerCase()}">${ICON.minus}</button><label class="val">${numIn(act, val, dec)}<small>${unit}</small><span class="sr">${label}</span></label><button data-act="${act}+" aria-label="Aumentar ${label.toLowerCase()}">${ICON.plus}</button></div>`;
/* painel de GER da v1: Doom face, rótulo, nome e reservas, em todo cartão de série (não na pergunta de carga) */
const typeLine = (g, label, sub, prep) => `<div class="gerline${prep ? ' prep' : ''}">${faceImg(g, 40)}<div><div class="t1">${GER[g].t}</div><div class="t2">${label}</div><div class="t3">${sub}</div></div></div>`;
/* quanto sobrou: um seletor no cartão; as opções abrem num modal */
const CHEV = pix(PIXI.down, 16).replace('<svg ', '<svg class="chev" ');
const gerSel = (target, sel) => `<button class="gersel" data-act="gerpick" aria-haspopup="dialog"><span><small>Quanto sobrou?</small><b>${up1(GER[sel].left)}</b></span>${CHEV}</button>`;
let gerCb = null;
function openGer(target, sel, rule, cb){
  const opts = target <= 10 ? [7,8,9,10] : [10,11,12,13];
  gerCb = cb; $('shT').textContent = 'Quanto sobrou?';
  $('shBody').innerHTML = `<div class="rirlist" role="group" aria-label="Quanto sobrou na série">` + opts.map(g =>
    `<button data-pickg="${g}" aria-pressed="${g === sel}">${faceImg(g, 32)}<span><b>${up1(GER[g].left)}</b><small>${GER[g].t}</small></span>${g === target ? '<i class="tg">alvo</i>' : '<i></i>'}</button>`).join('') + `</div>`;
  sheetIn();
  const cur = $('shBody').querySelector('[aria-pressed="true"]'); (cur || $('shX')).focus({preventScroll:true});
}
function setVal(act, v){ const el = $('cardBody') && $('cardBody').querySelector(`[data-in="${act}"]`); if (el && el !== document.activeElement) el.value = v; else if (el) el.value = v; }
const kgStepFor = id => dir => v => { const E = EQ[LIB[id].eq]; return Math.max(E.base || E.step, Math.round((v + dir*E.step)*100)/100); };
function inlineTimer(sec, onEnd){
  clearInterval(iT); let left = sec;
  const upd = () => { const el = $('cardBody') && $('cardBody').querySelector('.itimer'); if (!el) return; el.querySelector('b').textContent = left; el.querySelector('.trk i').style.width = (left/sec*100) + '%'; };
  upd(); iT = setInterval(() => { left--; if (left <= 0){ clearInterval(iT); onEnd(); } else upd(); }, 1000);
}
const itimerH = sec => `<div class="itimer" role="timer"><div class="trk"><i></i></div><b class="num">${sec}</b></div>`;
const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };

/* conteúdo de um passo; mode 'live' é o atual, 'edit' corrige um passado, 'fut' é um futuro bloqueado */
function card(i, mode){
  const st = S.steps[i], en = S.list[st.k], L = LIB[en.id], w = S.wk[st.k], unit = unitOf(L.eq), saved = S.res[i], live = mode !== 'edit';
  const C = {ph:{}, act:{}, typed:{}, paint:() => '', kind:st.kind}, p = C.ph;
  const finish = res => mode === 'live' ? completeStep(res) : mode === 'edit' ? saveEdit(i, res) : null;
  const btn = (txt, cls) => `<button class="btn ${cls || 'btn-primary'}" data-act="done">${live ? txt : 'Salvar correção'}</button>`;
  const ks = kgStepFor(en.id);
  const intField = (key, min, max) => v => { const n = parseNum(v); if (n == null) return; p[key] = Math.max(min, Math.min(max, Math.round(n))); };
  const pi = prepInfo(S.list, st.k);
  if (st.kind === 'CALIB'){
    const pl = w.plan;
    p.kg = saved ? saved.kg : w.kg; p.adjust = mode === 'edit' || pl.mode === 'wq';
    const ramp = () => RAMPS[pi.n].map((r, j) => `<li><small>${Math.round(r[0]*100)}%</small>${fmt(roundEq(p.kg*r[0], L.eq))} × ${r[1].replace(' a ', '-')}</li>`).join('') +
      en.sets.map((x, j) => `<li class="w"><small>S${j+1}</small>${x.type === 'NORMAL' ? fmt(p.kg) + ' × ' + x.rr.join('-') : TYPES[x.type].label.toLowerCase()}</li>`).join('');
    const planRow = () => `<div class="planrow"><ol class="rampline">${ramp()}</ol></div>`;
    C.paint = () => {
      if (!p.adjust) return `<div class="sug ${pl.mode}">${faceImg(pl.face, 40)}<div><h4>${pl.head}</h4><p>${esc(pl.body)}</p></div></div>` +
        (pl.mode === 'up' && mode === 'live' ? `<div class="kgjump ${w.blasted ? 'blown' : 'armed'}" aria-label="Carga sobe de ${fmt(lastOf(en).kg)} para ${fmt(pl.kg)} ${unit}"><s>${fmt(lastOf(en).kg)}</s><span class="arr">${pix(PIXI.up, 24)}</span><b>${fmt(pl.kg)}<small>${unit}</small></b></div>` : '') + planRow() +
        `<div class="okrow"><button class="btn btn-ghost" data-act="adjust">Ajustar</button><button class="btn btn-primary okbtn" data-act="done">Ok!</button></div>`;
      const q = pl.mode === 'wq' || mode === 'edit' ? `<p class="qbox">${esc(weightQuestion(en.sets[0]))}</p>` : `<p class="lastrec">Sugestão de hoje: ${fmt(pl.kg)} ${unit}. Ajuste se a academia não tiver essa carga.</p>`;
      return q + stepperH('kg', fmt(p.kg), unit, 'Carga de trabalho', true) + planRow() +
        (pl.mode !== 'wq' && mode !== 'edit' ? `<div class="okrow"><button class="btn btn-ghost" data-act="unadjust">Voltar</button>${btn('Confirmar carga')}</div>` : btn('Confirmar carga'));
    };
    const setKg = v => { p.kg = v; setVal('kg', fmt(p.kg)); const r = $('cardBody') && $('cardBody').querySelector('.rampline'); if (r) r.innerHTML = ramp(); showStep3D(true); };
    C.act = {'kg-': () => setKg(ks(-1)(p.kg)), 'kg+': () => setKg(ks(1)(p.kg)), adjust: () => { p.adjust = true; paintCard(); },
      unadjust: () => { p.adjust = false; p.kg = pl.kg; paintCard(); showStep3D(true); }, done: () => finish({kg:p.adjust ? roundEq(p.kg, L.eq) : pl.kg})};
    C.typed = {kg: v => { const n = parseNum(v); if (n != null && n > 0){ p.kg = n; showStep3D(false); } }};
    C.commit = {kg: () => setKg(roundEq(p.kg, L.eq))};
  }
  else if (st.kind === 'PREP'){
    p.kg = saved ? saved.kg : prepKg(st.k, st.pct); p.reps = saved ? saved.reps : firstNum(st.rr);
    C.sub = `Preparo ${st.j + 1} de ${st.n} · ${Math.round(st.pct*100)}%`;
    C.paint = () => typeLine(7, `${st.rr} repetições`, GER[7].rv, true) +
      `<div class="two">${stepperH('kg', fmt(p.kg), unit, 'Carga', true)}${stepperH('reps', p.reps, 'reps feitas', 'Repetições')}</div>` + btn('Concluir preparo', 'btn-prep');
    C.act = {'kg-': () => { p.kg = ks(-1)(p.kg); setVal('kg', fmt(p.kg)); showStep3D(true); }, 'kg+': () => { p.kg = ks(1)(p.kg); setVal('kg', fmt(p.kg)); showStep3D(true); },
      'reps-': () => { p.reps = Math.max(0, p.reps - 1); setVal('reps', p.reps); }, 'reps+': () => { p.reps = Math.min(40, p.reps + 1); setVal('reps', p.reps); },
      done: () => finish({kg:roundEq(p.kg, L.eq), reps:p.reps})};
    C.typed = {kg: v => { const n = parseNum(v); if (n != null && n > 0){ p.kg = n; showStep3D(false); } }, reps:intField('reps', 0, 40)};
    C.commit = {kg: () => { p.kg = roundEq(p.kg, L.eq); setVal('kg', fmt(p.kg)); showStep3D(true); }};
  }
  else {
    const set = st.set, n = en.sets.length, tg = w.plan.tg[st.j];
    C.sub = `Série ${st.j + 1} de ${n} · ${TYPES[set.type].label.toLowerCase()}`;
    if (set.type === 'NORMAL'){
      p.reps = saved ? saved.reps : (tg && tg.reps) || Math.round((set.rr[0] + set.rr[1]) / 2); p.ger = saved ? saved.ger : set.ger;
      const meta = tg ? (tg.range ? ` Meta de hoje: ${rrTxt(set.rr)}.` : ` Meta de hoje: ${tg.reps}.`) : '';
      C.paint = () => typeLine(set.ger, `${rrTxt(set.rr)} repetições`, GER[set.ger].rv) +
        stepperH('reps', p.reps, 'reps feitas', 'Repetições') + gerSel(set.ger, p.ger) + btn('Concluir série');
      C.act = {'reps-': () => { p.reps = Math.max(0, p.reps - 1); setVal('reps', p.reps); }, 'reps+': () => { p.reps = Math.min(40, p.reps + 1); setVal('reps', p.reps); },
        gerpick: () => openGer(set.ger, p.ger, '', g => { p.ger = g; paintCard(); }),
        done: () => finish({reps:p.reps, ger:p.ger})};
      C.typed = {reps:intField('reps', 0, 40)};
    }
    else if (set.type === 'REST_PAUSE'){
      Object.assign(p, saved ? {phase:'edit', b1:saved.b1, b2:saved.b2} : {phase:'b1', b1:(tg && tg.b1) || 8, b2:3});
      C.paint = () => {
        const sub = p.phase === 'b1' ? 'Bloco 1 até a falha' : p.phase === 'pause' ? 'Pausa de 20 segundos' : p.phase === 'b2' ? 'Bloco 2 até a falha' : 'Corrigir os dois blocos';
        const head = typeLine(12, 'Rest-pause', sub);
        if (p.phase === 'b1') return head + stepperH('b1', p.b1, 'reps no bloco 1', 'Repetições do bloco 1') + `<button class="btn btn-primary" data-act="next">Fim do bloco 1</button>`;
        if (p.phase === 'pause') return head + itimerH(20) + `<button class="btn btn-ghost" data-act="skip">Pular pausa</button>`;
        if (p.phase === 'b2') return head + stepperH('b2', p.b2, 'reps no bloco 2', 'Repetições do bloco 2') + btn('Concluir série');
        return head + `<div class="two">${stepperH('b1', p.b1, 'bloco 1', 'Repetições do bloco 1')}${stepperH('b2', p.b2, 'bloco 2', 'Repetições do bloco 2')}</div>` + btn('');
      };
      const toB2 = () => { p.phase = 'b2'; paintCard(); };
      C.act = {
        'b1-': () => { p.b1 = Math.max(0, p.b1 - 1); setVal('b1', p.b1); }, 'b1+': () => { p.b1++; setVal('b1', p.b1); },
        'b2-': () => { p.b2 = Math.max(0, p.b2 - 1); setVal('b2', p.b2); }, 'b2+': () => { p.b2++; setVal('b2', p.b2); },
        next: () => { if (p.b1 <= 0) return; p.phase = 'pause'; paintCard(); inlineTimer(20, toB2); },
        skip: () => { clearInterval(iT); toB2(); },
        done: () => { if (p.phase !== 'edit' && p.b2 <= 0) return; finish({b1:p.b1, b2:p.b2}); }
      };
      C.typed = {b1:intField('b1', 0, 40), b2:intField('b2', 0, 40)};
    }
    else {
      /* muscle round: até 6 blocos de 4; pode falhar em qualquer bloco e a série termina ali */
      Object.assign(p, saved ? {phase:'edit', stop: saved.blocks >= 6 ? 6 : saved.blocks + 1, last:saved.last} : {done:0, phase:'go', last:(tg && tg.last) || 5, fail:2});
      C.paint = () => {
        const head = sub => typeLine(11, 'Muscle round', sub);
        if (p.phase === 'edit'){
          const grid = '<div class="blocks" aria-hidden="true">' + Array.from({length:6}, (_, i) => `<i class="${i < p.stop - 1 ? 'done' : i === p.stop - 1 ? (p.stop === 6 && p.last > 3 ? 'done' : 'fail') : ''}">${i + 1}</i>`).join('') + '</div>';
          return head('Corrigir onde parou') + grid +
            `<div class="two">${stepperH('stop', p.stop, 'bloco onde parou', 'Bloco onde parou')}${stepperH('last', p.last, 'reps nesse bloco', 'Repetições nesse bloco')}</div>` + btn('');
        }
        const grid = '<div class="blocks" aria-label="Blocos">' + Array.from({length:6}, (_, i) => `<i class="${i < p.done ? 'done' : i === p.done ? (p.phase === 'fail' ? 'fail' : 'now') : ''}">${i + 1}</i>`).join('') + '</div>';
        const meta = tg && tg.last ? ` Meta: ${tg.last} no sexto.` : tg && tg.txt.startsWith('passar') ? ` Meta: ${tg.txt}.` : '';
        const sub = p.phase === 'pause' ? `Pausa de 10 segundos` : p.phase === 'fail' ? `Falhou no bloco ${p.done + 1}` : p.phase === 'final' ? `Bloco 6 de 6, até a falha` : `Bloco ${p.done + 1} de 6, 4 repetições`;
        if (p.phase === 'go') return head(sub) + grid + `<button class="btn btn-primary" data-act="blk">Bloco ${p.done + 1} feito, 4 reps</button><button class="btn btn-ghost" data-act="fail">Falhei antes de 4</button>`;
        if (p.phase === 'pause') return head(sub) + grid + itimerH(10) + `<button class="btn btn-ghost" data-act="skip">Pular pausa</button>`;
        if (p.phase === 'final') return head(sub) + grid + stepperH('last', p.last, 'reps no sexto bloco', 'Repetições no sexto bloco') + btn('Concluir série');
        return head(sub) + grid + stepperH('fr', p.fail, 'reps no bloco', 'Repetições no bloco da falha') + btn('Concluir série') + `<button class="linkbtn" data-act="unfail">Não falhei, voltar</button>`;
      };
      const after = () => { p.phase = p.done >= 5 ? 'final' : 'go'; paintCard(); };
      C.act = {
        blk: () => { p.done++; p.phase = 'pause'; paintCard(); inlineTimer(10, after); },
        skip: () => { clearInterval(iT); after(); },
        fail: () => { p.phase = 'fail'; paintCard(); }, unfail: () => { p.phase = 'go'; paintCard(); },
        'fr-': () => { p.fail = Math.max(0, p.fail - 1); setVal('fr', p.fail); }, 'fr+': () => { p.fail = Math.min(3, p.fail + 1); setVal('fr', p.fail); },
        'last-': () => { p.last = Math.max(0, p.last - 1); setVal('last', p.last); }, 'last+': () => { p.last++; setVal('last', p.last); },
        'stop-': () => { p.stop = Math.max(1, p.stop - 1); paintCard(); }, 'stop+': () => { p.stop = Math.min(6, p.stop + 1); paintCard(); },
        done: () => {
          if (p.phase === 'edit') return finish(p.stop === 6 ? {blocks:6, last:p.last} : {blocks:p.stop - 1, last:Math.min(3, p.last)});
          finish(p.phase === 'final' ? {blocks:6, last:p.last} : {blocks:p.done, last:p.fail});
        }
      };
      C.typed = {fr:intField('fail', 0, 3), last:intField('last', 0, 40), stop:intField('stop', 1, 6)};
    }
  }
  if (st.kind === 'CALIB') C.sub = mode === 'edit' || w.plan.mode === 'wq' ? 'Pergunta de carga' : 'Carga de hoje';
  return C;
}
function rowRes(i){
  const st = S.steps[i], r = S.res[i], u = unitOf(LIB[S.list[st.k].id].eq);
  if (S.skipped[i]) return 'pulado, igual à série válida';
  if (!r) return '';
  if (st.kind === 'CALIB') return `${fmt(r.kg)} ${u}`;
  if (st.kind === 'PREP') return `${fmt(r.kg)} ${u} × ${r.reps}`;
  if (st.set.type === 'NORMAL') return `${r.reps} reps, ${GER[r.ger].left}`;
  if (st.set.type === 'REST_PAUSE') return `${r.b1} + ${r.b2} reps`;
  return r.blocks >= 6 ? `6 blocos, ${r.last} no sexto` : `parou no bloco ${r.blocks + 1}`;
}
function stepSub(i){ const st = S.steps[i], en = S.list[st.k]; if (st.kind === 'CALIB') return S.wk[st.k].plan.mode === 'wq' ? 'Pergunta de carga' : 'Carga de hoje'; if (st.kind === 'PREP') return `Preparo ${st.j + 1} de ${st.n}`; return `Série ${st.j + 1} de ${en.sets.length} · ${TYPES[st.set.type].label.toLowerCase()}`; }
function restPanelH(){
  return `<div class="rpanel" id="rPanel"><div class="trk3"><i id="rBar"></i></div><div class="rrow"><button class="adj" data-rest="-15" aria-label="Menos 15 segundos">−15</button><div class="rt"><small id="rKind">${R.kind}</small><b class="num" id="rT"></b></div><button class="adj" data-rest="15" aria-label="Mais 15 segundos">+15</button><span class="sp"></span><button class="rgo" data-rest="go" id="rGo">Pular</button></div></div>`;
}
const LOCKSVG = ICON.lock;
function cardH(i, active){
  const st = S.steps[i], en = S.list[st.k], L = LIB[en.id], md = modeOf(i), cls = (st.kind === 'PREP' ? ' prep' : '') + (active && md === 'edit' ? ' edit' : '');
  const kg = active ? '' : (S.res[i] && S.res[i].kg != null ? S.res[i].kg : st.kind === 'PREP' ? prepKg(st.k, st.pct) : S.wk[st.k].kg);
  const info = `<button class="infobtn" data-info="${en.id}" aria-label="Como fazer ${esc(L.name)}">${ICON.info}</button>`;
  const hd = `<div class="rc-hd"><div><h3>${esc(L.name)}</h3><span class="sub">${active && S.C.sub ? S.C.sub : stepSub(i)}</span></div>${info}</div>`;
  const lockTip = st.kind === 'WORK' ? `<button class="tip lk" data-tip="A carga fica travada nas séries válidas, como na v1. Para corrigir, volte no reel até a carga de hoje deste exercício." aria-label="Por que a carga está travada">${LOCKSVG}</button>` : '';
  if (active){
    return `<article class="rcard act${cls}" data-i="${i}">${hd}<div class="stage" id="stageSess"><div class="load"><span class="kg" id="sessKg"></span><span class="u" id="sessU"></span>${lockTip}</div></div>` +
      `<div class="cardbody${(R.on && md === 'live') || md === 'fut' ? ' locked' : ''}" id="cardBody"></div>` + '' + `</article>`;
  }
  const snap = S.snap[i] ? `<img class="snap" src="${S.snap[i]}" alt="">` : '';
  const res = md === 'fut' ? `<div class="rc-lock">${LOCKSVG} Bloqueado</div>` : `<div class="rc-sum"><span>${md === 'live' ? (R.on ? 'Em descanso' : 'Passo atual') : 'Feito'}</span><b>${rowRes(i) || '—'}</b></div>`;
  return `<article class="rcard${cls}" data-i="${i}" aria-hidden="true">${hd}<div class="stage">${snap}<div class="load"><span class="kg">${fmt(kg)}</span><span class="u">${unitOf(L.eq)}</span></div></div>${res}</article>`;
}
function renderSession(dir){
  clearInterval(iT); hideTip();
  if (B3.ok && S.C && S.prevView != null && CV.closest('.rcard')){ try { S.snap[S.prevView] = CV.toDataURL('image/webp', .6); } catch(e){} }
  const v = S.view, md = modeOf(v);
  S.C = card(v, md);
  const lo = Math.max(0, v - 2), hi = Math.min(S.steps.length - 1, v + 2);
  let h = ''; for (let i = lo; i <= hi; i++) h += cardH(i, i === v);
  if (CV.closest('#reel')) $('stageHome').insertBefore(CV, $('stageHome').firstChild);
  $('reel').innerHTML = h;
  mountCanvas('stageSess'); if (B3.ok) B3.run(view === 'treino');
  paintCard();
  $('rPrev').disabled = v === 0; $('rNextBtn').disabled = v === S.steps.length - 1;
  const vb = $('viewBar'); vb.hidden = md === 'live'; vb.className = 'viewbar' + (md === 'edit' ? ' past' : '');
  vb.innerHTML = pix(md === 'edit' ? PIXI.down : PIXI.up, 14) + 'Voltar ao atual';
  if (!R.on) $('restSlot').innerHTML = ''; else if (!$('rPanel')) $('restSlot').innerHTML = restPanelH(); else $('rKind').textContent = R.kind;
  drawRest();
  S.prevView = v;
  showStep3D(dir !== 0);
  layoutReel(false, 0, dir);
}
/* posições do reel: cartão ativo no centro, vizinhos encolhendo e apagando como na v1 */
function layoutReel(animate, dy, dir){
  const reel = $('reel'), H = reel.clientHeight, cards = [...reel.children];
  const act = cards.find(c => c.classList.contains('act')); if (!act) return;
  act.style.maxHeight = Math.max(200, H - 12) + 'px';
  /* cabe sem rolagem: o 3D encolhe até 64 px antes de o cartão rolar */
  const stg = act.querySelector('.stage'); if (stg){ stg.style.height = ''; const over = act.scrollHeight - act.clientHeight; if (over > 0) stg.style.height = Math.max(64, stg.offsetHeight - over) + 'px'; }
  act.classList.toggle('scroll', act.scrollHeight > act.clientHeight + 1);
  const hA = act.offsetHeight, v = S.view, gap = 14;
  const topA = hA >= H - 12 ? 6 : (H - hA) / 2;
  const unit = hA * .6 + gap, du = (dy || 0) / unit;
  const pos = {}; pos[v] = topA;
  let y = topA; cards.filter(c => +c.dataset.i < v).reverse().forEach(c => { y -= gap + c.offsetHeight; pos[c.dataset.i] = y; });
  y = topA + hA; cards.filter(c => +c.dataset.i > v).forEach(c => { pos[c.dataset.i] = y + gap; y += gap + c.offsetHeight; });
  const apply = () => cards.forEach(c => {
    const i = +c.dataset.i, ad = Math.abs(i - v - (-du));
    const sc = Math.max(.84, 1 - ad*.12), op = Math.max(.22, 1 - ad*.5);
    c.style.transform = `translateY(${pos[i] + (dy || 0)}px) scale(${sc})`; c.style.opacity = op; c.style.zIndex = 100 - Math.round(ad*10);
  });
  if (dir && !reduced){
    cards.forEach(c => { c.classList.remove('anim'); c.style.transform = `translateY(${pos[c.dataset.i] + dir*unit}px) scale(.94)`; c.style.opacity = .5; });
    void reel.offsetHeight; cards.forEach(c => c.classList.add('anim')); apply();
    return;
  }
  cards.forEach(c => c.classList.toggle('anim', !!animate && !reduced)); apply();
}
function paintCard(){
  const b = $('cardBody'), slot = $('actSlot'); slot.innerHTML = '';
  if (!b || !S.C) return; b.innerHTML = S.C.paint();
  /* os botões sempre saem do cartão, mesmo travado, para o cartão não mudar de altura quando o descanso abre */
  slot.classList.toggle('locked', b.classList.contains('locked'));
  [...b.children].filter(el => el.matches('.btn,.okrow')).forEach(el => slot.appendChild(el));
  if (S.view === S.i && b.querySelector('.kgjump.armed')) setTimeout(blastKg, 250);
  if (FRT.on && !S.demo && S.view === S.i) setTimeout(frCardHint, 350);
}
$('actSlot').addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a || a.disabled) return; const f = S.C && S.C.act[a.dataset.act]; if (f){ f(a); requestAnimationFrame(() => layoutReel(false, 0)); } });
function commit(d){
  const n = S.view + d; if (n < 0 || n >= S.steps.length){ layoutReel(true, 0); return; }
  S.view = n; renderSession(d);
}
function backToCurrent(){ if (S.view === S.i) return; const d = S.i > S.view ? 1 : -1; S.view = S.i; renderSession(d); }
$('viewBar').onclick = backToCurrent;
$('rPrev').onclick = () => commit(-1); $('rNextBtn').onclick = () => commit(1);
/* arrasto, rolagem e teclado */
(() => {
  const reel = $('reel'); let y0 = null, dy = 0, dragging = false, justDragged = false, pid = null, wheelAcc = 0, wheelLock = false;
  const actCard = () => reel.querySelector('.rcard.act');
  reel.addEventListener('pointerdown', e => {
    if (e.target.closest('input,select,textarea')) return;
    y0 = e.clientY; dy = 0; dragging = false; pid = e.pointerId;
  });
  reel.addEventListener('pointermove', e => {
    if (y0 == null || e.pointerId !== pid) return;
    dy = e.clientY - y0;
    if (!dragging){
      if (Math.abs(dy) < 8) return;
      const a = actCard();
      if (a && a.classList.contains('scroll') && e.pointerType !== 'mouse'){ y0 = null; return; }
      dragging = true; try { reel.setPointerCapture(pid); } catch(err){}
      document.body.classList.add('dragmode'); hideTip();
    }
    let d = dy; if ((S.view === 0 && d > 0) || (S.view === S.steps.length - 1 && d < 0)) d *= .3;
    layoutReel(false, d);
  });
  const end = () => {
    if (y0 == null) return; y0 = null; document.body.classList.remove('dragmode');
    if (!dragging) return; dragging = false; justDragged = true; setTimeout(() => { justDragged = false; }, 60);
    if (dy >= 50) commit(-1); else if (dy <= -50) commit(1); else layoutReel(true, 0);
  };
  reel.addEventListener('pointerup', end); reel.addEventListener('pointercancel', () => { y0 = null; dragging = false; document.body.classList.remove('dragmode'); layoutReel(true, 0); });
  reel.addEventListener('click', e => { if (justDragged){ e.stopPropagation(); e.preventDefault(); } }, true);
  reel.addEventListener('wheel', e => {
    const a = actCard();
    if (a && a.classList.contains('scroll') && a.contains(e.target)){
      const atTop = a.scrollTop <= 0, atBot = a.scrollTop + a.clientHeight >= a.scrollHeight - 1;
      if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBot)) return;
    }
    e.preventDefault(); if (wheelLock) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 40){ commit(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; wheelLock = true; setTimeout(() => { wheelLock = false; }, 300); }
  }, {passive:false});
  document.addEventListener('keydown', e => {
    if (!S.active || view !== 'treino' || !$('sheet').hidden) return;
    const t = document.activeElement && document.activeElement.tagName;
    if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    if (e.key === 'ArrowUp'){ e.preventDefault(); commit(-1); }
    if (e.key === 'ArrowDown'){ e.preventDefault(); commit(1); }
  });
  window.addEventListener('resize', () => { if (S.active && view === 'treino') layoutReel(false, 0); });
})();
$('reel').addEventListener('click', e => {
  const inf = e.target.closest('[data-info]'); if (inf){ openInfo(inf.dataset.info); return; }
  const a = e.target.closest('[data-act]');
  if (a){ if (a.disabled || a.closest('.locked')) return; const f = S.C && S.C.act[a.dataset.act]; if (f){ f(a); requestAnimationFrame(() => layoutReel(false, 0)); } return; }
});
$('reel').addEventListener('input', e => { const t = e.target.closest('[data-in]'); if (!t || !S.C) return; const f = S.C.typed[t.dataset.in]; if (f) f(t.value); });
$('reel').addEventListener('change', e => { const t = e.target.closest('[data-in]'); if (!t || !S.C) return; const f = S.C.commit && S.C.commit[t.dataset.in]; if (f) f(); else { const k = t.dataset.in === 'fr' ? 'fail' : t.dataset.in; if (S.C.ph[k] != null) t.value = S.C.ph[k]; } });
$('reel').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-in]')) e.target.blur(); });
$('restSlot').addEventListener('click', e => { const r = e.target.closest('[data-rest]'); if (!r) return; if (r.dataset.rest === 'go') restDone(); else adjustRest(+r.dataset.rest); });

/* corte do preparo da v1: se a carga arredondada já é a de trabalho e as reps alcançam o mínimo da série, o preparo é pulado (o primeiro nunca) */
function shouldCut(n){
  const st = S.steps[n]; if (!st || st.kind !== 'PREP' || st.j === 0) return false;
  const w = S.wk[st.k], en = S.list[st.k], ws = en.sets[0];
  const workMin = ws.type === 'NORMAL' ? ws.rr[0] : Infinity;
  return prepKg(st.k, st.pct) >= w.kg && firstNum(st.rr) >= workMin;
}
function flash(kind){
  if (typeof faceReact === 'function') setTimeout(() => faceReact(kind === 'pickup' ? 'grin' : 'hurt'), 60);
  if (reduced) return; const f = $('flash'); f.className = 'flash ' + kind; void f.offsetWidth; f.classList.add('go');
}
function completeStep(res){
  clearInterval(iT);
  const i = S.i, st = S.steps[i], w = S.wk[st.k], en = S.list[st.k];
  S.res[i] = Object.assign({}, res);
  if (FRT.on && !S.demo && st.kind === 'WORK') frAfterWork();
  if (st.kind === 'CALIB') w.kg = res.kg;
  if (st.kind === 'PREP') S.preps++;
  if (st.kind === 'WORK'){
    S.res[i].kg = w.kg; S.valid++;
    const hard = st.set.type !== 'NORMAL' || res.ger >= 10;
    const L0 = lastOf(en), prev = L0 && L0.res[st.j];
    if (st.set.type === 'NORMAL' && prev && prev.reps != null && (w.kg > L0.kg ? res.reps >= prev.reps : w.kg === L0.kg && res.reps > prev.reps)){
      flash('pickup'); toast('Recorde nesta série', `${res.reps} repetições com ${fmt(w.kg)} ${unitOf(LIB[en.id].eq)}. Da última vez foram ${prev.reps} com ${fmt(L0.kg)}.`, 13, true);
      setTimeout(() => weaponFx('pistol', $('toast'), {shots:1, quick:true}), 200);
    } else if (st.set.type === 'MUSCLE_ROUND' && res.blocks >= 6 && res.last > 4){
      /* muscle round completo: a regra mais difícil de bater ganha dois tiros */
      flash('pickup'); toast('Muscle round completo', `Os 6 blocos saíram e o sexto teve ${res.last} repetições. A carga sobe no próximo treino.`, 13, true);
      setTimeout(() => weaponFx('pistol', $('toast'), {shots:2, quick:true}), 200);
    } else if (hard) flash('pain');
  }
  let n = i + 1; while (n < S.steps.length && shouldCut(n)){ S.skipped[n] = true; S.res[n] = null; n++; }
  const nx = S.steps[n], rest = restBefore(st, nx, S.list);
  const endEx = st.kind === 'WORK' && (!nx || nx.k !== st.k);
  let delay = 0;
  if (endEx) delay = judgeExercise(st.k) ? 900 : 250;
  S.i = n;
  if (S.i >= S.steps.length) return setTimeout(() => finishSession(false), delay);
  setTimeout(() => { if (!S.active) return; if (rest) startRest(rest, nx); S.view = S.i; renderSession(1); }, delay);
}
function saveEdit(i, res){
  const st = S.steps[i], w = S.wk[st.k];
  if (st.kind === 'CALIB'){ w.kg = res.kg; S.res[i] = {kg:res.kg}; }
  else S.res[i] = Object.assign({}, S.res[i], res);
  if (w.done) judgeExercise(st.k, true);
  toast('Série atualizada', st.kind === 'CALIB' ? 'A carga corrigida vale para as séries que ainda faltam.' : 'O registro corrigido entra na regra de progressão.', 9);
  renderSession(0);
}
function judgeExercise(k, quiet){
  const en = S.list[k], L = LIB[en.id], w = S.wk[k], unit = unitOf(L.eq);
  const js = en.sets.map((s, j) => judge(s, S.res[workIdx(k)[j]], w.kg, L.eq));
  const was = w.up, first = !w.done;
  w.done = true; w.up = js.every(j => j.ok); w.next = w.up ? w.kg + INC[L.eq] : w.kg;
  S.ups += (w.up ? 1 : 0) - (was ? 1 : 0);
  if (!S.demo){ if (!H[en.id]) H[en.id] = {last:null, hist:[]}; H[en.id].last = {kg:w.kg, res:workIdx(k).map(i => Object.assign({}, S.res[i]))}; if (first){ const hh = H[en.id].hist; H[en.id].hist = (hh.length >= 5 ? hh.slice(1) : hh).concat(w.kg); } }
  if (quiet) return w.up;
  if (w.up){ flash('pickup'); toast(`Progressão: ${L.name}`, `Bateu a regra. Na próxima vez, ${fmt(w.next)} ${unit}.`, 13, true); show3D('stageSess', en.id, w.next, true); }
  else { const miss = js.find(j => !j.ok); toast(`${L.name}: mantém ${fmt(w.kg)} ${unit}`, `Faltou: ${miss.txt}.`, 9); }
  return w.up;
}
$('skipEx').onclick = () => {
  if (!S.active) return;
  const k = S.steps[S.i].k; stopRest();
  let j = S.i; while (j < S.steps.length && S.steps[j].k === k) j++;
  if (j >= S.steps.length) return finishSession(false);
  S.i = j; S.view = j; renderSession(1);
};
function leaveLive(){ $('actSlot').innerHTML = ''; $('sessLive').hidden = true; $('v-treino').classList.remove('live'); if (B3.ok) B3.run(view === 'hoje'); }
$('endEarly').onclick = () => {
  const b = $('endEarly'), sp = b.querySelector('span');
  if (!b.dataset.armed){ b.dataset.armed = '1'; const was = sp.textContent; sp.textContent = 'Tem certeza?'; b._t = setTimeout(() => { delete b.dataset.armed; sp.textContent = was; }, 3000); return; }
  clearTimeout(b._t); delete b.dataset.armed; sp.textContent = S.demo ? 'Sair' : 'Encerrar';
  if (S.demo){ stopRest(); clearInterval(iT); clearInterval(S.timer); S.active = false; $('liveDot').hidden = true; leaveLive(); $('sessIdle').hidden = false; mountCanvas('stageHome'); return; }
  finishSession(true);
};

/* passo a passo do exercício: GIF e instruções da biblioteca */
const GIFSVG = (() => {
  const A = ['....##....','....##....','..######..','.#..##..#.','.#..##..#.','....##....','....##....','...#..#...','...#..#...','..#....#..','..#....#..','.##....##.'];
  const B = ['..........','..........','..........','....##....','....##....','..######..','.#..##..#.','....##....','..##..##..','.#......#.','.#......#.','.##....##.'];
  return pix(A, 120).replace('<svg ', '<svg class="fr a" style="position:absolute;color:#ff1414" ') + pix(B, 120).replace('<svg ', '<svg class="fr b" style="position:absolute;color:#ff1414" ');
})();
function openInfo(id){
  gerCb = null;
  const L = LIB[id], steps = INFO[id] || [];
  $('shT').textContent = L.name;
  $('shBody').innerHTML = `<div class="gif">${GIFSVG}</div>` +
    `<div class="facts"><div><small>Músculo alvo</small><b>${cap(L.m)}</b></div><div><small>Equipamento</small><b>${EQ[L.eq].name}</b></div>${L.acc.length ? `<div><small>Secundário</small><b>${L.acc.map(cap).join(', ')}</b></div>` : ''}</div>` +
    `<ol class="steps">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  sheetIn(); $('shX').focus({preventScroll:true});
}
/* modal: sobe suave do pé da tela e desce ao fechar; o fundo só muda de opacidade, que é barato de animar */
function sheetIn(){
  const sh = $('sheet'), pn = sh.querySelector('.panel'); clearTimeout(sheetT);
  sh.classList.remove('opening', 'closing'); sh.hidden = false; pn.scrollTop = 0;
  if (!reduced){ void sh.offsetWidth; sh.classList.add('opening'); }
}
let sheetT = 0;
function closeInfo(){
  const sh = $('sheet'); if (sh.hidden) return;
  if (reduced){ sh.hidden = true; return; }
  sh.classList.remove('opening'); sh.classList.add('closing');
  sheetT = setTimeout(() => { sh.hidden = true; sh.classList.remove('closing'); }, 180);
}
$('shX').onclick = closeInfo;
$('shBody').addEventListener('click', e => { const b = e.target.closest('[data-pickg]'); if (!b || !gerCb) return; const f = gerCb; gerCb = null; closeInfo(); f(+b.dataset.pickg); });
$('sheet').addEventListener('click', e => { if (e.target === $('sheet')) closeInfo(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('sheet').hidden) closeInfo(); });

/* descanso: embaixo do reel, com ajuste de 15 s; fora da tela de treino vira rodapé. Só segue ao tocar em Pronto ou Pular */
const R = {on:false, left:0, dur:0, done:false, kind:'', next:''};
function restLabel(nx){
  const en = S.list[nx.k], L = LIB[en.id], unit = unitOf(L.eq);
  if (nx.kind === 'PREP') return {kind:'Descanso do preparo', next:`Próximo: preparo ${nx.j + 1} de ${nx.n}, ${fmt(prepKg(nx.k, nx.pct))} ${unit}. Leve, só para aquecer o movimento.`};
  const s = nx.set;
  const hint = s.type === 'NORMAL' ? `Busque ${s.rr[1]} repetições deixando ${GER[s.ger].r}.` : s.type === 'REST_PAUSE' ? 'Bloco 1 até a falha, 20 segundos, bloco 2 até a falha.' : 'Blocos de 4 repetições com 10 segundos entre eles.';
  return {kind:'Descanso', next:`Próxima: série ${nx.j + 1} de ${en.sets.length}, ${TYPES[s.type].label.toLowerCase()}, ${fmt(S.wk[nx.k].kg)} ${unit}. ${hint}`};
}
function startRest(dur, nx){
  if (FRT.on && !S.demo) setTimeout(() => hint('rest', {lock:true, target:'#rPanel', face:9, text:'Descanso. O cronômetro conta sozinho e avisa quando acabar. Dá para tirar ou somar 15 segundos, ou seguir antes se já estiver pronto.'}), 500);
  const l = restLabel(nx);
  Object.assign(R, {on:true, left:dur, dur, done:false, kind:l.kind, next:l.next});
  clearInterval(R.t);
  R.t = setInterval(() => { if (R.left > 0) R.left--; if (R.left <= 0 && !R.done){ R.done = true; } drawRest(); }, 1000);
}
function adjustRest(d){ R.left = Math.max(0, R.left + d); R.dur = Math.max(R.dur, R.left); R.done = R.left <= 0; drawRest(); }
function stopRest(){ clearInterval(R.t); R.on = false; R.done = false; drawRest(); }
function restDone(){ stopRest(); if (S.active){ S.view = S.i; renderSession(0); } }
function drawRest(){
  const pct = R.dur ? R.left/R.dur : 0, col = pct > .5 ? 'var(--ok)' : pct > .2 ? 'var(--warn)' : 'var(--accent)';
  const t = R.done ? 'Pronto' : Math.floor(R.left/60) + ':' + String(R.left % 60).padStart(2, '0');
  const pnl = $('rPanel');
  if (pnl){
    pnl.classList.toggle('done', R.done); $('rT').textContent = t; $('rGo').textContent = R.done ? 'Pronto, seguir' : 'Pular';
    $('rBar').style.width = (pct*100) + '%'; $('rBar').style.backgroundColor = R.done ? 'var(--ok)' : col;
    pnl.querySelectorAll('.adj').forEach(b => { b.disabled = R.done; });
  }
  const f = $('restFoot'); f.hidden = !(R.on && view !== 'treino');
  if (!f.hidden){ $('fT').textContent = t; $('fBar').style.width = (pct*100) + '%'; $('fBar').style.backgroundColor = R.done ? 'var(--ok)' : col; }
}
$('fBack').onclick = () => go('treino');

function toast(title, sub, face, good){
  const t = $('toast'); $('toastT').textContent = title; $('toastS').textContent = sub; setFace('toastFace', face);
  t.classList.toggle('good', !!good); t.hidden = false;
  if (G && !reduced){ G.killTweensOf(t); G.fromTo(t, {x:-16, opacity:0}, {x:0, opacity:1, duration:.25, ease:'expo.out'}); G.to(t, {opacity:0, duration:.3, delay:3.6, onComplete:() => { t.hidden = true; }}); }
  else { clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 3800); }
}

const week = {done:1};
const phase = {done:5, total:12};
function countTo(el, to, fmtF){
  fmtF = fmtF || (n => String(Math.round(n)));
  if (!G || reduced){ el.textContent = fmtF(to); return; }
  const o = {v:0}; G.to(o, {v:to, duration:Math.min(1.4, .4 + to*.04), ease:'power1.out', delay:.25, onUpdate:() => { el.textContent = fmtF(o.v); }});
}
function finishSession(early){
  stopRest(); clearInterval(iT); clearInterval(S.timer); S.active = false; $('liveDot').hidden = true;
  const secs = Math.max(60, Math.round((Date.now() - S.t0)/1000));
  const par = estimate(S.list) * 60, shown = S.demo || early ? secs : Math.max(secs, par - 120);
  leaveLive(); $('sessDone').hidden = false; $('v-treino').scrollTop = 0; mountCanvas('stageHome');
  setFace('doneFace', early ? 10 : 13);
  if (!reduced){ $('doneFace').classList.remove('shake'); void $('doneFace').offsetWidth; $('doneFace').classList.add('shake'); }
  const frOn = FRT.on && !S.demo;
  const title = S.demo ? 'Teste concluído' : early ? 'Presença registrada' : frOn ? `Missão ${FRT.total + 1} concluída` : 'Meta da semana batida';
  $('doneTitle').innerHTML = title.split(' ').map(w => `<span class="w" style="display:inline-block">${w}</span>`).join(' ');
  $('doneEyebrow').textContent = S.demo ? 'Não conta presença' : `${S.title} concluída`;
  const totW = S.steps.filter(x => x.kind === 'WORK').length;
  countTo($('tSets'), S.valid, n => `${Math.round(n)}/${totW}`); countTo($('tPrep'), S.preps); countTo($('tUps'), S.ups);
  countTo($('tTime'), shown, n => clockTxt(Math.round(n))); $('tPar').textContent = clockTxt(par);
  const ups = S.list.map((en, k) => ({en, w:S.wk[k]})).filter(x => x.w.up);
  $('nextUps').innerHTML = ups.length ? ups.map(x => { const L = LIB[x.en.id]; return `<div class="prog"><span class="name">${esc(L.name)}</span><span class="delta up">${fmt(x.w.kg)} para ${fmt(x.w.next)} ${unitOf(L.eq)}</span></div>`; }).join('') : '<p class="next-meta">Nenhuma carga sobe desta vez. A regra de cada série fica para a próxima.</p>';
  $('achRow').hidden = S.demo || early;
  if (!S.demo){
    week.done = Math.min(2, week.done + 1); phase.done++; renderPhase();
    renderSlots($('weekSlotsDone'), week.done, 2, false); renderSlots($('weekSlots'), week.done, 2, false);
    if (S.type) nextType = other(S.type);
    $('nextCardTitle').textContent = `Próxima: sessão ${nextType}, em qualquer dia, de preferência com um dia de intervalo.`;
    refreshForNext(); renderExProg();
  } else { $('nextCardTitle').textContent = 'O teste não mexe na semana nem no histórico.'; }
  $('weekSlotsDone').hidden = S.demo;
  if (frOn) frFinish(early);
  if (G && !reduced){
    G.fromTo('#doneTitle .w', {filter:'blur(10px)', opacity:0, y:12}, {filter:'blur(0px)', opacity:1, y:0, duration:.6, stagger:.09, ease:'power3.out'});
    if (!early) setTimeout(() => { if (!$('sessDone').hidden) weaponFx(S.demo ? 'pistol' : 'ssg', $('doneTitle'), {shots:2, onHit:() => faceReact('grin')}); }, 900);
    G.fromTo('#inter > div', {x:-10, opacity:0}, {x:0, opacity:1, duration:.3, stagger:.12, ease:'power2.out'});
    G.fromTo('#weekSlotsDone .slot.done', {scale:.6, rotate:-12}, {scale:1, rotate:0, duration:.6, stagger:.12, ease:'expo.out', delay:.5});
  }
}
function refreshForNext(){
  if (FRT.on) return frHome();
  $('nextTitle').textContent = 'Próxima: sessão ' + nextType;
  $('startBtn2').textContent = 'Começar sessão ' + nextType;
  $('idleTitle').textContent = 'Cargas da sessão ' + nextType;
  renderProgList($('progList'), PLAN[nextType]);
  renderRule();
}
function startPlan(){
  if (FRT.on){ if (!FRT.sessions.length){ go('plano'); sStep = 0; document.querySelector('[data-pv="build"]').click(); return; } frStartToday(); return; }
  startSession(PLAN[nextType], 'Sessão ' + nextType);
  S.type = nextType;
}
$('backHome').onclick = () => { $('sessDone').hidden = true; $('sessIdle').hidden = false; go('hoje'); };
$('startBtn').onclick = () => startPlan();
$('startBtn2').onclick = () => startPlan();
$('demoBtn').onclick = () => startSession(DEMO, 'Teste de séries', {demo:true});

