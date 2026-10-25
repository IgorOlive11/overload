const FACE = {7: "@asset(faces/doom-face-7.png)", 8: "@asset(faces/doom-face-8.png)", 9: "@asset(faces/doom-face-9.png)", 10: "@asset(faces/doom-face-10.png)", 11: "@asset(faces/doom-face-11.png)", 12: "@asset(faces/doom-face-12.png)", 13: "@asset(faces/doom-face-13.png)"};
/* GER_CONFIG do original: título, alvo em repetições na reserva e o texto do que sobrou */
const GER = {
  7:{t:'Posso brincar papaizão', r:'4 a 6 repetições na reserva', left:'sobraram 4 a 6', rv:'4 a 6 na reserva'},
  8:{t:'Não quero me machucar', r:'2 a 3 repetições na reserva', left:'sobraram 2 a 3', rv:'2 a 3 na reserva'},
  9:{t:'Eu sou muito novo pra morrer', r:'1 repetição na reserva', left:'sobrou 1', rv:'1 na reserva'},
  10:{t:'Quebrei minha linha', r:'falha com a técnica perfeita', left:'falha com técnica perfeita', rv:'Até a falha, com técnica perfeita'},
  11:{t:'Sadomasoquista', r:'falha após perder a forma', left:'falha perdendo a forma', rv:'Até a falha, perdendo a forma'},
  12:{t:'Violência gratuita', r:'além da falha com ajuda ou técnicas', left:'além da falha com ajuda', rv:'Além da falha, com ajuda ou técnicas'},
  13:{t:'Eu sou reincarnação do Lucifer', r:'além da falha extrema', left:'muito além da falha', rv:'Muito além da falha'}
};
function paintFaces(root){ (root||document).querySelectorAll('img[data-face]').forEach(i => { i.src = FACE[i.dataset.face]; }); }
function setFace(id, g){ const el = $(id); if (el){ el.src = FACE[g]; el.alt = 'Doom face do esforço'; } }
const faceImg = (g, w) => { w = w || 36; return `<span class="fslot"><img class="face" src="${FACE[g]}" width="${w}" height="${Math.round(w*37.2/24)}" alt=""></span>`; };
