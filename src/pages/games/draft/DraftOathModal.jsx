/**
 * pages/games/draft/DraftOathModal.jsx
 *
 * Confirmation bottom-sheet shown after a player picks BOTH a character
 * (DraftBoard) and a target role (RoleGrid) for them, before the pick is
 * actually committed via draftEngine.assignRole. Pure presentation — it
 * doesn't touch game state itself, it just asks Draft.jsx to confirm or
 * cancel via the callbacks it's given.
 */
export default function DraftOathModal({ role, character, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div onClick={onCancel} className="absolute inset-0 bg-black/80" />

      <div
        className="relative w-full max-w-md border-t border-got-gold/30 bg-got-charcoal p-6 sm:rounded-lg sm:border"
        style={{ background: 'linear-gradient(#15110c, #0e0c0a)' }}
      >
        <div className="text-center">
          <p
            className="text-got-parchment/50 text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Swear them in as
          </p>
          <p
            className="text-got-gold text-lg tracking-wide uppercase mt-2"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {role.label}
          </p>

          <div className="gold-divider my-4 max-w-[120px] mx-auto" />

          <p className="text-got-parchment text-2xl font-semibold" style={{ fontFamily: 'Cinzel, serif' }}>
            {character.name}
          </p>
          <p className="text-stone-500 text-sm mt-1">{character.house ?? 'Unaffiliated'}</p>

          <p
            className="text-stone-400 text-sm leading-relaxed mt-4"
            style={{ fontFamily: 'EB Garamond, serif' }}
          >
            Once sworn, this seat is closed and the rest of today's offer moves on. Their fit for
            this role is revealed only after the oath.
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <button
            onClick={onConfirm}
            className="w-full py-3.5 rounded border border-got-gold bg-got-gold text-got-black text-sm font-bold tracking-widest uppercase transition-all duration-200 hover:bg-got-gold-light active:scale-[0.98]"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Take the Oath
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3.5 rounded border border-stone-700 text-stone-400 text-sm tracking-widest uppercase transition-colors hover:border-got-gold/40 hover:text-got-gold"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Reconsider
          </button>
        </div>
      </div>
    </div>
  )
}
