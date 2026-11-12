// Configuração da API, só pelo ambiente. Nada de segredo no código.

export interface Config {
  porta: number;
  /* Conexão como overload_api. */
  urlBanco: string;
  /* Endereço público do app, sem barra no fim: monta os links dos e-mails e confere a origem das requisições. */
  origem: string;
  producao: boolean;
  resendChave: string | undefined;
  remetente: string;
  /* Atrás do proxy do Coolify, o IP de quem chama vem do X-Forwarded-For. */
  confiarProxy: boolean;
  /* Pasta do PWA construído, servida na mesma origem. Sem ela, só a API sobe. */
  pastaApp: string | undefined;
}

export function lerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const faltando = ["DATABASE_URL", "ORIGEM_PUBLICA"].filter(k => !env[k]);
  if (faltando.length) throw new Error(`Defina ${faltando.join(" e ")}.`);
  const producao = env.NODE_ENV === "production";
  if (producao && !env.RESEND_API_KEY) throw new Error("Em produção, defina RESEND_API_KEY.");
  return {
    porta: Number(env.PORT ?? 3000),
    urlBanco: env.DATABASE_URL!,
    origem: new URL(env.ORIGEM_PUBLICA!).origin,
    producao,
    resendChave: env.RESEND_API_KEY,
    remetente: env.EMAIL_REMETENTE ?? "Overload <nao-responda@overload.app.br>",
    confiarProxy: env.CONFIAR_PROXY !== "0",
    pastaApp: env.PASTA_APP
  };
}
