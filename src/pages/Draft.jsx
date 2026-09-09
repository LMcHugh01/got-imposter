import PageWrapper from '../components/PageWrapper'
import ComingSoon from '../components/ComingSoon'

export default function Draft() {
  return (
    <PageWrapper className="justify-center">
      <ComingSoon
        icon="⚔"
        title="Draft"
        description="Build your house and conquer Westeros. This game is still being forged."
      />
    </PageWrapper>
  )
}
