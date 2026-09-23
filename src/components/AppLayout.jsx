import Header from './Header'
import Footer from './Footer'
import HonourToast from './HonourToast'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-got-bg bg-got">
      <Header />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
      <HonourToast />
    </div>
  )
}