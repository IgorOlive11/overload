// Dicas (.tip com data-tip) do mock (design/mock/navegacao.js): passar o mouse ou focar no computador, tocar no celular.
// Um balão só, posicionado dentro do .app, com a seta apontando para quem chamou.
import { useEffect, useRef } from "react";
import G from "gsap";

export function Dicas() {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tipBox = caixa.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tipFor: HTMLElement | null = null;
    const show = (el: HTMLElement) => {
      const text = el.dataset.tip, app = document.getElementById("app");
      if (!text || !app) return;
      tipFor = el; tipBox.textContent = text; tipBox.hidden = false;
      document.querySelectorAll('[aria-expanded="true"].tip').forEach(b => b.setAttribute("aria-expanded", "false"));
      el.setAttribute("aria-expanded", "true");
      const host = app.getBoundingClientRect(), r = el.getBoundingClientRect(), w = Math.min(280, host.width - 32);
      tipBox.style.width = w + "px";
      const x = Math.min(Math.max(r.left + r.width / 2 - w / 2, host.left + 16), host.right - 16 - w) - host.left;
      const below = r.bottom + tipBox.offsetHeight + 12 < host.bottom - 60;
      const y = below ? r.bottom - host.top + 10 : r.top - host.top - tipBox.offsetHeight - 10;
      tipBox.classList.toggle("above", !below);
      tipBox.style.left = x + "px"; tipBox.style.top = y + "px";
      tipBox.style.setProperty("--ax", Math.max(12, Math.min(w - 22, r.left + r.width / 2 - host.left - x - 5)) + "px");
      if (!reduced) G.fromTo(tipBox, { opacity: 0, y: below ? -4 : 4 }, { opacity: 1, y: 0, duration: .18, ease: "power2.out" });
    };
    const hide = () => { tipBox.hidden = true; tipFor?.setAttribute("aria-expanded", "false"); tipFor = null; };
    const hoverable = window.matchMedia("(hover:hover)").matches;
    const alvo = (e: Event) => (e.target as Element | null)?.closest?.<HTMLElement>(".tip") ?? null;
    const over = (e: PointerEvent) => { if (!hoverable) return; const t = alvo(e); if (t?.dataset.tip) show(t); };
    const out = (e: PointerEvent) => { if (!hoverable) return; const t = alvo(e); if (t && !t.contains(e.relatedTarget as Node)) hide(); };
    const fin = (e: FocusEvent) => { const t = alvo(e); if (t?.dataset.tip && t.matches(":focus-visible")) show(t); };
    const fout = (e: FocusEvent) => { if (alvo(e)) hide(); };
    const click = (e: MouseEvent) => {
      const t = alvo(e);
      if (t?.dataset.tip && !t.closest(".rir")) { if (tipFor === t) hide(); else show(t); return; }
      if (!t) hide();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    const scroll = () => hide();
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", fin);
    document.addEventListener("focusout", fout);
    document.addEventListener("click", click);
    document.addEventListener("keydown", key);
    document.addEventListener("scroll", scroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", fin);
      document.removeEventListener("focusout", fout);
      document.removeEventListener("click", click);
      document.removeEventListener("keydown", key);
      document.removeEventListener("scroll", scroll, { capture: true });
    };
  }, []);
  return <div className="tipbox" ref={caixa} role="tooltip" hidden />;
}
