import { constrainRankPosition } from '../utils/rankPosition.js'

function PlacementNumber({ player, slot, template, insideSlot = false }) {
  const safeRank = constrainRankPosition(player, slot)

  return (
    <span
      className="placement-number-clip"
      aria-hidden="true"
      style={{
        left: insideSlot ? 0 : `${(slot.x / template.width) * 100}%`,
        top: insideSlot ? 0 : `${(slot.y / template.height) * 100}%`,
        width: insideSlot ? '100%' : `${(slot.width / template.width) * 100}%`,
        height: insideSlot ? '100%' : `${(slot.height / template.height) * 100}%`,
        clipPath: insideSlot ? undefined : slot.clipPath,
        zIndex: insideSlot ? 1 : 30,
      }}
    >
      <span
        className="placement-number"
        style={{
          left: `${((safeRank.rankX - slot.x) / slot.width) * 100}%`,
          top: `${((safeRank.rankY - slot.y) / slot.height) * 100}%`,
          color: player.rankColor,
          fontSize: `clamp(8px, ${(safeRank.rankSize / template.width) * 100}vw, ${safeRank.rankSize}px)`,
        }}
      >
        {player.placement}
      </span>
    </span>
  )
}

export default PlacementNumber
