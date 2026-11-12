// Fila de envio: tudo que o treino grava vai primeiro para o aparelho e depois para a API, em lote.
// Sem rede, a fila espera e tenta de novo; o que a API recusar sai da fila e vira aviso para a pessoa.
// O núcleo não conhece IndexedDB nem fetch: recebe um Armazem e um Envio, e por isso é testado no Node.

export type Item =
  | { tipo: "sessao"; id: string; dados: Record<string, unknown> }
  | { tipo: "registro"; id: string; dados: Record<string, unknown> };

export interface Armazem {
  /* Os itens pendentes, na ordem em que entraram. */
  listar(): Promise<Item[]>;
  /* Grava ou troca pelo id (uma sessão que termina substitui a mesma sessão em andamento). */
  guardar(item: Item): Promise<void>;
  remover(ids: readonly string[]): Promise<void>;
}

export interface RespostaDoEnvio { recusas: { id: string; motivo: string }[] }
/* Lança erro quando não chegou à API (sem rede, 5xx). 401 vem como SemSessao. */
export type Envio = (lote: { sessoes: object[]; registros: object[] }) => Promise<RespostaDoEnvio>;
export class SemSessao extends Error {}

export interface Estado {
  pendentes: number;
  enviando: boolean;
  /* Última falha de rede ou de servidor, se a fila ainda não conseguiu enviar depois dela. */
  falha: string | null;
  /* Itens que a API recusou. Não voltam para a fila: a pessoa precisa saber. */
  recusas: { id: string; tipo: Item["tipo"]; motivo: string }[];
  semSessao: boolean;
}

const LOTE_SESSOES = 50;
const LOTE_REGISTROS = 500;

export class Fila {
  private estado: Estado = { pendentes: 0, enviando: false, falha: null, recusas: [], semSessao: false };
  private ouvintes = new Set<(e: Estado) => void>();
  private rodando: Promise<void> | null = null;
  private armazem: Armazem;
  private envio: Envio;

  constructor(armazem: Armazem, envio: Envio) {
    this.armazem = armazem;
    this.envio = envio;
  }

  get atual(): Estado { return this.estado; }

  ouvir(fn: (e: Estado) => void): () => void {
    this.ouvintes.add(fn);
    fn(this.estado);
    return () => { this.ouvintes.delete(fn); };
  }

  private mudar(parcial: Partial<Estado>) {
    this.estado = { ...this.estado, ...parcial };
    for (const fn of this.ouvintes) fn(this.estado);
  }

  async acrescentar(...itens: Item[]): Promise<void> {
    for (const i of itens) await this.armazem.guardar(i);
    this.mudar({ pendentes: (await this.armazem.listar()).length });
  }

  /* Envia tudo o que está pendente, em lotes. Uma chamada por vez; chamadas no meio esperam a que está rodando. */
  enviar(): Promise<void> {
    this.rodando ??= this.rodada().finally(() => { this.rodando = null; });
    return this.rodando;
  }

  private async rodada(): Promise<void> {
    this.mudar({ enviando: true });
    try {
      for (;;) {
        const todos = await this.armazem.listar();
        this.mudar({ pendentes: todos.length });
        if (!todos.length) break;
        const sessoes = todos.filter(i => i.tipo === "sessao").slice(0, LOTE_SESSOES);
        // Registros só vão junto com a própria sessão ou depois dela, para a chave estrangeira do banco valer.
        const pendentes = new Set(todos.filter(i => i.tipo === "sessao").map(i => i.id));
        const enviadas = new Set(sessoes.map(s => s.id));
        const registros = todos
          .filter(i => i.tipo === "registro" && (!pendentes.has(String(i.dados.sessaoId)) || enviadas.has(String(i.dados.sessaoId))))
          .slice(0, LOTE_REGISTROS);
        const lote = [...sessoes, ...registros];
        if (!lote.length) break;
        let resposta: RespostaDoEnvio;
        try {
          resposta = await this.envio({ sessoes: sessoes.map(s => s.dados), registros: registros.map(r => r.dados) });
        } catch (e) {
          if (e instanceof SemSessao) this.mudar({ semSessao: true, falha: "Entre de novo para enviar o que ficou no aparelho." });
          else this.mudar({ falha: (e as Error).message || "Sem conexão." });
          return;
        }
        const recusados = new Map(resposta.recusas.map(r => [r.id, r.motivo]));
        await this.armazem.remover(lote.map(i => i.id));
        const novas = lote.filter(i => recusados.has(i.id)).map(i => ({ id: i.id, tipo: i.tipo, motivo: recusados.get(i.id)! }));
        this.mudar({ falha: null, semSessao: false, recusas: [...this.estado.recusas, ...novas] });
      }
    } finally {
      this.mudar({ enviando: false, pendentes: (await this.armazem.listar()).length });
    }
  }

  /* Tira da fila a sessão e os registros dela que ainda não foram. Diz se a sessão ainda estava só no aparelho. */
  async descartar(sessaoId: string): Promise<boolean> {
    const todos = await this.armazem.listar();
    const ids = todos.filter(i => i.id === sessaoId || (i.tipo === "registro" && i.dados.sessaoId === sessaoId)).map(i => i.id);
    const soAqui = todos.some(i => i.tipo === "sessao" && i.id === sessaoId && i.dados.estado === "em_andamento") && !this.rodando;
    if (soAqui) await this.armazem.remover(ids);
    else await this.armazem.remover(ids.filter(id => id !== sessaoId));
    this.mudar({ pendentes: (await this.armazem.listar()).length });
    return soAqui;
  }

  dispensarRecusas() { this.mudar({ recusas: [] }); }
}

/* Armazém em memória: para testes e para quando o navegador não tem IndexedDB. */
export class ArmazemEmMemoria implements Armazem {
  private itens = new Map<string, Item>();
  async listar() { return [...this.itens.values()]; }
  async guardar(i: Item) { this.itens.delete(i.id); this.itens.set(i.id, i); }
  async remover(ids: readonly string[]) { for (const id of ids) this.itens.delete(id); }
}
