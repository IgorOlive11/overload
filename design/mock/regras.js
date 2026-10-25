/* ---------- regras ---------- */
const TYPES = {
  NORMAL:      {label:'Normal', ger:null, desc:'Série reta dentro da faixa de repetições, com a reserva do protocolo. A carga sobe quando todas as séries chegam ao topo da faixa sem passar do esforço alvo.'},
  REST_PAUSE:  {label:'Rest-pause', ger:12, fx:'cerca de 8', desc:'DC style rest pause: carga para cerca de 8 repetições. Bloco 1 até a falha, pausa de 20 segundos e bloco 2 até a falha. A carga sobe quando o bloco 1 chega a 10 repetições.'},
  MUSCLE_ROUND:{label:'Muscle round', ger:11, fx:'até 6 × 4', desc:'Até 6 blocos de 4 repetições com 10 segundos de pausa entre eles. Dá para falhar em qualquer bloco, e a série termina ali. O sexto bloco vai até a falha. A carga só sobe quando os 6 blocos saem completos e o sexto passa de 4 repetições.'}
};
const RAMPS = {3:[[.55,'8 a 10'],[.70,'6 a 8'],[.85,'4 a 6']], 2:[[.60,'8 a 10'],[.80,'4 a 6']], 1:[[.80,'4 a 6']], 0:[]};
const EQ = {
  barra:    {name:'Barra', base:20, step:2.5, what:'barra olímpica de 20 kg com anilhas, arredonda em 2,5 kg'},
  smith:    {name:'Smith', base:15, step:2.5, what:'barra do Smith de 15 kg com anilhas, arredonda em 2,5 kg'},
  carregada:{name:'Máquina de anilhas', base:0, step:5, what:'máquina carregada com anilhas nos dois lados, arredonda em 5 kg'},
  pilha:    {name:'Máquina de placas', base:0, step:2.5, what:'pilha de placas de 5 kg com meia placa de 2,5 kg; acima da pilha, anilhas no gympin. Polias usam o mesmo modelo'},
  halteres: {name:'Halteres', base:0, step:2, what:'par de halteres, carga por mão, de 2 em 2 kg', each:true}
};
const INC = {barra:5, smith:2.5, carregada:5, pilha:2.5, halteres:2};
const DEFKG = {barra:40, smith:30, carregada:40, pilha:30, halteres:10};
const unitOf = eq => EQ[eq].each ? 'kg cada' : 'kg';
const roundEq = (kg, eq) => { const E = EQ[eq]; const v = E.base + Math.round(Math.max(0, kg - E.base) / E.step) * E.step; return Math.max(E.base || E.step, Math.round(v*100)/100); };
const MUSCLES = ['COSTAS','PEITO','OMBROS','TRÍCEPS','BÍCEPS','QUADRÍCEPS','POSTERIOR','GLÚTEOS','ADUTORES','PANTURRILHA','CORE'];

