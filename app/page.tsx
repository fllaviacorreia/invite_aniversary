'use client'

import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Fish,
  Gift,
  Heart,
  ImageIcon,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircleMore,
  Music2,
  Pause,
  PencilLine,
  RotateCcw,
  Send,
  ShieldCheck,
  Shell,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Waves,
  X,
} from 'lucide-react'

const heroImage = '/hero-ocean.png'

type InvitationConfig = {
  childName: string
  age: string
  headline: string
  introduction: string
  date: string
  time: string
  venue: string
  address: string
  attire: string
  attireNote: string
  maxGuests: number
  soundtrackUrl: string
  backgroundImage: string
  giftNames: string[]
  familySignature: string
}

type Rsvp = {
  id: string
  name: string
  attendance: 'yes' | 'no'
  guests: number
  message: string
  createdAt: string
}

const defaultConfig: InvitationConfig = {
  childName: 'Theo',
  age: '5',
  headline: 'mergulha em uma nova idade!',
  introduction: 'Prepare o traje de banho e venha celebrar com a gente no fundo do mar.',
  date: 'Domingo, 18 de agosto',
  time: 'Das 15h às 19h',
  venue: 'Espaço Coral Azul',
  address: 'Rua das Conchas, 120 · Jardim Oceano',
  attire: 'Livre para mergulhar',
  attireNote: 'Venha com sua fantasia favorita',
  maxGuests: 4,
  soundtrackUrl: '',
  backgroundImage: heroImage,
  giftNames: ['Livro infantil sobre o oceano', 'Kit de pintura', 'Jogo de montar'],
  familySignature: 'Com carinho, mamãe, papai e Theo',
}

const giftDetails = [
  'Para viajar pelo fundo do mar',
  'Tintas, pincéis e muita imaginação',
  'Uma aventura para montar em família',
]

function usePersistedInvitation() {
  const [config, setConfig] = useState(defaultConfig)
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('theo-invitation-config')
      const savedRsvps = localStorage.getItem('theo-invitation-rsvps')
      if (savedConfig) setConfig({ ...defaultConfig, ...JSON.parse(savedConfig) })
      if (savedRsvps) setRsvps(JSON.parse(savedRsvps))
    } catch {
      // If the stored preview is malformed, the invitation still opens with safe defaults.
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem('theo-invitation-config', JSON.stringify(config))
    } catch {
      // Keep the current preview even if this browser has no storage space left.
    }
  }, [config, ready])

  useEffect(() => {
    if (ready) localStorage.setItem('theo-invitation-rsvps', JSON.stringify(rsvps))
  }, [rsvps, ready])

  return { config, setConfig, rsvps, setRsvps }
}

function useSoundtrack(source: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const melodyTimerRef = useRef<number | null>(null)
  const noteIndexRef = useRef(0)

  const createBuiltInSoundtrack = () => {
    const context = new AudioContext()
    const master = context.createGain()
    const filter = context.createBiquadFilter()
    master.gain.value = 0.2
    filter.type = 'lowpass'
    filter.frequency.value = 1000
    filter.Q.value = 0.7
    filter.connect(master)
    master.connect(context.destination)

    ;[130.81, 196, 261.63].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.value = index === 0 ? 0.035 : 0.018
      oscillator.connect(gain)
      gain.connect(filter)
      oscillator.start()
    })

    const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 880]
    const playNote = () => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.value = notes[noteIndexRef.current % notes.length]
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.045, now + 0.18)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45)
      oscillator.connect(gain)
      gain.connect(filter)
      oscillator.start(now)
      oscillator.stop(now + 1.5)
      noteIndexRef.current += 1
    }

    playNote()
    melodyTimerRef.current = window.setInterval(playNote, 1800)
    contextRef.current = context
  }

  const play = () => {
    if (source.trim()) {
      if (!audioRef.current || audioRef.current.src !== source) {
        audioRef.current?.pause()
        audioRef.current = new Audio(source)
        audioRef.current.loop = true
        audioRef.current.volume = 0.45
      }
      void audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
      return
    }

    if (contextRef.current) {
      void contextRef.current.resume()
    } else {
      createBuiltInSoundtrack()
    }
    setIsPlaying(true)
  }

  const pause = () => {
    audioRef.current?.pause()
    if (contextRef.current?.state === 'running') void contextRef.current.suspend()
    setIsPlaying(false)
  }

  const toggle = () => (isPlaying ? pause() : play())

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (melodyTimerRef.current) window.clearInterval(melodyTimerRef.current)
      if (contextRef.current && contextRef.current.state !== 'closed') void contextRef.current.close()
    }
  }, [])

  return { isPlaying, play, toggle }
}

