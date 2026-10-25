/* ---------- 3D: barra, Smith, máquina de anilhas, máquina de placas com gympin e halteres (Babylon.js) ---------- */
const PLATE = {25:{d:.45,t:.058,c:'#d8322a'}, 20:{d:.45,t:.05,c:'#2c66d6'}, 15:{d:.45,t:.043,c:'#e9b62a'},
               10:{d:.45,t:.036,c:'#2f9a55'}, 5:{d:.23,t:.03,c:'#e8e4dc'}, 2.5:{d:.19,t:.022,c:'#d8322a'}, 1.25:{d:.16,t:.017,c:'#b9bcc2'}};
const splitPlates = (perSide, set) => { const out = []; let r = Math.round(perSide*100)/100; for (const p of (set || [25,20,15,10,5,2.5,1.25])) while (r + 1e-6 >= p){ out.push(p); r -= p; } return out; };
const B3 = {ok:false};
function initBabylon(){
  const canvas = $('c3d');
  if (!window.BABYLON) return;
  let engine;
  try { engine = new BABYLON.Engine(canvas, false, {preserveDrawingBuffer:true, stencil:true, alpha:true}, false); engine.setHardwareScalingLevel(2); } catch(e){ return; }
  if (!engine) return;
  const V = (x,y,z) => new BABYLON.Vector3(x,y,z);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0,0,0,0);
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI/2 + .42, Math.PI/2.25, 2.55, V(.35,0,0), scene);
  cam.fov = .55; cam.minZ = .05;
  const hemi = new BABYLON.HemisphericLight('h', V(0,1,0), scene); hemi.intensity = .6; hemi.groundColor = new BABYLON.Color3(.06,.05,.05);
  const dir = new BABYLON.DirectionalLight('d', V(-.4,-1,.7), scene); dir.intensity = 1.15;
  const rim = new BABYLON.PointLight('r', V(1.6,.6,-1.4), scene); rim.diffuse = BABYLON.Color3.FromHexString('#e8382f'); rim.intensity = .55;
  const mats = {};
  const mat = (hex, spec) => { const k = hex + spec; if (mats[k]) return mats[k]; const m = new BABYLON.StandardMaterial('m'+k, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex); m.specularColor = new BABYLON.Color3(spec,spec,spec); m.specularPower = 48; return (mats[k] = m); };
  const steel = mat('#9ea3aa', .9), dark = mat('#3a3633', .3), frameM = mat('#2e2e30', .35), pad = mat('#2a1515', .05), rubber = mat('#2a2a2a', .12), red = mat('#d8322a', .25);
  const MB = BABYLON.MeshBuilder;
  const root = {};
  const node = n => (root[n] = new BABYLON.TransformNode(n, scene));
  const cylX = (n, h, d, x, y, m, parent, tess) => { const c = MB.CreateCylinder(n, {height:h, diameter:d, tessellation:tess || 40}, scene);
    c.rotation.z = Math.PI/2; c.position.set(x, y || 0, 0); c.material = m; c.parent = parent; return c; };
  const box = (n, w, h, d, x, y, z, m, parent) => { const b = MB.CreateBox(n, {width:w, height:h, depth:d}, scene); b.position.set(x, y, z); b.material = m; b.parent = parent; return b; };

  const bar = node('barra');
  cylX('shaft', 1.31, .045, 0, 0, steel, bar);
  cylX('sleeveR', .415, .05, .892, 0, steel, bar); cylX('sleeveL', .415, .05, -.892, 0, steel, bar);
  cylX('colR', .03, .075, .67, 0, steel, bar); cylX('colL', .03, .075, -.67, 0, steel, bar);
  const smith = node('smith');
  [-1, 1].forEach(sx => {
    const rail = MB.CreateCylinder('rail'+sx, {height:1.9, diameter:.045, tessellation:24}, scene); rail.position.set(sx*.58, .25, .07); rail.material = frameM; rail.parent = smith;
    box('hook'+sx, .07, .12, .1, sx*.58, 0, .03, steel, smith);
    box('foot'+sx, .2, .05, .3, sx*.58, -.72, .07, frameM, smith);
  });
  const car = node('carregada');
  const back = box('backrest', .56, .62, .07, 0, .02, .16, pad, car); back.rotation.x = -.14;
  box('sled', .96, .06, .26, 0, -.34, .05, frameM, car);
  box('shL', .13, .09, .2, -.19, .36, .06, pad, car); box('shR', .13, .09, .2, .19, .36, .06, pad, car);
  cylX('hornR', .46, .05, .73, -.16, steel, car); cylX('hornL', .46, .05, -.73, -.16, steel, car);
  cylX('stopR', .025, .1, .5, -.16, steel, car); cylX('stopL', .025, .1, -.5, -.16, steel, car);
  const stack = node('pilha');
  const blocks = [];
  for (let i = 0; i < 20; i++) blocks.push(box('b'+i, .42, .046, .2, 0, -.52 + i*.052, 0, dark, stack));
  const addon = box('addon', .2, .03, .14, 0, .52 + .06, 0, mat('#e9b62a', .2), stack); addon.setEnabled(false);
  const rodL = MB.CreateCylinder('rodL', {height:1.25, diameter:.018}, scene); rodL.parent = stack; rodL.position.set(-.12, 0, 0); rodL.material = steel;
  const rodR = rodL.clone('rodR'); rodR.parent = stack; rodR.position.x = .12;
  const pin = MB.CreateCylinder('pin', {height:.3, diameter:.02}, scene); pin.rotation.x = Math.PI/2; pin.parent = stack; pin.material = mat('#e8382f', .6);
  box('top', .5, .05, .24, 0, .66, 0, frameM, stack);
  box('base', .5, .05, .24, 0, -.6, 0, frameM, stack);
  // gympin: pino que sai da placa de cima, para carga acima da pilha
  const gym = new BABYLON.TransformNode('gym', scene); gym.parent = stack;
  const gpin = MB.CreateCylinder('gpin', {height:.36, diameter:.026}, scene); gpin.rotation.x = Math.PI/2; gpin.position.set(0, .468, -.28); gpin.material = steel; gpin.parent = gym;
  let gdisc = [];
  const dumb = node('halteres');
  let dbs = [];

  const FRAME = {barra:{t:[.35,0,0], r:2.55}, smith:{t:[.32,.08,0], r:3.0}, carregada:{t:[.32,-.02,0], r:2.6}, pilha:{t:[0,.03,-.08], r:3.05}, halteres:{t:[0,0,0], r:1.2}};
  const RIG = {barra:['barra'], smith:['barra','smith'], carregada:['carregada'], pilha:['pilha'], halteres:['halteres']};

  let plates = [], plateKey = null;
  function setPlates(eq, perSide, animate){
    const key = eq === 'carregada' ? 'car' : 'bar', parent = eq === 'carregada' ? car : bar, S0 = eq === 'carregada' ? .52 : .685, Y = eq === 'carregada' ? -.16 : 0;
    if (plateKey !== key){ plates.forEach(p => { p.L.dispose(); p.R.dispose(); }); plates = []; plateKey = key; }
    const list = splitPlates(perSide);
    const tx = i => { let x = S0; for (let k = 0; k < i; k++) x += PLATE[list[k]].t + .004; return x + PLATE[list[i]].t/2; };
    let keep = 0; while (keep < plates.length && keep < list.length && plates[keep].kg === list[keep]) keep++;
    plates.splice(keep).forEach(p => {
      const kill = () => { p.L.dispose(); p.R.dispose(); };
      if (G && animate && !reduced){ G.to(p.R.position, {x:1.9, duration:.35, ease:'power2.in', onComplete:kill}); G.to(p.L.position, {x:-1.9, duration:.35, ease:'power2.in'}); } else kill();
    });
    const mk = kg => { const P = PLATE[kg]; const m = MB.CreateCylinder('p'+kg+Math.random(), {height:P.t, diameter:P.d, tessellation:56}, scene);
      m.rotation.z = Math.PI/2; m.material = mat(P.c, kg >= 10 ? .12 : .5); m.parent = parent; m.position.y = Y;
      const hub = MB.CreateCylinder('hub', {height:P.t + .004, diameter:.09, tessellation:24}, scene); hub.parent = m; hub.material = steel; return m; };
    for (let i = keep; i < list.length; i++){
      const R = mk(list[i]), L = mk(list[i]), x = tx(i);
      if (G && animate && !reduced){ R.position.x = 1.9; L.position.x = -1.9;
        G.to(R.position, {x, duration:.55, delay:(i-keep)*.08 + .15, ease:'expo.out'}); G.to(L.position, {x:-x, duration:.55, delay:(i-keep)*.08 + .15, ease:'expo.out'}); }
      else { R.position.x = x; L.position.x = -x; }
      plates.push({kg:list[i], L, R});
    }
  }
  function setStack(kg, animate, max){
    const inStack = Math.min(kg, max), n = Math.min(20, Math.floor(inStack/5 + 1e-6)), rem = inStack - n*5, extra = Math.max(0, kg - max);
    blocks.forEach((b, i) => { const on = i >= 20 - n; b.material = on ? red : dark;
      if (G && animate && !reduced && on) G.fromTo(b.scaling, {x:.9}, {x:1, duration:.3, delay:(i-(20-n))*.02}); });
    pin.position.y = -.52 + (20-n)*.052 - .026;
    addon.setEnabled(rem > .01);
    gdisc.forEach(d => d.dispose()); gdisc = [];
    gym.setEnabled(extra > .01);
    if (extra > .01){
      let z = -.14;
      splitPlates(extra, [20,10,5,2.5,1.25]).forEach((p, i) => {
        const P = PLATE[p], d = MB.CreateCylinder('gd'+i, {height:P.t, diameter:P.d*.62, tessellation:40}, scene);
        d.rotation.x = Math.PI/2; d.position.set(0, .468, z - P.t/2); d.material = mat(P.c, .3); d.parent = gym; z -= P.t + .004;
        if (G && animate && !reduced) G.from(d.position, {z:-.7, duration:.45, delay:.1 + i*.06, ease:'expo.out'});
        gdisc.push(d);
      });
    }
  }
  function setDumbbells(kg, animate){
    dbs.forEach(g => g.dispose()); dbs = [];
    const hd = Math.min(.24, .085 + kg*.004), hl = Math.min(.12, .04 + kg*.002);
    [1, -1].forEach((s, i) => {
      const g = new BABYLON.TransformNode('db'+i, scene); g.parent = dumb; g.position.set(0, s*(hd/2 + .025), 0);
      cylX('dh'+i, .16, .034, 0, 0, steel, g);
      [-1, 1].forEach(side => { cylX('dhd'+i+side, hl, hd, side*(.075 + hl/2), 0, rubber, g, 6); cylX('dc'+i+side, .012, .05, side*.075, 0, steel, g); });
      if (G && animate && !reduced) G.fromTo(g.scaling, {x:.86, y:.86, z:.86}, {x:1, y:1, z:1, duration:.4, delay:i*.06, ease:'expo.out'});
      dbs.push(g);
    });
    FRAME.halteres.r = .7 + hd*1.6 + hl*2.2;
  }
  function frame(eq, animate){
    const f = FRAME[eq];
    if (G && animate && !reduced){ G.to(cam, {radius:f.r, duration:.6, ease:'power2.out'}); const o = {x:cam.target.x, y:cam.target.y, z:cam.target.z};
      G.to(o, {x:f.t[0], y:f.t[1], z:f.t[2], duration:.6, ease:'power2.out', onUpdate:() => cam.target.copyFromFloats(o.x, o.y, o.z)}); }
    else { cam.radius = f.r; cam.target.copyFromFloats(f.t[0], f.t[1], f.t[2]); }
  }
  let curEq = null;
  B3.show = (eq, kg, animate, max) => {
    const on = RIG[eq];
    Object.keys(root).forEach(n => root[n].setEnabled(on.includes(n)));
    if (eq === 'barra' || eq === 'smith' || eq === 'carregada') setPlates(eq, Math.max(0, (kg - EQ[eq].base) / 2), animate);
    if (eq === 'pilha') setStack(kg, animate, max || 100);
    if (eq === 'halteres') setDumbbells(kg, animate);
    frame(eq, animate && curEq !== null);
    curEq = eq;
  };
  B3.engine = engine; B3.ok = true;
  const baseA = cam.alpha; let t = 0;
  /* render só quando o 3D está na tela (Hoje ou sessão ativa) */
  const loop = () => { if (!reduced){ t += engine.getDeltaTime()/1000; cam.alpha = baseA + Math.sin(t*.45)*.22; cam.beta = Math.PI/2.25 + Math.sin(t*.3)*.04; } scene.render(); };
  let running = false;
  B3.run = on => { if (on && !running){ engine.runRenderLoop(loop); running = true; } else if (!on && running){ engine.stopRenderLoop(loop); running = false; } };
  B3.run(true);
  new ResizeObserver(() => engine.resize()).observe(canvas);
  window.addEventListener('resize', () => engine.resize());
}
function flat(stageId, eq, kg, max){
  const st = $(stageId); let f = st.querySelector('.flat');
  if (B3.ok){ if (f) f.remove(); return; }
  if (!f){ f = document.createElement('div'); f.className = 'flat'; st.insertBefore(f, st.firstChild); }
  if (eq === 'pilha'){
    max = max || 100;
    const n = Math.min(20, Math.floor(Math.min(kg, max)/5)), extra = Math.max(0, kg - max);
    f.style.flexDirection = 'row'; f.style.gap = '3px';
    const col = '<span style="display:flex;flex-direction:column-reverse;gap:3px">' + Array.from({length:14}, (_, i) => `<i style="width:90px;height:6px;background:${i < Math.min(14, n) ? 'var(--accent)' : 'var(--s3)'}"></i>`).join('') + '</span>';
    const gp = extra > 0 ? '<span class="gp"><i style="width:30px;height:4px;background:#9ea3aa"></i>' + splitPlates(extra, [20,10,5,2.5,1.25]).map(p => `<i style="width:${Math.max(4, PLATE[p].t*120)}px;height:${PLATE[p].d*80}px;background:${PLATE[p].c}"></i>`).join('') + '</span>' : '';
    f.innerHTML = col + gp;
    return;
  }
  if (eq === 'halteres'){
    const h = Math.min(64, 22 + kg*1.3), w = Math.min(26, 10 + kg*.5);
    f.style.flexDirection = 'column'; f.style.gap = '10px';
    f.innerHTML = [0,1].map(() => `<span class="db"><i style="width:${w}px;height:${h}px;background:#3a3a3a"></i><span class="hd"></span><i style="width:${w}px;height:${h}px;background:#3a3a3a"></i></span>`).join('');
    return;
  }
  f.style.flexDirection = 'row'; f.style.gap = '3px';
  const list = splitPlates(Math.max(0, (kg - EQ[eq].base)/2));
  const plate = k => `<i style="width:${Math.max(6, PLATE[k].t*160)}px;height:${PLATE[k].d*220}px;background:${PLATE[k].c}"></i>`;
  f.innerHTML = list.slice().reverse().map(plate).join('') + '<span class="sh"></span>' + list.map(plate).join('');
}
const CV = $('c3d');
function mountCanvas(stageId){
  const c = CV, st = $(stageId); if (!st) return;
  if (c.parentElement !== st) st.insertBefore(c, st.firstChild);
  if (B3.ok) requestAnimationFrame(() => B3.engine.resize());
}
function show3D(stageId, id, kg, animate){ const eq = LIB[id].eq, max = stackMax(id); if (B3.ok) B3.show(eq, kg, animate, max); else flat(stageId, eq, kg, max); }
