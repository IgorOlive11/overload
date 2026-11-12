// Telas de conta: entrar, criar conta, confirmar e-mail, esqueci a senha e redefinir.
// Os links dos e-mails trazem o token depois do # (#t=...), que não vai para o servidor nem para o log.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../../app/estado.ts";
import { api, ErroDaApi, type Conta } from "../../lib/api.ts";

function Moldura({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <p className="text-5xl leading-none text-accent">OVERLOAD</p>
      <h1 className="text-3xl uppercase tracking-[0.05em]">{titulo}</h1>
      {children}
    </main>
  );
}

function Campo(props: { rotulo: string; tipo?: string; valor: string; mudar(v: string): void; auto?: string; minimo?: number }) {
  return (
    <label className="block">
      <span className="rotulo">{props.rotulo}</span>
      <input className="campo" type={props.tipo ?? "text"} value={props.valor} required minLength={props.minimo}
        autoComplete={props.auto} onChange={e => props.mudar(e.target.value)} />
    </label>
  );
}

const Aviso = ({ texto, tom = "erro" }: { texto: string | null; tom?: "erro" | "ok" }) =>
  texto ? <p role={tom === "erro" ? "alert" : "status"} className={tom === "erro" ? "text-accent" : "text-ok"}>{texto}</p> : null;

const tokenDoLink = () => new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";

/* Estado comum de formulário: enviando, erro e o tratamento de falha de rede. */
function useEnvio() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const enviar = async (fn: () => Promise<void>) => {
    setEnviando(true);
    setErro(null);
    try { await fn(); } catch (e) {
      setErro(e instanceof ErroDaApi ? e.message : "Sem conexão. Tente de novo quando a rede voltar.");
    } finally { setEnviando(false); }
  };
  return { enviando, erro, setErro, enviar };
}

export function Entrar() {
  const entrou = useApp(s => s.entrou);
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [naoConfirmado, setNaoConfirmado] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const { enviando, erro, setErro, enviar } = useEnvio();

  const entrar = (e: FormEvent) => {
    e.preventDefault();
    void enviar(async () => {
      try {
        const { conta } = await api<{ conta: Conta }>("POST", "/sessao", { email, senha });
        await entrou(conta);
        navegar("/", { replace: true });
      } catch (x) {
        if (x instanceof ErroDaApi && x.corpo.codigo === "email_nao_confirmado") { setNaoConfirmado(true); setErro(x.message); return; }
        throw x;
      }
    });
  };

  return (
    <Moldura titulo="Entrar">
      <form className="flex flex-col gap-4" onSubmit={entrar}>
        <Campo rotulo="E-mail" tipo="email" valor={email} mudar={setEmail} auto="email" />
        <Campo rotulo="Senha" tipo="password" valor={senha} mudar={setSenha} auto="current-password" />
        <Aviso texto={erro} />
        {naoConfirmado && (reenviado
          ? <Aviso tom="ok" texto="Mandamos outro link. Confira a caixa de entrada e o spam." />
          : <button type="button" className="link self-start" onClick={() => void enviar(async () => {
              await api("POST", "/conta/reenviar", { email });
              setReenviado(true);
            })}>Reenviar o link de confirmação</button>)}
        <button className="btn-principal" disabled={enviando}>{enviando ? "Entrando..." : "Entrar"}</button>
      </form>
      <div className="flex justify-between">
        <Link className="link" to="/cadastro">Criar conta</Link>
        <Link className="link" to="/esqueci">Esqueci a senha</Link>
      </div>
    </Moldura>
  );
}

