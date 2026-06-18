export const ABOVE_MAX_PAX_RULE = 'use_last_tier'

export function normalizePricePerPersonTiers(tiers, fallbackPrice = 0, maxCustomPax = 1) {
  const source = Array.isArray(tiers)
    ? Object.fromEntries(tiers.map((value, index) => [index + 1, value]))
    : tiers && typeof tiers === 'object' ? tiers : {}
  const requestedMax = Math.max(1, Number(maxCustomPax) || Object.keys(source).length || 1)
  const normalized = {}
  let lastPrice = Math.max(0, Number(fallbackPrice) || 0)

  for (let pax = 1; pax <= requestedMax; pax += 1) {
    const tierPrice = Number(source[pax] ?? source[String(pax)])
    if (Number.isFinite(tierPrice) && tierPrice >= 0) lastPrice = tierPrice
    normalized[pax] = lastPrice
  }

  return normalized
}

export function getPrivatePricePerPerson(trip, participantCount) {
  const pax = Math.max(1, Number(participantCount) || 1)
  const maxCustomPax = Math.max(
    1,
    Number(trip?.maxCustomPax) || Object.keys(trip?.pricePerPersonTiers || {}).length || 1,
  )
  const tiers = normalizePricePerPersonTiers(trip?.pricePerPersonTiers, trip?.price, maxCustomPax)
  const appliedPax = Math.min(pax, maxCustomPax)
  return Number(tiers[appliedPax] ?? trip?.price ?? 0)
}

export function getTripStartingPrice(trip) {
  if (!trip?.isPrivateTrip) return Number(trip?.price || 0)
  return getPrivatePriceRange(trip).min
}

export function getPrivatePriceRange(trip) {
  const maxCustomPax = Math.max(
    1,
    Number(trip?.maxCustomPax) || Object.keys(trip?.pricePerPersonTiers || {}).length || 1,
  )
  const tiers = normalizePricePerPersonTiers(trip?.pricePerPersonTiers, trip?.price, maxCustomPax)
  const prices = Object.values(tiers)
    .map(Number)
    .filter((price) => Number.isFinite(price) && price >= 0)
  const fallbackPrice = Number(trip?.price || 0)

  if (!prices.length) return { min: fallbackPrice, max: fallbackPrice }
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  }
}
