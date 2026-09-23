import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import PageWrapper from '../../components/PageWrapper'
import {
  GameBackdrop,
  GamePrimaryButton,
  GameStats,
  Diamond,
  Hairline,
  CINZEL,
  GARAMOND,
  FOCUS,
} from '../../components/GameHome'
import { AuthField, HousePicker, FormError, FormNote } from '../../components/AuthForm'
import { useAuth } from '../../lib/auth'
import { fetchAccountRecord, fetchEarnedHonours } from '../../lib/recordSync'
import { HONOURS, honourProgress } from '../../data/honours'
import { HOUSE_BY_ID, MIN_PASSWORD, isEmail } from '../../data/accountHouses'

const ROMAN = ['—', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

function joined(date) {
  return date ? new Date(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : ''
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "12 Aug", or "12 Aug 2025" for earlier years. */
function earnedOn(date) {
  const d = new Date(date)
  const year = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}`
}

function SectionRule({ children }) {
  return (
    <div className="flex items-center gap-[18px] w-full mt-16">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.3))' }} />
      <h2 className="text-[11px] font-normal uppercase tracking-[0.34em] text-realm-brass whitespace-nowrap" style={CINZEL}>
        {children}
      </h2>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, transparent, rgba(216,184,120,.3))' }} />
    </div>
  )
}

/* ---------------- the record ---------------- */

function recordRows(r) {
  const n = (v) => (v > 0 ? v : '—')
  return [
    {
      name: 'Whispers',
      tagline: 'A Game of Deduction',
      to: '/games/whispers',
      stats: [
        { label: 'Streak', value: r.whispers.streak, gold: true },
        { label: 'Best', value: r.whispers.best },
        { label: 'Solved', value: r.whispers.solved },
      ],
    },
    {
      name: 'Allegiances',
      tagline: 'A Game of Diplomacy',
      to: '/games/allegiances',
      stats: [
        { label: 'Solved', value: r.allegiances.solved },
        { label: 'Played', value: r.allegiances.played },
        { label: 'Flawless', value: r.allegiances.flawless },
      ],
    },
    {
      name: 'Draft',
      tagline: 'A Game of Counsel',
      to: '/games/draft',
      stats: [
        { label: 'Drafts', value: r.draft.drafts },
        { label: 'Best Council', value: n(r.draft.best), gold: true },
      ],
    },
    {
      name: 'Campaign',
      tagline: 'A Game of Strategy',
      to: '/games/campaign',
      stats: [
        { label: 'Won', value: r.campaign.won, gold: true },
        { label: 'Battles Won', value: r.campaign.battlesWon },
        { label: 'Furthest', value: ROMAN[r.campaign.furthest] ?? r.campaign.furthest },
      ],
    },
  ]
}

function RecordRow({ row, index }) {
  return (
    <li className="border-b border-realm-gold/10">
      <Link
        to={row.to}
        className={`grid grid-cols-[32px_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-2 py-5 hover:bg-realm-gold/5 transition-colors ${FOCUS}`}
      >
        <span className="text-[14px] text-realm-gold" style={CINZEL} aria-hidden="true">
          {ROMAN[index + 1]}
        </span>
        <span className="min-w-0 text-left">
          <span className="block text-[20px] tracking-[0.1em] text-realm-cream" style={CINZEL}>
            {row.name}
          </span>
          <span className="block text-[16px] italic text-realm-muted" style={GARAMOND}>
            {row.tagline}
          </span>
        </span>
        <dl className="col-start-2 sm:col-start-3 flex gap-6 sm:gap-8">
          {row.stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse items-start sm:items-center gap-1.5">
              <dt className="text-[9px] uppercase tracking-[0.24em] text-realm-muted whitespace-nowrap" style={CINZEL}>
                {s.label}
              </dt>
              <dd className={`text-[24px] leading-none tabular-nums ${s.gold ? 'text-realm-gold' : 'text-realm-cream'}`} style={CINZEL}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </Link>
    </li>
  )
}

/* ---------------- honours ---------------- */

function HonourTile({ honour, record, earned }) {
  const held = earned.get(honour.id)
  const { current, target } = honourProgress(honour, record, new Set(earned.keys()))
  const pct = held ? 100 : Math.round((current / target) * 100)
  return (
    <li className="-ml-px -mt-px border border-realm-gold/15">
      <div className={`h-full flex flex-col items-center text-center px-4 pt-7 pb-5 ${held ? '' : 'opacity-80'}`}>
        <Diamond
          size={18}
          fill={held ? '#d8b878' : undefined}
          line={held ? '#d8b878' : 'rgba(216,184,120,.3)'}
          style={held ? { boxShadow: '0 0 22px rgba(216,184,120,.35)' } : undefined}
        />
        <h3
          className={`mt-5 text-[14px] font-normal uppercase tracking-[0.16em] ${held ? 'text-realm-cream' : 'text-[#8a8171]'}`}
          style={CINZEL}
        >
          {honour.title}
        </h3>
        <p className="mt-2 text-[16px] leading-snug italic text-realm-muted text-balance" style={GARAMOND}>
          {honour.desc}
        </p>
        <div className="flex-1 min-h-3" />
        <div
          className={`mt-3 text-[10px] uppercase tracking-[0.26em] ${held ? 'text-realm-brass' : 'text-realm-dim'}`}
          style={CINZEL}
        >
          {held ? `Earned ${earnedOn(held)}` : `${current} / ${target}`}
        </div>
        {!held && (
          <div className="w-full max-w-[140px] h-px mt-2.5 bg-realm-gold/15" aria-hidden="true">
            <div className="h-px bg-realm-gold" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </li>
  )
}

/* ---------------- settings ---------------- */

function SettingRow({ title, detail, open, onToggle, children, danger = false }) {
  return (
    <li className="border-b border-realm-gold/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-4 px-1 py-4 text-left cursor-pointer group ${FOCUS}`}
      >
        <span>
          <span
            className={`block text-[13px] uppercase tracking-[0.22em] ${danger ? 'text-realm-rose' : 'text-realm-cream'}`}
            style={CINZEL}
          >
            {title}
          </span>
          {detail && (
            <span className="block mt-1 text-[16px] italic text-realm-muted" style={GARAMOND}>
              {detail}
            </span>
          )}
        </span>
        <span className="text-realm-gold text-[18px] transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }} aria-hidden="true">
          ›
        </span>
      </button>
      {open && <div className="pb-8 pt-2 flex flex-col items-center animate-[riseIn_.25s_ease_both]">{children}</div>}
    </li>
  )
}

function ProfileForm({ profile, onSave }) {
  const [name, setName] = useState(profile.name)
  const [house, setHouse] = useState(profile.house)
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)
  const changed = name.trim() && (name.trim() !== profile.name || house !== profile.house)
  return (
    <form
      className="w-full max-w-[440px] flex flex-col items-center"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!changed) return
        const res = await onSave({ name, house })
        setError(res.error)
        setMsg(res.error ? null : 'Your seat has been updated.')
      }}
    >
      <div className="w-full mt-2">
        <AuthField label="Your Name" value={name} onChange={setName} maxLength={40} autoComplete="name" />
      </div>
      <HousePicker value={house} onChange={setHouse} label="Your House" />
      <FormError>{error}</FormError>
      {msg && <FormNote>{msg}</FormNote>}
      <GamePrimaryButton type="submit" disabled={!changed} className="mt-8">
        Save
      </GamePrimaryButton>
    </form>
  )
}

