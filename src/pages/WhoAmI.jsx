import PageWrapper from '../components/PageWrapper'
import ComingSoon from '../components/ComingSoon'

export default function WhoAmI() {
  return (
    <PageWrapper className="justify-center">
      <ComingSoon
        icon="🧠"
        title="Who Am I?"
        description="Identify the hidden character from a trail of clues. Coming to the realm soon."
      />
    </PageWrapper>
  )
}
