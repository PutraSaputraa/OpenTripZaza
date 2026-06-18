import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import './App.css'
import i18n from './i18n'
import { accounts, addonOptions } from './config/constants'
import { db } from './firebase'
import { AdminDashboard, AdminSchedule, AdminTrips, AdminWorkers, TripForm } from './pages/AdminPage'
import { CustomerAccountPage, CustomerCatalog, CustomerLoginPage, CustomerSignupPage, DestinationPage, RegistrationPage, TripDetail } from './pages/UserPage'
import { MyJobs, WorkerDashboard, WorkerJobDetail, WorkerJobs } from './pages/WorkerPage'
import { LoginPage, NotFound } from './pages/shared'
import { ABOVE_MAX_PAX_RULE, getPrivatePricePerPerson, normalizePricePerPersonTiers } from './utils/pricing'
import {
  getOpenTripScheduleOptions,
  getPrivateSessionOptions,
  isDateWithinPrivateRange,
  getRegistrationDate,
  getScheduleBookedCount,
  getTripSchedules,
  isPrivateSessionBooked,
} from './utils/schedules'

const collections = {
  trips: 'trips',
  registrations: 'registrations',
  jobs: 'jobs',
  customers: 'customers',
  workers: 'workers',
}

const sortById = (items) => [...items].sort((a, b) => Number(a.id) - Number(b.id))
const withNumericId = (snapshot) => snapshot.docs.map((item) => ({ id: Number(item.data().id || item.id), ...item.data() }))
const approvedStatuses = ['Disetujui', 'Selesai']

