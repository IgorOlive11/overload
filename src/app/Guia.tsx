// Balão do Doomguy com o rosto que fala, o destaque que acompanha a rolagem e o bloqueio da tela (design/mock/guia.js).
import { useEffect, useRef, useState } from "react";
import { FACE } from "../lib/faces.ts";
import { useGuia } from "./guia.ts";

const GERL: Record<number, string> = { 7: "4 a 6", 8: "2 a 3", 9: "1", 10: "Falha" };
const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const POR_LETRA = 30;

export function Guia() {
  const { passos, i, proximo } = useGuia();
  const passo = passos?.[i];
  const guia = useRef<HTMLDivElement>(null), spot = useRef<HTMLDivElement>(null), bolha = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);
  const [boca, setBoca] = useState(false);
  const ultimo = !!passos && i === passos.length - 1;
  const texto = passo?.texto ?? "", pronto = n >= texto.length;

  // Texto letra por letra; o rosto alterna enquanto fala.
  useEffect(() => {
    if (!passo) return;
    if (reduzido()) { const t = setTimeout(() => setN(texto.length), 0); return () => clearTimeout(t); }
    let k = 0;
    const t = setInterval(() => { k++; setN(k); if (k >= texto.length) clearInterval(t); }, POR_LETRA);
    const b = setInterval(() => setBoca(x => !x), 160);
    const zera = setTimeout(() => setN(0), 0);
    return () => { clearInterval(t); clearInterval(b); clearTimeout(zera); setBoca(false); };
  }, [passo, texto]);

  // O destaque procura o alvo a cada quadro: a tela pode rolar ou ser redesenhada.
  useEffect(() => {
    if (!passo) return;
    const app = document.getElementById("app");
    const alvo0 = passo.alvo ? document.querySelector<HTMLElement>(passo.alvo) : null;
    if (alvo0 && passo.revelar !== false) alvo0.scrollIntoView({ block: "center", behavior: reduzido() ? "auto" : "smooth" });
    let raf = 0;
    const colocar = () => {
      const g = guia.current, sp = spot.current;
      if (!g || !sp || !app) return;
      const a = app.getBoundingClientRect(), tabs = document.querySelector(".tabs")?.getBoundingClientRect().height ?? 0;
      const alvo = passo.alvo ? document.querySelector<HTMLElement>(passo.alvo) : null;
      if (alvo) {
        const r0 = alvo.getBoundingClientRect(); let rt = r0.top, rb = r0.bottom;
        const tela = alvo.closest(".screen");
        if (tela) { const sr = tela.getBoundingClientRect(); rt = Math.max(rt, sr.top + 6); rb = Math.min(rb, sr.bottom - 6); }
        const h = Math.max(0, rb - rt);
        sp.hidden = false;
        sp.style.visibility = h < 8 ? "hidden" : "visible";
        Object.assign(sp.style, { left: `${r0.left - a.left - 6}px`, top: `${rt - a.top - 6}px`, width: `${r0.width + 12}px`, height: `${h + 12}px` });
        const gh = g.offsetHeight, topo = rt - a.top, fundo = rb - a.top, cabe = a.height - tabs - 8;
        let y: number;
        if (cabe - fundo - 14 >= gh) y = fundo + 14;
        else if (topo - 22 >= gh) y = topo - 14 - gh;
        else y = (topo + fundo) / 2 > a.height / 2 ? 8 : cabe - gh;
        g.style.top = `${Math.max(8, Math.min(cabe - gh, y))}px`; g.style.bottom = "auto";
        g.classList.toggle("below", y >= fundo);
      } else {
        sp.hidden = true;
        g.style.top = passo.pos === "top" ? "64px" : "auto";
        g.style.bottom = passo.pos === "top" ? "auto" : `${tabs + 12}px`;
        g.classList.remove("below");
      }
      raf = requestAnimationFrame(colocar);
    };
    raf = requestAnimationFrame(colocar);
    return () => cancelAnimationFrame(raf);
  }, [passo]);

  if (!passo) return null;
  const fa = passo.face ?? 10, fb = fa === 13 ? 10 : fa === 7 ? 8 : fa + (fa < 10 ? 1 : -1);
  const falando = !pronto && !reduzido() && boca;
  const sacode = () => bolha.current?.animate([{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 200, easing: "steps(4,end)" });
  return <>
    <div className="gblock" aria-hidden="true" onPointerDown={e => { e.preventDefault(); sacode(); }} />
    <div className="gspot dim" ref={spot} hidden aria-hidden="true" />
    <div className={`guide${passo.pos === "top" && !passo.alvo ? " top" : ""}`} ref={guia}>
      <span className="fslot gf"><img className={`face${falando ? " chomp" : ""}`} src={FACE[falando ? fb : fa]} width={48} height={74} alt="Doomguy" /></span>
      <div className="gbub" ref={bolha} role="status" aria-live="polite">
        <p onClick={() => setN(texto.length)}>{texto.slice(0, n)}</p>
        {passo.faces && <div className="gmini">
          <div className="gscale">{passo.faces.map(f => <span key={f}><img className="face" src={FACE[f]} width={28} height={43} alt="" /><small>{GERL[f]}</small></span>)}</div>
          <div className="gaxis"><span>mais leve</span><span>falha</span></div>
        </div>}
        <div className="gact"><button className="btn btn-primary" disabled={!pronto} onClick={proximo}>{passo.botao ?? (ultimo ? "Entendi" : "Próximo")}</button></div>
      </div>
    </div>
  </>;
}
