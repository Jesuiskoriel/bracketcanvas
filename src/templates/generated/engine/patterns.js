import { svgDataUrl } from './constants.js'
import { clamp } from './random.js'

export const textureSystems = [
  'minimal', 'halftone', 'grid', 'speed', 'noise', 'pixels', 'checker',
  'scanlines', 'circuit', 'runes', 'spray', 'ink', 'bubbles', 'paper',
  'organic', 'gradient', 'blocks', 'lines',
].map((id) => ({ id }))

const patternMarkup = ({ id, base, accent, ink, text, opacity, scale }) => {
  const size = Math.max(6, Math.round(18 * scale))
  const patterns = {
    minimal: `<pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="${base}"/><path d="M0 79H80" stroke="${accent}" opacity="${opacity}"/></pattern>`,
    halftone: `<pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><rect width="${size}" height="${size}" fill="${base}"/><circle cx="${size * .28}" cy="${size * .28}" r="${Math.max(1.4, size * .13)}" fill="${ink}"/><circle cx="${size * .78}" cy="${size * .78}" r="${Math.max(1, size * .08)}" fill="${accent}" opacity="${opacity}"/></pattern>`,
    grid: `<pattern id="p" width="${size + 5}" height="${size + 5}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="${base}"/><path d="M${size + 5} 0H0V${size + 5}" fill="none" stroke="${accent}" opacity="${opacity}"/><circle cx="1" cy="1" r="1.3" fill="${accent}"/></pattern>`,
    speed: `<pattern id="p" width="${size * 2}" height="${size}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="${base}"/><path d="M-${size} ${size}L0 0M${size * .25} ${size}L${size * 1.25} 0M${size * 1.5} ${size}L${size * 2.5} 0" stroke="${accent}" stroke-width="${Math.max(2, size * .13)}" opacity="${opacity}"/></pattern>`,
    noise: `<pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="${base}"/><path d="M2 5L8 2M15 8L23 4M4 19L12 13M16 22L22 16" stroke="${accent}" opacity="${opacity}"/><circle cx="17" cy="13" r="1" fill="${ink}"/></pattern>`,
    pixels: `<pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="${base}"/><rect x="2" y="2" width="${size * .28}" height="${size * .28}" fill="${accent}" opacity="${opacity}"/><rect x="${size * .6}" y="${size * .6}" width="${size * .32}" height="${size * .32}" fill="${ink}" opacity=".42"/></pattern>`,
    checker: `<pattern id="p" width="${size * 2}" height="${size * 2}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="${base}"/><path d="M0 0H${size}V${size}H0ZM${size} ${size}H${size * 2}V${size * 2}H${size}Z" fill="${accent}" opacity="${opacity}"/></pattern>`,
    scanlines: `<pattern id="p" width="12" height="${Math.max(5, size * .4)}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="${base}"/><path d="M0 1H12" stroke="${text}" opacity="${opacity}"/></pattern>`,
    circuit: `<pattern id="p" width="${size + 12}" height="${size + 12}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="${base}"/><path d="M0 8H20V24H${size + 12}M8 0V15H26V${size + 12}" fill="none" stroke="${accent}" opacity="${opacity}"/><circle cx="20" cy="8" r="2" fill="${accent}"/></pattern>`,
    runes: `<pattern id="p" width="${size + 8}" height="${size + 8}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="${base}"/><path d="M${(size + 8) / 2} 3L${size + 2} ${(size + 8) / 2}L${(size + 8) / 2} ${size + 5}L6 ${(size + 8) / 2}Z M${(size + 8) / 2} 8V${size}" fill="none" stroke="${accent}" opacity="${opacity}"/></pattern>`,
    spray: `<pattern id="p" width="36" height="30" patternUnits="userSpaceOnUse"><rect width="36" height="30" fill="${base}"/><circle cx="5" cy="7" r="2" fill="${accent}" opacity="${opacity}"/><circle cx="24" cy="18" r="4" fill="${ink}" opacity=".35"/><circle cx="31" cy="4" r="1" fill="${text}"/><path d="M0 28L36 4" stroke="${accent}" stroke-width="2" opacity="${opacity}"/></pattern>`,
    ink: `<pattern id="p" width="44" height="34" patternUnits="userSpaceOnUse"><rect width="44" height="34" fill="${base}"/><path d="M-5 31C9 20 18 27 48 3M-2 14C14 7 25 13 46 -4" fill="none" stroke="${ink}" stroke-width="${Math.max(2, scale * 2.5)}" opacity="${opacity}"/></pattern>`,
    bubbles: `<pattern id="p" width="42" height="42" patternUnits="userSpaceOnUse"><rect width="42" height="42" fill="${base}"/><circle cx="10" cy="12" r="7" fill="none" stroke="${accent}" stroke-width="2" opacity="${opacity}"/><circle cx="34" cy="32" r="4" fill="${text}" opacity=".24"/></pattern>`,
    paper: `<pattern id="p" width="36" height="30" patternUnits="userSpaceOnUse"><rect width="36" height="30" fill="${base}"/><path d="M0 7C12 3 22 10 36 4M0 24C9 19 28 27 36 19" fill="none" stroke="${ink}" opacity="${Number(opacity) * .55}"/><circle cx="7" cy="17" r=".7" fill="${text}" opacity=".25"/></pattern>`,
    organic: `<pattern id="p" width="56" height="48" patternUnits="userSpaceOnUse"><rect width="56" height="48" fill="${base}"/><path d="M-8 31C8 8 28 50 64 12" fill="none" stroke="${accent}" stroke-width="6" opacity="${opacity}"/><circle cx="42" cy="35" r="9" fill="${ink}" opacity=".14"/></pattern>`,
    gradient: `<linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${base}"/><stop offset=".55" stop-color="${accent}"/><stop offset="1" stop-color="${ink}"/></linearGradient>`,
    blocks: `<pattern id="p" width="48" height="36" patternUnits="userSpaceOnUse"><rect width="48" height="36" fill="${base}"/><rect width="28" height="9" x="3" y="4" fill="${accent}" opacity="${opacity}"/><rect width="13" height="15" x="32" y="18" fill="${ink}" opacity=".3"/></pattern>`,
    lines: `<pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><rect width="100%" height="100%" fill="${base}"/><path d="M0 2H${size}" stroke="${accent}" opacity="${opacity}"/></pattern>`,
  }
  return patterns[id] || patterns.minimal
}

export const createSlotTexture = ({
  textureId,
  palette,
  index,
  intensity = 50,
  textureScale = 50,
  hierarchy = 'balanced',
}) => {
  const base = index === 0
    ? palette.winner
    : index % 3 === 1 ? palette.primary : index % 3 === 2 ? palette.secondary : palette.surface
  const opacity = (0.12 + clamp(intensity, 0, 100) * 0.0032).toFixed(2)
  const scale = 0.72 + clamp(Number(textureScale), 0, 100) * 0.011
  const pattern = patternMarkup({
    id: textureId,
    base,
    accent: palette.accent,
    ink: palette.outline,
    text: palette.text,
    opacity,
    scale,
  })
  const winnerMark = index === 0 && ['giant', 'number-led', 'isolated'].includes(hierarchy)
    ? `<circle cx="255" cy="40" r="82" fill="none" stroke="${palette.text}" stroke-width="15" opacity=".11"/>`
    : ''
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><defs>${pattern}</defs><rect width="320" height="220" fill="url(#p)"/>${winnerMark}</svg>`)
}