const getJobScope = (job) => job.registrationId ? `registration-${job.registrationId}` : `trip-${job.tripId}`

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [session, setSession] = useState(null)
  const [trips, setTrips] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [jobs, setJobs] = useState([])
  const [customerAccounts, setCustomerAccounts] = useState([])
  const [workerAccounts, setWorkerAccounts] = useState([])
  const [toast, setToast] = useState('')

  const navigate = (target) => {
    window.history.pushState({}, '', target)
    setPath(target)
    window.scrollTo(0, 0)
  }

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(query(collection(db, collections.trips), orderBy('id')), (snapshot) => {
        setTrips(sortById(withNumericId(snapshot)))
      }),
      onSnapshot(query(collection(db, collections.registrations), orderBy('id', 'desc')), (snapshot) => setRegistrations(withNumericId(snapshot))),
      onSnapshot(query(collection(db, collections.jobs), orderBy('id')), (snapshot) => setJobs(sortById(withNumericId(snapshot)))),
      onSnapshot(collection(db, collections.customers), (snapshot) => setCustomerAccounts(snapshot.docs.map((item) => item.data()))),
      onSnapshot(collection(db, collections.workers), (snapshot) => setWorkerAccounts(snapshot.docs.map((item) => item.data()))),
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [])

  const login = (role, form) => {
    const account = role === 'admin'
      ? accounts.admin
      : workerAccounts.find((item) => item.email === form.email && item.password === form.password) || accounts.worker

    if (form.email === account.email && form.password === account.password) {
      const nextSession = { role: account.role, name: account.name, email: account.email }
      setSession(nextSession)
      navigate(role === 'admin' ? '/admin/dashboard' : '/pekerja/dashboard')
      return true
    }
    return false
  }

  const loginCustomer = (form, redirectTo = '/open-trip') => {
    const account = customerAccounts.find((item) => item.email === form.email && item.password === form.password)
    if (!account) return false
    const nextSession = {
      role: 'customer',
      name: account.name,
      email: account.email,
      whatsapp: account.whatsapp || '',
      address: account.address || '',
      age: account.age || '',
      gender: account.gender || '',
      healthNotes: account.healthNotes || '',
    }
    setSession(nextSession)
    navigate(redirectTo)
    return true
  }

  const signupCustomer = async (form) => {
    const exists = customerAccounts.some((item) => item.email === form.email)
    if (exists) return false
    const nextAccount = {
      name: form.name,
      whatsapp: form.whatsapp,
      email: form.email,
      password: form.password,
      role: 'customer',
      address: form.address || '',
      age: form.age || '',
      gender: form.gender || '',
      healthNotes: form.healthNotes || '',
    }
    await setDoc(doc(db, collections.customers, form.email), nextAccount)
    setSession({ role: 'customer', name: form.name, email: form.email, whatsapp: form.whatsapp, address: form.address || '', age: form.age || '', gender: form.gender || '', healthNotes: form.healthNotes || '' })
    navigate('/open-trip')
    showToast(i18n.t('toast.signupSuccess'))
    return true
  }

  const createWorkerAccount = async (form) => {
    const normalizedEmail = form.email.trim().toLowerCase()
    const exists = workerAccounts.some((item) => item.email === normalizedEmail) || accounts.worker.email === normalizedEmail
    if (exists) return false

    const nextWorker = {
      name: form.name.trim(),
      email: normalizedEmail,
      password: form.password,
      role: 'pekerja',
    }

    await setDoc(doc(db, collections.workers, normalizedEmail), nextWorker)
    showToast('Akun pekerja berhasil dibuat.')
    return true
  }

  const logout = () => {
    setSession(null)
    navigate('/')
  }

  const approvedByTrip = useMemo(() => {
    return registrations.reduce((result, item) => {
      if (item.status === 'Disetujui' || item.status === 'Selesai') {
        result[item.tripId] = (result[item.tripId] || 0) + item.participants
      }
      return result
    }, {})
  }, [registrations])

  const updateTripSlots = async (tripId, nextRegistrations = registrations) => {
    const trip = trips.find((item) => item.id === tripId)
    if (!trip) return
    if (trip.isPrivateTrip) {
      await updateDoc(doc(db, collections.trips, String(tripId)), { slots: trip.quota, status: trip.status === 'Selesai' ? 'Selesai' : 'Tersedia' })
      return
    }

    const schedules = getTripSchedules(trip).map((schedule) => {
      const bookedCount = getScheduleBookedCount(nextRegistrations, tripId, schedule)
      const remaining = Math.max(Number(schedule.quota || 0) - bookedCount, 0)
      return {
        ...schedule,
        bookedCount,
        status: schedule.status === 'inactive' ? 'inactive' : remaining <= 0 ? 'full' : 'active',
      }
    })
    const slots = schedules.reduce((total, schedule) => total + Math.max(Number(schedule.quota || 0) - Number(schedule.bookedCount || 0), 0), 0)
    const quota = schedules.reduce((total, schedule) => total + Number(schedule.quota || 0), 0) || Number(trip.quota || 0)
    const status = trip.status === 'Selesai' ? 'Selesai' : slots === 0 ? 'Penuh' : 'Tersedia'
    const firstSchedule = schedules[0]
    await updateDoc(doc(db, collections.trips, String(tripId)), { schedules, slots, quota, date: firstSchedule?.date || trip.date || '', status })
  }

  const submitRegistration = async (form) => {
    const trip = trips.find((item) => item.id === Number(form.tripId))
    if (!trip || trip.status !== 'Tersedia') return false
    const approvedRegistrations = registrations.filter((item) => item.tripId === Number(form.tripId) && (item.status === 'Disetujui' || item.status === 'Selesai'))
    const isPrivateTour = Boolean(form.isPrivateTour || trip.isPrivateTrip)
    const participantCount = isPrivateTour ? Number(form.participants) : Number(form.participants || 1)
    if (!Number.isFinite(participantCount) || participantCount < 1) return false
    if (isPrivateTour && participantCount < Number(trip.minParticipants || 1)) return false
    if (isPrivateTour && participantCount > Number(trip.maxParticipants || trip.quota || participantCount)) return false
    let selectedSchedule = null
    let selectedSession = null
    let selectedDate = form.selectedDate || form.requestedDate || ''
    if (!isPrivateTour) {
      const scheduleOptions = getOpenTripScheduleOptions(trip, registrations)
      selectedSchedule = scheduleOptions.find((schedule) => schedule.id === form.scheduleId)
      if (!selectedSchedule || !selectedSchedule.isSelectable || selectedSchedule.remaining < participantCount) return false
      selectedDate = selectedSchedule.date
    }
    const privateTourTaken = approvedRegistrations.some((item) => item.isPrivateTour)
    if (!trip.isPrivateTrip && (privateTourTaken || (isPrivateTour && approvedRegistrations.length))) return false
    if (isPrivateTour) {
      if (!selectedDate || !form.sessionId) return false
      if (!isDateWithinPrivateRange(trip, selectedDate)) return false
      const sessionOptions = getPrivateSessionOptions(trip, registrations, selectedDate)
      selectedSession = sessionOptions.find((session) => session.id === form.sessionId)
      if (!selectedSession || !selectedSession.isSelectable) return false
      if (!selectedSession.isLegacy && isPrivateSessionBooked(registrations, trip.id, selectedDate, selectedSession.id)) return false
    }
    const participantDetails = Array.isArray(form.participantDetails) && form.participantDetails.length
      ? form.participantDetails
      : [{ name: form.name, address: form.address || '', age: form.age || '', gender: form.gender || '', healthNotes: form.healthNotes || '' }]
    const primaryParticipant = participantDetails[0] || {}
    const addons = Array.isArray(form.addons)
      ? form.addons.filter((addonId) => addonOptions.some((option) => option.id === addonId))
      : []
    const id = Date.now()
    const hargaPerOrang = isPrivateTour
      ? getPrivatePricePerPerson(trip, participantCount)
      : Number(trip.price || 0)
    const totalHarga = participantCount * hargaPerOrang
    const nextItem = {
      id,
      name: form.name,
      whatsapp: form.whatsapp,
      email: form.email,
      participants: isPrivateTour ? participantCount : 1,
      participantCount: isPrivateTour ? participantCount : 1,
      tripId: Number(form.tripId),
      tripType: isPrivateTour ? 'private' : 'open',
      experienceType: trip.experienceType === 'custom' ? 'custom' : 'cave',
      notes: form.notes || '-',
      isPrivateTour,
      isPrivateTrip: Boolean(trip.isPrivateTrip),
      scheduleId: isPrivateTour ? '' : selectedSchedule.id,
      selectedDate,
      requestedDate: selectedDate,
      sessionId: isPrivateTour ? selectedSession.id : '',
      sessionName: isPrivateTour ? selectedSession.name : '',
      startTime: isPrivateTour ? selectedSession.startTime : '',
      endTime: isPrivateTour ? selectedSession.endTime : '',
      address: primaryParticipant.address || '',
      age: primaryParticipant.age || '',
      gender: primaryParticipant.gender || '',
      healthNotes: primaryParticipant.healthNotes || '',
      participantDetails,
      addons,
      transportFrom: addons.includes('transport') ? form.transportFrom || '' : '',
      hargaPerOrang,
      totalHarga,
      pricePerPerson: hargaPerOrang,
      totalPrice: totalHarga,
      status: 'Menunggu Approval',
    }
    await Promise.all([
      setDoc(doc(db, collections.registrations, String(id)), nextItem),
      setDoc(doc(db, collections.customers, form.email), {
        name: form.name,
        whatsapp: form.whatsapp,
        email: form.email,
        role: 'customer',
        address: primaryParticipant.address || '',
        age: primaryParticipant.age || '',
        gender: primaryParticipant.gender || '',
        healthNotes: primaryParticipant.healthNotes || '',
      }, { merge: true }),
    ])
    setSession((current) => current?.email === form.email ? {
      ...current,
      name: form.name,
      whatsapp: form.whatsapp,
      address: primaryParticipant.address || '',
      age: primaryParticipant.age || '',
      gender: primaryParticipant.gender || '',
      healthNotes: primaryParticipant.healthNotes || '',
    } : current)
    if (!isPrivateTour) await updateTripSlots(trip.id, [...registrations, nextItem])
    showToast(i18n.t('toast.registrationSuccess'))
    navigate('/open-trip')
    return true
  }

  const buildAddonJob = (id, registration, trip, addon, slot, totalWorkers) => ({
    id,
    tripId: Number(registration.tripId),
    registrationId: Number(registration.id),
    bookingId: Number(registration.id),
    tripType: registration.tripType || (registration.isPrivateTrip || registration.isPrivateTour || trip?.isPrivateTrip ? 'private' : 'open'),
    scheduleId: registration.scheduleId || '',
    selectedDate: getRegistrationDate(registration) || '',
    sessionId: registration.sessionId || '',
    sessionName: registration.sessionName || '',
    startTime: registration.startTime || '',
    endTime: registration.endTime || '',
    addonId: addon.id,
    addonType: addon.id,
    addonLabel: addon.label,
    customerName: registration.name,
    requestedDate: getRegistrationDate(registration) || trip?.date || '',
    slot,
    totalWorkers,
    task: addon.id === 'transport' && registration.transportFrom
      ? `${addon.task} Titik jemput: ${registration.transportFrom}.`
      : addon.task,
    status: 'Tersedia',
    worker: '',
  })

  const syncRegistrationAddonJobs = async (registration, status) => {
    const selectedAddons = Array.isArray(registration?.addons)
      ? addonOptions.filter((option) => registration.addons.includes(option.id))
      : []
    const relatedJobs = jobs.filter((job) => Number(job.registrationId) === Number(registration.id))

    if (!approvedStatuses.includes(status) || !selectedAddons.length) {
      const removableJobs = relatedJobs.filter((job) => !job.worker && job.status === 'Tersedia')
      await Promise.all(removableJobs.map((job) => deleteDoc(doc(db, collections.jobs, String(job.id)))))
      return
    }

    const existingAddonIds = new Set(relatedJobs.map((job) => job.addonId))
    const missingAddons = selectedAddons.filter((addon) => !existingAddonIds.has(addon.id))
    if (!missingAddons.length) return

    const baseId = Date.now()
    const trip = trips.find((item) => item.id === Number(registration.tripId))
    await Promise.all(missingAddons.map((addon, index) => {
      const slot = relatedJobs.length + index + 1
      const nextJob = buildAddonJob(baseId + index + 1, registration, trip, addon, slot, relatedJobs.length + missingAddons.length)
      return setDoc(doc(db, collections.jobs, String(nextJob.id)), nextJob)
    }))
  }

  const setRegistrationStatus = async (id, status) => {
    const current = registrations.find((item) => item.id === id)
    const next = registrations.map((item) => (item.id === id ? { ...item, status } : item))
    await updateDoc(doc(db, collections.registrations, String(id)), { status })
    if (current) {
      await Promise.all([
        updateTripSlots(current.tripId, next),
        syncRegistrationAddonJobs({ ...current, status }, status),
      ])
    }
  }

  const saveTrip = async (trip) => {
    const schedules = Array.isArray(trip.schedules)
      ? trip.schedules.map((schedule, index) => ({
        id: schedule.id || `schedule_${index + 1}`,
        date: schedule.date || '',
        quota: Number(schedule.quota || 0),
        bookedCount: Number(schedule.bookedCount || 0),
        status: schedule.status || 'active',
      }))
      : []
    const sessions = Array.isArray(trip.sessions)
      ? trip.sessions.map((sessionItem, index) => ({
        id: sessionItem.id || `session_${index + 1}`,
        name: sessionItem.name || `Sesi ${index + 1}`,
        startTime: sessionItem.startTime || '',
        endTime: sessionItem.endTime || '',
        status: sessionItem.status || 'active',
      }))
      : []
    const isPrivateTrip = Boolean(trip.isPrivateTrip)
    const maxParticipants = Number(trip.maxParticipants || trip.quota || 1)
    const maxCustomPax = isPrivateTrip
      ? Math.min(Math.max(1, Number(trip.maxCustomPax) || 1), Math.max(1, maxParticipants))
      : 0
    const aggregateQuota = schedules.reduce((total, schedule) => total + Number(schedule.quota || 0), 0)
    const aggregateSlots = schedules.reduce((total, schedule) => total + Math.max(Number(schedule.quota || 0) - Number(schedule.bookedCount || 0), 0), 0)
    const normalizedTrip = {
      ...trip,
      type: isPrivateTrip ? 'private' : 'open',
      experienceType: trip.experienceType === 'custom' ? 'custom' : 'cave',
      schedules: isPrivateTrip ? [] : schedules,
      sessions: isPrivateTrip ? sessions : [],
      availableStartDate: isPrivateTrip ? trip.availableStartDate || '' : '',
      availableEndDate: isPrivateTrip ? trip.availableEndDate || '' : '',
      date: !isPrivateTrip ? schedules[0]?.date || trip.date || '' : trip.date || '',
      slots: !isPrivateTrip && schedules.length ? aggregateSlots : Number(trip.slots),
      quota: !isPrivateTrip && schedules.length ? aggregateQuota : Number(trip.quota),
      price: Number(trip.price),
      pricePerPersonTiers: isPrivateTrip
        ? normalizePricePerPersonTiers(trip.pricePerPersonTiers, trip.price, maxCustomPax)
        : {},
      maxCustomPax,
      aboveMaxPaxRule: isPrivateTrip ? ABOVE_MAX_PAX_RULE : '',
      minParticipants: Number(trip.minParticipants || 1),
      maxParticipants,
    }
    if (trip.id) {
      const nextTrip = { ...normalizedTrip, id: Number(trip.id) }
      await setDoc(doc(db, collections.trips, String(trip.id)), nextTrip)
    } else {
      const id = Date.now()
      const nextTrip = { ...normalizedTrip, id }
      await setDoc(doc(db, collections.trips, String(id)), nextTrip)
    }
    navigate('/admin/open-trip')
  }

  const deleteTrip = async (id) => {
    const relatedJobs = jobs.filter((item) => item.tripId === id)
    await Promise.all([
      deleteDoc(doc(db, collections.trips, String(id))),
      ...relatedJobs.map((job) => deleteDoc(doc(db, collections.jobs, String(job.id)))),
    ])
  }

  const takeJob = async (id) => {
    const job = jobs.find((item) => item.id === id)
    if (!job || job.status !== 'Tersedia') return
    const workerName = session?.name || accounts.worker.name
    const jobScope = getJobScope(job)
    const alreadyTookScope = jobs.some((item) => getJobScope(item) === jobScope && item.worker === workerName)
    if (alreadyTookScope) {
      showToast('Kamu sudah mengambil job untuk booking ini.')
      return
    }
    await updateDoc(doc(db, collections.jobs, String(id)), { status: 'Diambil', worker: workerName })
    showToast('Job berhasil diambil.')
  }

  const updateJobStatus = async (id, status, extraFields = {}) => {
    await updateDoc(doc(db, collections.jobs, String(id)), { status, ...extraFields })
  }

  const props = {
    path,
    session,
    trips,
    registrations,
    jobs,
    customerAccounts,
    workerAccounts,
    approvedByTrip,
    navigate,
    login,
    loginCustomer,
    signupCustomer,
    createWorkerAccount,
    logout,
    submitRegistration,
    setRegistrationStatus,
    saveTrip,
    deleteTrip,
    takeJob,
    updateJobStatus,
    showToast,
  }

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      <RouteRenderer {...props} />
    </>
  )
}

