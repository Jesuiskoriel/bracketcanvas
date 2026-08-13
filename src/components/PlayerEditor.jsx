import { memo } from 'react'

function RangeControl({ id, label, value, min, max, step = 1, suffix, onChange }) {
  return (
    <label className="range-control" htmlFor={id}>
      <span>
        {label}
        <output htmlFor={id}>{value}{suffix}</output>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function PlayerEditor({
  player,
  slotNumber,
  characters,
  canvasWidth,
  canvasHeight,
  selectedLayer,
  onChange,
  onSelectLayer,
  onCharacterChange,
  onRenderChange,
  onSecondaryCharacterChange,
  onSecondaryRenderChange,
  onLogoChange,
  isAutoPlacing,
  onAutoPlace,
}) {
  const selectedCharacter = characters.find(
    (character) => character.id === player.character,
  )
  const selectedSecondaryCharacter = characters.find(
    (character) => character.id === player.secondaryCharacter,
  )
  const isPrimaryActive =
    selectedLayer.playerId === player.id && selectedLayer.layer === 'primary'
  const isSecondaryActive =
    selectedLayer.playerId === player.id && selectedLayer.layer === 'secondary'

  return (
    <details className="player-editor" open={slotNumber === 1}>
      <summary>
        <span className="editor-placement">{player.placement}</span>
        <span>
          <strong>{player.playerName || `Joueur ${slotNumber}`}</strong>
          <small>Slot {slotNumber}</small>
        </span>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="editor-fields">
        <label className="text-control" htmlFor={`${player.id}-name`}>
          <span>Pseudo</span>
          <input
            id={`${player.id}-name`}
            type="text"
            value={player.playerName}
            maxLength={24}
            placeholder={`Joueur ${slotNumber}`}
            onChange={(event) => onChange({ playerName: event.target.value })}
          />
        </label>

        <div className="logo-control">
          <span>Logo de team</span>
          <div className="logo-input-row">
            <label className="file-button">
              {player.teamLogo ? 'Remplacer le logo' : 'Importer un logo'}
              <input
                id={`${player.id}-team-logo`}
                className="visually-hidden-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => {
                  onLogoChange(event.target.files?.[0] || null)
                  event.target.value = ''
                }}
              />
            </label>
            {player.teamLogo && (
              <button
                className="remove-logo-button"
                type="button"
                onClick={() => onLogoChange(null)}
              >
                Retirer
              </button>
            )}
          </div>
          <small>{player.teamLogoName || 'PNG, JPG, WebP ou SVG'}</small>
        </div>

        <div className="selects-grid">
          <label className="text-control" htmlFor={`${player.id}-character`}>
            <span>Personnage</span>
            <select
              id={`${player.id}-character`}
              value={player.character}
              onChange={(event) => onCharacterChange(event.target.value)}
            >
              <option value="">Choisir un personnage</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-control" htmlFor={`${player.id}-render`}>
            <span>Skin</span>
            <select
              id={`${player.id}-render`}
              value={player.renderId}
              disabled={!selectedCharacter}
              onChange={(event) => onRenderChange(event.target.value)}
            >
              <option value="">
                {selectedCharacter ? 'Choisir un skin' : 'Choisir un personnage'}
              </option>
              {selectedCharacter?.renders.map((render) => (
                <option key={render.id} value={render.id}>
                  {render.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          className="auto-place-button"
          type="button"
          disabled={!player.render || isAutoPlacing}
          onClick={onAutoPlace}
        >
          {isAutoPlacing ? 'Cadrage en cours…' : '✨ Auto cadrage'}
        </button>

        <fieldset className="control-group">
          <legend>Render du personnage</legend>
          <button
            className={`layer-select-button${isPrimaryActive ? ' is-active' : ''}`}
            type="button"
            disabled={!player.render}
            aria-pressed={isPrimaryActive}
            onClick={() => onSelectLayer('primary')}
          >
            {isPrimaryActive ? 'Render 1 actif sur le canvas' : 'Manipuler le render 1'}
          </button>
          <div className="ranges-grid">
            <RangeControl id={`${player.id}-x`} label="Position X" value={player.x} min={-100} max={100} step={0.1} suffix="%" onChange={(x) => onChange({ x })} />
            <RangeControl id={`${player.id}-y`} label="Position Y" value={player.y} min={-100} max={100} step={0.1} suffix="%" onChange={(y) => onChange({ y })} />
            <RangeControl id={`${player.id}-scale`} label="Zoom" value={player.scale} min={0.25} max={2.5} step={0.05} suffix="×" onChange={(scale) => onChange({ scale })} />
            <RangeControl id={`${player.id}-opacity`} label="Opacité" value={player.opacity} min={0} max={100} suffix="%" onChange={(opacity) => onChange({ opacity })} />
          </div>

          <label className="toggle-control" htmlFor={`${player.id}-flip`}>
            <input
              id={`${player.id}-flip`}
              type="checkbox"
              checked={player.flipped}
              onChange={(event) => onChange({ flipped: event.target.checked })}
            />
            <span>Retourner horizontalement</span>
          </label>
        </fieldset>

        <fieldset className="control-group secondary-character-controls">
          <legend>Deuxième personnage</legend>
          <div className="selects-grid">
            <label className="text-control compact-control" htmlFor={`${player.id}-secondary-character`}>
              <span>Personnage 2</span>
              <select
                id={`${player.id}-secondary-character`}
                value={player.secondaryCharacter}
                onChange={(event) => onSecondaryCharacterChange(event.target.value)}
              >
                <option value="">Aucun deuxième personnage</option>
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-control compact-control" htmlFor={`${player.id}-secondary-render`}>
              <span>Skin 2</span>
              <select
                id={`${player.id}-secondary-render`}
                value={player.secondaryRenderId}
                disabled={!selectedSecondaryCharacter}
                onChange={(event) => onSecondaryRenderChange(event.target.value)}
              >
                <option value="">
                  {selectedSecondaryCharacter ? 'Choisir un skin' : 'Choisir un personnage'}
                </option>
                {selectedSecondaryCharacter?.renders.map((render) => (
                  <option key={render.id} value={render.id}>
                    {render.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            className={`layer-select-button${isSecondaryActive ? ' is-active' : ''}`}
            type="button"
            disabled={!player.secondaryRender}
            aria-pressed={isSecondaryActive}
            onClick={() => onSelectLayer('secondary')}
          >
            {isSecondaryActive ? 'Render 2 actif sur le canvas' : 'Manipuler le render 2'}
          </button>

          <div className="ranges-grid">
            <RangeControl id={`${player.id}-secondary-x`} label="Position X" value={player.secondaryX} min={-100} max={100} step={0.1} suffix="%" onChange={(secondaryX) => onChange({ secondaryX })} />
            <RangeControl id={`${player.id}-secondary-y`} label="Position Y" value={player.secondaryY} min={-100} max={100} step={0.1} suffix="%" onChange={(secondaryY) => onChange({ secondaryY })} />
            <RangeControl id={`${player.id}-secondary-scale`} label="Zoom" value={player.secondaryScale} min={0.25} max={2.5} step={0.05} suffix="×" onChange={(secondaryScale) => onChange({ secondaryScale })} />
            <RangeControl id={`${player.id}-secondary-opacity`} label="Opacité" value={player.secondaryOpacity} min={0} max={100} suffix="%" onChange={(secondaryOpacity) => onChange({ secondaryOpacity })} />
          </div>

          <label className="toggle-control" htmlFor={`${player.id}-secondary-flip`}>
            <input
              id={`${player.id}-secondary-flip`}
              type="checkbox"
              checked={player.secondaryFlipped}
              onChange={(event) => onChange({ secondaryFlipped: event.target.checked })}
            />
            <span>Retourner le personnage 2</span>
          </label>
        </fieldset>

        <fieldset className="control-group placement-controls">
          <legend>Chiffre de position</legend>
          <div className="ranges-grid">
            <RangeControl id={`${player.id}-rank-x`} label="Position X" value={player.rankX} min={0} max={canvasWidth} suffix=" px" onChange={(rankX) => onChange({ rankX })} />
            <RangeControl id={`${player.id}-rank-y`} label="Position Y" value={player.rankY} min={0} max={canvasHeight} suffix=" px" onChange={(rankY) => onChange({ rankY })} />
            <RangeControl id={`${player.id}-rank-size`} label="Taille" value={player.rankSize} min={8} max={80} suffix=" px" onChange={(rankSize) => onChange({ rankSize })} />
          </div>

          <div className="rank-options">
            <label className="color-control" htmlFor={`${player.id}-rank-color`}>
              <span>Couleur</span>
              <span className="color-input-wrap">
                <input
                  id={`${player.id}-rank-color`}
                  type="color"
                  value={player.rankColor}
                  onChange={(event) => onChange({ rankColor: event.target.value })}
                />
                <output htmlFor={`${player.id}-rank-color`}>{player.rankColor}</output>
              </span>
            </label>

            <label className="text-control rank-layer-control" htmlFor={`${player.id}-rank-layer`}>
              <span>Profondeur</span>
              <select
                id={`${player.id}-rank-layer`}
                value={player.rankLayer}
                onChange={(event) => onChange({ rankLayer: event.target.value })}
              >
                <option value="front">Premier plan</option>
                <option value="back">Derrière le personnage</option>
              </select>
            </label>
          </div>
        </fieldset>
      </div>
    </details>
  )
}

export default memo(PlayerEditor, (previous, next) =>
  previous.player === next.player &&
  previous.selectedLayer === next.selectedLayer &&
  previous.characters === next.characters &&
  previous.slotNumber === next.slotNumber &&
  previous.canvasWidth === next.canvasWidth &&
  previous.canvasHeight === next.canvasHeight &&
  previous.isAutoPlacing === next.isAutoPlacing,
)
