'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AlertTriangle, Check, Eye, EyeOff, KeyRound, LoaderCircle, Shell } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

type RecoveryState = 'checking' | 'ready' | 'invalid' | 'success'

export default function ResetPasswordPage() {
  const [state, setState] = useState<RecoveryState>('checking')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const queryParams = new URLSearchParams(window.location.search)
    const recoveryLink = hashParams.get('type') === 'recovery'
    const linkError = hashParams.get('error_description') ?? queryParams.get('error_description')

    if (linkError) {
      setError(linkError)
      setState('invalid')
      return
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' && session) setState('ready')
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session && recoveryLink) setState('ready')
      else window.setTimeout(() => {
        if (active) setState((current) => current === 'checking' ? 'invalid' : current)
      }, 800)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    const passwordConfirmation = String(data.get('passwordConfirmation') ?? '')

    if (password !== passwordConfirmation) {
      setError('As senhas digitadas não são iguais.')
      setSubmitting(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError('Não foi possível atualizar a senha. Solicite um novo link e tente novamente.')
      setSubmitting(false)
      return
    }

    await supabase.auth.signOut()
    setState('success')
    setSubmitting(false)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#073f53] px-5 py-12">
      <img src="/hero-platform-generic.png" alt="" className="absolute inset-0 size-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(4,42,59,.97),rgba(4,42,59,.74))]" />
      <div className="bubble bubble-one" /><div className="bubble bubble-two" /><div className="bubble bubble-three" />

      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/20 bg-[#fffdf7] p-7 shadow-2xl sm:p-9">
        {state === 'checking' && <Status icon={<LoaderCircle className="animate-spin" size={26} />} title="Validando seu link" text="Aguarde enquanto verificamos sua solicitação de recuperação." />}

        {state === 'invalid' && <Status icon={<AlertTriangle size={25} />} title="Link inválido ou expirado" text={error || 'Solicite um novo e-mail de recuperação para redefinir sua senha.'} action="Solicitar outro link" href="/acesso?modo=recuperar" />}

        {state === 'success' && <Status icon={<Check size={27} />} title="Senha atualizada" text="Sua nova senha foi salva. Agora você já pode entrar no painel." action="Entrar no painel" href="/acesso" />}

        {state === 'ready' && (
          <>
            <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[#dff1ed] text-[#0a7088]"><KeyRound size={23} /></div>
            <p className="eyebrow text-[#178ba4]">Nova senha</p>
            <h1 className="mt-2 font-display text-4xl leading-tight text-[#073f53]">Crie uma senha segura</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#617f87]">Digite a nova senha duas vezes para confirmar a alteração.</p>

            <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
              <label className="field-label">Nova senha
                <span className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" placeholder="Mínimo de 6 caracteres" className="field-input pr-12" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#79949c] hover:bg-[#e8f3ef]" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </span>
              </label>
              <label className="field-label">Confirmar nova senha
                <input name="passwordConfirmation" type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" placeholder="Repita a nova senha" className="field-input" />
              </label>
              {error && <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-medium text-[#9b4037]">{error}</p>}
              <button disabled={submitting} type="submit" className="primary-button mt-1 w-full disabled:cursor-wait disabled:opacity-70">
                {submitting ? <><LoaderCircle className="animate-spin" size={17} /> Salvando...</> : <><KeyRound size={17} /> Salvar nova senha</>}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#8aa1a6]"><Shell size={14} /> Recuperação protegida pelo Supabase</div>
      </section>
    </main>
  )
}

function Status({ icon, title, text, action, href }: { icon: React.ReactNode; title: string; text: string; action?: string; href?: string }) {
  return (
    <div className="py-3 text-center">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#dff1ed] text-[#0a7088]">{icon}</div>
      <h1 className="font-display text-4xl text-[#073f53]">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#617f87]">{text}</p>
      {action && href && <a href={href} className="primary-button mt-7 w-full">{action}</a>}
    </div>
  )
}