function RouteRenderer(props) {
  const { path, session, navigate } = props
  const parts = path.split('/').filter(Boolean)
  const id = Number(parts[1] || parts[2] || 0)

  if (path.startsWith('/admin') && path !== '/admin/login' && session?.role !== 'admin') {
    return <LoginPage role="admin" {...props} />
  }
  if (path.startsWith('/pekerja') && path !== '/pekerja/login' && session?.role !== 'pekerja') {
    return <LoginPage role="pekerja" {...props} />
  }

  if (path === '/' || path === '/open-trip') return <CustomerCatalog {...props} />
  if (path.startsWith('/destinasi')) return <DestinationPage {...props} />
  if (path === '/akun') {
    if (session?.role !== 'customer') return <CustomerLoginPage afterLoginPath="/akun" {...props} />
    return <CustomerAccountPage {...props} />
  }
  if (path === '/login' || path === '/customer/login') return <CustomerLoginPage {...props} />
  if (path === '/signup' || path === '/customer/signup') return <CustomerSignupPage {...props} />
  if (parts[0] === 'open-trip' && id) return <TripDetail tripId={id} {...props} />
  if (parts[0] === 'daftar' && id) {
    if (session?.role !== 'customer') return <CustomerLoginPage afterLoginPath={`/daftar/${id}`} {...props} />
    return <RegistrationPage tripId={id} {...props} />
  }
  if (path === '/admin/login') return <LoginPage role="admin" {...props} />
  if (path === '/admin/dashboard') return <AdminDashboard {...props} />
  if (path === '/admin/open-trip') return <AdminTrips {...props} />
  if (path === '/admin/open-trip/tambah') return <TripForm {...props} />
  if (parts[0] === 'admin' && parts[1] === 'open-trip' && parts[2] === 'edit') return <TripForm tripId={Number(parts[3])} {...props} />
  if (path === '/admin/pendaftaran') return <AdminSchedule {...props} />
  if (path === '/admin/jadwal') return <AdminSchedule {...props} />
  if (parts[0] === 'admin' && parts[1] === 'jadwal' && parts[2] === 'private-trip' && Number(parts[3])) return <AdminSchedule privateTripId={Number(parts[3])} {...props} />
  if (parts[0] === 'admin' && parts[1] === 'jadwal' && parts[2] === 'private' && Number(parts[3])) return <AdminSchedule scheduleRegistrationId={Number(parts[3])} {...props} />
  if (parts[0] === 'admin' && parts[1] === 'jadwal' && Number(parts[2])) return <AdminSchedule scheduleTripId={Number(parts[2])} scheduleId={parts[3] || ''} {...props} />
  if (path === '/admin/pekerja') return <AdminWorkers {...props} />
  if (path === '/pekerja/login') return <LoginPage role="pekerja" {...props} />
  if (path === '/pekerja/dashboard') return <WorkerDashboard {...props} />
  if (path === '/pekerja/job') return <WorkerJobs {...props} />
  if (parts[0] === 'pekerja' && parts[1] === 'job' && Number(parts[2])) return <WorkerJobDetail jobId={Number(parts[2])} {...props} />
  if (path === '/pekerja/job-saya') return <MyJobs {...props} />

  return <NotFound navigate={navigate} />
}

export default App
