import PageWrapper from '../../components/PageWrapper'

export default function About() {
  return (
    <PageWrapper className="justify-center">
      <div className="w-full max-w-sm flex flex-col gap-6 text-center">
        <div>
          <h1
            className="text-3xl font-bold tracking-widest uppercase text-got-gold"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            About
          </h1>
          <div className="gold-divider mt-3" />
        </div>
        <p
          className="text-got-parchment/60 text-base italic leading-relaxed"
          style={{ fontFamily: 'EB Garamond, serif' }}
        >
          A fan-made Game of Thrones gaming hub. Play Imposter now, with Draft,
          Who Am I?, and Trivia on the way. Character and house data is drawn
          from the world of A Song of Ice and Fire.
        </p>
      </div>
    </PageWrapper>
  )
}