/* max: tamanho real da pilha da máquina, em kg */
const LIB = {
  hack:  {name:'Hack squat', m:'QUADRÍCEPS', acc:['GLÚTEOS'], eq:'carregada'},
  leg45: {name:'Leg press 45°', m:'QUADRÍCEPS', acc:[], eq:'carregada'},
  ext:   {name:'Cadeira extensora', m:'QUADRÍCEPS', acc:[], eq:'pilha', max:100},
  extr:  {name:'Extensora tronco reclinado', m:'QUADRÍCEPS', acc:[], eq:'pilha', max:100},
  stiff: {name:'Stiff', m:'POSTERIOR', acc:['GLÚTEOS'], eq:'barra'},
  flex:  {name:'Cadeira flexora', m:'POSTERIOR', acc:[], eq:'pilha', max:100},
  flexpe:{name:'Flexão de pernas em pé', m:'POSTERIOR', acc:[], eq:'pilha', max:70},
  adut:  {name:'Cadeira adutora', m:'ADUTORES', acc:[], eq:'pilha', max:100},
  pants: {name:'Panturrilha sentado', m:'PANTURRILHA', acc:[], eq:'carregada'},
  pantp: {name:'Panturrilha em pé na máquina', m:'PANTURRILHA', acc:[], eq:'pilha', max:100},
  pux:   {name:'Puxada alta aberta', m:'COSTAS', acc:['BÍCEPS'], eq:'pilha', max:100},
  puxf:  {name:'Puxada alta fechada', m:'COSTAS', acc:['BÍCEPS'], eq:'pilha', max:100},
  tbar:  {name:'T-bar row aberta', m:'COSTAS', acc:['OMBROS'], eq:'carregada'},
  pullo: {name:'Pullover com corda', m:'COSTAS', acc:[], eq:'pilha', max:70},
  dev:   {name:'Desenvolvimento no Smith', m:'OMBROS', acc:['PEITO'], eq:'smith'},
  elev:  {name:'Elevação lateral na máquina', m:'OMBROS', acc:[], eq:'pilha', max:70},
  crucr: {name:'Crucifixo reverso na máquina', m:'OMBROS', acc:[], eq:'pilha', max:70},
  sup:   {name:'Supino inclinado no Smith', m:'PEITO', acc:['TRÍCEPS'], eq:'smith'},
  supH:  {name:'Supino inclinado com halteres', m:'PEITO', acc:['TRÍCEPS'], eq:'halteres'},
  pecfly:{name:'Pec fly na máquina', m:'PEITO', acc:[], eq:'pilha', max:100},
  paral: {name:'Tríceps paralela na máquina', m:'TRÍCEPS', acc:['OMBROS'], eq:'pilha', max:100},
  pul:   {name:'Tríceps pulley', m:'TRÍCEPS', acc:[], eq:'pilha', max:70},
  scott: {name:'Rosca Scott na máquina', m:'BÍCEPS', acc:[], eq:'pilha', max:70}
};
const stackMax = id => LIB[id].max || 100;

/* histórico de exemplo da fase 1 (2 séries normais de 8 a 12, GER 8) */
const H = {
  hack: {last:{kg:80, res:[12,12]}, hist:[70,75,75,80,80]},
  flex: {last:{kg:45, res:[12,10]}, hist:[40,40,42.5,45,45]},
  pux:  {last:{kg:60, res:[11,10]}, hist:[52.5,55,57.5,60,60]},
  dev:  {last:{kg:40, res:[12,11]}, hist:[35,35,37.5,40,40]},
  pul:  {last:{kg:25, res:[12,12]}, hist:[20,22.5,22.5,25,25]},
  stiff:{last:{kg:70, res:[12,12]}, hist:[60,65,65,70,70]},
  ext:  {last:{kg:50, res:[12,11]}, hist:[45,45,47.5,50,50]},
  sup:  {last:{kg:50, res:[10,9]},  hist:[45,45,47.5,50,50]},
  tbar: {last:{kg:45, res:[12,12]}, hist:[35,40,40,45,45]},
  elev: {last:{kg:20, res:[12,12]}, hist:[15,17.5,17.5,20,20]}
};
Object.values(H).forEach(h => { h.last.res = h.last.res.map(r => ({reps:r, ger:8})); });

const N = (ger, rr) => ({type:'NORMAL', ger, rr: rr || [8,12]});
const T = type => ({type});
const f1 = (id, prep, rest) => ({id, sets:[N(8),N(8)], prep, rest, prepRest:60});
const PLAN = {
  A:[f1('hack',2,120), f1('flex',0,90), f1('pux',2,120), f1('dev',0,120), f1('pul',0,90)],
  B:[f1('stiff',2,120), f1('ext',0,90), f1('sup',2,120), f1('tbar',0,120), f1('elev',0,90)]
};
/* sessão de demonstração: pergunta de carga na primeira vez (pec fly), três estados do músculo, trava manual, os três tipos, os cinco equipamentos e o gympin */
const DEMO = [
  {id:'dev',   sets:[N(9,[6,8]), T('REST_PAUSE')], prep:'auto', rest:120, prepRest:40, last:{kg:40, res:[{reps:10, ger:9},{b1:9,b2:4}]}},
  {id:'pecfly', sets:[N(9,[10,12])], prep:'auto', rest:90, prepRest:40},
  {id:'supH',  sets:[N(9,[10,12]),N(9,[10,12])], prep:'auto', rest:120, prepRest:40, last:{kg:20, res:[{reps:12, ger:9},{reps:12, ger:9}]}},
  {id:'elev',  sets:[T('MUSCLE_ROUND')], prep:'auto', rest:90, prepRest:40, last:{kg:20, res:[{blocks:6, last:6}]}},
  {id:'pul',   sets:[N(10,[10,12])], prep:0, rest:90, prepRest:40, last:{kg:25, res:[{reps:11, ger:10}]}},
  {id:'hack',  sets:[N(8,[10,12]),N(8,[10,12])], prep:'auto', rest:120, prepRest:40, last:{kg:80, res:[{reps:12, ger:8},{reps:12, ger:9}]}},
  {id:'pantp', sets:[N(9,[10,12])], prep:1, rest:60, prepRest:30, last:{kg:110, res:[{reps:13, ger:9}]}},
  {id:'stiff', sets:[N(9,[8,10]), N(9,[8,10])], prep:'auto', rest:120, prepRest:40, last:{kg:70, res:[{reps:10, ger:9},{reps:9, ger:9}]}}
];

