import { useState } from "react";
import { LuSwords, LuMail, LuLock, LuUser, LuArrowLeft, LuEye, LuEyeOff, LuLockKeyhole } from 'react-icons/lu';
import { supabase } from "../lib/supabase";

export default function AuthPage() {
    const [mode, setMode] = useState ('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()

        if (mode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
        }
    }

    return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 ">
            <div className="flex flex-col items-center mb-8">   
                <LuSwords size={48} className="text-neon text-5xl mb-4" />
                <h1 className="font-display text-neon text-4xl tracking-widest">OVERLOAD</h1>
            </div>
            <div className="w-full max-w-sm bg-s1 border border-border1 p-5">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border1">
                    <div className="font-display text-sm text-neon tracking-[0.2em]">
                        {mode === 'login' ? 'ENTRAR' : mode === 'register' ? 'CRIAR CONTA' : 'RECUPERAR SENHA'}
                    </div>
                </div>
                <form className="space-y-3" onSubmit={handleSubmit}>
                    <div>

                        <div className="font-mono text-[9px] text-muted tracking-widest mb-1">E-MAIL</div>
                        <div className="relative">
                            <LuMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                className="w-full bg-s2 border border-border2 text-ink px-3 py-3 pl-9 font-mono text-sm outline-none focus:border-neon transition-colors"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="font-mono text-[9px] text-muted tracking-widest mb-1 pt-3">SENHA</div>
                        <div className="relative">
                            <LuLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="w-full bg-s2 border border-border2 text-ink px-3 py-3 pl-9 pr-10 font-mono text-sm outline-none focus:border-neon transition-colors"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors" onClick ={() => setShowPassword(!showPassword)}>
                                {showPassword ? <LuEye size={14} /> : <LuEyeOff size={14} />}
                            </button>
                        </div>

                        <button type="submit" className="w-full btn-primary mt-5">
                            {mode === 'login' ? 'ENTRAR' : mode == 'register' ? 'CRIAR CONTA' : 'RECUPERAR SENHA'}
                        </button>

                    </div>
                </form>
                <div>
                    <button type="button" onClick={() => setMode('forgot')}
                    className="pt-2 text-muted font-mono text-[10px] block w-full tracking-wider transition-colors hover:text-neon">
                        Esqueceu a senha?
                    </button>
                    <button type="button" onClick={() => setMode('register')}
                    className="pt-2 text-muted font-mono text-[10px] block w-full tracking-wider transition-colors hover:text-neon">
                        Não tem conta? CRIAR CONTA
                    </button>
                </div>
            </div>
        </div>
    )
}