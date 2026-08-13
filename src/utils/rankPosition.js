const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value))

const finiteOr = (value, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const isInsidePolygon = ([x, y], points) => {
  let inside = false

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const [currentX, currentY] = points[index]
    const [previousX, previousY] = points[previous]
    const crossesRay = (currentY > y) !== (previousY > y) &&
      x < ((previousX - currentX) * (y - currentY)) /
        (previousY - currentY) + currentX

    if (crossesRay) inside = !inside
  }

  return inside
}

const closestPointOnSegment = ([x, y], [startX, startY], [endX, endY]) => {
  const segmentX = endX - startX
  const segmentY = endY - startY
  const lengthSquared = segmentX ** 2 + segmentY ** 2
  const ratio = lengthSquared === 0
    ? 0
    : clamp(
      ((x - startX) * segmentX + (y - startY) * segmentY) / lengthSquared,
      0,
      1,
    )

  return [startX + segmentX * ratio, startY + segmentY * ratio]
}

const constrainPointToPolygon = (point, points) => {
  if (isInsidePolygon(point, points)) return point

  let closestPoint = points[0]
  let closestDistance = Number.POSITIVE_INFINITY

  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length]
    const candidate = closestPointOnSegment(point, start, end)
    const distance = (candidate[0] - point[0]) ** 2 +
      (candidate[1] - point[1]) ** 2

    if (distance < closestDistance) {
      closestPoint = candidate
      closestDistance = distance
    }
  })

  return closestPoint
}

export const constrainRankPosition = (player, slot) => {
  const rankSize = clamp(finiteOr(player.rankSize, slot.rank.size), 8, 80)
  const points = slot.points || [
    [slot.x, slot.y],
    [slot.x + slot.width, slot.y],
    [slot.x + slot.width, slot.y + slot.height],
    [slot.x, slot.y + slot.height],
  ]
  const position = constrainPointToPolygon([
    finiteOr(player.rankX, slot.rank.x),
    finiteOr(player.rankY, slot.rank.y),
  ], points)

  return {
    rankX: position[0],
    rankY: position[1],
    rankSize,
  }
}
