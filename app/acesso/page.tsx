'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Shell, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

type AccessMode = 'login' | 'register' | 'forgot'

export default function AccessPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AccessMode>('login')
  const [emailValue, setEmailValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isAdminRegistration = mode === 'register' && emailValue.trim().toLowerCase() === 'freelas.jequie@gmail.com'
  const platformHeroImage = '/hero-platform-generic.png'

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get('modo')
    if (requestedMode === 'cadastro') setMode('register')
    if (requestedMode === 'recuperar') setMode('forgot')
  }, [])

  const redirectByRole = async (userId: string) => {
    const { data } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    router.replace(data ? '/admin' : '/painel')
    router.refresh()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')

    const form = event.currentTarget
    const formData = new FormData(form)
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')

    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        })
        if (resetError) throw new Error('Não foi possível enviar o e-mail agora. Aguarde um pouco e tente novamente.')
        setNotice('Se esse e-mail estiver cadastrado, você receberá um link para criar uma nova senha.')
        return
      }

      if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError || !data.user) throw new Error('E-mail ou senha incorretos.')
        await redirectByRole(data.user.id)
        return
      }

      const fullName = String(formData.get('fullName') ?? '').trim()
      const childName = String(formData.get('childName') ?? '').trim()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, child_name: childName },
          emailRedirectTo: `${window.location.origin}/painel`,
        },
      })

      if (signUpError) throw signUpError
      if (!data.user) throw new Error('Não foi possível criar a conta.')
      if (data.user.identities?.length === 0) {
        throw new Error('Este e-mail já possui uma conta. Entre com sua senha.')
      }

      if (data.session) {
        await redirectByRole(data.user.id)
      } else {
        form.reset()
        setEmailValue('')
        setNotice(email === 'freelas.jequie@gmail.com'
          ? 'Acesso administrativo criado! Confirme o endereço pelo e-mail recebido e depois entre.'
          : 'Conta criada! Abra o e-mail de confirmação e depois entre para editar seu convite.')
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível concluir o acesso.')
    } finally {
      setSubmitting(false)
    }
  }

  const changeMode = (nextMode: AccessMode) => {
    setMode(nextMode)
    setError('')
    setNotice('')
    const url = nextMode === 'register'
      ? '/acesso?modo=cadastro'
      : nextMode === 'forgot'
        ? '/acesso?modo=recuperar'
        : '/acesso'
    window.history.replaceState(null, '', url)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#073f53] px-5 py-12">
      <img src={platformHeroImage} alt="" className="absolute inset-0 size-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(4,42,59,.96),rgba(4,42,59,.7))]" />
      <div className="bubble bubble-one" /><div className="bubble bubble-two" /><div className="bubble bubble-three" />

      <div className="relative z-10 w-full max-w-md">
        <a href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white">
          <ArrowLeft size={16} /> Voltar ao início
        </a>
        <section className="rounded-[2rem] border border-white/20 bg-[#fffdf7] p-7 shadow-2xl sm:p-9">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[#dff1ed] text-[#0a7088]">
            {mode === 'register' ? <Sparkles size={23} /> : mode === 'forgot' ? <KeyRound size={22} /> : <LockKeyhole size={22} />}
          </div>
          <p className="eyebrow text-[#178ba4]">{mode === 'register' ? 'Primeiro acesso' : mode === 'forgot' ? 'Recuperação de acesso' : 'Área do responsável'}</p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-[#073f53]">
            {isAdminRegistration ? 'Crie seu acesso administrativo' : mode === 'register' ? 'Crie seu convite' : mode === 'forgot' ? 'Redefina sua senha' : 'Entre no seu painel'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#617f87]">
            {isAdminRegistration
              ? 'Este e-mail será reconhecido como administrador da plataforma.'
              : mode === 'register'
              ? 'Faça um cadastro rápido. Seu convite será criado automaticamente para você personalizar.'
              : mode === 'forgot'
              ? 'Informe seu e-mail e enviaremos um link seguro para você criar uma nova senha.'
              : 'Use seu e-mail e senha para editar o convite e acompanhar as confirmações.'}
          </p>

          {mode !== 'forgot' && <div className="mt-6 grid grid-cols-2 rounded-2xl bg-[#e8f3ef] p-1.5">
              <button type="button" onClick={() => changeMode('login')} className={`admin-tab ${mode === 'login' ? 'admin-tab-active' : ''}`}>Entrar</button>
              <button type="button" onClick={() => changeMode('register')} className={`admin-tab ${mode === 'register' ? 'admin-tab-active' : ''}`}>Criar conta</button>
            </div>}

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {mode === 'register' && (
              <>
                <label className="field-label">Nome do responsável
                  <input name="fullName" required minLength={2} maxLength={120} autoComplete="name" placeholder="Ex.: Maria Santos" className="field-input" />
                </label>
                {!isAdminRegistration && <label className="field-label">Nome do aniversariante
                  <input name="childName" required minLength={2} maxLength={80} placeholder="Ex.: Theo" className="field-input" />
                </label>}
              </>
            )}
            <label className="field-label">E-mail
              <input name="email" type="email" required autoComplete="email" placeholder="seu@email.com" value={emailValue} onChange={(event) => setEmailValue(event.target.value)} className="field-input" />
            </label>
            {mode !== 'forgot' && <label className="field-label">Senha
              <span className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'register' ? 'Mínimo de 6 caracteres' : 'Digite sua senha'}
                  className="field-input pr-12"
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#79949c] hover:bg-[#e8f3ef]" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>}

            {mode === 'login' && <button type="button" onClick={() => changeMode('forgot')} className="-mt-1 self-end text-xs font-bold text-[#178ba4] underline underline-offset-4 hover:text-[#073f53]">Esqueci minha senha</button>}

            {error && <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-medium text-[#9b4037]">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-[#e1f3ea] px-4 py-3 text-sm font-medium leading-relaxed text-[#267454]">{notice}</p>}

            <button disabled={submitting} className="primary-button mt-1 w-full disabled:cursor-wait disabled:opacity-70" type="submit">
              {submitting
                ? <><LoaderCircle className="animate-spin" size={17} /> Aguarde...</>
                : mode === 'forgot'
                  ? <><KeyRound size={17} /> Enviar link de recuperação</>
                : isAdminRegistration
                  ? <><LockKeyhole size={17} /> Criar acesso administrativo</>
                  : mode === 'register'
                  ? <><Sparkles size={17} /> Criar conta e convite</>
                  : <><LockKeyhole size={17} /> Entrar no painel</>}
            </button>
          </form>

          {mode === 'forgot' && <button type="button" onClick={() => changeMode('login')} className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-semibold text-[#547884] hover:text-[#073f53]"><ArrowLeft size={15} /> Voltar para o login</button>}

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#8aa1a6]"><Shell size={14} /> Acesso protegido pelo Supabase</div>
        </section>
      </div>
    </main>
  )
}