function accOf(en){ return en.acc || LIB[en.id].acc; }
function prepInfo(list, k){
  const en = list[k], m = LIB[en.id].m, before = list.slice(0, k);
  const prim = before.some(e => LIB[e.id].m === m);
  const acc = before.some(e => accOf(e).includes(m));
  const state = prim ? 'ja_primario' : acc ? 'pre_ativado' : 'estreante';
  const auto = {estreante:3, pre_ativado:2, ja_primario:1}[state];
  const locked = en.prep !== 'auto' && en.prep !== undefined && en.prep !== null;
  const n = locked ? +en.prep : auto;
  const stateTxt = {estreante:`${cap(m)} entra pela primeira vez na sessão (estreante), então são 3 séries de preparo.`,
    pre_ativado:`${cap(m)} já trabalhou como acessório antes nesta sessão (pré-ativado), então são 2 séries de preparo.`,
    ja_primario:`${cap(m)} já foi o músculo principal de um exercício anterior (já primário), então é 1 série de preparo.`}[state];
  const why = locked ? `Travado manualmente em ${n}. Pelo estado do músculo seriam ${auto}: ${stateTxt.charAt(0).toLowerCase() + stateTxt.slice(1)}` : stateTxt;
  return {n, state, auto, locked, why};
}
function buildSteps(list){
  const st = [];
  list.forEach((en, k) => {
    st.push({k, kind:'CALIB'});
    const p = prepInfo(list, k);
    RAMPS[p.n].forEach((r, j) => st.push({k, kind:'PREP', j, n:p.n, pct:r[0], rr:r[1]}));
    en.sets.forEach((s, j) => st.push({k, kind:'WORK', j, set:s}));
  });
  return st;
}
/* descanso: só antes de preparo ou de série válida, nunca depois da calibração; o valor é o do exercício da próxima série */
function restBefore(cur, nx, list){
  if (!nx || cur.kind === 'CALIB') return 0;
  if (nx.kind === 'PREP') return list[nx.k].prepRest;
  if (nx.kind === 'WORK') return list[nx.k].rest;
  return 0;
}
const EXEC = {PREP:20, NORMAL:35, REST_PAUSE:75, MUSCLE_ROUND:120};
function estimate(list){
  const st = buildSteps(list); let s = list.length * 75;
  st.forEach((x, i) => { if (x.kind === 'PREP') s += EXEC.PREP; if (x.kind === 'WORK') s += EXEC[x.set.type]; s += restBefore(x, st[i+1], list); });
  return Math.round(s / 60);
}
function weightQuestion(set){
  if (set.type === 'NORMAL'){
    if (set.ger <= 9) return `Com que peso você faz ${rrTxt(set.rr)} repetições deixando ${GER[set.ger].rv}?`;
    if (set.ger === 10) return `Com que peso você faz ${rrTxt(set.rr)} repetições indo até a falha com a técnica perfeita?`;
    return `Com que peso você faria ${set.rr[1]} repetições indo além da falha?`;
  }
  if (set.type === 'REST_PAUSE') return 'Com que peso você faria cerca de 8 repetições chegando perto da falha total?';
  return 'Com que peso você normalmente falharia entre 10 e 12 repetições?';
}

/* progressão por tipo de série */
/* salto grande: o próximo incremento passa de 10% da carga (teto da ACSM). Aí a carga só sobe com uma repetição além do topo,
   para a pessoa não cair abaixo da faixa logo depois de subir */
