// Envio de e-mail pelo Resend, a partir da fila overload.tarefas_email.
// A fila tenta de novo com espera crescente (5, 10, 20... minutos) e para depois de 6 tentativas.
import type pg from "pg";
import type { Config } from "./config.ts";

interface Tarefa { id: string; para: string; tipo: "confirmar" | "redefinir"; dados: { nome?: string; link?: string } }

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export function montarEmail(t: Tarefa): { assunto: string; html: string; texto: string } {
  const nome = esc(t.dados.nome ?? "");
  const link = t.dados.link ?? "";
  const [assunto, titulo, frase, botao] = t.tipo === "confirmar"
    ? ["Confirme seu e-mail no Overload", "Bem-vindo ao inferno", "Falta um passo: confirme o e-mail para entrar.", "Confirmar e-mail"]
    : ["Redefinir sua senha do Overload", "Esqueceu a senha?", "Use o botão para criar uma nova. O link vale por 1 hora.", "Criar nova senha"];
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0b0505;color:#e8d9c4;font-family:Verdana,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#1a0b08;border:2px solid #7a1a10">
<tr><td style="padding:24px"><p style="margin:0 0 8px;font-size:22px;font-weight:bold;color:#ff4a1c;letter-spacing:1px">OVERLOAD</p>
<p style="margin:0 0 16px;font-size:18px">${titulo}${nome ? `, ${nome}` : ""}.</p>
<p style="margin:0 0 24px;line-height:1.5">${frase}</p>
<a href="${esc(link)}" style="display:inline-block;background:#b3200e;color:#fff;padding:12px 20px;text-decoration:none;font-weight:bold">${botao}</a>
<p style="margin:24px 0 0;font-size:12px;color:#a08b74">Se não foi você, ignore este e-mail.</p></td></tr></table></td></tr></table></body></html>`;
  const texto = `${titulo}${t.dados.nome ? `, ${t.dados.nome}` : ""}.\n\n${frase}\n\n${link}\n\nSe não foi você, ignore este e-mail.`;
  return { assunto, html, texto };
}

export interface Carteiro { avisar(): void; parar(): Promise<void> }

export function iniciarCarteiro(pool: pg.Pool, cfg: Config, log: { info(o: object, m: string): void; error(o: object, m: string): void }): Carteiro {
  let timer: NodeJS.Timeout | undefined;
  let rodando: Promise<void> | null = null;
  let parado = false;

  async function enviar(t: Tarefa): Promise<string | null> {
    const e = montarEmail(t);
    if (!cfg.resendChave) {
      // Só fora de produção (lerConfig exige a chave em produção): o link aparece no log para testar localmente.
      log.info({ para: t.para, link: t.dados.link }, "e-mail não enviado (sem RESEND_API_KEY)");
      return null;
    }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${cfg.resendChave}`, "content-type": "application/json" },
      body: JSON.stringify({ from: cfg.remetente, to: [t.para], subject: e.assunto, html: e.html, text: e.texto }),
      signal: AbortSignal.timeout(15_000)
    });
    return r.ok ? null : `Resend ${r.status}: ${(await r.text()).slice(0, 300)}`;
  }

  async function rodada() {
    try {
      const { rows } = await pool.query<Tarefa>("select * from overload.pegar_tarefas_email(10)");
      for (const t of rows) {
        const erro = await enviar(t).catch((e: Error) => e.message);
        await pool.query("select overload.concluir_tarefa_email($1, $2)", [t.id, erro]);
        if (erro) log.error({ tarefa: t.id, tipo: t.tipo }, `e-mail falhou: ${erro}`);
      }
    } catch (e) {
      log.error({ err: e }, "fila de e-mail falhou");
    }
  }

  const avisar = () => {
    if (parado || rodando) return;
    rodando = rodada().finally(() => { rodando = null; });
  };
  const agendar = () => { if (!parado) timer = setTimeout(() => { avisar(); agendar(); }, 30_000); };
  agendar();
  avisar();

  return {
    avisar,
    async parar() { parado = true; clearTimeout(timer); await rodando; }
  };
}
