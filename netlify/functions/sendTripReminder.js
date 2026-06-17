import { Buffer } from 'node:buffer'
import process from 'node:process'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
})

const getErrorMessage = (error) => {
  if (error instanceof Error) return error.message
  return String(error || 'Unknown error')
}

const logFunctionError = (stage, error, extra = {}) => {
  console.error('[sendTripReminder]', {
    stage,
    message: getErrorMessage(error),
    stack: error?.stack,
    ...extra,
  })
}

const parseServiceAccountJson = (rawValue) => {
  const trimmedValue = String(rawValue || '').trim()
  if (!trimmedValue) return null

  try {
    return JSON.parse(trimmedValue)
  } catch (jsonError) {
    try {
      return JSON.parse(Buffer.from(trimmedValue, 'base64').toString('utf8'))
    } catch (base64Error) {
      const parseError = new Error('FIREBASE_SERVICE_ACCOUNT harus berupa JSON service account Firebase yang valid.', { cause: base64Error })
      parseError.jsonParseMessage = getErrorMessage(jsonError)
      throw parseError
    }
  }
}

const normalizeServiceAccount = (serviceAccount) => {
  const projectId = serviceAccount?.project_id || serviceAccount?.projectId
  const clientEmail = serviceAccount?.client_email || serviceAccount?.clientEmail
  const privateKey = String(serviceAccount?.private_key || serviceAccount?.privateKey || '').replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT belum lengkap. Pastikan project_id, client_email, dan private_key ada.')
  }

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT private_key tidak valid. Gunakan isi JSON service account asli dari Firebase.')
  }

  return { projectId, clientEmail, privateKey }
}

const parseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return normalizeServiceAccount(parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT))
  }

  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    return normalizeServiceAccount({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  }

  return null
}

const getAdminDb = () => {
  if (!getApps().length) {
    const serviceAccount = parseServiceAccount()
    if (!serviceAccount) {
      throw new Error('Konfigurasi Firebase Admin belum tersedia.')
    }
    try {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.projectId,
      })
    } catch (error) {
      throw new Error(`Firebase Admin gagal diinisialisasi: ${error.message}`, { cause: error })
    }
  }

  return getFirestore()
}

const normalizeStatus = (status) => String(status || '').trim().toLowerCase()
const isApprovedStatus = (status) => {
  const normalized = normalizeStatus(status)
  return normalized === 'approved' || normalized === 'disetujui'
}

const formatTripDate = (value) => {
  if (!value) return '-'
  const text = String(value)
  const parts = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const date = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    : new Date(text)

  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const findTrip = async (db, scheduleId) => {
  const docSnap = await db.collection('trips').doc(String(scheduleId)).get()
  if (docSnap.exists) return { id: docSnap.id, ...docSnap.data() }

  const numericId = Number(scheduleId)
  if (!Number.isNaN(numericId)) {
    const querySnap = await db.collection('trips').where('id', '==', numericId).limit(1).get()
    if (!querySnap.empty) {
      const tripDoc = querySnap.docs[0]
      return { id: tripDoc.id, ...tripDoc.data() }
    }
  }

  return null
}

const getRegistrationDate = (registration) => registration?.selectedDate || registration?.requestedDate || ''

const getLocalizedText = (value) => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return value.id || value.en || ''
  return String(value)
}

const isPrivateRegistration = (registration) => (
  registration?.isPrivateTrip ||
  registration?.isPrivateTour ||
  String(registration?.tripType || '').toLowerCase() === 'private'
)

const isSameScheduleRegistration = (registration, tripScheduleId, selectedDate) => {
  if (!tripScheduleId && !selectedDate) return true
  if (tripScheduleId && registration.scheduleId) return registration.scheduleId === tripScheduleId
  if (selectedDate) return getRegistrationDate(registration) === selectedDate
  return false
}

const isSameRegistrationId = (registration, registrationId = '') => {
  if (!registrationId) return true
  const targetId = String(registrationId)
  return [registration.id, registration.docId]
    .filter((value) => value !== undefined && value !== null)
    .some((value) => String(value) === targetId)
}

const findRegistrations = async (db, tripId, tripScheduleId = '', selectedDate = '', registrationId = '') => {
  const numericId = Number(tripId)
  const snapshots = []

  if (!Number.isNaN(numericId)) {
    snapshots.push(await db.collection('registrations').where('tripId', '==', numericId).get())
  }
  snapshots.push(await db.collection('registrations').where('tripId', '==', String(tripId)).get())

  const byId = new Map()
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((registrationDoc) => {
      byId.set(registrationDoc.id, { docId: registrationDoc.id, ...registrationDoc.data() })
    })
  })

  return [...byId.values()]
    .filter((registration) => isApprovedStatus(registration.status) && registration.email)
    .filter((registration) => isSameRegistrationId(registration, registrationId))
    .filter((registration) => isSameScheduleRegistration(registration, tripScheduleId, selectedDate))
}

