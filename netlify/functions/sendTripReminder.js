import process from 'node:process'
import admin from 'firebase-admin'
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

const parseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    return {
      projectId: parsed.project_id || parsed.projectId,
      clientEmail: parsed.client_email || parsed.clientEmail,
      privateKey: (parsed.private_key || parsed.privateKey || '').replace(/\\n/g, '\n'),
    }
  }

  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  }

  return null
}

const getAdminDb = () => {
  if (!admin.apps.length) {
    const serviceAccount = parseServiceAccount()
    if (!serviceAccount) {
      throw new Error('Konfigurasi Firebase Admin belum tersedia.')
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.projectId,
    })
  }

  return admin.firestore()
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

const findRegistrations = async (db, scheduleId) => {
  const numericId = Number(scheduleId)
  const snapshots = []

  if (!Number.isNaN(numericId)) {
    snapshots.push(await db.collection('registrations').where('tripId', '==', numericId).get())
  }
  snapshots.push(await db.collection('registrations').where('tripId', '==', String(scheduleId)).get())

  const byId = new Map()
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((registrationDoc) => {
      byId.set(registrationDoc.id, { docId: registrationDoc.id, ...registrationDoc.data() })
    })
  })

  return [...byId.values()].filter((registration) => isApprovedStatus(registration.status) && registration.email)
}

const buildEmail = ({ registration, trip, tripDate }) => {
  const participantName = registration.name || 'Peserta'
  const participantCount = Number(registration.participants || 1)
  const tripName = trip.name || 'Open Trip'
  const destination = trip.destination || trip.location || '-'
  const subject = `Pengingat Open Trip ${tripName} - ${tripDate}`
  const safeParticipantName = escapeHtml(participantName)
  const safeTripName = escapeHtml(tripName)
  const safeDestination = escapeHtml(destination)
  const safeTripDate = escapeHtml(tripDate)
  const text = [
    `Halo ${participantName},`,
    '',
    `Ini pengingat singkat untuk jadwal trip kamu:`,
    `Nama trip: ${tripName}`,
    `Lokasi trip: ${destination}`,
    `Tanggal trip: ${tripDate}`,
    `Jumlah peserta: ${participantCount} orang`,
    '',
    'Mohon pastikan perlengkapan, kondisi kesehatan, dan waktu keberangkatan sudah siap. Sampai jumpa di trip.',
  ].join('\n')
  const html = `
    <p>Halo ${safeParticipantName},</p>
    <p>Ini pengingat singkat untuk jadwal trip kamu:</p>
    <ul>
      <li><strong>Nama trip:</strong> ${safeTripName}</li>
      <li><strong>Lokasi trip:</strong> ${safeDestination}</li>
      <li><strong>Tanggal trip:</strong> ${safeTripDate}</li>
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
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {})
  if (event.httpMethod !== 'POST') return jsonResponse(405, { message: 'Method not allowed.' })

  try {
    const body = JSON.parse(event.body || '{}')
    const scheduleId = body.scheduleId || body.tripScheduleId
    if (!scheduleId) return jsonResponse(400, { message: 'scheduleId atau tripScheduleId wajib dikirim.' })

    const db = getAdminDb()
    const trip = await findTrip(db, scheduleId)
    if (!trip) return jsonResponse(404, { message: 'Jadwal trip tidak ditemukan.' })

    const registrations = await findRegistrations(db, scheduleId)
    const tripDate = formatTripDate(trip.date)
    const results = []

    for (const registration of registrations) {
      const email = buildEmail({ registration, trip, tripDate })
      const participantName = registration.name || 'Peserta'
      const logBase = {
        scheduleId,
        registrationId: registration.id || registration.docId,
        toEmail: registration.email,
        participantName,
      }

      try {
        await sendEmail({ to: registration.email, ...email })
        await writeReminderLog(db, { ...logBase, status: 'sent' })
        results.push({ registrationId: logBase.registrationId, status: 'sent' })
      } catch (error) {
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
    return jsonResponse(500, { message: error.message || 'Gagal memproses pengingat trip.' })
  }
}
