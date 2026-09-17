/**
 * data/leadershipStyles.js
 *
 * King, Hand, and Consort are the three roles where a single fixed
 * formula flattens genuinely different, equally valid approaches to
 * authority — a Cersei-style ruler (fear, control, leverage) scores
 * poorly against a formula tuned for a Ned-style ruler (duty, honour,
 * consistency), even though both are demonstrably effective at holding
 * and using power. Champion solved the same problem for fighting styles
 * (see data/championStyles.js) — this applies that pattern to
 * authority style instead.
 *
 * Each character has a fixed `leadership_style` (characters table,
 * mirroring the `fighting_style` column) — not a 0-100 stat, a category.
 * King/Hand/Consort's roleRating() looks up LEADERSHIP_STYLE_WEIGHTS[role][style]
 * instead of a single fixed table (see gameEngine/ratings.js). This
 * REPLACES the king/hand/consort entries that used to live in
 * ROLE_WEIGHTS (data/roleWeights.js) — they are no longer keys there,
 * same way champion isn't.
 *
 * Each role gets its own full weight table per style (not one shared
 * "style bonus" layered on top of a common base) — King, Hand, and
 * Consort have different core jobs, so the same style expresses
 * differently in each: Tyrant as a King leans Command +
 * Intimidation; Tyrant as a Hand leans Intimidation + Subterfuge
 * with far less Command. All four style tables per role still sum their
 * positive weights to 1.0 (or 1.0 + |penalty| where a style actively
 * undercuts an attribute), matching the ROLE_WEIGHTS convention.
 */

export const LEADERSHIP_STYLES = ['tyrant', 'beloved', 'honorable', 'pragmatist']

export const LEADERSHIP_STYLE_LABELS = {
  tyrant: 'Tyrant',
  beloved: 'Beloved',
  honorable: 'Honorable',
  pragmatist: 'Pragmatist',
}

// camelCase JS key -> DB text value stored in characters.leadership_style.
export const LEADERSHIP_STYLE_DB_VALUES = {
  tyrant: 'tyrant',
  beloved: 'beloved',
  honorable: 'honorable',
  pragmatist: 'pragmatist',
}

export const LEADERSHIP_STYLE_FROM_DB = Object.fromEntries(
  Object.entries(LEADERSHIP_STYLE_DB_VALUES).map(([js, db]) => [db, js])
)

export const LEADERSHIP_STYLE_WEIGHTS = {
  king: {
    // Command, subterfuge, and raw fear over duty/honour/family — rules by
    // consequence. (Cersei, late-series Tywin-as-power-behind-throne.)
    tyrant: {
      command: 0.25,
      intimidation: 0.2,
      subterfuge: 0.15,
      selfPreservation: 0.1,
      prestige: 0.1,
      willpower: 0.1,
      duty: 0.05,
      recruitment: 0.05,
    },
    // Makes people want to follow — the new Charisma attribute is the
    // backbone here, alongside battle morale and prestige.
    beloved: {
      command: 0.2,
      charisma: 0.2,
      battleMorale: 0.15,
      prestige: 0.15,
      diplomacy: 0.1,
      family: 0.1,
      willpower: 0.1,
    },
    // The "traditional good king" — closest to the original base King
    // formula, since that was written with this archetype in mind.
    // (Ned Stark, Robb.)
    honorable: {
      honour: 0.2,
      duty: 0.2,
      command: 0.15,
      justice: 0.15,
      family: 0.15,
      scholarship: 0.1,
      willpower: 0.05,
    },
    // Deals, leverage, information — rules like a broker.
    // (Littlefinger-as-king hypothetical, Tywin's realpolitik.)
    pragmatist: {
      cunning: 0.2,
      diplomacy: 0.15,
      subterfuge: 0.15,
      economy: 0.15,
      command: 0.15,
      selfPreservation: 0.1,
      prestige: 0.1,
    },
  },
  hand: {
    // Enforcer-Hand: gets things done through fear and leverage, not
    // persuasion. (Tywin-as-Hand, Qyburn.)
    tyrant: {
      intimidation: 0.25,
      subterfuge: 0.2,
      selfPreservation: 0.2,
      command: 0.15,
      strategy: 0.1,
      economy: 0.1,
    },
    // The Hand as the court's charming operator — wins the room, not
    // just the argument.
    beloved: {
      command: 0.2,
      charisma: 0.2,
      diplomacy: 0.2,
      prestige: 0.15,
      scholarship: 0.15,
      willpower: 0.1,
    },
    // The dutiful administrator-Hand — reliable, principled, by-the-book.
    // (Ned Stark-as-Hand, Davos-as-Hand.)
    honorable: {
      duty: 0.2,
      honour: 0.2,
      scholarship: 0.2,
      justice: 0.15,
      command: 0.15,
      diplomacy: 0.1,
    },
    // The classic "power behind the throne" schemer-Hand — leans harder
    // into economy/cunning/subterfuge than the base Hand formula does.
    // (Littlefinger.)
    pragmatist: {
      cunning: 0.25,
      economy: 0.2,
      subterfuge: 0.2,
      diplomacy: 0.15,
      selfPreservation: 0.1,
      command: 0.1,
    },
  },
  consort: {
    // The controlling consort — manipulates from beside the throne
    // rather than commanding from it. (Cersei-as-Robert's-queen.)
    tyrant: {
      subterfuge: 0.25,
      intimidation: 0.2,
      command: 0.15,
      selfPreservation: 0.15,
      prestige: 0.1,
      diplomacy: 0.05,
      beautyAppeal: 0.1,
    },
    // The classic charming consort — Charisma-led, wins the court.
    // Beauty/Appeal carries real weight here too — this is the one
    // Consort style where physical presence is part of the appeal, not
    // incidental to it. (Margaery Tyrell.)
    beloved: {
      charisma: 0.25,
      prestige: 0.2,
      etiquette: 0.15,
      beautyAppeal: 0.15,
      diplomacy: 0.1,
      willpower: 0.1,
      family: 0.05,
    },
    // The steady, loyal partner-consort — appeal matters least here;
    // duty and reliability carry the role.
    honorable: {
      duty: 0.25,
      family: 0.2,
      diplomacy: 0.2,
      honour: 0.15,
      etiquette: 0.15,
      beautyAppeal: 0.05,
    },
    // The consort who's really a political operator in her own right.
    // (Olenna Tyrell-as-consort-type figure.)
    pragmatist: {
      cunning: 0.25,
      diplomacy: 0.2,
      economy: 0.15,
      subterfuge: 0.15,
      etiquette: 0.1,
      command: 0.1,
      beautyAppeal: 0.05,
    },
  },
}