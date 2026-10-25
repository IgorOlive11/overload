/* ---------- boot ---------- */
document.querySelectorAll('.infobtn:not([data-info]) > svg').forEach(sv => { sv.outerHTML = pix(PIXI.info, 16); });
const TABI = {hoje:'skull', treino:'dumb', progresso:'chart', plano:'plan'};
document.querySelectorAll('.tabs button').forEach(b => { const sv = b.querySelector('svg'); if (sv) sv.outerHTML = pix(PIXI[TABI[b.dataset.v]], 22); });
$('rPrev').querySelector('svg').outerHTML = pix(PIXI.up, 16); $('rNextBtn').querySelector('svg').outerHTML = pix(PIXI.down, 16);
$('shX').querySelector('svg').outerHTML = pix(PIXI.x, 16);
$('endEarly').querySelector('svg').outerHTML = pix(PIXI.skull, 16);
document.querySelectorAll('.lock > svg').forEach(sv => { sv.outerHTML = pix(PIXI.lock, 26); });
renderSlots($('weekSlots'), week.done, 2, false);
renderProgList($('progList'), PLAN.A);
paintFaces(); setFace('homeFace', 8); setFace('doneFace', 13); setFace('toastFace', 13);
renderWeeks(); renderExProg(); renderPlan(); renderIdeas(); renderPhase();
initBabylon(); renderRule(); initScroll();
if (G && !reduced) G.from('#v-hoje > *', {y:14, opacity:.3, duration:.45, stagger:.06, ease:'power2.out', clearProps:'all'});
