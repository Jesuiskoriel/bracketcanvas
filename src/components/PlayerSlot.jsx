import { memo, useEffect, useRef } from 'react'
import PlacementNumber from './PlacementNumber.jsx'

const POSITION_MIN = -100
const POSITION_MAX = 100
const ZOOM_MIN = 0.25
const ZOOM_MAX = 2.5
const ZOOM_STEP = 0.05

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value))

const round = (value, precision = 2) => {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

const layerKeys = {
  primary: { x: 'x', y: 'y', scale: 'scale' },
  secondary: {
    x: 'secondaryX',
    y: 'secondaryY',
    scale: 'secondaryScale',
  },
}

function PlayerSlot({
  slot,
  player,
  template,
  selectedLayer,
  onSelectLayer,
  onChange,
  showAutoPlacementDebug,
}) {
  const primaryRef = useRef(null)
  const secondaryRef = useRef(null)
  const dragRef = useRef(null)
  const animationFrameRef = useRef(null)
  const pendingChangesRef = useRef(null)
  const latestRef = useRef({ player, onChange, onSelectLayer })

  latestRef.current = { player, onChange, onSelectLayer }

  const selectedInThisSlot = selectedLayer?.playerId === player.id
  const interactionLayer = selectedInThisSlot ? selectedLayer.layer : 'primary'

  useEffect(() => {
    const element = interactionLayer === 'secondary'
      ? secondaryRef.current
      : primaryRef.current

    if (!element) return undefined

    const handleWheel = (event) => {
      const current = latestRef.current
      const keys = layerKeys[interactionLayer]
      const currentScale = current.player[keys.scale]
      const direction = event.deltaY < 0 ? 1 : -1
      const nextScale = round(
        clamp(currentScale + direction * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX),
      )

      if (nextScale === currentScale) return

      event.preventDefault()
      current.onSelectLayer(interactionLayer)
      current.onChange({ [keys.scale]: nextScale })
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [interactionLayer, player.render, player.secondaryRender])

  useEffect(
    () => () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    },
    [],
  )

  if (!player) return null

  const commitPendingChanges = () => {
    animationFrameRef.current = null
    if (!pendingChangesRef.current) return
    latestRef.current.onChange(pendingChangesRef.current)
    pendingChangesRef.current = null
  }

  const scheduleChanges = (changes) => {
    pendingChangesRef.current = changes
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(commitPendingChanges)
    }
  }

  const startDrag = (layer, event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const canvas = event.currentTarget.closest('.top8-canvas')
    const canvasBounds = canvas?.getBoundingClientRect()
    if (!canvasBounds?.width || !canvasBounds.height) return

    const keys = layerKeys[layer]
    const scaleX = canvasBounds.width / template.width
    const scaleY = canvasBounds.height / template.height

    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: player[keys.x],
      startY: player[keys.y],
      renderWidth: event.currentTarget.offsetWidth / scaleX,
      renderHeight: event.currentTarget.offsetHeight / scaleY,
      scaleX,
      scaleY,
      keys,
    }

    onSelectLayer(layer)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add('is-dragging')
    event.preventDefault()
  }

  const moveRender = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaLogicalX = (event.clientX - drag.startClientX) / drag.scaleX
    const deltaLogicalY = (event.clientY - drag.startClientY) / drag.scaleY
    const x = round(clamp(
      drag.startX + (deltaLogicalX / drag.renderWidth) * 100,
      POSITION_MIN,
      POSITION_MAX,
    ))
    const y = round(clamp(
      drag.startY + (deltaLogicalY / drag.renderHeight) * 100,
      POSITION_MIN,
      POSITION_MAX,
    ))

    scheduleChanges({ [drag.keys.x]: x, [drag.keys.y]: y })
  }

  const finishDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      commitPendingChanges()
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    event.currentTarget.classList.remove('is-dragging')
    dragRef.current = null
  }

  const pointerHandlers = (layer) => ({
    onPointerDown: (event) => startDrag(layer, event),
    onPointerMove: moveRender,
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
  })

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
    color: slot.nameZone.color,
    background: slot.nameZone.background,
    transform: `rotate(${slot.nameZone.rotation || 0}deg)`,
    fontFamily: slot.nameZone.fontFamily,
    fontWeight: slot.nameZone.fontWeight,
    fontStyle: slot.nameZone.fontStyle,
    letterSpacing: slot.nameZone.letterSpacing,
    textShadow: slot.nameZone.textShadow,
  }

  const renderStyle = {
    transform: `translate(calc(-50% + ${player.x}%), calc(-50% + ${player.y}%)) scale(${player.flipped ? -player.scale : player.scale}, ${player.scale})`,
    opacity: player.opacity / 100,
    pointerEvents: interactionLayer === 'primary' ? 'auto' : 'none',
    filter: template.renderFilter,
  }

  const secondaryRenderStyle = {
    transform: `translate(calc(-50% + ${player.secondaryX}%), calc(-50% + ${player.secondaryY}%)) scale(${player.secondaryFlipped ? -player.secondaryScale : player.secondaryScale}, ${player.secondaryScale})`,
    opacity: player.secondaryOpacity / 100,
    pointerEvents: 'auto',
    filter: template.renderFilter,
  }

  const logoStyle = {
    top: `${template.teamLogo.top}%`,
    right: `${template.teamLogo.right}%`,
    width: `${template.teamLogo.width}%`,
    height: `${template.teamLogo.height}%`,
  }

  const debugStyle = (bounds) =>
    bounds
      ? {
          left: `${(bounds.left / slot.width) * 100}%`,
          top: `${(bounds.top / slot.height) * 100}%`,
          width: `${(bounds.width / slot.width) * 100}%`,
          height: `${(bounds.height / slot.height) * 100}%`,
        }
      : undefined

  const centerStyle = (center) =>
    center
      ? {
          left: `${(center.x / slot.width) * 100}%`,
          top: `${(center.y / slot.height) * 100}%`,
        }
      : undefined

  return (
    <article
      className={`player-slot${slot.podiumTone ? ` player-slot-${slot.podiumTone}` : ''}`}
      data-psd-player={player.id}
      style={slotStyle}
      aria-label={`Place ${player.placement}`}
    >
      {player.rankLayer === 'back' && (
        <PlacementNumber
          player={player}
          slot={slot}
          template={template}
          insideSlot
          onChange={onChange}
        />
      )}
      {player.secondaryRender && (
        <img
          ref={secondaryRef}
          className="player-render player-render-secondary"
          data-psd-key={`player-${player.id}-character-2`}
          data-psd-role="character"
          src={player.secondaryRender}
          alt=""
          draggable="false"
          style={secondaryRenderStyle}
          {...pointerHandlers('secondary')}
        />
      )}
      {player.render && (
        <img
          ref={primaryRef}
          className="player-render player-render-primary"
          data-psd-key={`player-${player.id}-character-1`}
          data-psd-role="character"
          src={player.render}
          alt=""
          draggable="false"
          style={renderStyle}
          {...pointerHandlers('primary')}
        />
      )}
      <div
        className="slot-shade"
        data-psd-key={`player-${player.id}-shade`}
        data-psd-role="player-part"
        style={template.slotShadeStyle}
      />
      {player.teamLogo && (
        <img
          className="team-logo"
          data-psd-key={`player-${player.id}-team-logo`}
          data-psd-role="player-part"
          src={player.teamLogo}
          alt=""
          draggable="false"
          style={logoStyle}
        />
      )}
      <span
        className={`player-name${player.playerName ? '' : ' is-empty'}`}
        data-psd-key={`player-${player.id}-pseudo`}
        data-psd-role="player-part"
        style={nameStyle}
      >
        {player.playerName || `Joueur ${player.placement}`}
      </span>
      {showAutoPlacementDebug && player.autoPlacementDebug && (
        <div
          className="auto-placement-debug"
          data-export-ignore="true"
          aria-hidden="true"
        >
          <span
            className="auto-placement-debug-safe"
            style={debugStyle({
              left: player.autoPlacementDebug.safeZone.x,
              top: player.autoPlacementDebug.safeZone.y,
              width: player.autoPlacementDebug.safeZone.width,
              height: player.autoPlacementDebug.safeZone.height,
            })}
          />
          <span
            className="auto-placement-debug-bounds auto-placement-debug-primary"
            style={debugStyle(player.autoPlacementDebug.primaryBounds)}
          />
          {player.autoPlacementDebug.secondaryBounds && (
            <span
              className="auto-placement-debug-bounds auto-placement-debug-secondary"
              style={debugStyle(player.autoPlacementDebug.secondaryBounds)}
            />
          )}
          <span
            className="auto-placement-debug-center"
            style={centerStyle(player.autoPlacementDebug.primaryCenter)}
          />
          {player.autoPlacementDebug.secondaryCenter && (
            <span
              className="auto-placement-debug-center auto-placement-debug-center-secondary"
              style={centerStyle(player.autoPlacementDebug.secondaryCenter)}
            />
          )}
          <output>score {player.autoPlacementDebug.score}</output>
        </div>
      )}
    </article>
  )
}

export default memo(PlayerSlot, (previous, next) =>
  previous.slot === next.slot &&
  previous.player === next.player &&
  previous.template === next.template &&
  previous.selectedLayer === next.selectedLayer,
)
