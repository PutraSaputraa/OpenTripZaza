const fullScheduleStatuses = ['full', 'penuh']
const inactiveScheduleStatuses = ['inactive', 'ditutup', 'selesai']
const approvedStatuses = ['approved', 'disetujui', 'selesai']
const privateBlockingStatuses = ['pending', 'menunggu approval', 'approved', 'disetujui']

const normalized = (value) => String(value || '').trim().toLowerCase()

export const getRegistrationDate = (registration) => registration?.selectedDate || registration?.requestedDate || ''

export const isApprovedRegistration = (registration) => approvedStatuses.includes(normalized(registration?.status))

export const isPrivateBlockingRegistration = (registration) => privateBlockingStatuses.includes(normalized(registration?.status))

export function getPrivateDateRange(trip) {
  return {
    startDate: trip?.availableStartDate || trip?.privateStartDate || '',
    endDate: trip?.availableEndDate || trip?.privateEndDate || '',
  }
}

export function isDateWithinPrivateRange(trip, selectedDate) {
  if (!selectedDate) return false
  const { startDate, endDate } = getPrivateDateRange(trip)
  if (startDate && selectedDate < startDate) return false
  if (endDate && selectedDate > endDate) return false
  return true
}

export function normalizeScheduleStatus(status, fallback = 'active') {
  const value = normalized(status || fallback)
  if (fullScheduleStatuses.includes(value)) return 'full'
  if (inactiveScheduleStatuses.includes(value)) return 'inactive'
  return 'active'
}

export function scheduleStatusLabel(status) {
  const normalizedStatus = normalizeScheduleStatus(status)
  if (normalizedStatus === 'full') return 'Penuh'
  if (normalizedStatus === 'inactive') return 'Nonaktif'
  return 'Tersedia'
}

export function getTripSchedules(trip) {
  if (Array.isArray(trip?.schedules) && trip.schedules.length) {
    return trip.schedules.map((schedule, index) => ({
      id: schedule.id || `schedule_${index + 1}`,
      date: schedule.date || '',
      quota: Number(schedule.quota || trip?.quota || 0),
      bookedCount: Number(schedule.bookedCount || 0),
      status: normalizeScheduleStatus(schedule.status),
    }))
  }

  if (!trip?.date && !trip?.quota) return []
  const status = trip?.status === 'Penuh' ? 'full' : trip?.status === 'Ditutup' || trip?.status === 'Selesai' ? 'inactive' : 'active'
  return [{
    id: 'legacy_date',
    date: trip?.date || '',
    quota: Number(trip?.quota || trip?.slots || 0),
    bookedCount: 0,
    status,
  }]
}

export function getTripSessions(trip) {
  if (Array.isArray(trip?.sessions) && trip.sessions.length) {
    return trip.sessions.map((session, index) => ({
      id: session.id || `session_${index + 1}`,
      name: session.name || `Sesi ${index + 1}`,
      startTime: session.startTime || '',
      endTime: session.endTime || '',
      status: normalizeScheduleStatus(session.status),
    }))
  }

  return [{
    id: 'legacy_session',
    name: 'Sesi fleksibel',
    startTime: '',
    endTime: '',
    status: 'active',
    isLegacy: true,
  }]
}

export function isSameScheduleRegistration(registration, schedule) {
  if (!registration || !schedule) return false
  if (registration.scheduleId) return registration.scheduleId === schedule.id
  const registrationDate = getRegistrationDate(registration)
  if (!registrationDate && schedule.id === 'legacy_date') return true
  return registrationDate === schedule.date
}

export function getScheduleBookedCount(registrations = [], tripId, schedule) {
  return registrations
    .filter((registration) => Number(registration.tripId) === Number(tripId))
    .filter(isApprovedRegistration)
    .filter((registration) => isSameScheduleRegistration(registration, schedule))
    .reduce((total, registration) => total + Number(registration.participants || registration.participantCount || 0), 0)
}

export function getScheduleAvailability(trip, registrations, schedule) {
  const bookedCount = getScheduleBookedCount(registrations, trip?.id, schedule)
  const quota = Number(schedule?.quota || 0)
  const status = normalizeScheduleStatus(schedule?.status)
  const remaining = Math.max(quota - bookedCount, 0)
  const isFull = status === 'full' || remaining <= 0
  return {
    ...schedule,
    bookedCount,
    quota,
    remaining,
    status: isFull ? 'full' : status,
    isSelectable: status === 'active' && remaining > 0,
  }
}

export function getOpenTripScheduleOptions(trip, registrations = []) {
  return getTripSchedules(trip).map((schedule) => getScheduleAvailability(trip, registrations, schedule))
}

export function isPrivateSessionBooked(registrations = [], tripId, selectedDate, sessionId) {
  if (!selectedDate || !sessionId) return false
  return registrations
    .filter((registration) => Number(registration.tripId) === Number(tripId))
    .filter((registration) => registration.isPrivateTrip || registration.isPrivateTour || registration.tripType === 'private')
    .filter(isPrivateBlockingRegistration)
    .some((registration) => getRegistrationDate(registration) === selectedDate && registration.sessionId === sessionId)
}

export function getPrivateSessionOptions(trip, registrations = [], selectedDate) {
  return getTripSessions(trip).map((session) => {
    const booked = !session.isLegacy && isPrivateSessionBooked(registrations, trip?.id, selectedDate, session.id)
    const status = normalizeScheduleStatus(session.status)
    return {
      ...session,
      isBooked: booked,
      isSelectable: status === 'active' && !booked,
    }
  })
}

export function hasScheduleRegistrations(registrations = [], tripId, schedule) {
  return registrations
    .filter((registration) => Number(registration.tripId) === Number(tripId))
    .some((registration) => isSameScheduleRegistration(registration, schedule))
}
