// O reel da sessão (design/mock/sessao.js: renderSession, layoutReel, arrasto e descanso): o cartão ativo no centro,
// os vizinhos encolhendo e apagando, e o descanso por cima do pé do reel.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EQUIPAMENTOS } from "../../domain/equipamento.ts";
import { GER } from "../../domain/ger.ts";
import { relogio, type EstadoDaSessao } from "../../domain/sessao.ts";
import { cap } from "../../domain/texto.ts";
import { useProtocolo } from "../../app/protocolo.ts";
import { useTreino } from "../../app/treino.ts";
import { useGuia, type PassoDoGuia } from "../../app/guia.ts";
import { Gaveta } from "../../components/camadas.tsx";
import { Pix, PixLinhas } from "../../components/pix.tsx";
import { tempoDoDescanso, useAgora } from "./tempo.ts";
import { CartaoAtivo, CartaoFechado, Face, type Modo } from "./Cartao.tsx";

/* O boneco que faz o movimento enquanto o exercício não tem GIF (sessao.js: GIFSVG). */
const GIF_A = ["....##....", "....##....", "..######..", ".#..##..#.", ".#..##..#.", "....##....", "....##....", "...#..#...", "...#..#...", "..#....#..", "..#....#..", ".##....##."];
const GIF_B = ["..........", "..........", "..........", "....##....", "....##....", "..######..", ".#..##..#.", "....##....", "..##..##..", ".#......#.", ".#......#.", ".##....##."];
const Boneco = () => <>
  <PixLinhas linhas={GIF_A} w={120} className="fr a" style={{ position: "absolute", color: "#ff1414" }} />
  <PixLinhas linhas={GIF_B} w={120} className="fr b" style={{ position: "absolute", color: "#ff1414" }} />
</>;

const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const up1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function PainelDoDescanso({ s }: { s: EstadoDaSessao }) {
  const agora = useAgora(250), { ajustarDescanso, acabarDescanso } = useTreino();
  const d = s.descanso!, t = tempoDoDescanso(d, agora);
  return (
    <div className={`rpanel${t.pronto ? " done" : ""}`} id="rPanel">
      <div className="trk3"><i style={{ width: `${t.pct * 100}%`, backgroundColor: t.cor }} /></div>
      <div className="rrow">
        <button className="adj" disabled={t.pronto} aria-label="Menos 15 segundos" onClick={() => ajustarDescanso(-15)}>−15</button>
        <div className="rt"><small>{d.tipo}</small><b className="num">{t.texto}</b></div>
        <button className="adj" disabled={t.pronto} aria-label="Mais 15 segundos" onClick={() => ajustarDescanso(15)}>+15</button>
        <span className="sp" />
        <button className="rgo" onClick={acabarDescanso}>{t.pronto ? "Pronto, seguir" : "Pular"}</button>
      </div>
    </div>
  );
}

function BotaoArmado({ rotulo, armado, icone, aria, agir }: { rotulo: string; armado: string; icone: React.ReactNode; aria?: string; agir(): void }) {
  const [arm, setArm] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <button className="endbtn" data-armed={arm ? "1" : undefined} aria-label={arm ? armado : aria}
      onClick={() => {
        if (!arm) { setArm(true); t.current = setTimeout(() => setArm(false), 3000); return; }
        clearTimeout(t.current); setArm(false); agir();
      }}>{icone}{(rotulo || arm) && <span>{arm ? armado : rotulo}</span>}</button>
  );
}

