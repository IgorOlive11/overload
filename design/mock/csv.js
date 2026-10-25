/* CSV do montador do Plano: mesmas colunas da v1 (uma linha por série) e duas novas no fim */
const clone = o => JSON.parse(JSON.stringify(o));
const trainDays = d => d.days.filter(x => !x.off && x.ex.length).length;

const CSVH = ['semana','dia','descanso_seg','prep_seg','dia_descanso','exercicio','musculo','tipo_serie','ger','rep_range','musculo_acessorio','prep_override','biblioteca_id','apelido_pt','agenda','fase_semanas'];
/* célula que começa com =, +, - ou @ vira texto, para o Excel não executar fórmula escondida no arquivo */
const q = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function toCsv(d){
  const rows = [CSVH.join(',')];
  d.days.forEach((day, i) => {
    const dia = i + 1, tail = [d.schedule, d.layer.weeks];
    if (day.off){ rows.push([1, dia, '', '', 'S', '', '', '', '', '', '', '', '', '', ...tail].map(q).join(',')); return; }
    if (!day.ex.length){ rows.push([1, dia, d.rest, d.prepRest, 'N', '', '', '', '', '', '', '', '', '', ...tail].map(q).join(',')); return; }
    day.ex.forEach(e => {
      const L = LIB[e.id];
      e.sets.forEach(s => rows.push([1, dia, e.rest || d.rest, e.prepRest || d.prepRest, 'N', L.name, L.m, s.type, s.type === 'NORMAL' ? s.ger : TYPES[s.type].ger,
        s.type === 'NORMAL' ? s.rr.join('-') : '', (e.acc || L.acc).join('|'), e.prep === 'auto' ? '' : e.prep, e.id, '', ...tail].map(q).join(',')));
    });
  });
  return rows.join('\n');
}
function splitCsv(text){
  const out = []; let row = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (inQ){ if (c === '"'){ if (text[i+1] === '"'){ cell += '"'; i++; } else inQ = false; } else cell += c; continue; }
    if (c === '"') inQ = true; else if (c === ',' || c === ';'){ row.push(cell); cell = ''; } else if (c === '\n'){ row.push(cell); out.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length){ row.push(cell); out.push(row); }
  return out.filter(r => r.some(x => x.trim() !== ''));
}
function parseCsv(text){
  const rows = splitCsv(text.replace(/^﻿/, ''));
  if (rows.length < 2) throw new Error('O arquivo está vazio ou tem só o cabeçalho.');
  const hd = rows[0].map(h => h.trim().toLowerCase()), col = n => hd.indexOf(n);
  const miss = ['semana','dia','exercicio'].filter(h => col(h) < 0);
  if (miss.length) throw new Error(`Faltam as colunas ${miss.join(', ')}. Use o modelo.`);
  const get = (r, n) => col(n) < 0 ? '' : String(r[col(n)] == null ? '' : r[col(n)]).trim();
  const body = rows.slice(1), weeks = new Set(body.map(r => parseInt(get(r, 'semana'), 10) || 1)), w1 = Math.min(...weeks);
  const d = {schedule:'semana', rest:120, prepRest:40, layer:{phase:true, weeks:6, goal:true, goalN:2, never2:true}, days:Array.from({length:7}, () => ({off:false, ex:[]}))};
  const warn = [], notFound = new Set(), conv = {};
  let sets = 0, restSeen = null, prepSeen = null, last = null;
  body.forEach(r => {
    if ((parseInt(get(r, 'semana'), 10) || 1) !== w1) return;
    const dia = parseInt(get(r, 'dia'), 10); if (!(dia >= 1 && dia <= 7)) return;
    const day = d.days[dia - 1];
    if (get(r, 'agenda') === 'sequencia' || get(r, 'agenda') === 'semana') d.schedule = get(r, 'agenda');
    const fw = parseInt(get(r, 'fase_semanas'), 10); if (fw) d.layer.weeks = fw;
    if (get(r, 'dia_descanso').toUpperCase() === 'S'){ day.off = true; last = null; return; }
    const name = get(r, 'exercicio'); if (!name){ last = null; return; }
    const lid = get(r, 'biblioteca_id');
    const id = LIB[lid] ? lid : Object.keys(LIB).find(k => norm(LIB[k].name) === norm(name) || norm(LIB[k].name) === norm(get(r, 'apelido_pt')));
    if (!id){ notFound.add(name); last = null; return; }
    const rs = parseInt(get(r, 'descanso_seg'), 10) || null, ps = parseInt(get(r, 'prep_seg'), 10) || null;
    if (restSeen == null && rs) restSeen = rs; if (prepSeen == null && ps) prepSeen = ps;
    let en = last && last.dia === dia && last.name === name ? last.en : null;
    if (!en){
      const po = get(r, 'prep_override'), acc = get(r, 'musculo_acessorio');
      en = {id, sets:[], prep: po === '' ? 'auto' : Math.max(0, Math.min(3, parseInt(po, 10) || 0)), acc: acc ? acc.split('|').map(a => a.trim().toUpperCase()).filter(a => MUSCLES.includes(a)) : LIB[id].acc.slice(), rest:rs, prepRest:ps};
      day.ex.push(en); last = {dia, name, en};
    }
    let t = get(r, 'tipo_serie').toUpperCase() || 'NORMAL';
    const g = parseInt(get(r, 'ger'), 10), rr = get(r, 'rep_range').split('-').map(n => parseInt(n, 10));
    if (!TYPES[t]){ conv[t] = (conv[t] || 0) + 1; t = 'NORMAL'; }
    en.sets.push(t === 'NORMAL' ? N(g >= 7 && g <= 13 ? g : 9, rr.length === 2 && rr.every(n => n > 0) ? rr : [8,12]) : T(t)); sets++;
  });
  d.days.forEach(day => { day.ex = day.ex.filter(e => e.sets.length); if (!day.off && !day.ex.length) day.off = true; });
  d.rest = [60,90,120,150,180].includes(restSeen) ? restSeen : 120; d.prepRest = [30,40,60].includes(prepSeen) ? prepSeen : 40;
  d.days.forEach(day => day.ex.forEach(e => { if (e.rest === d.rest) e.rest = null; if (e.prepRest === d.prepRest) e.prepRest = null; }));
  if (![4,6,8].includes(d.layer.weeks)) d.layer.weeks = d.layer.weeks > 6 ? 8 : d.layer.weeks > 4 ? 6 : 4;
  d.layer.goalN = Math.max(1, Math.min(5, d.days.filter(x => !x.off).length));
  if (weeks.size > 1) warn.push(`O arquivo tem ${weeks.size} semanas. O v2 usa uma semana modelo repetida pela fase, então só a semana ${w1} entrou e a fase ficou com ${d.layer.weeks} semanas.`);
  Object.keys(conv).forEach(t => warn.push(`${conv[t]} ${conv[t] > 1 ? 'séries' : 'série'} do tipo ${t}, que saiu do v2, ${conv[t] > 1 ? 'viraram séries normais' : 'virou série normal'}. Revise a reserva e a faixa.`));
  if (notFound.size) warn.push(`Sem vínculo na biblioteca, ficaram de fora: ${[...notFound].join(', ')}.`);
  const nEx = d.days.reduce((a, x) => a + x.ex.length, 0);
  return {draft:d, ok:`${trainDays(d)} dias de treino, ${nEx} exercícios e ${sets} séries lidos.`, warn};
}
$('bExport').onclick = () => { saveFile('protocolo_overload.csv', toCsv(draft)); toast('CSV exportado', 'Quem receber o arquivo importa no Plano da própria conta.', 10); };

/* download pelo app quando houver; no navegador comum, link direto */
let DL = null;
try { if (window.claude && claude.use) claude.use('downloads').then(x => { DL = x; }).catch(() => {}); } catch(e){}
async function saveFile(name, text){
  if (DL){
    try { await DL.save({filename:name, data:text}); toast('Arquivo salvo', name, 9); }
    catch(err){ if (err && err.code !== 'declined') toast('Não deu para baixar aqui', 'O conteúdo foi colocado no campo de colar CSV.', 8), fallbackText(text); }
    return;
  }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type:'text/csv'})); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast('CSV gerado', name, 9); }
  catch(err){ fallbackText(text); }
}
function fallbackText(text){ const el = $('sCsvPaste'); if (el) el.value = text; }
