import { useEffect, useRef } from 'react'
import { constrainRankPosition } from '../utils/rankPosition.js'

function PlacementNumber({
  player,
  slot,
  template,
  customFont,
  insideSlot = false,
  onChange,
}) {
  const numberRef = useRef(null)
  const dragRef = useRef(null)
  const animationFrameRef = useRef(null)
  const pendingChangesRef = useRef(null)
  const latestRef = useRef({ player, onChange })

  latestRef.current = { player, onChange }
  const safeRank = constrainRankPosition(player, slot)

  useEffect(
    () => () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    const element = numberRef.current
    if (!element || !onChange) return undefined

    let gestureStartSize = null

    const applySize = (rankSize) => {
      const current = latestRef.current
      if (!current.onChange) return

      const nextRank = constrainRankPosition(
        { ...current.player, rankSize },
        slot,
      )
      current.onChange({
        rankX: nextRank.rankX,
        rankY: nextRank.rankY,
        rankSize: nextRank.rankSize,
      })
    }

    const handleWheel = (event) => {
      if (!event.ctrlKey) return

      const currentSize = constrainRankPosition(
        latestRef.current.player,
        slot,
      ).rankSize
      const direction = event.deltaY < 0 ? 1 : -1
      const step = Math.max(
        1,
        Math.min(4, Math.round(Math.abs(event.deltaY) / 20)),
      )
      const nextSize = Math.min(80, Math.max(8, currentSize + direction * step))

      if (nextSize === currentSize) return
      event.preventDefault()
      applySize(nextSize)
    }

    const handleGestureStart = (event) => {
      gestureStartSize = constrainRankPosition(
        latestRef.current.player,
        slot,
      ).rankSize
      event.preventDefault()
    }

    const handleGestureChange = (event) => {
      if (gestureStartSize === null || !Number.isFinite(event.scale)) return
      event.preventDefault()
      applySize(Math.round(gestureStartSize * event.scale))
    }

    const handleGestureEnd = () => {
      gestureStartSize = null
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    element.addEventListener('gesturestart', handleGestureStart, { passive: false })
    element.addEventListener('gesturechange', handleGestureChange, { passive: false })
    element.addEventListener('gestureend', handleGestureEnd)

    return () => {
      element.removeEventListener('wheel', handleWheel)
      element.removeEventListener('gesturestart', handleGestureStart)
      element.removeEventListener('gesturechange', handleGestureChange)
      element.removeEventListener('gestureend', handleGestureEnd)
    }
  }, [onChange, slot])

  const commitPendingChanges = () => {
    animationFrameRef.current = null
    if (!pendingChangesRef.current || !latestRef.current.onChange) return
    latestRef.current.onChange(pendingChangesRef.current)
    pendingChangesRef.current = null
  }

  const scheduleChanges = (changes) => {
    pendingChangesRef.current = changes
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(commitPendingChanges)
    }
  }

  const startDrag = (event) => {
    if (!onChange || (event.pointerType === 'mouse' && event.button !== 0)) return

    const canvas = event.currentTarget.closest('.top8-canvas')
    const canvasBounds = canvas?.getBoundingClientRect()
    if (!canvasBounds?.width || !canvasBounds.height) return

    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRankX: safeRank.rankX,
      startRankY: safeRank.rankY,
      scaleX: canvasBounds.width / template.width,
      scaleY: canvasBounds.height / template.height,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add('is-dragging')
    event.preventDefault()
    event.stopPropagation()
  }

  const moveNumber = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const nextRank = constrainRankPosition(
      {
        ...latestRef.current.player,
        rankX: drag.startRankX +
          (event.clientX - drag.startClientX) / drag.scaleX,
        rankY: drag.startRankY +
          (event.clientY - drag.startClientY) / drag.scaleY,
      },
      slot,
    )

    scheduleChanges({ rankX: nextRank.rankX, rankY: nextRank.rankY })
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

  return (
    <span
      className="placement-number-clip"
      data-psd-key={`player-${player.id}-placement`}
      data-psd-role="placement"
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
        ref={numberRef}
        className="placement-number"
        onPointerDown={startDrag}
        onPointerMove={moveNumber}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{
          left: `${((safeRank.rankX - slot.x) / slot.width) * 100}%`,
          top: `${((safeRank.rankY - slot.y) / slot.height) * 100}%`,
          color: player.rankColor,
          fontSize: `${(safeRank.rankSize / template.width) * 100}cqi`,
          ...template.rankStyle,
          ...(customFont
            ? { fontFamily: `"BracketCanvas Custom Font ${customFont.id}", "Hylia Serif", serif` }
            : {}),
        }}
      >
        {player.placement}
      </span>
    </span>
  )
}

export default PlacementNumber
