// Entrada do app: criar conta, confirmar o e-mail, boas-vindas, entrar, esqueci e redefinir a senha.
// Marcação, textos e classes do mock (design/mock/primeiro-acesso.js, camada .frlayer). Entrar, esqueci e
// redefinir não existem no mock, que simula só a conta nova; seguem o mesmo molde da tela de cadastro.
// Os links dos e-mails trazem o token depois do # (#t=...), que não vai para o servidor nem para o log.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../../app/estado.ts";
import { api, ErroDaApi, type Conta } from "../../lib/api.ts";
import { FACE } from "../../lib/faces.ts";
import { erroDoCadastro, PW, pwScore } from "./regras.ts";

function Camada({ children, classe }: { children: ReactNode; classe?: string }) {
  return (
    <div className="frlayer full">
      <div className={`frbox${classe ? ` ${classe}` : ""}`}>{children}</div>
    </div>
  );
}

const Marca = () => <div className="mark">Overload</div>;

function Campo(p: { rotulo: string; tipo?: string; valor: string; mudar(v: string): void; auto: string; foco?: boolean }) {
  return (
    <label className="frf">
      <span>{p.rotulo}</span>
      <input className="field" type={p.tipo ?? "text"} value={p.valor} autoComplete={p.auto} autoFocus={p.foco}
        onChange={e => p.mudar(e.target.value)} />
    </label>
  );
}

function Medidor({ senha }: { senha: string }) {
  const n = pwScore(senha);
  const [face, texto] = PW[n]!;
  return (
    <div className="pwm" aria-live="polite">
      <span className="fslot"><img className="face" src={FACE[face]} width={24} height={37} alt="" /></span>
      <div className="pwbar"><i data-n={n} style={{ width: senha ? `${(n + 1) * 20}%` : "0%" }} /></div>
      <small>{!senha ? "Pelo menos 8 caracteres" : senha.length < 8 ? `Faltam ${8 - senha.length} caracteres` : texto}</small>
    </div>
  );
}

const tokenDoLink = () => new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";

function useEnvio() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const enviar = async (fn: () => Promise<void>) => {
    setEnviando(true);
    setErro("");
    try { await fn(); } catch (e) {
      setErro(e instanceof ErroDaApi ? e.message : "Sem conexão. Tente de novo quando a rede voltar.");
    } finally { setEnviando(false); }
  };
  return { enviando, erro, setErro, enviar };
}

export function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [enviado, setEnviado] = useState(false);
  const { enviando, erro, setErro, enviar } = useEnvio();

  const criar = (e: FormEvent) => {
    e.preventDefault();
    const err = erroDoCadastro(nome, email, senha, repetir);
    setErro(err);
    if (err) return;
    void enviar(async () => { await api("POST", "/conta", { nome: nome.trim(), email: email.trim(), senha }); setEnviado(true); });
  };

  if (enviado) return <ConfirmeOEmail email={email.trim()} />;

  return (
    <Camada>
      <Marca />
      <h2 className="frh">Criar conta</h2>
      <form className="col" noValidate onSubmit={criar}>
        <Campo rotulo="Nome" valor={nome} mudar={setNome} auto="name" foco />
        <Campo rotulo="E-mail" tipo="email" valor={email} mudar={setEmail} auto="email" />
        <Campo rotulo="Senha" tipo="password" valor={senha} mudar={setSenha} auto="new-password" />
        <Medidor senha={senha} />
        <Campo rotulo="Confirmar senha" tipo="password" valor={repetir} mudar={setRepetir} auto="new-password" />
        <p className="frerr" role="alert">{erro}</p>
        <button className="btn btn-primary" type="submit" disabled={enviando}>Criar conta</button>
      </form>
      <Link className="linkbtn" to="/entrar">Já tenho conta</Link>
    </Camada>
  );
}

function ConfirmeOEmail({ email }: { email: string }) {
  const [aviso, setAviso] = useState("");
  const { erro, enviar } = useEnvio();
  return (
    <Camada>
      <Marca />
      <h2 className="frh">Confirme seu e-mail</h2>
      <p className="why">Mandamos um link para <b>{email}</b>. Abra o e-mail e toque no botão para entrar.</p>
      <p className="frerr" role="alert">{erro}</p>
      {aviso && <p className="frok" role="status">{aviso}</p>}
      <button className="linkbtn" onClick={() => void enviar(async () => {
        await api("POST", "/conta/reenviar", { email });
        setAviso(`E-mail reenviado. Confira a caixa de entrada de ${email}.`);
      })}>Reenviar o e-mail</button>
      <Link className="linkbtn" to="/entrar">Já confirmei, entrar</Link>
    </Camada>
  );
}

