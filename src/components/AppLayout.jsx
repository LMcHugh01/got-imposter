import Header from './Header'
import Footer from './Footer'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-got">
      <Header />
      <main className="flex-1 pt-16 flex flex-col">{children}</main>
      <Footer />
    </div>
  )
}