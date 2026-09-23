import PageWrapper from '../components/PageWrapper'
import PageHeading from '../components/PageHeading'
import { GARAMOND, CINZEL } from '../components/GameHome'

const SECTIONS = [
  {
    title: 'Without an account',
    body: 'You can play every game without signing up. Your scores and games in progress are kept in your own browser, on your device only. Nothing about you is sent to us.',
  },
  {
    title: 'With an account',
    body: 'We store your name, your email address, the house you chose, the date you joined, your record in each game (such as streaks and best scores) and the honours you have earned. Your password is handled by our sign-in provider and is never visible to us.',
  },
  {
    title: 'Why',
    body: 'Only to keep your record and honours, let you sign in on any device, and send the emails you ask for: confirming your account, resetting your password, and confirming a change of email. We send nothing else and share nothing with anyone.',
  },
  {
    title: 'Where',
    body: 'Accounts are stored with Supabase, which hosts our database and handles sign-in and email.',
  },
  {
    title: 'Your choices',
    body: 'You can change your name, house, email and password from your account page at any time. You can also delete your account there: it removes your account, record and honours permanently.',
  },
]

/** /privacy — what is stored, and why. */
export default function Privacy() {
  return (
    <PageWrapper className="justify-start text-realm-ink">
      <PageHeading className="pt-4" eyebrow="Westerosi Games" title="What We Store" subtitle="In plain words." />
      <div className="w-full max-w-[600px] mx-auto mt-12 flex flex-col gap-9 text-left pb-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-[12px] font-normal uppercase tracking-[0.3em] text-realm-gold" style={CINZEL}>
              {s.title}
            </h2>
            <p className="mt-3 text-[19px] leading-relaxed text-realm-body" style={GARAMOND}>
              {s.body}
            </p>
          </section>
        ))}
      </div>
    </PageWrapper>
  )
}