function EmailForm({ current, onSave }) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)
  const ok = isEmail(email) && email.trim() !== current
  return (
    <form
      className="w-full max-w-[440px] flex flex-col items-center"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!ok) return
        const res = await onSave(email.trim())
        setError(res.error)
        setMsg(res.error ? null : 'Check your inbox. The change happens once you confirm it from the link we sent.')
      }}
    >
      <div className="w-full mt-2">
        <AuthField label="New Email" type="email" value={email} onChange={setEmail} placeholder={current} autoComplete="email" />
      </div>
      <FormError>{error}</FormError>
      {msg && <FormNote>{msg}</FormNote>}
      <GamePrimaryButton type="submit" disabled={!ok} className="mt-8">
        Change Email
      </GamePrimaryButton>
    </form>
  )
}

function PasswordForm({ onSave }) {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)
  const ok = password.length >= MIN_PASSWORD
  return (
    <form
      className="w-full max-w-[440px] flex flex-col items-center"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!ok) return
        const res = await onSave(password)
        setError(res.error)
        if (!res.error) {
          setMsg('Your password has been changed.')
          setPassword('')
        }
      }}
    >
      <div className="w-full mt-2">
        <AuthField
          label="New Password"
          type="password"
          reveal
          value={password}
          onChange={setPassword}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          autoComplete="new-password"
        />
      </div>
      <FormError>{error}</FormError>
      {msg && <FormNote>{msg}</FormNote>}
      <GamePrimaryButton type="submit" disabled={!ok} className="mt-8">
        Change Password
      </GamePrimaryButton>
    </form>
  )
}

