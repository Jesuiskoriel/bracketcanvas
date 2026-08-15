export const typographySystems = [
  { id: 'condensed', label: 'Condensée esport', title: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', labelFont: 'Arial Narrow, Arial, sans-serif', weight: 900, transform: 'uppercase', tracking: '.015em' },
  { id: 'grotesk-massive', label: 'Grotesk massive', title: 'Arial Black, Arial, sans-serif', labelFont: 'Arial, Helvetica, sans-serif', weight: 900, transform: 'uppercase', tracking: '-.025em' },
  { id: 'serif-editorial', label: 'Serif éditoriale', title: 'Georgia, "Times New Roman", serif', labelFont: 'Arial, Helvetica, sans-serif', weight: 700, transform: 'none', tracking: '-.015em' },
  { id: 'mono-tech', label: 'Monospace technique', title: 'ui-monospace, SFMono-Regular, Menlo, monospace', labelFont: 'ui-monospace, SFMono-Regular, Menlo, monospace', weight: 800, transform: 'uppercase', tracking: '.045em' },
  { id: 'comic', label: 'Comic impact', title: 'Impact, "Arial Black", sans-serif', labelFont: 'Trebuchet MS, Arial, sans-serif', weight: 900, transform: 'uppercase', tracking: '.025em' },
  { id: 'retro-arcade', label: 'Arcade rétro', title: 'Courier New, ui-monospace, monospace', labelFont: 'Courier New, ui-monospace, monospace', weight: 900, transform: 'uppercase', tracking: '.05em' },
  { id: 'elegant-serif', label: 'Serif élégante', title: '"Hylia Serif", Georgia, serif', labelFont: 'Georgia, "Times New Roman", serif', weight: 600, transform: 'uppercase', tracking: '.065em' },
  { id: 'heavy-display', label: 'Display lourde', title: 'Impact, Haettenschweiler, sans-serif', labelFont: 'Arial Black, Arial, sans-serif', weight: 900, transform: 'uppercase', tracking: '.01em' },
  { id: 'minimal-sans', label: 'Sans serif minimale', title: 'Arial, Helvetica, sans-serif', labelFont: 'Arial, Helvetica, sans-serif', weight: 700, transform: 'uppercase', tracking: '.08em' },
  { id: 'geometric', label: 'Géométrique', title: 'Trebuchet MS, Arial, sans-serif', labelFont: 'Arial, Helvetica, sans-serif', weight: 800, transform: 'uppercase', tracking: '.025em' },
]

const legacyAliases = { serif: 'serif-editorial', mono: 'mono-tech' }

export const getTypographySystem = (id) => typographySystems.find(
  (system) => system.id === (legacyAliases[id] || id),
)
