export const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value))

export const hashSeed = (seed) => {
  let hash = 2166136261
  const source = String(seed)
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const createRandom = (seed) => {
  let value = hashSeed(seed)
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

export const createRandomContext = (seed) => ({
  seed,
  for: (namespace) => createRandom(`${seed}/${namespace}`),
})

export const pick = (values, random) =>
  values[Math.min(values.length - 1, Math.floor(random() * values.length))]

export const weightedPick = (values, getWeight, random) => {
  const weighted = values.map((value) => ({
    value,
    weight: Math.max(0, Number(getWeight(value)) || 0),
  }))
  const total = weighted.reduce((sum, item) => sum + item.weight, 0)
  if (!total) return pick(values, random)
  let cursor = random() * total
  for (const item of weighted) {
    cursor -= item.weight
    if (cursor <= 0) return item.value
  }
  return weighted.at(-1).value
}

export const round = (value, precision = 2) => {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}
