import { useId, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateAssessed } from '../utils/dateAssessed.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
function localDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function AssessmentDatePicker({ id, value, onChange }) {
  const calendarId = useId()
  const trigger = useRef(null)
  const [today] = useState(() => new Date())
  const [visible, setVisible] = useState(true)
  const [month, setMonth] = useState(() => value ? new Date(`${value}T12:00:00`) : new Date())
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const offset = new Date(year, monthIndex, 1).getDay()
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const years = Array.from({ length: Math.max(today.getFullYear() + 10, year) - Math.min(1900, year) + 1 }, (_, index) => Math.min(1900, year) + index)
  const choose = (date) => {
    onChange(localDateValue(date))
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setVisible(false)
    trigger.current?.focus()
  }

  return <div className="assessment-date-picker" onKeyDown={(event) => {
    if (event.key === 'Escape' && visible) {
      event.preventDefault()
      event.stopPropagation()
      setVisible(false)
      trigger.current?.focus()
    }
  }}>
    <button id={id} ref={trigger} type="button" autoFocus className="assessment-date-trigger" aria-label={`Date Assessed: ${value ? formatDateAssessed(value) : 'Choose a date'}`} aria-expanded={visible} aria-controls={calendarId} onClick={() => setVisible(!visible)}>
      <span>{value ? formatDateAssessed(value) : 'Choose a date'}</span><CalendarDays size={18} aria-hidden="true" />
    </button>
    {visible && <div id={calendarId} className="assessment-calendar" role="group" aria-label="Choose assessment date">
      <div className="assessment-calendar-nav">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={18} aria-hidden="true" /></button>
        <select aria-label="Calendar month" value={monthIndex} onChange={(event) => setMonth(new Date(year, Number(event.target.value), 1))}>
          {MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
        </select>
        <select aria-label="Calendar year" value={year} onChange={(event) => setMonth(new Date(Number(event.target.value), monthIndex, 1))}>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <div className="assessment-calendar-grid">
        {WEEKDAYS.map((name) => <span key={name} className="assessment-calendar-weekday" aria-hidden="true">{name}</span>)}
        {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
          const day = index - offset + 1
          if (day < 1 || day > days) return <span key={index} />
          const date = new Date(year, monthIndex, day, 12)
          const iso = localDateValue(date)
          return <button key={index} type="button" className="assessment-calendar-day" aria-label={formatDateAssessed(iso)} aria-pressed={value === iso} aria-current={iso === localDateValue(today) ? 'date' : undefined} onClick={() => choose(date)}>{day}</button>
        })}
      </div>
      <button type="button" className="assessment-calendar-today" onClick={() => choose(today)}>Today</button>
    </div>}
  </div>
}