const bigJump = (kg, eq) => kg > 0 && INC[eq] / kg > .10;
function judge(set, r, kg, eq){
  if (!r) return {ok:false, txt:'série não feita'};
  if (set.type === 'NORMAL'){
    const big = bigJump(kg, eq), need = set.rr[1] + (big ? 1 : 0);
    const g = r.ger != null ? r.ger : set.ger, top = r.reps >= need, eff = g <= set.ger;
    return {ok: top && eff, under: r.reps < set.rr[0], big,
      txt: `${r.reps} repetições, ${GER[g].left}, numa série de ${rrTxt(set.rr)} com ${GER[set.ger].rv.toLowerCase()}` + (top && !eff ? ' (chegou ao topo, mas com menos reserva que o combinado)' : '') + (big && r.reps === set.rr[1] ? ` (o próximo salto passa de 10% da carga, então sobe com ${need})` : '')};
  }
  if (set.type === 'REST_PAUSE') return {ok: r.b1 >= 10, txt:`rest-pause com ${r.b1} repetições no bloco 1 e ${r.b2} no bloco 2 (sobe com 10 no bloco 1)`};
  return {ok: r.blocks >= 6 && r.last > 4, txt: r.blocks >= 6 ? `muscle round completo com ${r.last} repetições no sexto bloco (sobe com mais de 4)` : `muscle round com falha no bloco ${r.blocks + 1} de 6`};
}
function lastOf(en){
  if (en.last) return en.last;
  const h = H[en.id];
  if (h && en.sets.every(s => s.type === 'NORMAL') && h.last.res.length === en.sets.length) return h.last;
  return null;
}
function suggestion(en){
  const L = lastOf(en), eq = LIB[en.id].eq, inc = INC[eq];
  if (!L) return {kg:null, up:false, short:'Sem histórico', why:'Primeira vez neste formato. Responda a pergunta da calibração; a carga vira a referência.'};
  const js = en.sets.map((s, i) => judge(s, L.res[i], L.kg, eq));
  const lastTxt = `Na última sessão, com ${fmt(L.kg)} ${unitOf(eq)}: ${js.map(j => j.txt).join('; ')}.`;
  if (js.every(j => j.ok)) return {kg:L.kg + inc, up:true, short:`Sobe ${fmt(inc)} kg`, why:lastTxt + ` Bateu a regra em todas as séries, então hoje sobe ${fmt(inc)} kg.`};
  if (js.some(j => j.under)) return {kg:L.kg, up:false, under:true, short:'Abaixo da faixa', why:lastTxt + ' Ficou abaixo do mínimo da faixa. A sugestão mantém a carga; se repetir, considere reduzir.'};
  return {kg:L.kg, up:false, short:'Mantém', why:lastTxt + ' Ainda falta bater a regra em todas as séries, então a carga se mantém.'};
}

/* ---------- pergunta de carga ou cartão de sugestão ----------
   Primeira vez do exercício com aquela configuração de séries: pergunta de carga (calibração).
   Da segunda vez em diante: cartão com o que fez da última vez e a meta de hoje, e um Ok.
   Se progrediu: carga nova pela regra automática, com a faixa inteira como meta. */
