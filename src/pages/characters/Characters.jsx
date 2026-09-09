import PageWrapper from '../../components/PageWrapper'
import ComingSoon from '../../components/ComingSoon'

export default function Characters() {
  return (
    <PageWrapper className="justify-center">
      <ComingSoon
        icon="📜"
        title="Characters"
        description="Explore the people of Westeros. This chronicle is still being written."
      />
    </PageWrapper>
  )
}
