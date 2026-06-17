import { addonOptions } from '../config/constants'
import { getRegistrationDate } from './schedules'

export const mediaResultAddonIds = ['drone', 'camera360', 'documentation']

export const getJobResultLink = (job) => job?.resultLink || job?.driveLink || job?.completionLink || ''

export const getJobCompletedAt = (job) => job?.completedAt || job?.finishedAt || ''

export const getJobWorkerName = (job) => job?.completedByName || job?.workerName || job?.worker || job?.assignedWorkerName || ''

export const getJobAddonId = (job) => job?.addonId || job?.addonType || job?.jobType || ''

export const getJobAddonLabel = (job) => {
  const addonId = getJobAddonId(job)
  return job?.addonLabel || addonOptions.find((addon) => addon.id === addonId)?.label || job?.task || 'Job trip'
}

export const getNormalizedJobStatus = (job) => {
  const status = String(job?.resultStatus || job?.status || '').trim().toLowerCase()
  if (status === 'completed' || status === 'selesai') return 'completed'
  if (status === 'in_progress' || status === 'sedang berjalan' || status === 'diambil') return 'in_progress'
  return 'pending'
}

export const getCustomerJobStatusLabel = (job, t) => {
  const status = getNormalizedJobStatus(job)
  return t ? t(`workResult.status.${status}`) : {
    pending: 'Menunggu diproses',
    in_progress: 'Sedang dikerjakan',
    completed: 'Selesai',
  }[status]
}

export const isPrivateRegistration = (registration) => (
  registration?.isPrivateTrip ||
  registration?.isPrivateTour ||
  String(registration?.tripType || '').toLowerCase() === 'private'
)

const sameId = (left, right) => String(left ?? '') !== '' && String(left ?? '') === String(right ?? '')

const hasSelectedAddon = (registration, job) => {
  const addonId = getJobAddonId(job)
  if (!addonId) return true
  const selectedAddons = Array.isArray(registration?.addons) ? registration.addons : []
  return selectedAddons.includes(addonId)
}

const isSameOpenSchedule = (job, registration) => {
  if (sameId(job.scheduleId, registration.scheduleId)) return true
  if (!job.scheduleId && !registration.scheduleId && job.requestedDate && getRegistrationDate(registration)) {
    return job.requestedDate === getRegistrationDate(registration)
  }
  if (!job.scheduleId && registration.scheduleId && job.requestedDate && getRegistrationDate(registration)) {
    return job.requestedDate === getRegistrationDate(registration)
  }
  return !job.scheduleId && !job.requestedDate
}

const isSamePrivateBooking = (job, registration) => {
  if (sameId(job.bookingId, registration.id) || sameId(job.registrationId, registration.id)) return true
  if (!sameId(job.tripId, registration.tripId)) return false
  const jobDate = job.selectedDate || job.requestedDate || ''
  const registrationDate = getRegistrationDate(registration)
  const sameDate = !jobDate || !registrationDate || jobDate === registrationDate
  const sameSession = !job.sessionId || !registration.sessionId || job.sessionId === registration.sessionId
  return sameDate && sameSession
}

export const isJobForRegistration = (job, registration) => {
  if (!job || !registration) return false
  if (sameId(job.registrationId, registration.id) || sameId(job.bookingId, registration.id)) return hasSelectedAddon(registration, job)
  if (!sameId(job.tripId, registration.tripId)) return false
  const sameRegistration = isPrivateRegistration(registration)
    ? isSamePrivateBooking(job, registration)
    : isSameOpenSchedule(job, registration)
  return sameRegistration && hasSelectedAddon(registration, job)
}

export const getRegistrationResultJobs = (jobs = [], registration) => (
  jobs.filter((job) => isJobForRegistration(job, registration))
)