export default function Page() {
  const { config, setConfig, rsvps, setRsvps } = usePersistedInvitation()
  const { isPlaying, play, toggle } = useSoundtrack(config.soundtrackUrl)
  const [entered, setEntered] = useState(false)
  const [rsvpOpen, setRsvpOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminLoginOpen, setAdminLoginOpen] = useState(false)
  const [adminChecking, setAdminChecking] = useState(false)
  const [reserved, setReserved] = useState<string[]>([])

  const enterInvitation = () => {
    play()
    setEntered(true)
  }

  const addRsvp = (rsvp: Omit<Rsvp, 'id' | 'createdAt'>) => {
    setRsvps((current) => [
      { ...rsvp, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
      ...current,
    ])
  }

  const requestAdminAccess = async () => {
    setAdminChecking(true)
    try {
      const response = await fetch('/api/admin/session', { cache: 'no-store' })
      if (response.ok) setAdminOpen(true)
      else setAdminLoginOpen(true)
    } catch {
      setAdminLoginOpen(true)
    } finally {
      setAdminChecking(false)
    }
  }

  const logoutAdmin = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAdminOpen(false)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#edf7f3] text-[#123f4d]">
      {!entered && <AccessCover config={config} onEnter={enterInvitation} />}

      <nav className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-5 py-5 sm:px-10">
        <a href="#inicio" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white drop-shadow">
          <Shell size={20} /> fundo do mar
        </a>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="glass-button" aria-label={isPlaying ? 'Pausar música' : 'Tocar música'}>
            {isPlaying ? <Pause size={15} /> : <Music2 size={15} />}
            <span className="hidden sm:inline">{isPlaying ? 'Pausar trilha' : 'Tocar trilha'}</span>
          </button>
        </div>
      </nav>

      <section id="inicio" className="hero-section">
        <img src={config.backgroundImage || heroImage} alt={`${config.childName} em um cenário de fundo do mar`} className="absolute inset-0 size-full object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,45,65,.42)_0%,rgba(5,45,65,.04)_42%,rgba(5,45,65,.88)_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#edf7f3] to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 sm:pb-24">
          <div className="max-w-2xl text-white drop-shadow-md">
            <p className="eyebrow text-[#ffd36a]">Uma aventura está chegando · {config.age} anos</p>
            <h1 className="mt-3 font-display text-6xl leading-[.92] tracking-tight sm:text-8xl">
              O {config.childName}<br /><i>{config.headline.split(' ')[0]}</i><br />{config.headline.split(' ').slice(1).join(' ')}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/90">{config.introduction}</p>
            <button onClick={() => setRsvpOpen(true)} className="primary-button mt-8">
              Confirmar presença <ChevronDown size={17} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-7 right-6 hidden items-center gap-2 text-xs font-medium text-white/75 sm:flex sm:right-10">
          <Waves size={17} /> role para explorar
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-[#178ba4]">Anote na concha</p>
          <h2 className="section-title mt-3">Um dia especial merece uma festa <i>inesquecível</i></h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <InfoCard icon={<CalendarDays />} title="Quando" text={config.date} sub={config.time} />
          <InfoCard icon={<MapPin />} title="Onde" text={config.venue} sub={config.address} />
          <InfoCard icon={<Fish />} title="Traje" text={config.attire} sub={config.attireNote} />
        </div>
      </section>

      <section className="bg-[#073f53] px-6 py-16 text-[#fffdf7] sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow text-[#ffd36a]">Um mimo para o aniversariante</p>
            <h2 className="section-title mt-3 text-[#fffdf7]">Se quiser presentear, escolha uma <i>onda</i></h2>
            <p className="mt-5 max-w-md leading-relaxed text-[#b7d9df]">
              Sua presença é o maior presente. Mas, se quiser deixar um carinho para {config.childName}, aqui vão algumas ideias.
            </p>
            <button onClick={() => setRsvpOpen(true)} className="secondary-button mt-7">Vou à festa <Send size={16} /></button>
          </div>
          <div className="grid gap-3">
            {config.giftNames.filter(Boolean).map((gift, index) => (
              <div key={`${gift}-${index}`} className="gift-row">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#1386a5] text-[#ffd36a]"><Gift size={22} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{gift}</h3>
                  <p className="mt-1 text-sm text-[#9fc6d1]">{giftDetails[index] ?? 'Um carinho escolhido com amor'}</p>
                </div>
                <button
                  onClick={() => setReserved((items) => [...items, gift])}
                  disabled={reserved.includes(gift)}
                  className="gift-button"
                >
                  {reserved.includes(gift) ? <><Check size={14} /> Escolhido</> : 'Escolher'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#edf7f3] px-6 py-14 text-center">
        <Shell className="mx-auto mb-4 text-[#1386a5]" size={28} />
        <p className="font-display text-2xl text-[#073f53]">Esperamos você, <i>mergulhador!</i></p>
        <p className="mt-3 text-sm text-[#547884]">{config.familySignature}</p>
        <button disabled={adminChecking} onClick={requestAdminAccess} className="mt-9 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#547884] underline underline-offset-4 disabled:cursor-wait disabled:opacity-60">
          {adminChecking ? <LoaderCircle className="animate-spin" size={14} /> : <LockKeyhole size={14} />} Acesso administrativo
        </button>
      </footer>

      {rsvpOpen && <RSVPModal config={config} onClose={() => setRsvpOpen(false)} onSubmit={addRsvp} />}
      {adminLoginOpen && (
        <AdminLoginModal
          onClose={() => setAdminLoginOpen(false)}
          onAuthenticated={() => {
            setAdminLoginOpen(false)
            setAdminOpen(true)
          }}
        />
      )}
      {adminOpen && (
        <AdminPanel
          config={config}
          rsvps={rsvps}
          onSave={setConfig}
          onDeleteRsvp={(id) => setRsvps((items) => items.filter((item) => item.id !== id))}
          onLogout={logoutAdmin}
          onClose={() => setAdminOpen(false)}
        />
      )}
    </main>
  )
}

function AccessCover({ config, onEnter }: { config: InvitationConfig; onEnter: () => void }) {
  return (
    <section className="access-cover" aria-label="Abertura do convite">
      <img src={config.backgroundImage || heroImage} alt="" className="absolute inset-0 size-full object-cover object-center" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,42,59,.32),rgba(4,42,59,.86))]" />
      <div className="bubble bubble-one" /><div className="bubble bubble-two" /><div className="bubble bubble-three" />
      <div className="relative z-10 mx-auto w-full max-w-md px-6 text-center text-white">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm"><Shell size={27} /></div>
        <p className="eyebrow text-[#ffd36a]">Você recebeu um convite</p>
        <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">{config.childName} faz <i>{config.age}</i></h1>
        <div className="mx-auto my-6 h-px w-16 bg-white/35" />
        <p className="text-sm font-medium text-white/85">{config.date} · {config.time.replace('Das ', '')}</p>
        <button onClick={onEnter} className="primary-button mt-8 w-full py-4 text-base">
          <Music2 size={18} /> Abrir convite com som
        </button>
        <p className="mt-4 text-xs text-white/60">A trilha começa ao abrir o convite</p>
      </div>
    </section>
  )
}

function RSVPModal({ config, onClose, onSubmit }: { config: InvitationConfig; onClose: () => void; onSubmit: (rsvp: Omit<Rsvp, 'id' | 'createdAt'>) => void }) {
  const [sent, setSent] = useState(false)
  const [attendance, setAttendance] = useState<'yes' | 'no'>('yes')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({
      name: String(data.get('name') ?? ''),
      attendance,
      guests: attendance === 'yes' ? Number(data.get('guests')) : 0,
      message: String(data.get('message') ?? ''),
    })
    setSent(true)
  }

  return (
    <ModalShell onClose={onClose} side={false}>
      <div className="mb-7 flex items-start justify-between gap-4">
        <div><p className="eyebrow text-[#178ba4]">Confirmação de presença</p><h2 className="mt-2 font-display text-3xl text-[#073f53]">Você vem nadar com a gente?</h2></div>
        <CloseButton onClick={onClose} />
      </div>
      {sent ? (
        <div className="rounded-3xl bg-[#e1f3ea] p-7 text-center text-[#15573d]">
          <Sparkles className="mx-auto mb-3" />
          <h3 className="font-display text-2xl">Resposta enviada!</h3>
          <p className="mt-2 text-sm">{attendance === 'yes' ? 'Mal podemos esperar para viver essa aventura com você.' : 'Sentiremos sua falta, mas agradecemos por avisar.'}</p>
          <button onClick={onClose} className="mt-6 text-sm font-bold underline underline-offset-4">Fechar</button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <label className="field-label">Seu nome<input required name="name" placeholder="Como podemos te chamar?" className="field-input" /></label>
          <div>
            <span className="field-label mb-2">Você poderá ir?</span>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton active={attendance === 'yes'} onClick={() => setAttendance('yes')}><Heart size={17} /> Sim, eu vou!</ChoiceButton>
              <ChoiceButton active={attendance === 'no'} onClick={() => setAttendance('no')}>Não poderei ir</ChoiceButton>
            </div>
          </div>
          {attendance === 'yes' && (
            <label className="field-label">Total de pessoas
              <select name="guests" className="field-input" defaultValue="1">
                {Array.from({ length: config.maxGuests }, (_, index) => index + 1).map((amount) => <option key={amount} value={amount}>{amount} {amount === 1 ? 'pessoa' : 'pessoas'}</option>)}
              </select>
              <span className="field-hint">Inclua você e os acompanhantes.</span>
            </label>
          )}
          <label className="field-label">Recadinho <span className="font-normal text-[#79949c]">(opcional)</span><textarea name="message" placeholder={`Deixe uma mensagem para ${config.childName}`} className="field-input min-h-24 resize-none" /></label>
          <button className="primary-button mt-1 w-full" type="submit"><Send size={17} /> Enviar resposta</button>
        </form>
      )}
    </ModalShell>
  )
}

function AdminLoginModal({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: () => void }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: String(formData.get('password') ?? '') }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) {
        setError(result.error ?? 'Não foi possível entrar.')
        return
      }
      onAuthenticated()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} side={false}>
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#dff1ed] text-[#0a7088]"><LockKeyhole size={22} /></div>
          <p className="eyebrow text-[#178ba4]">Acesso restrito</p>
          <h2 className="mt-2 font-display text-3xl text-[#073f53]">Área administrativa</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#617f87]">Entre com a senha do responsável para editar o convite e consultar as confirmações.</p>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="field-label">Senha administrativa
          <input name="password" type="password" autoComplete="current-password" required autoFocus placeholder="Digite sua senha" className="field-input" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-medium text-[#9b4037]">{error}</p>}
        <button disabled={submitting} className="primary-button mt-1 w-full disabled:cursor-wait disabled:opacity-70" type="submit">
          {submitting ? <><LoaderCircle className="animate-spin" size={17} /> Verificando...</> : <><ShieldCheck size={17} /> Entrar com segurança</>}
        </button>
      </form>
      <p className="mt-5 text-center text-xs leading-relaxed text-[#8aa1a6]">A sessão expira automaticamente após 8 horas.</p>
    </ModalShell>
  )
}

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

