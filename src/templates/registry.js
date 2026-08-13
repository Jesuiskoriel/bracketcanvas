import { validateGeneratedTemplate } from './generated/generator.js'
import { applyPaletteStateToTemplate } from './paletteTemplate.js'
import {
  LEGACY_ZERO_TEMPLATE_IDS,
  ZERO_TEMPLATE_ID,
  zeroTemplate,
} from './zero/index.js'

export const isZeroTemplateId = (templateId) =>
  !templateId ||
  templateId === ZERO_TEMPLATE_ID ||
  LEGACY_ZERO_TEMPLATE_IDS.includes(templateId)

export const getTemplate = (templateId, generatedTemplate, paletteState) => {
  if (isZeroTemplateId(templateId)) {
    return applyPaletteStateToTemplate(zeroTemplate, paletteState)
  }
  if (
    typeof templateId === 'string' &&
    templateId.startsWith('generated-') &&
    generatedTemplate?.id === templateId &&
    validateGeneratedTemplate(generatedTemplate)
  ) {
    return applyPaletteStateToTemplate(generatedTemplate, paletteState)
  }
  return applyPaletteStateToTemplate(zeroTemplate, paletteState)
}

export { ZERO_TEMPLATE_ID, zeroTemplate }
