import { CINZEL, GARAMOND, INK } from './HouseParts'

/**
 * components/houses/FamilyTree.jsx
 *
 * A house's family tree, as it stood in `year`. Scaffolding for now: the
 * section's frame and legend are in place, and until a family's members are
 * recorded it shows the maesters' note.
 *
 * Later, `members` will be the house's people (from the characters table,
 * each with a father, mother and spouse), and the tree will be drawn here:
 * the head of house marked, the dead with a †, and a member's line of
 * descent traced when picked.
 */
export default function FamilyTree({ house, year, members = [] }) {
  const recorded = members.length > 0

  return (
    <section aria-labelledby="family-tree-title">
      <div className="flex items-center gap-4 mb-3">
        <h2 id="family-tree-title" className="uppercase whitespace-nowrap font-normal" style={{ ...CINZEL, fontSize: 11, letterSpacing: '.34em', color: INK.gold }}>
          Family Tree
        </h2>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(216,184,120,.3), rgba(216,184,120,.04))' }} />
        <span className="uppercase whitespace-nowrap" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.2em', color: INK.muted }}>
          As of {year} AC
        </span>
      </div>

      {recorded && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3">
          <span className="flex items-center gap-2 uppercase" style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.2em', color: INK.muted }}>
            <span className="w-3.5 h-2.5 border" style={{ borderColor: INK.gold, background: `${house.tinctFrom ?? '#3a342a'}aa` }} />
            Head of house
          </span>
          <span className="uppercase" style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.2em', color: INK.muted }}>
            † Deceased
          </span>
          <span className="italic text-[16px]" style={{ ...GARAMOND, color: INK.muted }}>
            Select a member to trace their line
          </span>
        </div>
      )}

      <div
        className="rounded-[3px] border border-[rgba(216,184,120,.14)] px-6 py-14 text-center"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.015), rgba(0,0,0,.12))' }}
      >
        {recorded ? null /* the tree, once members are recorded */ : (
          <p className="italic text-[18px]" style={{ ...GARAMOND, color: INK.muted }}>
            The maesters have not yet recorded this family&rsquo;s line.
          </p>
        )}
      </div>
    </section>
  )
}