import { t, useLanguage } from '../i18n.js'
import { memo } from 'react'

function RangeControl({ id, label, value, min, max, step = 1, suffix, onChange }) {
  return (
    <label className="range-control" htmlFor={id}>
      <span>
        {t(label)}
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
  onSlotBackgroundChange,
  isAutoPlacing,
  onAutoPlace,
}) {
  useLanguage()
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
          <strong>{player.playerName || t("Joueur {0}", { 0: slotNumber })}</strong>
          <small>{t("Case ")}{slotNumber}</small>
        </span>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="editor-fields">
        <label className="text-control" htmlFor={`${player.id}-name`}>
          <span>{t("Pseudo")}</span>
          <input
            id={`${player.id}-name`}
            type="text"
            value={player.playerName}
            maxLength={24}
            placeholder={t("Joueur {0}", { 0: slotNumber })}
            onChange={(event) => onChange({ playerName: event.target.value })}
          />
        </label>

        <div className="logo-control">
          <span>{t("Logo d’équipe")}</span>
          <div className="logo-input-row">
            <label className="file-button">
              {player.teamLogo ? t("Remplacer le logo") : t("Importer un logo")}
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
              >{t("Retirer")}</button>
            )}
          </div>
          <small>{player.teamLogoName || t("PNG, JPG, WebP ou SVG")}</small>
        </div>

        {player.teamLogo && (
          <fieldset className="control-group team-logo-controls">
            <legend>{t("Position du logo d’équipe")}</legend>
            <div className="ranges-grid">
              <RangeControl id={`${player.id}-team-logo-x`} label={t("Position X")} value={player.teamLogoX} min={0} max={100} step={0.1} suffix="%" onChange={(teamLogoX) => onChange({ teamLogoX })} />
              <RangeControl id={`${player.id}-team-logo-y`} label={t("Position Y")} value={player.teamLogoY} min={0} max={100} step={0.1} suffix="%" onChange={(teamLogoY) => onChange({ teamLogoY })} />
              <RangeControl id={`${player.id}-team-logo-size`} label={t("Taille")} value={player.teamLogoSize} min={5} max={80} step={0.5} suffix="%" onChange={(teamLogoSize) => onChange({ teamLogoSize })} />
            </div>
          </fieldset>
        )}

        <div className="logo-control">
          <span>{t("Fond de la case")}</span>
          <div className="logo-input-row">
            <label className="file-button">
              {player.slotBackground ? t("Remplacer l’image") : t("Importer une image")}
              <input
                id={`${player.id}-slot-background`}
                className="visually-hidden-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => {
                  onSlotBackgroundChange(event.target.files?.[0] || null)
                  event.target.value = ''
                }}
              />
            </label>
            {player.slotBackground && (
              <button
                className="remove-logo-button"
                type="button"
                onClick={() => onSlotBackgroundChange(null)}
              >{t("Retirer")}</button>
            )}
          </div>
          <small>{player.slotBackgroundName || t("Remplace la texture de cette case")}</small>
        </div>

        <div className="selects-grid">
          <label className="text-control" htmlFor={`${player.id}-character`}>
            <span>{t("Personnage")}</span>
            <select
              id={`${player.id}-character`}
              value={player.character}
              onChange={(event) => onCharacterChange(event.target.value)}
            >
              <option value="">{t("Choisir un personnage")}</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-control" htmlFor={`${player.id}-render`}>
            <span>{t("Apparence")}</span>
            <select
              id={`${player.id}-render`}
              value={player.renderId}
              disabled={!selectedCharacter}
              onChange={(event) => onRenderChange(event.target.value)}
            >
              <option value="">
                {selectedCharacter ? t("Choisir une apparence") : t("Choisir un personnage")}
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
          {isAutoPlacing ? t("Cadrage en cours…") : t("Cadrage automatique")}
        </button>

        <fieldset className="control-group">
          <legend>{t("Visuel du personnage")}</legend>
          <button
            className={`layer-select-button${isPrimaryActive ? ' is-active' : ''}`}
            type="button"
            disabled={!player.render}
            aria-pressed={isPrimaryActive}
            onClick={() => onSelectLayer('primary')}
          >
            {isPrimaryActive ? t("Visuel 1 actif sur le canevas") : t("Modifier le visuel 1")}
          </button>
          <div className="ranges-grid">
            <RangeControl id={`${player.id}-x`} label={t("Position X")} value={player.x} min={-100} max={100} step={0.1} suffix="%" onChange={(x) => onChange({ x })} />
            <RangeControl id={`${player.id}-y`} label={t("Position Y")} value={player.y} min={-100} max={100} step={0.1} suffix="%" onChange={(y) => onChange({ y })} />
            <RangeControl id={`${player.id}-scale`} label={t("Zoom")} value={player.scale} min={0.25} max={2.5} step={0.05} suffix="×" onChange={(scale) => onChange({ scale })} />
            <RangeControl id={`${player.id}-opacity`} label={t("Opacité")} value={player.opacity} min={0} max={100} suffix="%" onChange={(opacity) => onChange({ opacity })} />
          </div>

          <label className="toggle-control" htmlFor={`${player.id}-flip`}>
            <input
              id={`${player.id}-flip`}
              type="checkbox"
              checked={player.flipped}
              onChange={(event) => onChange({ flipped: event.target.checked })}
            />
            <span>{t("Retourner horizontalement")}</span>
          </label>
        </fieldset>

        <fieldset className="control-group secondary-character-controls">
          <legend>{t("Deuxième personnage")}</legend>
          <div className="selects-grid">
            <label className="text-control compact-control" htmlFor={`${player.id}-secondary-character`}>
              <span>{t("Personnage 2")}</span>
              <select
                id={`${player.id}-secondary-character`}
                value={player.secondaryCharacter}
                onChange={(event) => onSecondaryCharacterChange(event.target.value)}
              >
                <option value="">{t("Aucun deuxième personnage")}</option>
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-control compact-control" htmlFor={`${player.id}-secondary-render`}>
              <span>{t("Apparence 2")}</span>
              <select
                id={`${player.id}-secondary-render`}
                value={player.secondaryRenderId}
                disabled={!selectedSecondaryCharacter}
                onChange={(event) => onSecondaryRenderChange(event.target.value)}
              >
                <option value="">
                  {selectedSecondaryCharacter ? t("Choisir une apparence") : t("Choisir un personnage")}
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
            {isSecondaryActive ? t("Visuel 2 actif sur le canevas") : t("Modifier le visuel 2")}
          </button>

          <div className="ranges-grid">
            <RangeControl id={`${player.id}-secondary-x`} label={t("Position X")} value={player.secondaryX} min={-100} max={100} step={0.1} suffix="%" onChange={(secondaryX) => onChange({ secondaryX })} />
            <RangeControl id={`${player.id}-secondary-y`} label={t("Position Y")} value={player.secondaryY} min={-100} max={100} step={0.1} suffix="%" onChange={(secondaryY) => onChange({ secondaryY })} />
            <RangeControl id={`${player.id}-secondary-scale`} label={t("Zoom")} value={player.secondaryScale} min={0.25} max={2.5} step={0.05} suffix="×" onChange={(secondaryScale) => onChange({ secondaryScale })} />
            <RangeControl id={`${player.id}-secondary-opacity`} label={t("Opacité")} value={player.secondaryOpacity} min={0} max={100} suffix="%" onChange={(secondaryOpacity) => onChange({ secondaryOpacity })} />
          </div>

          <label className="toggle-control" htmlFor={`${player.id}-secondary-flip`}>
            <input
              id={`${player.id}-secondary-flip`}
              type="checkbox"
              checked={player.secondaryFlipped}
              onChange={(event) => onChange({ secondaryFlipped: event.target.checked })}
            />
            <span>{t("Retourner le personnage 2")}</span>
          </label>
        </fieldset>

        <fieldset className="control-group placement-controls">
          <legend>{t("Chiffre de position")}</legend>
          <div className="ranges-grid">
            <RangeControl id={`${player.id}-rank-x`} label={t("Position X")} value={player.rankX} min={0} max={canvasWidth} suffix=" px" onChange={(rankX) => onChange({ rankX })} />
            <RangeControl id={`${player.id}-rank-y`} label={t("Position Y")} value={player.rankY} min={0} max={canvasHeight} suffix=" px" onChange={(rankY) => onChange({ rankY })} />
            <RangeControl id={`${player.id}-rank-size`} label={t("Taille")} value={player.rankSize} min={8} max={80} suffix=" px" onChange={(rankSize) => onChange({ rankSize })} />
          </div>

          <div className="rank-options">
            <label className="color-control" htmlFor={`${player.id}-rank-color`}>
              <span>{t("Couleur")}</span>
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
              <span>{t("Profondeur")}</span>
              <select
                id={`${player.id}-rank-layer`}
                value={player.rankLayer}
                onChange={(event) => onChange({ rankLayer: event.target.value })}
              >
                <option value="front">{t("Premier plan")}</option>
                <option value="back">{t("Derrière le personnage")}</option>
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
