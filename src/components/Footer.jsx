export default function Footer() {
  return (
    <footer className="border-t border-stone-900 py-6">
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="flex-1 gold-divider" />
          <span className="text-got-gold/60 text-sm">⚔</span>
          <div className="flex-1 gold-divider" />
        </div>
        <p
          className="text-stone-700 text-xs tracking-widest uppercase text-center"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          A Song of Ice and Fire · Fan Project
        </p>
      </div>
    </footer>
  )
}