function DeleteForm({ name, onDelete }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const ok = typed.trim() === name
  return (
    <form
      className="w-full max-w-[440px] flex flex-col items-center"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!ok || busy) return
        setBusy(true)
        const res = await onDelete()
        setBusy(false)
        setError(res.error)
      }}
    >
      <p className="text-[17px] leading-normal italic text-realm-body text-balance" style={GARAMOND}>
        This removes your account, your record and your honours for good. It can’t be undone. Type your name to confirm.
      </p>
      <div className="w-full mt-6">
        <AuthField label="Your Name" value={typed} onChange={setTyped} placeholder={name} autoComplete="off" />
      </div>
      <FormError>{error}</FormError>
      <button
        type="submit"
        disabled={!ok || busy}
        className={`mt-8 px-8 py-4 border text-[13px] font-semibold uppercase tracking-[0.26em] transition-colors ${
          ok ? 'border-realm-ember text-realm-rose hover:bg-realm-ember/10 cursor-pointer' : 'border-realm-gold/15 text-realm-faint cursor-default'
        } ${FOCUS}`}
        style={CINZEL}
      >
        {busy ? 'Deleting…' : 'Delete My Account'}
      </button>
    </form>
  )
}

/* ---------------- page ---------------- */

export default function Account() {
  const auth = useAuth()
  const { ready, user, profile } = auth
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const welcome = params.has('welcome')

  const [record, setRecord] = useState(null)
  const [earned, setEarned] = useState(new Map())
  const [loadError, setLoadError] = useState(null)
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [r, h] = await Promise.all([fetchAccountRecord(user.id), fetchEarnedHonours(user.id)])
      setRecord(r)
      setEarned(new Map(h.map((x) => [x.honour_id, x.earned_at])))
      setLoadError(null)
    } catch (err) {
      setLoadError(err.message)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // A new honour (e.g. Sworn, just after first sign-in) — refresh the page's copy.
  useEffect(() => {
    const onHonour = () => load()
    window.addEventListener('westerosi:honour', onHonour)
    return () => window.removeEventListener('westerosi:honour', onHonour)
  }, [load])

  if (ready && !user) return <Navigate to="/login?next=/account" replace />

  const house = HOUSE_BY_ID[profile?.house]
  const toggle = (key) => setOpen((o) => (o === key ? null : key))

  return (
    <PageWrapper className="relative overflow-hidden justify-start text-realm-ink">
      <GameBackdrop center="220px" />
      <div className="relative z-10 w-full max-w-[860px] mx-auto flex flex-col items-center text-center pt-6 pb-16">
        {!profile || !record ? (
          <p className="pt-24 text-[20px] italic text-realm-note" style={GARAMOND}>
            {loadError ?? 'Unrolling your record…'}
          </p>
        ) : (
          <>
            {/* Crest */}
            <header className="flex flex-col items-center animate-[riseIn_.35s_ease_both]">
              <div className="relative w-[84px] h-[84px] flex items-center justify-center" aria-hidden="true">
                <div className="absolute w-[58px] h-[58px] rotate-45 border border-realm-gold/60" />
                <div className="absolute w-[46px] h-[46px] rotate-45 border border-realm-gold/25" />
                <span className="relative text-[20px] tracking-[0.08em] text-realm-gold" style={CINZEL}>
                  {initials(profile.name)}
                </span>
              </div>
              <div className="mt-6 text-[11px] uppercase tracking-[0.4em] indent-[0.4em] text-realm-muted" style={CINZEL}>
                House {house?.name} · Sworn {joined(profile.created_at)}
              </div>
              <h1
                className="mt-3 font-normal leading-[1.1] tracking-[0.12em] indent-[0.12em] text-realm-cream text-balance"
                style={{ ...CINZEL, fontSize: 'clamp(30px, 6vw, 48px)' }}
              >
                {profile.name}
              </h1>
              <div className="mt-2 text-[19px] italic text-realm-note" style={GARAMOND}>
                {house?.words}
              </div>
              {welcome && (
                <p className="mt-6 max-w-[36ch] text-[18px] italic text-realm-gold text-balance" style={GARAMOND}>
                  Welcome to the realm. Your first honour is already yours.
                </p>
              )}
            </header>

            <GameStats
              className="mt-12"
              items={[
                { label: 'Honours', value: earned.size },
                { label: 'Best Streak', value: record.whispers.best },
                { label: 'Best Council', value: record.draft.best || '—' },
                { label: 'Battles Won', value: record.campaign.battlesWon },
              ]}
            />

            <SectionRule>The Record</SectionRule>
            <ol className="w-full mt-4">
              {recordRows(record).map((row, i) => (
                <RecordRow key={row.name} row={row} index={i} />
              ))}
            </ol>

            <SectionRule>
              Honours · {earned.size} of {HONOURS.length}
            </SectionRule>
            <ul className="w-full grid grid-cols-2 lg:grid-cols-4 mt-8 pl-px pt-px">
              {HONOURS.map((h) => (
                <HonourTile key={h.id} honour={h} record={record} earned={earned} />
              ))}
            </ul>

            <SectionRule>Your Seat</SectionRule>
            <ul className="w-full max-w-[560px] mt-4 text-left">
              <SettingRow title="Name & House" detail={`${profile.name} · House ${house?.name}`} open={open === 'profile'} onToggle={() => toggle('profile')}>
                <ProfileForm profile={profile} onSave={auth.updateProfile} />
              </SettingRow>
              <SettingRow title="Email" detail={user.email} open={open === 'email'} onToggle={() => toggle('email')}>
                <EmailForm current={user.email} onSave={auth.changeEmail} />
              </SettingRow>
              <SettingRow title="Password" open={open === 'password'} onToggle={() => toggle('password')}>
                <PasswordForm onSave={auth.setNewPassword} />
              </SettingRow>
              <SettingRow title="Delete Account" danger open={open === 'delete'} onToggle={() => toggle('delete')}>
                <DeleteForm
                  name={profile.name}
                  onDelete={async () => {
                    const res = await auth.deleteAccount()
                    if (!res.error) navigate('/', { replace: true, state: { farewell: true } })
                    return res
                  }}
                />
              </SettingRow>
            </ul>

            <Hairline className="max-w-[560px] mt-14" />
            <button
              type="button"
              onClick={async () => {
                await auth.logOut()
                navigate('/', { replace: true })
              }}
              className={`mt-8 px-3 py-3 text-[11px] uppercase tracking-[0.3em] text-realm-rose hover:text-[#f1b3a6] transition-colors cursor-pointer ${FOCUS}`}
              style={CINZEL}
            >
              Sign Out
            </button>
            <Link to="/privacy" className={`mt-2 px-3 py-2 text-[10px] uppercase tracking-[0.26em] text-realm-dim hover:text-realm-cream ${FOCUS}`} style={CINZEL}>
              What we store
            </Link>
          </>
        )}
      </div>
    </PageWrapper>
  )
}
