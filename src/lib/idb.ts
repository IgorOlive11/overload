// IndexedDB do app, sem biblioteca: um banco "overload" com a fila de envio e um guarda-volumes de chave e valor.
import type { Armazem, Item } from "./fila.ts";

const NOME = "overload";
const VERSAO = 1;

let aberto: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  aberto ??= new Promise((ok, erro) => {
    const r = indexedDB.open(NOME, VERSAO);
    r.onupgradeneeded = () => {
      const db = r.result;
      // seq mantém a ordem de chegada; o id do item é único.
      const fila = db.createObjectStore("fila", { keyPath: "seq", autoIncrement: true });
      fila.createIndex("id", "id", { unique: true });
      db.createObjectStore("chaves");
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { aberto = null; erro(r.error); };
  });
  return aberto;
}

const pedido = <T>(r: IDBRequest<T>) => new Promise<T>((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
const fim = (t: IDBTransaction) => new Promise<void>((ok, erro) => { t.oncomplete = () => ok(); t.onerror = t.onabort = () => erro(t.error); });

export const armazemIdb: Armazem = {
  async listar() {
    const db = await abrir();
    const linhas = await pedido(db.transaction("fila").objectStore("fila").getAll()) as (Item & { seq: number })[];
    return linhas.map(l => { const i: Partial<typeof l> = { ...l }; delete i.seq; return i as Item; });
  },
  async guardar(item) {
    const db = await abrir();
    const t = db.transaction("fila", "readwrite");
    const s = t.objectStore("fila");
    const antiga = await pedido(s.index("id").getKey(item.id));
    if (antiga !== undefined) s.delete(antiga);
    s.add(item);
    await fim(t);
  },
  async remover(ids) {
    const db = await abrir();
    const t = db.transaction("fila", "readwrite");
    const s = t.objectStore("fila");
    for (const id of ids) {
      const k = await pedido(s.index("id").getKey(id));
      if (k !== undefined) s.delete(k);
    }
    await fim(t);
  }
};

export async function lerChave<T>(chave: string): Promise<T | undefined> {
  const db = await abrir();
  return pedido(db.transaction("chaves").objectStore("chaves").get(chave)) as Promise<T | undefined>;
}

export async function gravarChave(chave: string, valor: unknown): Promise<void> {
  const db = await abrir();
  const t = db.transaction("chaves", "readwrite");
  t.objectStore("chaves").put(valor, chave);
  await fim(t);
}

/* Sair limpa tudo o que está no aparelho (regra da v1 mantida). */
export async function limparTudo(): Promise<void> {
  const db = await abrir();
  const t = db.transaction(["fila", "chaves"], "readwrite");
  t.objectStore("fila").clear();
  t.objectStore("chaves").clear();
  await fim(t);
}
