// CalendarioTurnex: wrapper sobre Calendar con semana Dom-Sáb y targets touch 44px
import { Calendar } from './calendar.js'

export class CalendarioTurnex {
  constructor (gridEl, labelEl, opts = {}) {
    this.gridEl = gridEl
    this.labelEl = labelEl
    // fuerza semana domingo-primero; permite override
    const options = { weekStart: 'sunday', ...(opts || {}) }
    this._cal = new Calendar(gridEl, labelEl, options)
    // mejorar targets táctiles
    if (this.gridEl) this.gridEl.classList.add('calendar-touch-44')
  }

  mount () { this._cal.mount() }
  prev () { this._cal.prev() }
  next () { this._cal.next() }
  onSelect (cb) { this._cal.onSelect(cb) }
  setSelected (d) { this._cal.setSelected(d) }
}
