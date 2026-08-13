const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value))

const finiteOr = (value, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export const constrainRankPosition = (player, slot) => {
  const rankSize = clamp(finiteOr(player.rankSize, slot.rank.size), 8, 80)
  const bounds = slot.rank.bounds || {
    x: slot.x,
    y: slot.y,
    width: slot.width,
    height: slot.height,
  }
  const horizontalMargin = Math.min(
    Math.max(rankSize * 0.58, 8),
    bounds.width / 2 - 1,
  )
  const verticalMargin = Math.min(
    Math.max(rankSize * 0.58, 8),
    bounds.height / 2 - 1,
  )

  return {
    rankX: clamp(
      finiteOr(player.rankX, slot.rank.x),
      bounds.x + horizontalMargin,
      bounds.x + bounds.width - horizontalMargin,
    ),
    rankY: clamp(
      finiteOr(player.rankY, slot.rank.y),
      bounds.y + verticalMargin,
      bounds.y + bounds.height - verticalMargin,
    ),
    rankSize,
  }
}