export function Reel({ s }: { s: EstadoDaSessao }) {
  const { vista, ver, concluirPasso, corrigirPasso, encerrar, cancelar, pular } = useTreino();
  const protocolo = useProtocolo(x => x.protocolo);
  const agora = useAgora();
  const reel = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [gerAberto, setGerAberto] = useState<{ alvo: number; atual: number; escolher(g: number): void } | null>(null);
  const anterior = useRef(vista);
  const total = s.passos.length;
  const modoDe = (i: number): Modo => i === s.i ? "live" : i < s.i ? "edit" : "fut";
  const md = modoDe(vista), descansando = !!s.descanso;

  // Dicas do Doomguy no primeiro treino, uma vez por conta (guia.js: frCardHint, frAfterWork e a do descanso).
  const { carregado: guiaPronto, dica, vistos } = useGuia();
  const novato = useProtocolo(x => x.carregado && !x.sessoes.length);
  const atual = s.passos[s.i];
  const qual = !atual ? null : descansando ? "rest"
    : atual.tipo === "CALIBRACAO" && s.wk[atual.k]!.cartao.modo === "pergunta" ? "wq"
    : atual.tipo === "PREPARO" ? "prep"
    : atual.tipo === "TRABALHO" && atual.serie.tipo === "NORMAL" ? "ger" : null;
  const ritmo = s.validas >= 1 && !!vistos.ger;
  useEffect(() => {
    if (!guiaPronto || !novato || s.teste || vista !== s.i) return;
    const D: Record<string, PassoDoGuia> = {
      wq: { alvo: "#cardBody .qbox", face: 9, texto: "Primeira vez neste exercício, então eu ainda não sei sua força. Escolha uma carga que dê para fazer a faixa deixando a reserva que eu pedi. Se errar, tudo bem: no próximo treino eu corrijo." },
      prep: { alvo: "#cardBody", face: 10, texto: "Isto é preparo: séries leves para aquecer o músculo. Não contam como série válida e não precisam ir perto da falha." },
      ger: { alvo: "#cardBody .gersel", face: 8, faces: [7, 8, 9, 10], texto: "Série válida. Quando terminar, me diga quanto sobrou: é com isso que eu decido se a carga sobe. Seja honesto, iniciante costuma achar que sobrou menos do que sobrou." },
      rest: { alvo: "#rPanel", face: 9, texto: "Descanso. O cronômetro conta sozinho e avisa quando acabar. Dá para tirar ou somar 15 segundos, ou seguir antes se já estiver pronto." }
    };
    const t = setTimeout(() => {
      if (ritmo) dica("rhythm", { pos: "top", face: 13, texto: "Isso! Agora é com você: mesmo ritmo até o fim. Carga, repetições, quanto sobrou e descanso. Eu fico de olho e só volto a falar quando tiver novidade." });
      if (qual) dica(qual, D[qual]!);
    }, ritmo ? 700 : 400);
    return () => clearTimeout(t);
  }, [guiaPronto, novato, s.teste, vista, s.i, qual, ritmo, dica]);
  const travado = (descansando && md === "live") || md === "fut";

  /* posições do reel: cartão ativo no centro, vizinhos encolhendo e apagando como na v1 */
  const layout = useCallback((animar: boolean, dy: number, dir: number) => {
    const r = reel.current; if (!r) return;
    const H = r.clientHeight, cards = [...r.children] as HTMLElement[];
    const act = cards.find(c => c.classList.contains("act")); if (!act) return;
    act.style.maxHeight = Math.max(200, H - 12) + "px";
    const stg = act.querySelector<HTMLElement>(".stage");
    if (stg) { stg.style.height = ""; const over = act.scrollHeight - act.clientHeight; if (over > 0) stg.style.height = Math.max(64, stg.offsetHeight - over) + "px"; }
    act.classList.toggle("scroll", act.scrollHeight > act.clientHeight + 1);
    const hA = act.offsetHeight, v = vista, gap = 14;
    const topA = hA >= H - 12 ? 6 : (H - hA) / 2;
    const unit = hA * .6 + gap, du = dy / unit;
    const pos: Record<number, number> = { [v]: topA };
    let y = topA;
    cards.filter(c => +c.dataset.i! < v).reverse().forEach(c => { y -= gap + c.offsetHeight; pos[+c.dataset.i!] = y; });
    y = topA + hA;
    cards.filter(c => +c.dataset.i! > v).forEach(c => { pos[+c.dataset.i!] = y + gap; y += gap + c.offsetHeight; });
    const aplicar = () => cards.forEach(c => {
      const i = +c.dataset.i!, ad = Math.abs(i - v + du);
      c.style.transform = `translateY(${pos[i]! + dy}px) scale(${Math.max(.84, 1 - ad * .12)})`;
      c.style.opacity = String(Math.max(.22, 1 - ad * .5));
      c.style.zIndex = String(100 - Math.round(ad * 10));
    });
    if (dir && !reduzido()) {
      cards.forEach(c => { c.classList.remove("anim"); c.style.transform = `translateY(${pos[+c.dataset.i!]! + dir * unit}px) scale(.94)`; c.style.opacity = ".5"; });
      void r.offsetHeight; cards.forEach(c => c.classList.add("anim")); aplicar();
      return;
    }
    cards.forEach(c => c.classList.toggle("anim", animar && !reduzido())); aplicar();
  }, [vista]);

  useLayoutEffect(() => {
    const dir = Math.sign(vista - anterior.current);
    anterior.current = vista;
    layout(false, 0, dir);
  });

  const mudar = useCallback((d: number) => {
    const n = vista + d;
    if (n < 0 || n >= total) { layout(true, 0, 0); return; }
    ver(n);
  }, [vista, total, ver, layout]);

  // arrasto, rolagem e teclado
  useEffect(() => {
    const r = reel.current; if (!r) return;
    let y0: number | null = null, dy = 0, arrastando = false, acabouDeArrastar = false, pid = -1, acc = 0, trava = false;
    const ativo = () => r.querySelector<HTMLElement>(".rcard.act");
    const down = (e: PointerEvent) => { if ((e.target as HTMLElement).closest("input,select,textarea")) return; y0 = e.clientY; dy = 0; arrastando = false; pid = e.pointerId; };
    const move = (e: PointerEvent) => {
      if (y0 == null || e.pointerId !== pid) return;
      dy = e.clientY - y0;
      if (!arrastando) {
        if (Math.abs(dy) < 8) return;
        const a = ativo();
        if (a?.classList.contains("scroll") && e.pointerType !== "mouse") { y0 = null; return; }
        arrastando = true; try { r.setPointerCapture(pid); } catch { /* sem captura */ }
        document.body.classList.add("dragmode");
      }
      let d = dy; if ((vista === 0 && d > 0) || (vista === total - 1 && d < 0)) d *= .3;
      layout(false, d, 0);
    };
    const up = () => {
      if (y0 == null) return; y0 = null; document.body.classList.remove("dragmode");
      if (!arrastando) return; arrastando = false; acabouDeArrastar = true; setTimeout(() => { acabouDeArrastar = false; }, 60);
      if (dy >= 50) mudar(-1); else if (dy <= -50) mudar(1); else layout(true, 0, 0);
    };
    const cancel = () => { y0 = null; arrastando = false; document.body.classList.remove("dragmode"); layout(true, 0, 0); };
    const clique = (e: MouseEvent) => { if (acabouDeArrastar) { e.stopPropagation(); e.preventDefault(); } };
    const roda = (e: WheelEvent) => {
      const a = ativo();
      if (a?.classList.contains("scroll") && a.contains(e.target as Node)) {
        const topo = a.scrollTop <= 0, fundo = a.scrollTop + a.clientHeight >= a.scrollHeight - 1;
        if ((e.deltaY < 0 && !topo) || (e.deltaY > 0 && !fundo)) return;
      }
      e.preventDefault(); if (trava) return;
      acc += e.deltaY;
      if (Math.abs(acc) > 40) { mudar(acc > 0 ? 1 : -1); acc = 0; trava = true; setTimeout(() => { trava = false; }, 300); }
    };
    const tecla = (e: KeyboardEvent) => {
      if (document.querySelector(".sheet")) return;
      const t = document.activeElement?.tagName;
      if (t === "INPUT" || t === "SELECT" || t === "TEXTAREA") return;
      if (e.key === "ArrowUp") { e.preventDefault(); mudar(-1); }
      if (e.key === "ArrowDown") { e.preventDefault(); mudar(1); }
    };
    const tamanho = () => layout(false, 0, 0);
    r.addEventListener("pointerdown", down); r.addEventListener("pointermove", move); r.addEventListener("pointerup", up); r.addEventListener("pointercancel", cancel);
    r.addEventListener("click", clique, true); r.addEventListener("wheel", roda, { passive: false });
    document.addEventListener("keydown", tecla); window.addEventListener("resize", tamanho);
    return () => {
      r.removeEventListener("pointerdown", down); r.removeEventListener("pointermove", move); r.removeEventListener("pointerup", up); r.removeEventListener("pointercancel", cancel);
      r.removeEventListener("click", clique, true); r.removeEventListener("wheel", roda);
      document.removeEventListener("keydown", tecla); window.removeEventListener("resize", tamanho);
    };
  }, [vista, total, mudar, layout]);

  const lo = Math.max(0, vista - 2), hi = Math.min(total - 1, vista + 2);
  const cards = [];
  for (let i = lo; i <= hi; i++) {
    cards.push(i === vista
      ? <CartaoAtivo key={`${i}-${s.i}-${s.res[i] ? "f" : "n"}`} s={s} i={i} modo={md} travado={travado} slot={slot}
          concluir={r => void concluirPasso(r)} corrigir={r => void corrigirPasso(i, r)}
          info={setInfo} ger={(alvo, atual, escolher) => setGerAberto({ alvo, atual, escolher })} />
      : <CartaoFechado key={i} s={s} i={i} modo={modoDe(i)} descansando={descansando} />);
  }

  const L = info ? useProtocolo.getState().bib[info] : null;
  const B = info ? protocolo?.biblioteca?.[info] : null;
  const passos = B ? (B.instrucoesPt?.length ? B.instrucoesPt : B.instrucoes) : [];
  const opcoes = gerAberto ? (gerAberto.alvo <= 10 ? [7, 8, 9, 10] : [10, 11, 12, 13]) : [];

  return (
    <div id="sessLive" className="sess">
      <div className="sess-top">
        <h2 id="sessName">{s.titulo}</h2>
        <div className="row" style={{ gap: 4 }}>
          <span className="clock num" aria-label="Tempo de sessão">{relogio(Math.max(0, Math.floor((agora - s.inicio) / 1000)))}</span>
          {s.teste
            ? <><button className="endbtn" id="skipEx" onClick={() => void pular()}>Pular</button>
                <BotaoArmado rotulo="Sair" armado="Tem certeza?" icone={<Pix nome="skull" w={16} />} agir={() => void encerrar()} /></>
            : <><BotaoArmado rotulo="" armado="Descartar?" aria="Cancelar o treino sem salvar" icone={<Pix nome="x" w={14} />} agir={() => void cancelar()} />
                <BotaoArmado rotulo="Encerrar" armado="Tem certeza?" icone={<Pix nome="skull" w={16} />} agir={() => void encerrar()} /></>}
        </div>
      </div>
      {md !== "live" && <button className={`viewbar${md === "edit" ? " past" : ""}`} onClick={() => ver(s.i)}><Pix nome={md === "edit" ? "down" : "up"} w={14} />Voltar ao atual</button>}
      <div className="reel" id="reel" ref={reel} aria-label="Passos da sessão. Arraste, role ou use as setas para navegar.">{cards}</div>
      <div id="restSlot">{descansando && <PainelDoDescanso s={s} />}</div>
      <div className="reelfoot">
        <button className="nav" aria-label="Passo anterior" disabled={vista === 0} onClick={() => mudar(-1)}><Pix nome="up" w={16} /></button>
        <div className={`actslot${travado ? " locked" : ""}`} id="actSlot" ref={setSlot} />
        <button className="nav" aria-label="Próximo passo" disabled={vista === total - 1} onClick={() => mudar(1)}><Pix nome="down" w={16} /></button>
      </div>

      <Gaveta titulo={L?.nome ?? "Exercício"} aberta={!!info} fechar={() => setInfo(null)}>
        {L && <>
          <div className="gif">{B?.gifUrl ? <img src={B.gifUrl} alt={`Execução de ${L.nome}`} loading="lazy" /> : <Boneco />}</div>
          <div className="facts">
            <div><small>Músculo alvo</small><b>{cap(L.musculo)}</b></div>
            <div><small>Equipamento</small><b>{EQUIPAMENTOS[L.equipamento].nome}</b></div>
            {L.acessorios.length > 0 && <div><small>Secundário</small><b>{L.acessorios.map(cap).join(", ")}</b></div>}
          </div>
          {passos.length > 0 && <ol className="steps">{passos.map((x, j) => <li key={j}>{x}</li>)}</ol>}
        </>}
      </Gaveta>
      <Gaveta titulo="Quanto sobrou?" aberta={!!gerAberto} fechar={() => setGerAberto(null)}>
        <div className="rirlist" role="group" aria-label="Quanto sobrou na série">
          {opcoes.map(g => (
            <button key={g} aria-pressed={g === gerAberto?.atual} onClick={() => { gerAberto?.escolher(g); setGerAberto(null); }}>
              <Face g={g} w={32} /><span><b>{up1(GER[g]!.sobrou)}</b><small>{GER[g]!.titulo}</small></span>{g === gerAberto?.alvo ? <i className="tg">alvo</i> : <i />}
            </button>
          ))}
        </div>
      </Gaveta>
    </div>
  );
}