const joinPt = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
function didTxt(sets, res){
  if (sets.every(s => s.type === 'NORMAL')) return joinPt(res.map(r => String(r.reps))) + (res.length === 1 && res[0].reps === 1 ? ' repetição' : ' repetições');
  return joinPt(sets.map((s, j) => {
    const r = res[j];
    if (s.type === 'NORMAL') return `${r.reps} repetições na série ${j + 1}`;
    if (s.type === 'REST_PAUSE') return `${r.b1} repetições no bloco 1 do rest-pause`;
    return r.blocks >= 6 ? `os 6 blocos do muscle round com ${r.last} repetições no sexto` : `o muscle round até falhar no bloco ${r.blocks + 1}`;
  }));
}
function targetOf(set, r, up, big){
  if (set.type === 'NORMAL'){
    if (up) return {reps:set.rr[1], range:true, txt:`${rrTxt(set.rr)} repetições`};
    if (big && r.reps === set.rr[1]) return {reps:set.rr[1] + 1, txt:`${set.rr[1] + 1} repetições, uma além do topo, porque o próximo salto de carga passa de 10%`};
    if (r.reps >= set.rr[1]) return {reps:set.rr[1], txt:`${set.rr[1]} repetições de novo, deixando ${GER[set.ger].rv.toLowerCase()}`, effort:true};
    const n = Math.max(set.rr[0], r.reps + 1); return {reps:n, txt:`${n} repetições`};
  }
  if (set.type === 'REST_PAUSE') return up ? {txt:'cerca de 8 repetições no bloco 1'} : {b1:Math.min(10, r.b1 + 1), txt:`${Math.min(10, r.b1 + 1)} repetições no bloco 1`};
  if (up) return {txt:'os 6 blocos de 4'};
  return r.blocks >= 6 ? {last:Math.max(5, r.last + 1), txt:`${Math.max(5, r.last + 1)} repetições no sexto bloco`} : {txt:`passar do bloco ${r.blocks + 1}`};
}
function tgtTxt(sets, tg){
  if (sets.every(s => s.type === 'NORMAL')){
    if (tg.every(t => t.range) && sets.every(s => s.rr[0] === sets[0].rr[0] && s.rr[1] === sets[0].rr[1])) return `${rrTxt(sets[0].rr)} repetições ${sets.length > 1 ? 'em cada série' : ''}`.trim();
    if (tg.every(t => !t.range && !t.effort)) return tg.length > 1 && tg.every(t => t.reps === tg[0].reps) ? `${tg[0].reps} repetições em cada série` : joinPt(tg.map(t => String(t.reps))) + ' repetições';
  }
  return joinPt(tg.map((t, j) => sets.length > 1 && sets[j].type === 'NORMAL' ? `${t.txt} na série ${j + 1}` : t.txt));
}
function planFor(en, demo){
  const s = suggestion(en), L = lastOf(en), eq = LIB[en.id].eq, u = unitOf(eq);
  if (!L) return {mode:'wq', kg:DEFKG[eq], s, tg:[]};
  const gap = demo ? 0 : GAP[scenario], back = gap >= 15, cut = gap >= 28, up = s.up && !back;
  const kg = back ? backKg(en, eq) : s.kg;
  /* na volta, a meta é o começo da faixa: o corpo readapta antes de voltar a progredir */
  const tg = en.sets.map((set, j) => back && set.type === 'NORMAL' ? {reps:set.rr[0], txt:`${set.rr[0]} repetições`} : targetOf(set, L.res[j], up, bigJump(L.kg, eq)));
  const did = didTxt(en.sets, L.res), tt = tgtTxt(en.sets, tg), last = `${fmt(L.kg)} ${u}`;
  const mode = back ? 'back' : up ? 'up' : s.under ? 'under' : 'hold';
  const head = {up:'Você superou seus limites', hold:'Mais uma hoje', under:'Abaixo da faixa', back:'De volta do inferno'}[mode];
  const body = {
    up:`No último treino você fez ${did} com ${last}. Hoje, tente ${tt} com ${fmt(kg)} ${u}.`,
    hold:`Você fez ${did} da última vez nesse exercício, com ${last}. Tente fazer ${tt} com a mesma carga hoje.`,
    under:`Você fez ${did} da última vez, com ${last}, abaixo do mínimo da faixa. Mantenha a carga e busque ${tt}. Se repetir, ajuste a carga para baixo.`,
    back: cut ? `Faz ${gap} dias desde o último treino, quando você fez ${did} com ${last}. Depois de quatro semanas parado a força começa a cair, então hoje a carga vem 10% mais leve, ${fmt(kg)} ${u}. Tente ${tt}.`
      : `Faz ${gap} dias desde o último treino, quando você fez ${did} com ${last}. A força se mantém nesse intervalo, então a carga continua a mesma. Hoje, mire em ${tt} e deixe folga na reserva.`
  }[mode];
  return {mode, kg, s, tg, head, body, face:{up:13, hold:10, under:8, back:7}[mode]};
}