export function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [feito, setFeito] = useState(false);
  const { enviando, erro, setErro, enviar } = useEnvio();

  const criar = (e: FormEvent) => {
    e.preventDefault();
    if (senha !== repetir) { setErro("As senhas não são iguais."); return; }
    void enviar(async () => { await api("POST", "/conta", { nome, email, senha }); setFeito(true); });
  };

  if (feito) return (
    <Moldura titulo="Confira o e-mail">
      <p>Se der para usar <strong>{email}</strong>, chega um link de confirmação em instantes. Abra o link neste aparelho para entrar.</p>
      <Link className="btn-secundario" to="/entrar">Voltar</Link>
    </Moldura>
  );

  return (
    <Moldura titulo="Criar conta">
      <form className="flex flex-col gap-4" onSubmit={criar}>
        <Campo rotulo="Como quer ser chamado" valor={nome} mudar={setNome} auto="nickname" />
        <Campo rotulo="E-mail" tipo="email" valor={email} mudar={setEmail} auto="email" />
        <Campo rotulo="Senha (pelo menos 8 caracteres)" tipo="password" valor={senha} mudar={setSenha} auto="new-password" minimo={8} />
        <Campo rotulo="Repita a senha" tipo="password" valor={repetir} mudar={setRepetir} auto="new-password" minimo={8} />
        <Aviso texto={erro} />
        <button className="btn-principal" disabled={enviando}>{enviando ? "Criando..." : "Criar conta"}</button>
      </form>
      <Link className="link" to="/entrar">Já tenho conta</Link>
    </Moldura>
  );
}

export function Confirmar() {
  const entrou = useApp(s => s.entrou);
  const navegar = useNavigate();
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    const token = tokenDoLink();
    history.replaceState(null, "", window.location.pathname);
    api<{ conta: Conta }>("POST", "/conta/confirmar", { token })
      .then(async ({ conta }) => { await entrou(conta); navegar("/", { replace: true }); })
      .catch((e: unknown) => setErro(e instanceof ErroDaApi ? e.message : "Sem conexão. Abra o link de novo quando a rede voltar."));
  }, [entrou, navegar]);
  return (
    <Moldura titulo="Confirmando o e-mail">
      {erro ? <><Aviso texto={erro} /><Link className="btn-secundario" to="/entrar">Entrar</Link></> : <p>Um instante...</p>}
    </Moldura>
  );
}

export function Esqueci() {
  const [email, setEmail] = useState("");
  const [feito, setFeito] = useState(false);
  const { enviando, erro, enviar } = useEnvio();
  return (
    <Moldura titulo="Esqueci a senha">
      {feito ? <p>Se houver conta com esse e-mail, chega um link para criar uma senha nova. Ele vale por 1 hora.</p> : (
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void enviar(async () => { await api("POST", "/conta/esqueci", { email }); setFeito(true); }); }}>
          <Campo rotulo="E-mail" tipo="email" valor={email} mudar={setEmail} auto="email" />
          <Aviso texto={erro} />
          <button className="btn-principal" disabled={enviando}>Mandar o link</button>
        </form>
      )}
      <Link className="link" to="/entrar">Voltar</Link>
    </Moldura>
  );
}

export function Redefinir() {
  const entrou = useApp(s => s.entrou);
  const navegar = useNavigate();
  const [token] = useState(tokenDoLink);
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const { enviando, erro, setErro, enviar } = useEnvio();
  useEffect(() => { history.replaceState(null, "", window.location.pathname); }, []);
  return (
    <Moldura titulo="Senha nova">
      <form className="flex flex-col gap-4" onSubmit={e => {
        e.preventDefault();
        if (senha !== repetir) { setErro("As senhas não são iguais."); return; }
        void enviar(async () => {
          const { conta } = await api<{ conta: Conta }>("POST", "/conta/redefinir", { token, senha });
          await entrou(conta);
          navegar("/", { replace: true });
        });
      }}>
        <Campo rotulo="Senha nova (pelo menos 8 caracteres)" tipo="password" valor={senha} mudar={setSenha} auto="new-password" minimo={8} />
        <Campo rotulo="Repita a senha" tipo="password" valor={repetir} mudar={setRepetir} auto="new-password" minimo={8} />
        <Aviso texto={erro} />
        <button className="btn-principal" disabled={enviando || !token}>Salvar e entrar</button>
      </form>
    </Moldura>
  );
}
