import { supabase } from './supabase'
import { applyEvent, mergeRecords, withDefaults, isEmptyRecord, seedRecord, TRACKED_GAMES } from '../gameEngine/record'
import { newlyEarned, HONOUR_BY_ID } from '../data/honours'
import { loadWhispers } from './whispersStorage'
import { loadAllegiances } from './allegiancesStorage'

/**
 * lib/recordSync.js
 *
 * Where game results go.
 *   Guests: into a record on this device.
 *   Players: into their game_stats rows in Supabase, then honours are checked.
 * When a guest signs in, their device record is added to the account once
 * and cleared, so it can't be counted twice.
 *
 * Games call recordGameEvent(game, event) and don't need to know which.
 */
const GUEST_KEY = 'westerosi.record.guest.v1'
let currentUserId = null

export function setRecordUser(userId) {
  currentUserId = userId
}

/* ---------------- guest record (this device) ---------------- */

function loadGuestRecord() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(GUEST_KEY) || 'null')
    if (raw) return withDefaults(raw)
  } catch {
    // fall through to seeding
  }
  // First run since accounts arrived: keep the stats this device already had.
  const seeded = seedRecord({ whispers: loadWhispers().stats, allegiances: loadAllegiances().stats })
  saveGuestRecord(seeded)
  return seeded
}

function saveGuestRecord(record) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(record))
  } catch {
    // storage unavailable
  }
}

/* ---------------- account record (Supabase) ---------------- */

export async function fetchAccountRecord(userId) {
  const { data, error } = await supabase.from('game_stats').select('game, stats').eq('user_id', userId)
  if (error) throw new Error(`Could not load your record: ${error.message}`)
  return withDefaults(Object.fromEntries((data ?? []).map((row) => [row.game, row.stats])))
}

async function saveAccountGames(userId, record, games) {
  const rows = games.map((game) => ({ user_id: userId, game, stats: record[game], updated_at: new Date().toISOString() }))
  const { error } = await supabase.from('game_stats').upsert(rows, { onConflict: 'user_id,game' })
  if (error) throw new Error(`Could not save your record: ${error.message}`)
}

export async function fetchEarnedHonours(userId) {
  const { data, error } = await supabase.from('honours').select('honour_id, earned_at').eq('user_id', userId)
  if (error) throw new Error(`Could not load your honours: ${error.message}`)
  return data ?? []
}

/** Award any honours this record has earned. Announces each new one. */
export async function checkHonours(userId, record) {
  const held = await fetchEarnedHonours(userId)
  const fresh = newlyEarned(record, held.map((h) => h.honour_id))
  if (!fresh.length) return []
  const { error } = await supabase
    .from('honours')
    .upsert(fresh.map((honour_id) => ({ user_id: userId, honour_id })), { onConflict: 'user_id,honour_id', ignoreDuplicates: true })
  if (error) throw new Error(`Could not record your honours: ${error.message}`)
  fresh.forEach((id) => announceHonour(id))
  return fresh
}

function announceHonour(id) {
  const honour = HONOUR_BY_ID[id]
  if (honour) window.dispatchEvent(new CustomEvent('westerosi:honour', { detail: honour }))
}

/* ---------------- the two entry points ---------------- */

// Results are saved one at a time, in order. Each save reads the record,
// adds to it and writes it back; two running at once (e.g. the final
// battle and the campaign win) would each start from the same record and
// the second would overwrite the first.
let queue = Promise.resolve()

/** Record one finished game. Never throws — a failed save mustn't break a game. */
export function recordGameEvent(game, event) {
  const run = queue.then(() => saveGameEvent(game, event))
  queue = run
  return run
}

async function saveGameEvent(game, event) {
  if (!TRACKED_GAMES.includes(game)) return
  try {
    if (!currentUserId) {
      saveGuestRecord(applyEvent(loadGuestRecord(), game, event))
      return
    }
    const userId = currentUserId
    const record = applyEvent(await fetchAccountRecord(userId), game, event)
    await saveAccountGames(userId, record, [game])
    await checkHonours(userId, record)
  } catch (err) {
    console.warn(err.message)
  }
}

/**
 * Run whenever a player signs in: add this device's guest record to their
 * account (once), then award any honours they now qualify for — including
 * Sworn on their very first sign-in.
 */
export async function syncOnSignIn(userId) {
  const guest = loadGuestRecord()
  let record = await fetchAccountRecord(userId)
  if (!isEmptyRecord(guest)) {
    record = mergeRecords(record, guest)
    await saveAccountGames(userId, record, TRACKED_GAMES)
    saveGuestRecord(withDefaults({}))
  }
  await checkHonours(userId, record)
}