/* passo a passo de cada exercício (na v2 vem da biblioteca, com o GIF) */
const INFO = {
  hack:['Costas e ombros apoiados, pés no meio da plataforma na largura do quadril.','Desça controlando até a coxa passar da paralela, sem tirar o quadril do encosto.','Suba empurrando com o pé inteiro, sem travar o joelho no topo.'],
  leg45:['Pés no meio da plataforma e lombar colada no banco.','Desça até o joelho chegar perto do peito sem a lombar sair do apoio.','Empurre de volta sem estender o joelho por completo.'],
  ext:['Ajuste o encosto para o joelho ficar alinhado ao eixo da máquina.','Estenda as pernas até quase travar e segure um instante no topo.','Volte devagar até o peso quase encostar na pilha.'],
  extr:['Encosto reclinado para o quadríceps trabalhar alongado, joelho alinhado ao eixo.','Estenda as pernas até quase travar, sem tirar o quadril do banco.','Volte devagar até o peso quase encostar na pilha.'],
  stiff:['Barra rente às pernas, joelhos levemente flexionados e fixos.','Leve o quadril para trás e desça a barra junto à coxa até sentir o posterior alongar.','Suba contraindo os glúteos, com a coluna neutra o tempo todo.'],
  flex:['Joelho alinhado ao eixo da máquina e rolo logo acima do calcanhar.','Flexione até o rolo chegar perto do glúteo, sem levantar o quadril.','Volte controlando até quase estender.'],
  flexpe:['Quadril apoiado no encosto e rolo acima do calcanhar.','Flexione uma perna de cada vez, sem girar o quadril.','Volte devagar até quase estender.'],
  adut:['Costas no encosto e abertura no limite confortável.','Feche as pernas contraindo a parte interna da coxa.','Abra devagar até sentir o alongamento.'],
  pants:['Joelhos sob a almofada e ponta dos pés na plataforma.','Desça o calcanhar o máximo possível e pause embaixo.','Suba até a ponta dos pés e segure um instante.'],
  pantp:['Ombros sob as almofadas e ponta dos pés na plataforma.','Desça o calcanhar até alongar e pause embaixo.','Suba até a ponta dos pés sem dobrar os joelhos.'],
  pux:['Pegada aberta, coxas presas sob o apoio.','Puxe a barra até o alto do peito levando os cotovelos para baixo e para trás.','Volte até os braços quase estenderem, sem soltar os ombros.'],
  puxf:['Pegada fechada no triângulo e peito alto.','Puxe até o peito com os cotovelos rentes ao corpo.','Volte controlando até alongar as costas.'],
  tbar:['Peito no apoio, pegada aberta.','Puxe levando os cotovelos para fora e para trás.','Desça até os braços estenderem, sem arredondar a lombar.'],
  pullo:['De frente para a polia alta, corda nas mãos e braços quase estendidos.','Leve a corda até a coxa num arco, sem dobrar os cotovelos.','Volte até sentir as costas alongarem acima da cabeça.'],
  dev:['Banco a 80 ou 90 graus, barra na altura do queixo.','Empurre até quase estender os cotovelos, sem arquear a lombar.','Desça controlando até a altura do queixo.'],
  elev:['Braços nas almofadas, cotovelos levemente flexionados.','Eleve até a linha dos ombros sem subir o trapézio.','Desça devagar, sem deixar o peso encostar.'],
  crucr:['Peito no apoio e pegadas na altura dos ombros.','Abra os braços para trás contraindo o deltoide posterior.','Volte devagar sem deixar o peso encostar.'],
  sup:['Banco a 30 graus, barra na linha do alto do peito.','Desça até tocar de leve o peito, com os cotovelos a cerca de 45 graus.','Empurre de volta sem travar os cotovelos.'],
  supH:['Banco a 30 graus, halteres na linha do peito.','Desça até alongar o peito, com os cotovelos a cerca de 45 graus.','Empurre de volta aproximando os halteres no topo.'],
  pecfly:['Banco ajustado para as pegadas ficarem na linha do peito.','Feche os braços contraindo o peito, com os cotovelos levemente flexionados.','Abra devagar até alongar.'],
  paral:['Tronco levemente inclinado à frente e cotovelos junto ao corpo.','Empurre até estender os cotovelos.','Volte até o cotovelo passar de 90 graus.'],
  pul:['Cotovelos colados ao corpo, barra ou corda na altura do peito.','Estenda os cotovelos até o fim sem mover os ombros.','Volte devagar até cerca de 90 graus.'],
  scott:['Axila encostada no apoio e braços estendidos.','Flexione até o antebraço passar da vertical.','Desça devagar até quase estender.']
};

