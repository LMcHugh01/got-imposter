/**
 * gameEngine/whispers.js
 *
 * Pure rules for Whispers — no React, no storage, no network — so they can
 * be unit-tested (whispers.test.js) and reused by any screen.
 *
 * A "suspect" is a draftable character reshaped for this game:
 *   { id, name, house, region, style, attributes, groups: { combat: 64, ... } }
 */
import { CHAMPION_STYLE_LABELS } from '../data/championStyles'
import { WHISPER_GROUPS, MAX_GUESSES, CLOSE_BAND, regionForHouse } from '../data/whispers'

/** Average each standing's sub-attributes. Missing values are skipped; a standing with none is null. */
export function groupScores(attributes) {
  return Object.fromEntries(
    WHISPER_GROUPS.map((g) => {
      const values = g.keys.map((k) => attributes?.[k]).filter((v) => typeof v === 'number')
      const score = values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null
      return [g.id, score]
    }),
  )
}

export function buildSuspect(character) {
  return {
    id: character.id,
    name: character.name,
    house: character.house || 'Unaffiliated',
    houseKnown: Boolean(character.house),
    region: regionForHouse(character.house),
    style: character.fightingStyle ? (CHAMPION_STYLE_LABELS[character.fightingStyle] ?? null) : null,
    attributes: character.attributes ?? {},
    groups: groupScores(character.attributes),
  }
}

/** Draftable pool → suspects, alphabetical for the search list. */
export function buildRoster(pool) {
  return pool.map(buildSuspect).sort((a, b) => a.name.localeCompare(b.name))
}

/** Random suspect, never the same one twice in a row (when there's a choice). */
export function pickTarget(roster, avoidId = null, random = Math.random) {
  if (!roster.length) return null
  const choices = roster.length > 1 ? roster.filter((s) => s.id !== avoidId) : roster
  return choices[Math.floor(random() * choices.length)]
}

/** 'playing' | 'won' | 'lost' */
export function roundStatus(guessIds, targetId, maxGuesses = MAX_GUESSES) {
  if (guessIds.includes(targetId)) return 'won'
  return guessIds.length >= maxGuesses ? 'lost' : 'playing'
}

/**
 * How one guess measures up against the hidden suspect.
 *   traits: house / region / fighting style — hit when they match
 *   tiles:  one per standing — the guess's score, which way the truth lies,
 *           and whether it's exact or within the close band
 */
export function compareGuess(guess, target, closeBand = CLOSE_BAND) {
  const traits = [
    { id: 'house', label: 'House', hit: guess.houseKnown && guess.house === target.house },
    {
      id: 'region',
      label: guess.region ?? 'Unknown region',
      hit: Boolean(guess.region) && guess.region === target.region,
    },
    { id: 'style', label: guess.style ?? 'Untagged', hit: Boolean(guess.style) && guess.style === target.style },
  ]

  const tiles = WHISPER_GROUPS.map((g) => {
    const mine = guess.groups[g.id]
    const theirs = target.groups[g.id]
    if (mine == null || theirs == null) {
      return { id: g.id, code: g.code, label: g.label, value: null, direction: null, exact: false, near: false }
    }
    const diff = theirs - mine
    return {
      id: g.id,
      code: g.code,
      label: g.label,
      value: mine,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : null,
      exact: diff === 0,
      near: Math.abs(diff) <= closeBand,
    }
  })

  return { traits, tiles }
}

function rankedGroups(target) {
  return WHISPER_GROUPS.filter((g) => target.groups[g.id] != null).sort(
    (a, b) => target.groups[b.id] - target.groups[a.id],
  )
}

export function strongestGroup(target) {
  return rankedGroups(target)[0] ?? null
}

/**
 * A hint that grows with the number of guesses: nothing before the second
 * guess, then a new line every two guesses.
 */
export function whisperFor(target, guessCount) {
  if (guessCount < 2) return null
  const ranked = rankedGroups(target)
  const top = ranked[0]
  const low = ranked[ranked.length - 1]
  const honour = target.attributes?.honour

  const lines = []
  if (top) lines.push(`Their strength is ${top.label.toLowerCase()}. Little else recommends them.`)
  if (low) lines.push(`Ask nothing of their ${low.label.toLowerCase()}; there is little there.`)
  if (target.region) {
    lines.push(
      target.region === 'Essos' || target.region === 'Beyond the Wall'
        ? 'They were not born under the Seven Kingdoms.'
        : `They answer, in the end, to ${target.region}.`,
    )
  }
  if (typeof honour === 'number') {
    lines.push(
      honour >= 75
        ? 'They have never broken an oath.'
        : honour <= 30
          ? 'Their word has never been worth the breath.'
          : 'Their honour bends, but does not often break.',
    )
  }
  if (!lines.length) return null
  return lines[Math.min(Math.floor((guessCount - 2) / 2), lines.length - 1)]
}

export const EMPTY_STATS = { streak: 0, best: 0, solved: 0, played: 0 }

/** Stats after a finished round. A loss ends the current streak. */
export function recordResult(stats, won) {
  const streak = won ? stats.streak + 1 : 0
  return {
    streak,
    best: Math.max(stats.best, streak),
    solved: stats.solved + (won ? 1 : 0),
    played: stats.played + 1,
  }
}