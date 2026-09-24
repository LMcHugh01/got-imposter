import { useEffect, useState } from 'react'
import { fetchAllHouses, fetchAllHouseEras, fetchAllCastles } from './houseService'

/**
 * lib/useArchive.js
 *
 * Houses, their per-era rows and the map's castles, fetched once per visit
 * and shared by everything that asks (the Maps page and its map). If the
 * castles can't be loaded (say the table isn't there yet), the map just
 * shows none; the houses still load. Pass `enabled = false`
 * to skip the fetch entirely (the home page's simple map needs no houses).
 */

let pending = null

function load() {
  if (!pending) {
    const castles = fetchAllCastles().catch((err) => {
      console.warn(err.message)
      return []
    })
    pending = Promise.all([fetchAllHouses(), fetchAllHouseEras(), castles]).then(([houses, eras, castleRows]) => ({
      houses,
      eras,
      castles: castleRows,
    }))
    pending.catch(() => {
      pending = null // let a later visit try again
    })
  }
  return pending
}

export function useArchive(enabled = true) {
  const [state, setState] = useState({ houses: null, eras: null, castles: null, error: null })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    load()
      .then((data) => !cancelled && setState({ ...data, error: null }))
      .catch((err) => !cancelled && setState({ houses: null, eras: null, castles: null, error: err.message || 'Failed to load houses.' }))
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