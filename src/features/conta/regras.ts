// Regras das telas de conta, iguais às do mock (design/mock/primeiro-acesso.js).

/* Força da senha, igual ao mock: 0 a 4 pontos, e a face de cada nível. */
export function pwScore(p: string): number {
  let n = 0;
  if (p.length >= 8) n++;
  if (p.length >= 12) n++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
  if (/\d/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p)) n++;
  return Math.min(4, n);
}
export const PW: readonly (readonly [number, string])[] = [[7, "Muito fraca"], [8, "Fraca"], [9, "Razoável"], [10, "Forte"], [13, "Muito forte"]];

/* Validação do cadastro, com as mensagens do mock. */
export function erroDoCadastro(nome: string, email: string, a: string, b: string): string {
  return !nome.trim() ? "Diga seu nome."
    : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? "Esse e-mail não parece válido."
    : a.length < 8 ? "A senha precisa de pelo menos 8 caracteres."
    : a !== b ? "As senhas não são iguais."
    : "";
}