async function optimizeBackgroundImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem válido.')
  if (file.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 10 MB.')

  const bitmap = await createImageBitmap(file)
  const maxDimension = 1800
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Este navegador não conseguiu processar a imagem.')
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const optimized = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
  if (!optimized) throw new Error('Não foi possível otimizar a imagem.')
  return fileToDataUrl(optimized)
}

function AdminPanel({ config, rsvps, onSave, onDeleteRsvp, onLogout, onClose }: { config: InvitationConfig; rsvps: Rsvp[]; onSave: (value: InvitationConfig) => void; onDeleteRsvp: (id: string) => void; onLogout: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState(config)
  const [tab, setTab] = useState<'content' | 'guests'>('content')
  const [saved, setSaved] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const attending = rsvps.filter((rsvp) => rsvp.attendance === 'yes')
  const totalGuests = attending.reduce((total, rsvp) => total + rsvp.guests, 0)

  const update = <K extends keyof InvitationConfig>(key: K, value: InvitationConfig[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    onSave(draft)
    setSaved(true)
  }

  const uploadBackground = async (file: File | undefined) => {
    if (!file) return
    setImageLoading(true)
    setImageError('')
    try {
      update('backgroundImage', await optimizeBackgroundImage(file))
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Não foi possível usar esta imagem.')
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <ModalShell onClose={onClose} side>
      <div className="flex items-start justify-between gap-4">
        <div><p className="eyebrow text-[#178ba4]">Área administrativa</p><h2 className="mt-2 font-display text-3xl text-[#073f53]">Gerenciar convite</h2></div>
        <div className="flex items-center gap-1">
          <button onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-[#6d898f] transition hover:bg-[#fff0ed] hover:text-[#9b4037]" aria-label="Encerrar sessão administrativa"><LogOut size={15} /> Sair</button>
          <CloseButton onClick={onClose} />
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 rounded-2xl bg-[#e8f3ef] p-1.5">
        <button onClick={() => setTab('content')} className={`admin-tab ${tab === 'content' ? 'admin-tab-active' : ''}`}><PencilLine size={16} /> Conteúdo</button>
        <button onClick={() => setTab('guests')} className={`admin-tab ${tab === 'guests' ? 'admin-tab-active' : ''}`}><Users size={16} /> Convidados <span className="tab-count">{rsvps.length}</span></button>
      </div>

      {tab === 'content' ? (
        <form onSubmit={save} className="mt-8 flex flex-col gap-7">
          <AdminSection title="Aniversariante">
            <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
              <AdminField label="Nome"><input value={draft.childName} onChange={(event) => update('childName', event.target.value)} className="field-input" /></AdminField>
              <AdminField label="Idade"><input value={draft.age} onChange={(event) => update('age', event.target.value)} className="field-input" /></AdminField>
            </div>
            <AdminField label="Chamada principal"><input value={draft.headline} onChange={(event) => update('headline', event.target.value)} className="field-input" /></AdminField>
            <AdminField label="Texto de abertura"><textarea value={draft.introduction} onChange={(event) => update('introduction', event.target.value)} className="field-input min-h-24 resize-none" /></AdminField>
          </AdminSection>

          <AdminSection title="Imagem de fundo">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#d8eeea]">
              <img src={draft.backgroundImage || heroImage} alt="Prévia da imagem de fundo" className="size-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-[#052f40]/75 to-transparent px-4 pb-3 pt-8 text-xs font-bold text-white"><ImageIcon size={15} /> Prévia da capa</div>
            </div>
            <AdminField label="Usar uma imagem da internet">
              <input
                type="url"
                value={draft.backgroundImage.startsWith('data:') ? '' : draft.backgroundImage}
                onChange={(event) => {
                  setImageError('')
                  update('backgroundImage', event.target.value)
                }}
                placeholder="https://site.com/imagem.jpg"
                className="field-input"
              />
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <label className="image-action-button">
                {imageLoading ? <LoaderCircle className="animate-spin" size={17} /> : <Upload size={17} />}
                {imageLoading ? 'Processando...' : 'Enviar imagem'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={imageLoading}
                  className="sr-only"
                  onChange={(event) => {
                    void uploadBackground(event.target.files?.[0])
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setImageError('')
                  update('backgroundImage', heroImage)
                }}
                className="image-action-button"
              ><RotateCcw size={17} /> Restaurar original</button>
            </div>
            {imageError && <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-medium text-[#9b4037]">{imageError}</p>}
            <p className="field-hint">Formatos JPG, PNG ou WebP, com até 10 MB. O arquivo é otimizado automaticamente.</p>
          </AdminSection>

          <AdminSection title="Data e local">
            <AdminField label="Data"><input value={draft.date} onChange={(event) => update('date', event.target.value)} className="field-input" /></AdminField>
            <AdminField label="Horário"><input value={draft.time} onChange={(event) => update('time', event.target.value)} className="field-input" /></AdminField>
            <AdminField label="Nome do local"><input value={draft.venue} onChange={(event) => update('venue', event.target.value)} className="field-input" /></AdminField>
            <AdminField label="Endereço"><input value={draft.address} onChange={(event) => update('address', event.target.value)} className="field-input" /></AdminField>
          </AdminSection>

          <AdminSection title="Confirmação">
            <AdminField label="Máximo de pessoas por resposta">
              <select value={draft.maxGuests} onChange={(event) => update('maxGuests', Number(event.target.value))} className="field-input">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((amount) => <option key={amount} value={amount}>{amount} {amount === 1 ? 'pessoa' : 'pessoas'}</option>)}
              </select>
            </AdminField>
          </AdminSection>

          <AdminSection title="Trilha sonora">
            <AdminField label="Link direto do áudio (opcional)">
              <input type="url" value={draft.soundtrackUrl} onChange={(event) => update('soundtrackUrl', event.target.value)} placeholder="https://site.com/musica.mp3" className="field-input" />
            </AdminField>
            <p className="admin-note"><Music2 size={17} /> Sem um link, o convite usa a trilha instrumental suave que já vem incluída.</p>
          </AdminSection>

          <AdminSection title="Sugestões de presentes">
            {draft.giftNames.map((gift, index) => (
              <AdminField key={index} label={`Sugestão ${index + 1}`}>
                <input value={gift} onChange={(event) => update('giftNames', draft.giftNames.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="field-input" />
              </AdminField>
            ))}
          </AdminSection>

          <AdminSection title="Detalhes finais">
            <AdminField label="Traje"><input value={draft.attire} onChange={(event) => update('attire', event.target.value)} className="field-input" /></AdminField>
            <AdminField label="Observação sobre o traje"><input value={draft.attireNote} onChange={(event) => update('attireNote', event.target.value)} className="field-input" /></AdminField>
            <AdminField label="Assinatura"><input value={draft.familySignature} onChange={(event) => update('familySignature', event.target.value)} className="field-input" /></AdminField>
          </AdminSection>

          <div className="sticky bottom-0 -mx-7 border-t border-[#d8e8e3] bg-[#fffdf7]/95 px-7 py-4 backdrop-blur sm:-mx-10 sm:px-10">
            <button className="primary-button w-full" type="submit">{saved ? <><Check size={17} /> Alterações salvas</> : <><Sparkles size={17} /> Salvar e publicar</>}</button>
          </div>
        </form>
      ) : (
        <div className="mt-8">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Users />} value={String(totalGuests)} label="pessoas confirmadas" />
            <StatCard icon={<MessageCircleMore />} value={String(rsvps.length)} label="respostas recebidas" />
          </div>
          <div className="mt-7 flex flex-col gap-3">
            {rsvps.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#b8d5d1] px-6 py-12 text-center text-[#6d8d94]">
                <Users className="mx-auto mb-3 opacity-60" />
                <p className="font-semibold text-[#315f69]">Nenhuma resposta ainda</p>
                <p className="mt-1 text-sm">As confirmações aparecerão aqui.</p>
              </div>
            ) : rsvps.map((rsvp) => (
              <article key={rsvp.id} className="rounded-2xl border border-[#d8e8e3] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#073f53]">{rsvp.name}</h3><span className={`status-pill ${rsvp.attendance === 'yes' ? 'status-yes' : 'status-no'}`}>{rsvp.attendance === 'yes' ? `${rsvp.guests} ${rsvp.guests === 1 ? 'pessoa' : 'pessoas'}` : 'Não poderá ir'}</span></div>
                    {rsvp.message && <p className="mt-2 text-sm leading-relaxed text-[#547884]">“{rsvp.message}”</p>}
                    <p className="mt-2 text-xs text-[#93a9ad]">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(rsvp.createdAt))}</p>
                  </div>
                  <button onClick={() => onDeleteRsvp(rsvp.id)} className="rounded-full p-2 text-[#93a9ad] transition hover:bg-[#fff0ed] hover:text-[#ba4a3d]" aria-label={`Excluir resposta de ${rsvp.name}`}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </ModalShell>
  )
}

function ModalShell({ children, onClose, side }: { children: ReactNode; onClose: () => void; side: boolean }) {
  return (
    <div className={`fixed inset-0 z-[70] flex bg-[#052f40]/55 backdrop-blur-sm ${side ? 'justify-end' : 'items-end justify-center sm:items-center sm:p-6'}`} role="dialog" aria-modal="true">
      <div className={side ? 'h-full w-full max-w-xl overflow-y-auto bg-[#fffdf7] p-7 shadow-2xl sm:p-10' : 'max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#fffdf7] p-7 shadow-2xl sm:rounded-[2rem] sm:p-9'}>
        {children}
      </div>
    </div>
  )
}

function InfoCard({ icon, title, text, sub }: { icon: ReactNode; title: string; text: string; sub: string }) {
  return <article className="info-card"><div className="mb-6 flex size-11 items-center justify-center rounded-full bg-[#d8eeea] text-[#1386a5]">{icon}</div><p className="eyebrow text-[#178ba4]">{title}</p><h3 className="mt-2 font-display text-2xl text-[#073f53]">{text}</h3><p className="mt-2 text-sm leading-relaxed text-[#547884]">{sub}</p></article>
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${active ? 'border-[#1386a5] bg-[#e1f3f1] text-[#0a6f88] ring-2 ring-[#1386a5]/10' : 'border-[#cfe1dd] bg-white text-[#547884] hover:border-[#8ebbb8]'}`}>{children}</button>
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} aria-label="Fechar" className="shrink-0 rounded-full p-2 text-[#547884] transition hover:bg-[#e8f3ef]"><X /></button>
}

function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="flex flex-col gap-4"><legend className="mb-4 flex w-full items-center gap-3 text-sm font-bold text-[#073f53] after:h-px after:flex-1 after:bg-[#d8e8e3]">{title}</legend>{children}</fieldset>
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field-label">{label}{children}</label>
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return <div className="rounded-2xl bg-[#e8f3ef] p-4 text-[#073f53]"><div className="mb-3 text-[#1386a5]">{icon}</div><strong className="font-display text-3xl">{value}</strong><p className="mt-1 text-xs text-[#547884]">{label}</p></div>
}
