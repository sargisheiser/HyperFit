import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react'

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function Calendar({ selectedDate, onDateSelect, className = '' }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1))
  const [isOpen, setIsOpen] = useState(false)

  const calendarDate = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  }, [currentMonth])

  const firstDayOfMonth = useMemo(() => {
    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1)
    // Get Monday as first day (0 = Sunday, so we adjust)
    const day = firstDay.getDay()
    return day === 0 ? 6 : day - 1 // Convert Sunday (0) to 6, others -1
  }, [calendarDate])

  const daysInMonth = useMemo(() => {
    return new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate()
  }, [calendarDate])

  const previousMonth = () => {
    setCurrentMonth(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const todayDate = new Date()
    setCurrentMonth(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
    onDateSelect(todayDate)
  }

  const handleDateClick = (day) => {
    const selected = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day)
    onDateSelect(selected)
    setIsOpen(false)
  }

  const isToday = (day) => {
    const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day)
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (day) => {
    if (!selectedDate) return false
    const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day)
    return date.toDateString() === selectedDate.toDateString()
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return 'Datum auswählen'
    return selectedDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const calendarDays = useMemo(() => {
    const days = []
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }, [firstDayOfMonth, daysInMonth])

  return (
    <div className={`relative ${className}`}>
      {/* Calendar Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-[#00FF7F]/30 bg-[#0B0D13]/80 px-4 py-2.5 text-sm font-medium text-white transition hover:border-[#00FF7F]/50 hover:bg-[#0B0D13]"
      >
        <CalendarIcon className="h-4 w-4 text-[#00FF7F]" />
        <span>{formatSelectedDate()}</span>
        {selectedDate && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDateSelect(null)
            }}
            className="ml-1 rounded-full p-0.5 hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </button>

      {/* Calendar Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 z-50 mt-2 rounded-2xl border border-[#00FF7F]/30 bg-[#0B0D13] p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Calendar Header */}
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={previousMonth}
                  className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h3 className="text-base font-semibold text-white">
                  {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                </h3>
                <button
                  onClick={nextMonth}
                  className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="mb-2 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-xs font-medium text-white/50"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />
                  }

                  const isTodayDate = isToday(day)
                  const isSelectedDate = isSelected(day)

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`
                        aspect-square rounded-lg text-sm font-medium transition
                        ${isSelectedDate
                          ? 'bg-[#00FF7F] text-[#0B0D13]'
                          : isTodayDate
                            ? 'border-2 border-[#00FF7F]/50 text-[#00FF7F]'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }
                      `}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Footer Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <button
                  onClick={goToToday}
                  className="text-xs text-[#00FF7F] transition hover:text-[#00FF7F]/80"
                >
                  Heute
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}