/* Abre pelo link do e-mail. Depois de confirmar, as boas-vindas do mock. */
export function Confirmar() {
  const entrou = useApp(s => s.entrou);
  const navegar = useNavigate();
  const [conta, setConta] = useState<Conta | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    const token = tokenDoLink();
    history.replaceState(null, "", window.location.pathname);
    api<{ conta: Conta }>("POST", "/conta/confirmar", { token })
      .then(async r => { await entrou(r.conta); setConta(r.conta); })
      .catch((e: unknown) => setErro(e instanceof ErroDaApi ? e.message : "Sem conexão. Abra o link de novo quando a rede voltar."));
  }, [entrou]);

  if (erro) return (
    <Camada>
      <Marca />
      <h2 className="frh">Confirme seu e-mail</h2>
      <p className="frerr" role="alert">{erro}</p>
      <Link className="btn btn-primary" to="/entrar">Entrar</Link>
    </Camada>
  );
  if (!conta) return <Camada><Marca /><p className="why">Confirmando o e-mail...</p></Camada>;
  return (
    <Camada classe="frwel">
      <Marca />
      <img className="face welface talk" src={FACE[13]} width={96} height={149} alt="Doom face" />
      <h2 className="frh">Episódio 1 · Missão 1</h2>
      <p className="why">Conta criada, {conta.nome.split(" ")[0]}. Antes do primeiro treino, o Doomguy mostra como o app funciona e monta o protocolo com você.</p>
      <button className="btn btn-primary" onClick={() => navegar("/", { replace: true })}>Começar</button>
    </Camada>
  );
}

export function Entrar() {
  const entrou = useApp(s => s.entrou);
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [naoConfirmado, setNaoConfirmado] = useState(false);
  const { enviando, erro, enviar } = useEnvio();

  if (naoConfirmado) return <ConfirmeOEmail email={email.trim()} />;

  return (
    <Camada>
      <Marca />
      <h2 className="frh">Entrar</h2>
      <form className="col" noValidate onSubmit={e => {
        e.preventDefault();
        void enviar(async () => {
          try {
            const { conta } = await api<{ conta: Conta }>("POST", "/sessao", { email: email.trim(), senha });
            await entrou(conta);
            navegar("/", { replace: true });
          } catch (x) {
            if (x instanceof ErroDaApi && x.corpo.codigo === "email_nao_confirmado") { setNaoConfirmado(true); return; }
            throw x;
          }
        });
      }}>
        <Campo rotulo="E-mail" tipo="email" valor={email} mudar={setEmail} auto="email" foco />
        <Campo rotulo="Senha" tipo="password" valor={senha} mudar={setSenha} auto="current-password" />
        <p className="frerr" role="alert">{erro}</p>
        <button className="btn btn-primary" type="submit" disabled={enviando}>Entrar</button>
      </form>
      <div className="frlinks">
        <Link className="linkbtn" to="/cadastro">Criar conta</Link>
        <Link className="linkbtn" to="/esqueci">Esqueci a senha</Link>
      </div>
    </Camada>
  );
}

export function Esqueci() {
  const [email, setEmail] = useState("");
  const [feito, setFeito] = useState(false);
  const { enviando, erro, enviar } = useEnvio();
  return (
    <Camada>
      <Marca />
      <h2 className="frh">Esqueci a senha</h2>
      {feito
        ? <p className="why">Se houver conta com <b>{email.trim()}</b>, chega um link para criar uma senha nova. Ele vale por 1 hora.</p>
        : (
          <form className="col" noValidate onSubmit={e => { e.preventDefault(); void enviar(async () => { await api("POST", "/conta/esqueci", { email: email.trim() }); setFeito(true); }); }}>
            <Campo rotulo="E-mail" tipo="email" valor={email} mudar={setEmail} auto="email" foco />
            <p className="frerr" role="alert">{erro}</p>
            <button className="btn btn-primary" type="submit" disabled={enviando}>Mandar o link</button>
          </form>
        )}
      <Link className="linkbtn" to="/entrar">Voltar</Link>
    </Camada>
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
    <Camada>
      <Marca />
      <h2 className="frh">Senha nova</h2>
      <form className="col" noValidate onSubmit={e => {
        e.preventDefault();
        const err = senha.length < 8 ? "A senha precisa de pelo menos 8 caracteres." : senha !== repetir ? "As senhas não são iguais." : "";
        setErro(err);
        if (err) return;
        void enviar(async () => {
          const { conta } = await api<{ conta: Conta }>("POST", "/conta/redefinir", { token, senha });
          await entrou(conta);
          navegar("/", { replace: true });
        });
      }}>
        <Campo rotulo="Senha" tipo="password" valor={senha} mudar={setSenha} auto="new-password" foco />
        <Medidor senha={senha} />
        <Campo rotulo="Confirmar senha" tipo="password" valor={repetir} mudar={setRepetir} auto="new-password" />
        <p className="frerr" role="alert">{erro}</p>
        <button className="btn btn-primary" type="submit" disabled={enviando || !token}>Salvar e entrar</button>
      </form>
    </Camada>
  );
}
