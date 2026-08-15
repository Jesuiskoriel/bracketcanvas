import { forwardRef } from 'react'
import PlayerSlot from './PlayerSlot.jsx'
import PlacementNumber from './PlacementNumber.jsx'

const showAutoPlacementDebug =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('autoPlacementDebug') === '1'

const Top8Canvas = forwardRef(function Top8Canvas(
  {
    template,
    players,
    eventDetails,
    selectedLayer,
    onPlayerChange,
    onSelectLayer,
  },
  ref,
) {
  const metadataValues = {
    eventName: eventDetails.eventName,
    subtitle: eventDetails.subtitle,
    date: eventDetails.date,
    participantCount: `${eventDetails.participantCount || '0'} Participant${Number(eventDetails.participantCount) > 1 ? 's' : ''}`,
  }

  return (
    <div
      ref={ref}
      className={`top8-canvas top8-canvas-${template.visualStyle || 'default'}`}
      style={{
        aspectRatio: `${template.width} / ${template.height}`,
        ...template.canvasStyle,
      }}
      aria-label="Aperçu du Top 8"
    >
      {template.layers
        .filter((layer) => layer.zIndex < 20)
        .map((layer) => (
          <img
            key={layer.id}
            className="template-layer"
            data-psd-key={`template-layer-${layer.id}`}
            data-psd-role="background"
            src={layer.src}
            alt=""
            aria-hidden="true"
            draggable="false"
            style={{ zIndex: layer.zIndex }}
          />
        ))}
      {template.decorations.map((decoration) => (
        <img
          key={decoration.id}
          className="template-decoration"
          data-psd-key={`decoration-${decoration.id}`}
          data-psd-role="decoration"
          src={decoration.src}
          alt=""
          aria-hidden="true"
          draggable="false"
          style={{
            left: `${(decoration.x / template.width) * 100}%`,
            top: `${(decoration.y / template.height) * 100}%`,
            width: `${(decoration.width / template.width) * 100}%`,
            height: `${(decoration.height / template.height) * 100}%`,
            zIndex: decoration.zIndex,
            opacity: decoration.opacity,
            mixBlendMode: decoration.blendMode,
            transform: `rotate(${decoration.rotation || 0}deg) scaleX(${decoration.flipped ? -1 : 1})`,
          }}
        />
      ))}
      {template.metadata.map((field) => (
        <span
          key={field.id}
          className={`template-text template-text-${field.id}`}
          data-psd-key={`metadata-${field.id}`}
          data-psd-role="metadata"
          style={{
            left: `${(field.x / template.width) * 100}%`,
            top: `${(field.y / template.height) * 100}%`,
            width: `${(field.width / template.width) * 100}%`,
            height: `${(field.height / template.height) * 100}%`,
            zIndex: field.zIndex,
            fontSize: `${(field.fontSize / template.width) * 100}cqi`,
            lineHeight: field.lineHeight,
            textAlign: field.align,
            color: field.color,
            background: field.background,
            fontFamily: field.fontFamily,
            fontWeight: field.fontWeight,
            fontStyle: field.fontStyle,
            letterSpacing: field.letterSpacing,
            textTransform: field.textTransform,
            textShadow: field.textShadow,
          }}
        >
          {metadataValues[field.id]}
        </span>
      ))}
      {(eventDetails.tournamentLogo || template.defaultTournamentLogo) && (
        <img
          className="tournament-logo"
          data-psd-key="tournament-logo"
          data-psd-role="tournament-logo"
          src={eventDetails.tournamentLogo || template.defaultTournamentLogo}
          alt=""
          aria-hidden="true"
          draggable="false"
          style={{
            left: `${(template.tournamentLogo.x / template.width) * 100}%`,
            top: `${(template.tournamentLogo.y / template.height) * 100}%`,
            width: `${(template.tournamentLogo.width / template.width) * 100}%`,
            height: `${(template.tournamentLogo.height / template.height) * 100}%`,
            zIndex: template.tournamentLogo.zIndex,
          }}
        />
      )}
      {template.slots.map((slot) => (
        <img
          key={`${slot.id}-texture`}
          className={`slot-texture${slot.podiumTone ? ` slot-texture-${slot.podiumTone}` : ''}`}
          data-psd-key={`slot-texture-${slot.id}`}
          data-psd-role="slot-texture"
          src={slot.texture || template.slotTexture}
          alt=""
          aria-hidden="true"
          draggable="false"
          style={{
            left: `${(slot.x / template.width) * 100}%`,
            top: `${(slot.y / template.height) * 100}%`,
            width: `${(slot.width / template.width) * 100}%`,
            height: `${(slot.height / template.height) * 100}%`,
            clipPath: slot.clipPath,
            ...template.slotTextureStyle,
          }}
        />
      ))}
      {template.slots.map((slot) => (
        <PlayerSlot
          key={slot.id}
          slot={slot}
          player={players.find((player) => player.id === slot.id)}
          template={template}
          selectedLayer={selectedLayer}
          onChange={(changes) => onPlayerChange(slot.id, changes)}
          onSelectLayer={(layer) => onSelectLayer(slot.id, layer)}
          showAutoPlacementDebug={showAutoPlacementDebug}
        />
      ))}
      {template.layers
        .filter((layer) => layer.zIndex >= 20)
        .map((layer) => (
          <img
            key={layer.id}
            className="template-layer"
            data-psd-key={`template-layer-${layer.id}`}
            data-psd-role="foreground"
            src={layer.src}
            alt=""
            aria-hidden="true"
            draggable="false"
            style={{ zIndex: layer.zIndex }}
          />
        ))}
      {players
        .filter((player) => player.rankLayer === 'front')
        .map((player) => (
          <PlacementNumber
            key={player.id}
            player={player}
            slot={template.slots.find((slot) => slot.id === player.id)}
            template={template}
            onChange={(changes) => onPlayerChange(player.id, changes)}
          />
        ))}
    </div>
  )
})

export default Top8Canvas
