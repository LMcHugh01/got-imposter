export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-[18px] text-center px-6 pt-16 pb-12">
      <div className="w-[7px] h-[7px] rotate-45 bg-[rgba(216,184,120,.5)]" aria-hidden="true" />
      <p
        className="text-[11px] uppercase tracking-[0.32em] text-[#8f8676]"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        A Song of Ice and Fire · Fan Project
      </p>
      <p
        className="text-[10px] uppercase tracking-[0.3em] text-[#6f6758]"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        © {new Date().getFullYear()} DKG Development
      </p>
    </footer>
  )
}