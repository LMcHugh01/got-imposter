import PageWrapper from '../components/PageWrapper'
import ComingSoon from '../components/ComingSoon'

export default function Trivia() {
  return (
    <PageWrapper className="justify-center">
      <ComingSoon
        icon="❓"
        title="Trivia"
        description="Test your knowledge of Westeros. The maesters are still writing the questions."
      />
    </PageWrapper>
  )
}
