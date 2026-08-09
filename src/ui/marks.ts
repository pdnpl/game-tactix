import type { Player } from '../game/types'

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Builds the SVG for a mark inside a 0-100 box.
 *
 * Every shape carries `pathLength="1"` so the draw-in animation in CSS can use a
 * single dash rule for both marks, whatever their real geometry.
 */
export function markSvg(player: Player): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add(player === 'X' ? 'mark-x' : 'mark-o')

  if (player === 'X') {
    for (const d of ['M22 22 L78 78', 'M78 22 L22 78']) {
      const path = document.createElementNS(SVG_NS, 'path')
      path.setAttribute('d', d)
      path.setAttribute('pathLength', '1')
      svg.append(path)
    }
  } else {
    const circle = document.createElementNS(SVG_NS, 'circle')
    circle.setAttribute('cx', '50')
    circle.setAttribute('cy', '50')
    circle.setAttribute('r', '28')
    circle.setAttribute('pathLength', '1')
    svg.append(circle)
  }

  return svg
}