const buildEmail = ({ registration, trip, tripDate }) => {
  const participantName = registration.name || 'Peserta'
  const participantCount = Number(registration.participants || 1)
  const privateTrip = isPrivateRegistration(registration)
  const tripName = trip.name || (privateTrip ? 'Private Trip' : 'Open Trip')
  const destination = getLocalizedText(trip.destination || trip.location) || '-'
  const sessionText = registration.sessionName
    ? `${registration.sessionName}${registration.startTime && registration.endTime ? ` (${registration.startTime} - ${registration.endTime})` : ''}`
    : ''
  const tripLabel = privateTrip ? 'Private Trip' : 'Open Trip'
  const subject = `Pengingat ${tripLabel} ${tripName} - ${tripDate}`
  const safeParticipantName = escapeHtml(participantName)
  const safeTripName = escapeHtml(tripName)
  const safeDestination = escapeHtml(destination)
  const safeTripDate = escapeHtml(tripDate)
  const safeSessionText = escapeHtml(sessionText)
  const text = [
    `Halo ${participantName},`,
    '',
    `Ini pengingat singkat untuk jadwal trip kamu:`,
    `Nama trip: ${tripName}`,
    `Lokasi trip: ${destination}`,
    `Tanggal trip: ${tripDate}`,
    sessionText ? `Sesi: ${sessionText}` : '',
    `Jumlah peserta: ${participantCount} orang`,
    '',
    'Mohon pastikan perlengkapan, kondisi kesehatan, dan waktu keberangkatan sudah siap. Sampai jumpa di trip.',
  ].filter((line) => line !== '').join('\n')
  const html = `
    <p>Halo ${safeParticipantName},</p>
    <p>Ini pengingat singkat untuk jadwal trip kamu:</p>
    <ul>
      <li><strong>Nama trip:</strong> ${safeTripName}</li>
      <li><strong>Lokasi trip:</strong> ${safeDestination}</li>
      <li><strong>Tanggal trip:</strong> ${safeTripDate}</li>
      ${sessionText ? `<li><strong>Sesi:</strong> ${safeSessionText}</li>` : ''}
      <li><strong>Jumlah peserta:</strong> ${participantCount} orang</li>
    </ul>
    <p>Mohon pastikan perlengkapan, kondisi kesehatan, dan waktu keberangkatan sudah siap. Sampai jumpa di trip.</p>
  `

  return { subject, text, html }
}

const sendEmail = async ({ to, subject, text, html }) => {
  const provider = String(process.env.EMAIL_PROVIDER || 'resend').toLowerCase()
  const from = process.env.REMINDER_EMAIL_FROM || process.env.EMAIL_FROM || process.env.GMAIL_USER

  if (provider === 'gmail') {
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD
    if (!user || !pass || !from) {
      throw new Error('Konfigurasi GMAIL_USER, GMAIL_APP_PASSWORD, dan REMINDER_EMAIL_FROM wajib tersedia.')
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
    await transporter.sendMail({ from, to, subject, text, html })
    return
  }

  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey || !from) {
      throw new Error('Konfigurasi RESEND_API_KEY dan REMINDER_EMAIL_FROM wajib tersedia.')
    }

    const resend = new Resend(apiKey)
    const response = await resend.emails.send({ from, to, subject, text, html })
    if (response.error) {
      throw new Error(response.error.message || 'Provider email menolak pengiriman.')
    }
    return
  }

  throw new Error(`Email provider "${provider}" belum didukung.`)
}

const writeReminderLog = (db, fields) => {
  return db.collection('reminderLogs').add({
    ...fields,
    sentAt: FieldValue.serverTimestamp(),
  })
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {})
  if (event.httpMethod !== 'POST') return jsonResponse(405, { message: 'Method not allowed.' })

  let stage = 'start'

  try {
    stage = 'parse request body'
    const body = JSON.parse(event.body || '{}')
    const scheduleId = body.scheduleId || body.tripId
    const tripScheduleId = body.tripScheduleId || body.scheduleItemId || ''
    const selectedDate = body.selectedDate || body.scheduleDate || ''
    const registrationId = body.registrationId || ''
    if (!scheduleId) return jsonResponse(400, { message: 'scheduleId atau tripId wajib dikirim.' })

    stage = 'initialize firebase admin'
    const db = getAdminDb()

    stage = 'find trip'
    const trip = await findTrip(db, scheduleId)
    if (!trip) return jsonResponse(404, { message: 'Jadwal trip tidak ditemukan.' })

    stage = 'find registrations'
    const registrations = await findRegistrations(db, scheduleId, tripScheduleId, selectedDate, registrationId)
    const tripDate = formatTripDate(selectedDate || trip.date)
    const results = []

    for (const registration of registrations) {
      const email = buildEmail({ registration, trip, tripDate: selectedDate ? tripDate : formatTripDate(getRegistrationDate(registration) || trip.date) })
      const participantName = registration.name || 'Peserta'
      const logBase = {
        scheduleId,
        tripScheduleId,
        selectedDate: selectedDate || getRegistrationDate(registration) || '',
        registrationId: registration.id || registration.docId,
        toEmail: registration.email,
        participantName,
      }

      try {
        stage = `send email to registration ${logBase.registrationId}`
        await sendEmail({ to: registration.email, ...email })
        stage = `write sent log ${logBase.registrationId}`
        await writeReminderLog(db, { ...logBase, status: 'sent' })
        results.push({ registrationId: logBase.registrationId, status: 'sent' })
      } catch (error) {
        logFunctionError(stage, error, { registrationId: logBase.registrationId })
        stage = `write failed log ${logBase.registrationId}`
        await writeReminderLog(db, {
          ...logBase,
          status: 'failed',
          errorMessage: error.message || 'Gagal mengirim email.',
        })
        results.push({ registrationId: logBase.registrationId, status: 'failed', errorMessage: error.message })
      }
    }

    const sent = results.filter((result) => result.status === 'sent').length
    const failed = results.filter((result) => result.status === 'failed').length

    return jsonResponse(200, {
      scheduleId,
      totalRecipients: registrations.length,
      sent,
      failed,
      results,
    })
  } catch (error) {
    logFunctionError(stage, error)
    return jsonResponse(500, {
      message: `Gagal memproses pengingat trip pada tahap "${stage}": ${getErrorMessage(error)}`,
    })
  }
}
