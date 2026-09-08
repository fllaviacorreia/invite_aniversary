'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, LoaderCircle, Phone, Save, Shell, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

type Profile = {
  user_id: string
  full_name: string
  email: string
  phone: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [backPath, setBackPath] = useState('/painel')
  const [loading, setLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      const user = authData.user

      if (authError || !user) {
        router.replace('/acesso')
        return
      }

      const [profileResult, adminResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, phone').eq('user_id', user.id).maybeSingle(),
        supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
      ])

      if (!active) return

      if (profileResult.error || !profileResult.data) {
        setProfileError('Não foi possível carregar seu perfil. Confirme se a migração de perfil foi aplicada no Supabase.')
      } else {
        setProfile({
          ...(profileResult.data as Profile),
          email: user.email ?? profileResult.data.email ?? '',
          phone: profileResult.data.phone ?? '',
        })
      }

      if (adminResult.data) setBackPath('/admin')
      setLoading(false)
    }

    void load()
    return () => { active = false }
  }, [router])

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return

    const fullName = profile.full_name.trim()
    const phone = profile.phone.trim()
    setProfileError('')
    setProfileSuccess('')

    if (fullName.length < 2) {
      setProfileError('Informe um nome com pelo menos 2 caracteres.')
      return
    }

    setProfileSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('user_id', profile.user_id)
    setProfileSaving(false)

    if (error) {
      setProfileError('Não foi possível salvar os dados. Tente novamente.')
      return
    }

    setProfile((current) => current ? { ...current, full_name: fullName, phone } : current)
    setProfileSuccess('Dados atualizados com sucesso.')
  }

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword) {
      setPasswordError('Informe sua senha atual.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== passwordConfirmation) {
      setPasswordError('A confirmação da nova senha não confere.')
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError('Escolha uma senha diferente da atual.')
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    })
    setPasswordSaving(false)

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('password') || message.includes('credential')) {
        setPasswordError('A senha atual está incorreta ou a nova senha não atende aos requisitos.')
      } else {
        setPasswordError('Não foi possível alterar a senha. Tente novamente.')
      }
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setPasswordConfirmation('')
    setPasswordSuccess('Senha alterada com sucesso.')
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#073f53] text-white"><LoaderCircle className="animate-spin text-[#ffd36a]" size={32} /></main>
  }

  return (
    <main className="min-h-screen bg-[#edf7f3] text-[#123f4d]">
      <header className="bg-[#073f53] px-5 py-6 text-white sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#ffd36a]"><Shell size={22} /></div>
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/55">Minha conta</p><h1 className="mt-1 font-display text-2xl">Perfil</h1></div>
          </div>
          <a href={backPath} className="glass-button"><ArrowLeft size={16} /> <span className="hidden sm:inline">Voltar ao painel</span></a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="mb-8">
          <p className="eyebrow text-[#178ba4]">Dados da conta</p>
          <h2 className="mt-2 font-display text-4xl text-[#073f53]">Cuide do seu perfil</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#617f87]">Atualize seus dados pessoais ou escolha uma nova senha de acesso.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <section className="rounded-[2rem] border border-[#d9e8e4] bg-white p-6 shadow-[0_18px_60px_rgba(7,63,83,.08)] sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e7f5f2] text-[#1386a5]"><UserRound size={21} /></div>
              <div><h3 className="font-display text-2xl text-[#073f53]">Dados pessoais</h3><p className="text-sm text-[#789198]">Nome, telefone e e-mail da conta.</p></div>
            </div>

            {profile ? (
              <form onSubmit={saveProfile} className="space-y-5">
                <label className="block"><span className="mb-2 block text-sm font-bold text-[#315e68]">Nome</span><div className="relative"><UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8ba5aa]" size={18} /><input value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} className="field-input pl-11" autoComplete="name" maxLength={120} required /></div></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-[#315e68]">Telefone</span><div className="relative"><Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8ba5aa]" size={18} /><input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="field-input pl-11" autoComplete="tel" inputMode="tel" maxLength={30} placeholder="(00) 00000-0000" /></div></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-[#315e68]">E-mail</span><input type="email" value={profile.email} className="field-input cursor-not-allowed bg-[#f4f7f6] text-[#789198]" readOnly aria-describedby="email-note" /></label>
                <p id="email-note" className="-mt-3 text-xs leading-relaxed text-[#789198]">O e-mail de acesso não pode ser alterado nesta área.</p>
                {profileError && <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-semibold text-[#9b4037]">{profileError}</p>}
                {profileSuccess && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#e9f8ef] px-4 py-3 text-sm font-semibold text-[#2d7250]"><Check size={17} /> {profileSuccess}</p>}
                <button type="submit" className="primary-button w-full justify-center" disabled={profileSaving}>{profileSaving ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />} {profileSaving ? 'Salvando...' : 'Salvar dados'}</button>
              </form>
            ) : (
              <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-semibold text-[#9b4037]">{profileError || 'Perfil não encontrado.'}</p>
            )}
          </section>

          <section className="rounded-[2rem] border border-[#d9e8e4] bg-white p-6 shadow-[0_18px_60px_rgba(7,63,83,.08)] sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#fff5d8] text-[#b57516]"><KeyRound size={21} /></div>
              <div><h3 className="font-display text-2xl text-[#073f53]">Alterar senha</h3><p className="text-sm text-[#789198]">Use ao menos 6 caracteres.</p></div>
            </div>

            <form onSubmit={changePassword} className="space-y-5">
              <PasswordField label="Senha atual" value={currentPassword} onChange={setCurrentPassword} visible={showPasswords} autoComplete="current-password" />
              <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} visible={showPasswords} autoComplete="new-password" />
              <PasswordField label="Confirmar nova senha" value={passwordConfirmation} onChange={setPasswordConfirmation} visible={showPasswords} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPasswords((visible) => !visible)} className="inline-flex items-center gap-2 text-sm font-bold text-[#178ba4] transition hover:text-[#073f53]">{showPasswords ? <EyeOff size={17} /> : <Eye size={17} />} {showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}</button>
              {passwordError && <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-semibold text-[#9b4037]">{passwordError}</p>}
              {passwordSuccess && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#e9f8ef] px-4 py-3 text-sm font-semibold text-[#2d7250]"><Check size={17} /> {passwordSuccess}</p>}
              <button type="submit" className="primary-button w-full justify-center" disabled={passwordSaving}>{passwordSaving ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />} {passwordSaving ? 'Alterando...' : 'Alterar senha'}</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}

function PasswordField({ label, value, onChange, visible, autoComplete }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; autoComplete: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#315e68]">{label}</span>
      <input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="field-input" autoComplete={autoComplete} minLength={6} required />
    </label>
  )
}
