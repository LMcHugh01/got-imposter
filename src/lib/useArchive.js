import { useEffect, useState } from 'react'
import { fetchAllHouses, fetchAllHouseEras } from './houseService'

/**
 * lib/useArchive.js
 *
 * Houses and their per-era rows, fetched once per visit and shared by
 * everything that asks (the Maps page and its map). Pass `enabled = false`
 * to skip the fetch entirely (the home page's simple map needs no houses).
 */

let pending = null

function load() {
  if (!pending) {
    pending = Promise.all([fetchAllHouses(), fetchAllHouseEras()]).then(([houses, eras]) => ({ houses, eras }))
    pending.catch(() => {
      pending = null // let a later visit try again
    })
  }
  return pending
}

export function useArchive(enabled = true) {
  const [state, setState] = useState({ houses: null, eras: null, error: null })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    load()
      .then((data) => !cancelled && setState({ ...data, error: null }))
      .catch((err) => !cancelled && setState({ houses: null, eras: null, error: err.message || 'Failed to load houses.' }))
    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}

/**
 * Each house merged with its row for `year`, the same way the Houses page does
 * it. A house with no row that year (King Bran before 305) is left out.
 */
export function housesAt(houses, eras, year) {
  if (!houses || !eras) return null
  return houses
    .map((house) => {
      const era = eras.find((e) => e.houseId === house.id && e.year === year)
      return era ? { ...house, ...era } : null
    })
    .filter(Boolean)
}
