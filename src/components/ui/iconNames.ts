/**
 * Iconos incluidos en la fuente recortada (src/styles/fonts/). Un nombre que no esté aquí
 * no compila; al añadir uno, ejecuta `npm run icons` o se verá como texto.
 */
export const ICON_NAMES = [
  'arrow_circle_up',
  'bar_chart',
  'check_circle',
  'close',
  'delete',
  'donut_large',
  'error',
  'folder_open',
  'help',
  'hourglass_top',
  'info',
  'monitoring',
  'movie',
  'open_in_new',
  'pause',
  'play_arrow',
  'refresh',
  'restart_alt',
  'search',
  'swap_horiz',
  'timer',
  'today',
  'warning',
] as const

export type IconName = (typeof ICON_NAMES)[number]
