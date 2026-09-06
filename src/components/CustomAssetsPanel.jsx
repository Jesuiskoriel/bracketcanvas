import { t, useLanguage } from '../i18n.js'

function CustomAssetsPanel({
  customCharacters,
  customFonts,
  selectedFontId,
  disabled,
  onAddCharacter,
  onRemoveCharacter,
  onAddFont,
  onRemoveFont,
  onSelectFont,
}) {
  useLanguage()

  return (
    <section className="custom-assets-panel" aria-labelledby="custom-assets-title">
      <div className="section-heading">
        <p className="eyebrow">{t("Personnalisation")}</p>
        <h2 id="custom-assets-title">{t("Assets personnels")}</h2>
      </div>

      <div className="custom-assets-grid">
        <div className="logo-control">
          <span>{t("Police du canevas")}</span>
          <label className="text-control compact-control" htmlFor="custom-font-select">
            <select
              id="custom-font-select"
              value={selectedFontId || ''}
              disabled={disabled}
              onChange={(event) => onSelectFont(event.target.value)}
            >
              <option value="">{t("Police du modèle")}</option>
              {customFonts.map((font) => (
                <option key={font.id} value={font.id}>{font.name}</option>
              ))}
            </select>
          </label>
          <div className="logo-input-row">
            <label className="file-button">
              {t("Importer une police")}
              <input
                id="custom-font-upload"
                className="visually-hidden-file"
                type="file"
                accept=".otf,.ttf,.woff,.woff2,font/otf,font/ttf,font/woff,font/woff2"
                disabled={disabled}
                onChange={(event) => {
                  onAddFont(event.target.files?.[0] || null)
                  event.target.value = ''
                }}
              />
            </label>
            {selectedFontId && (
              <button
                className="remove-logo-button"
                type="button"
                disabled={disabled}
                onClick={() => onSelectFont('')}
              >{t("Police du modèle")}</button>
            )}
          </div>
          <small>{t("Les polices importées restent dans cet espace de travail.")}</small>
        </div>

        <div className="logo-control">
          <span>{t("Skins personnels")}</span>
          <div className="logo-input-row">
            <label className="file-button">
              {t("Importer un skin")}
              <input
                id="custom-skin-upload"
                className="visually-hidden-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={disabled}
                onChange={(event) => {
                  onAddCharacter(event.target.files?.[0] || null)
                  event.target.value = ''
                }}
              />
            </label>
          </div>
          <small>{t("Le skin apparaîtra dans la liste des personnages.")}</small>
        </div>
      </div>

      {(customCharacters.length > 0 || customFonts.length > 0) && (
        <div className="custom-assets-list">
          {customCharacters.map((character) => (
            <div key={character.id} className="custom-asset-row">
              <span>{character.name}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveCharacter(character.id)}
              >{t("Retirer")}</button>
            </div>
          ))}
          {customFonts.map((font) => (
            <div key={font.id} className="custom-asset-row">
              <span>{font.name}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveFont(font.id)}
              >{t("Retirer")}</button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default CustomAssetsPanel
