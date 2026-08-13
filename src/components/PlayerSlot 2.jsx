function PlayerSlot({ slot, player, template }) {
  if (!player) return null

  const slotStyle = {
    left: `${(slot.x / template.width) * 100}%`,
    top: `${(slot.y / template.height) * 100}%`,
    width: `${(slot.width / template.width) * 100}%`,
    height: `${(slot.height / template.height) * 100}%`,
    clipPath: slot.clipPath,
    zIndex: slot.zIndex,
  }

  const nameStyle = {
    left: `${((slot.nameZone.x - slot.x) / slot.width) * 100}%`,
    top: `${((slot.nameZone.y - slot.y) / slot.height) * 100}%`,
    width: `${(slot.nameZone.width / slot.width) * 100}%`,
    height: `${(slot.nameZone.height / slot.height) * 100}%`,
    justifyContent: slot.nameZone.align,
    textAlign: slot.nameZone.align,
    fontSize: `clamp(5px, ${(slot.nameZone.fontSize / template.width) * 100}vw, ${slot.nameZone.fontSize}px)`,
  }

  const renderStyle = {
    transform: `translate(calc(-50% + ${player.x}%), calc(-50% + ${player.y}%)) scale(${player.flipped ? -player.scale : player.scale}, ${player.scale})`,
    opacity: player.opacity / 100,
  }

  const secondaryRenderStyle = {
    transform: `translate(calc(-50% + ${player.secondaryX}%), calc(-50% + ${player.secondaryY}%)) scale(${player.secondaryFlipped ? -player.secondaryScale : player.secondaryScale}, ${player.secondaryScale})`,
    opacity: player.secondaryOpacity / 100,
  }

  const logoStyle = {
    top: `${template.teamLogo.top}%`,
    right: `${template.teamLogo.right}%`,
    width: `${template.teamLogo.width}%`,
    height: `${template.teamLogo.height}%`,
  }

  return (
    <article className="player-slot" style={slotStyle} aria-label={`Place ${player.placement}`}>
      {player.secondaryRender && (
        <img
          className="player-render player-render-secondary"
          src={player.secondaryRender}
          alt=""
          draggable="false"
          style={secondaryRenderStyle}
        />
      )}
      {player.render && (
        <img
          className="player-render player-render-primary"
          src={player.render}
          alt=""
          draggable="false"
          style={renderStyle}
        />
      )}
      <div className="slot-shade" />
      {player.teamLogo && (
        <img
          className="team-logo"
          src={player.teamLogo}
          alt=""
          draggable="false"
          style={logoStyle}
        />
      )}
      <span className={`player-name${player.playerName ? '' : ' is-empty'}`} style={nameStyle}>
        {player.playerName || `Joueur ${player.placement}`}
      </span>
    </article>
  )
}

export default PlayerSlot
