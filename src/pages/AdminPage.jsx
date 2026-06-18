import { useState } from 'react'
import { accounts, addonOptions, registrationStatuses, tripStatuses } from '../config/constants'
import { formatCurrency, formatDate, tripName } from '../utils/formatters'
import { getCustomerJobStatusLabel, getJobAddonLabel, getJobCompletedAt, getJobResultLink, getJobWorkerName, getRegistrationResultJobs } from '../utils/jobResults'
import { localizedList, localizedText, multilingualLines, multilingualText, textToLines } from '../utils/localization'
import { ABOVE_MAX_PAX_RULE, normalizePricePerPersonTiers } from '../utils/pricing'
import { getPrivateDateRange, getRegistrationDate, getTripSchedules, getTripSessions, hasScheduleRegistrations, isSameScheduleRegistration, scheduleStatusLabel } from '../utils/schedules'
import { AppModal, Badge, DataPanel, Metric, Sidebar } from './shared'

const parseImageUrls = (value) => String(value || '')
  .split(/\r?\n|,/)
  .map((item) => item.trim())
  .filter(Boolean)

const adminText = (value) => localizedText(value, 'id') || '-'
const adminListText = (value) => localizedList(value, 'id').join(', ')
const getExperienceType = (trip) => trip?.experienceType === 'custom' ? 'custom' : 'cave'
const getExperienceLabel = (trip) => getExperienceType(trip) === 'custom' ? 'Wisata / Kegiatan' : 'Wisata Goa'
const getAdminTripTypeLabel = (trip) => {
  if (getExperienceType(trip) === 'custom') return trip?.isPrivateTrip ? 'Private' : 'Open'
  return trip?.isPrivateTrip ? 'Private Trip' : 'Open Trip'
}
const newSchedule = (index, source = {}) => ({
  id: source.id || `schedule_${index + 1}`,
  date: source.date || '',
  quota: Number(source.quota || 10),
  bookedCount: Number(source.bookedCount || 0),
  status: source.status || 'active',
})
const newSession = (index, source = {}) => ({
  id: source.id || `session_${index + 1}`,
  name: source.name || `Sesi ${index + 1}`,
  startTime: source.startTime || '',
  endTime: source.endTime || '',
  status: source.status || 'active',
})
const resizeScheduleList = (items, count) => Array.from({ length: Math.max(1, Number(count) || 1) }, (_, index) => newSchedule(index, items[index]))
const resizeSessionList = (items, count) => Array.from({ length: Math.max(1, Number(count) || 1) }, (_, index) => newSession(index, items[index]))

const getActivityText = (trip) => {
  if (trip?.activities) return localizedList(trip.activities, 'id').join('\n')
  if (trip?.activity) return trip.activity
  if (trip?.itinerary) return trip.itinerary
  if (!Array.isArray(trip?.itineraryDays)) return ''
  return trip.itineraryDays
    .map((item) => (typeof item === 'string' ? item : item?.text))
    .filter(Boolean)
    .join('\n')
}

const normalizeTripForm = (trip) => {
  const description = multilingualText(trip?.description)
  const destination = multilingualText(trip?.destination)
  const activities = multilingualLines(trip?.activities ?? getActivityText(trip))
  const facilities = multilingualLines(trip?.facilities)
  const schedules = getTripSchedules(trip)
  const sessions = Array.isArray(trip?.sessions) && trip.sessions.length ? getTripSessions(trip) : []
  const maxCustomPax = Math.max(1, Number(trip?.maxCustomPax) || Math.min(Number(trip?.maxParticipants) || 4, 4))
  const pricePerPersonTiers = normalizePricePerPersonTiers(trip?.pricePerPersonTiers, trip?.price, maxCustomPax)

  return {
    name: '',
    date: '',
    price: 0,
    quota: 10,
    slots: 10,
    minParticipants: 2,
    maxParticipants: 10,
    privateNotes: '',
    flexibleSchedule: true,
    isPrivateTrip: false,
    experienceType: 'cave',
    imageUrl: '',
    imageUrls: [],
    status: 'Tersedia',
    ...trip,
    maxCustomPax,
    pricePerPersonTiers,
    aboveMaxPaxRule: ABOVE_MAX_PAX_RULE,
    availableStartDate: trip?.availableStartDate || trip?.privateStartDate || '',
    availableEndDate: trip?.availableEndDate || trip?.privateEndDate || '',
    schedules: schedules.length ? schedules.map((schedule, index) => newSchedule(index, schedule)) : [newSchedule(0, { date: trip?.date || '', quota: trip?.quota || 10, bookedCount: 0 })],
    sessions: sessions.length ? sessions.map((session, index) => newSession(index, session)) : [newSession(0)],
    descriptionId: description.id,
    descriptionEn: description.en,
    destinationId: destination.id,
    destinationEn: destination.en,
    activitiesId: activities.id,
    activitiesEn: activities.en,
    facilitiesId: facilities.id,
    facilitiesEn: facilities.en,
    imageUrlsText: parseImageUrls(Array.isArray(trip?.imageUrls) && trip.imageUrls.length ? trip.imageUrls.join('\n') : trip?.imageUrl).join('\n'),
  }
}

const registrationTripType = (item) => {
  const isPrivate = item.isPrivateTrip || item.isPrivateTour || item.tripType === 'private'
  if (item.experienceType === 'custom') return isPrivate ? 'Private' : 'Open'
  return isPrivate ? 'Private cave tour' : 'Open trip goa'
}

const getSelectedAddons = (registration) => {
  const selectedIds = Array.isArray(registration?.addons) ? registration.addons : []
  return addonOptions
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.id === 'transport' && registration.transportFrom ? `${option.label} dari ${registration.transportFrom}` : option.label)
}

const isPendingRegistration = (registration) => {
  const status = String(registration?.status || '').toLowerCase()
  return status.includes('pending') || status.includes('menunggu')
}

const isReminderApprovedRegistration = (registration) => {
  const status = String(registration?.status || '').trim().toLowerCase()
  return status === 'approved' || status === 'disetujui'
}

const countParticipants = (items) => items.reduce((sum, item) => sum + Number(item.participants || 0), 0)

function AdminShell({ title, children, navigate, logout, path, registrations = [] }) {
  const pendingParticipants = countParticipants(registrations.filter(isPendingRegistration))

  return (
    <main className="app-shell">
      <Sidebar title="Admin" links={[
        ['/admin/dashboard', 'Dashboard'],
        ['/admin/open-trip', 'Paket Trip'],
        ['/admin/jadwal', 'Jadwal', pendingParticipants],
        ['/admin/pekerja', 'Akun Pekerja'],
      ]} navigate={navigate} logout={logout} path={path} />
      <section className="workspace">
        {title && <h1>{title}</h1>}
        {children}
      </section>
    </main>
  )
}

export function AdminDashboard(props) {
  const { trips, registrations, jobs } = props
  const stats = [
    ['Total paket trip', trips.length],
    ['Total pendaftar', registrations.length],
    ['Menunggu approval', countParticipants(registrations.filter(isPendingRegistration))],
    ['Disetujui', registrations.filter((item) => item.status === 'Disetujui').length],
    ['Ditolak', registrations.filter((item) => item.status === 'Ditolak').length],
    ['Job tersedia', jobs.filter((item) => item.status === 'Tersedia').length],
    ['Job diambil', jobs.filter((item) => item.worker).length],
  ]
  return (
    <AdminShell title="Dashboard Admin" {...props}>
      <section className="admin-dashboard">
        <div className="dashboard-hero">
          <div>
            <p className="eyebrow">Ringkasan operasional</p>
            <h2>Kelola open trip goa, pendaftaran, dan pekerjaan tim dari menu admin.</h2>
            <p className="muted">Gunakan dashboard ini sebagai pintu masuk cepat. Detail lengkap tetap ada di halaman masing-masing menu.</p>
          </div>
          <div className="dashboard-actions">
            <button className="primary-btn" onClick={() => props.navigate('/admin/open-trip')}>Kelola paket trip</button>
            <button className="outline-btn" onClick={() => props.navigate('/admin/jadwal')}>Lihat jadwal</button>
          </div>
        </div>
        <section className="stat-grid dashboard-stats">{stats.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</section>
      </section>
    </AdminShell>
  )
}

export function AdminTrips(props) {
  const [activeType, setActiveType] = useState('all')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeStatus, setActiveStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [tripToDelete, setTripToDelete] = useState(null)
  const searchTerm = search.trim().toLowerCase()
  const filteredTrips = props.trips
    .filter((trip) => {
      if (activeType === 'open') return !trip.isPrivateTrip
      if (activeType === 'private') return trip.isPrivateTrip
      return true
    })
    .filter((trip) => activeCategory === 'all' || getExperienceType(trip) === activeCategory)
    .filter((trip) => activeStatus === 'all' || trip.status === activeStatus)
    .filter((trip) => {
      if (!searchTerm) return true
      return [trip.name, adminText(trip.destination), adminText(trip.description), adminListText(trip.activities), adminListText(trip.facilities)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm)
    })
  const typeTabs = [
    ['all', 'Semua', props.trips.length],
    ['open', 'Open Trip', props.trips.filter((trip) => !trip.isPrivateTrip).length],
    ['private', 'Private Trip', props.trips.filter((trip) => trip.isPrivateTrip).length],
  ]
  const categoryTabs = [
    ['all', 'Semua kategori', props.trips.length],
    ['cave', 'Wisata Goa', props.trips.filter((trip) => getExperienceType(trip) === 'cave').length],
    ['custom', 'Wisata / Kegiatan', props.trips.filter((trip) => getExperienceType(trip) === 'custom').length],
  ]
  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return
    await props.deleteTrip(tripToDelete.id)
    setTripToDelete(null)
  }

  return (
    <AdminShell title="" {...props}>
      <section className="admin-page-stack admin-trip-page">
        <div className="admin-page-head">
          <div>
            <div className="admin-trip-heading-meta">
              <p className="eyebrow">Katalog trip</p>
              <span>{props.trips.length} paket</span>
            </div>
            <h2>Paket Trip</h2>
            <p className="muted">Kelola paket Open Trip dan Private Trip yang tampil untuk customer.</p>
          </div>
          <button className="primary-btn admin-add-trip-btn" onClick={() => props.navigate('/admin/open-trip/tambah')}>
            <span aria-hidden="true">+</span>
            Tambah Paket
          </button>
        </div>

        <section className="admin-list-toolbar">
          <label className="admin-search-field">
            <span>Cari paket</span>
            <input placeholder="Nama trip, destinasi, atau deskripsi" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="admin-filter-groups">
            <div className="admin-trip-type-filter">
              <span className="admin-filter-label">Tipe</span>
              <div className="segmented-tabs compact-tabs" role="tablist" aria-label="Filter jenis paket">
              {typeTabs.map(([value, label, count]) => (
                <button className={activeType === value ? 'is-active' : ''} key={value} type="button" onClick={() => setActiveType(value)}>
                  {label}<span>{count}</span>
                </button>
              ))}
              </div>
            </div>
            <label className="admin-compact-filter">
              <span>Kategori</span>
              <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>
                {categoryTabs.map(([value, label, count]) => <option value={value} key={value}>{label} ({count})</option>)}
              </select>
            </label>
            <label className="admin-compact-filter">
              <span>Status</span>
              <select value={activeStatus} onChange={(event) => setActiveStatus(event.target.value)}>
                <option value="all">Semua Status</option>
                {tripStatuses.map((status) => <option value={status} key={status}>{status}</option>)}
              </select>
            </label>
          </div>
        </section>

        <div className="admin-trip-grid">
          {filteredTrips.length ? filteredTrips.map((trip) => (
            (() => {
              const schedules = !trip.isPrivateTrip ? getTripSchedules(trip) : []
              const remainingSlots = schedules.reduce((total, schedule) => total + Math.max(Number(schedule.quota || 0) - Number(schedule.bookedCount || 0), 0), 0)
              return (
              <article className={`admin-trip-card ${trip.isPrivateTrip ? 'is-private' : 'is-open'}`} key={trip.id}>
                <div className="admin-trip-card-head">
                  <div>
                    <h3>{trip.name}</h3>
                  </div>
                  <div className="card-badge-stack">
                    <span className="trip-type-chip">{getAdminTripTypeLabel(trip)}</span>
                    <Badge status={trip.status} />
                  </div>
                </div>
                <div className="admin-trip-subline">
                  <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{adminText(trip.destination)}</p>
                  <span className="admin-trip-category">{getExperienceLabel(trip)}</span>
                </div>
                <div className="admin-trip-price">
                  <span>{trip.isPrivateTrip ? 'Mulai dari' : 'Harga per orang'}</span>
                  <strong>{formatCurrency(trip.price)}</strong>
                </div>
                <dl className="admin-trip-meta">
                  <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />Jadwal</dt><dd>{trip.isPrivateTrip ? 'Jadwal fleksibel' : `${schedules.length} jadwal`}</dd></div>
                  {!trip.isPrivateTrip && <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Kuota / Slot</dt><dd>{trip.quota} / {remainingSlots}</dd></div>}
                  {trip.isPrivateTrip && <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Peserta</dt><dd>Min {trip.minParticipants || 2} - Max {trip.maxParticipants || trip.quota || 10}</dd></div>}
                  {trip.isPrivateTrip && <div><dt>Periode booking</dt><dd>{trip.availableStartDate ? formatDate(trip.availableStartDate) : '-'} - {trip.availableEndDate ? formatDate(trip.availableEndDate) : '-'}</dd></div>}
                  <div><dt>Status</dt><dd>{trip.status}</dd></div>
                </dl>
                {!trip.isPrivateTrip && schedules.length > 0 && (
                  <div className="admin-schedule-mini-list">
                    {schedules.slice(0, 2).map((schedule) => (
                      <span key={schedule.id}><strong>{formatDate(schedule.date)}</strong><small>{schedule.bookedCount || 0}/{schedule.quota} peserta</small></span>
                    ))}
                    {schedules.length > 2 && <p>+{schedules.length - 2} jadwal lainnya</p>}
                  </div>
                )}
                <div className="admin-trip-actions">
                  <button className="outline-btn compact-action-btn" onClick={() => props.navigate(`/admin/jadwal/${trip.id}`)}>Detail</button>
                  <button className="outline-btn compact-action-btn" onClick={() => props.navigate(`/admin/open-trip/edit/${trip.id}`)}>Edit</button>
                  <button className="outline-btn compact-action-btn danger-btn" onClick={() => setTripToDelete(trip)}>Hapus</button>
                </div>
              </article>
              )
            })()
          )) : <p className="empty-state">Belum ada paket trip untuk filter ini.</p>}
        </div>
        <AppModal
          isOpen={Boolean(tripToDelete)}
          title="Hapus paket trip?"
          description="Paket trip yang dihapus tidak akan tampil lagi untuk customer. Pastikan paket ini memang sudah tidak diperlukan."
          confirmText="Ya, Hapus"
          cancelText="Batal"
          variant="danger"
          onConfirm={confirmDeleteTrip}
          onCancel={() => setTripToDelete(null)}
        />
      </section>
    </AdminShell>
  )
}

export function TripForm({ tripId, trips, saveTrip, navigate, ...props }) {
  const selected = trips.find((item) => item.id === tripId)
  const [form, setForm] = useState(normalizeTripForm(selected))
  const [formError, setFormError] = useState('')
  const isPrivateTrip = Boolean(form.isPrivateTrip)
  const previewImage = parseImageUrls(form.imageUrlsText || form.imageUrl)[0]
  const registrations = props.registrations || []

  const updateScheduleCount = (value) => {
    const nextCount = Math.max(1, Number(value) || 1)
    if (selected && nextCount < form.schedules.length) {
      const removedSchedules = form.schedules.slice(nextCount)
      const hasBookedSchedule = removedSchedules.some((schedule) => hasScheduleRegistrations(registrations, selected.id, schedule))
      if (hasBookedSchedule) {
        setFormError('Jadwal yang sudah memiliki pendaftar tidak bisa dihapus.')
        return
      }
    }
    setFormError('')
    setForm({ ...form, schedules: resizeScheduleList(form.schedules, nextCount) })
  }

  const updateSessionCount = (value) => {
    const nextCount = Math.max(1, Number(value) || 1)
    setForm({ ...form, sessions: resizeSessionList(form.sessions, nextCount) })
  }

  const updatePriceTierCount = (value) => {
    const maxParticipants = Math.max(1, Number(form.maxParticipants) || 1)
    const nextCount = Math.min(Math.max(1, Number(value) || 1), maxParticipants)
    const nextTiers = Object.fromEntries(
      Array.from({ length: nextCount }, (_, index) => {
        const pax = index + 1
        return [pax, form.pricePerPersonTiers?.[pax] ?? '']
      }),
    )
    setForm({
      ...form,
      maxCustomPax: nextCount,
      pricePerPersonTiers: nextTiers,
      aboveMaxPaxRule: ABOVE_MAX_PAX_RULE,
    })
  }

  const updatePriceTier = (pax, value) => {
    setForm({
      ...form,
      pricePerPersonTiers: {
        ...form.pricePerPersonTiers,
        [pax]: value,
      },
    })
  }

  const updateMaxParticipants = (value) => {
    const maxParticipants = Math.max(1, Number(value) || 1)
    const maxCustomPax = Math.min(Math.max(1, Number(form.maxCustomPax) || 1), maxParticipants)
    const nextTiers = Object.fromEntries(
      Array.from({ length: maxCustomPax }, (_, index) => {
        const pax = index + 1
        return [pax, form.pricePerPersonTiers?.[pax] ?? '']
      }),
    )
    setForm({
      ...form,
      maxParticipants: value,
      quota: value,
      slots: value,
      maxCustomPax,
      pricePerPersonTiers: nextTiers,
    })
  }

  const updateSchedule = (index, field, value) => {
    const currentSchedule = form.schedules[index]
    if (selected && field === 'date' && currentSchedule?.date !== value && hasScheduleRegistrations(registrations, selected.id, currentSchedule)) {
      setFormError('Tanggal jadwal yang sudah memiliki pendaftar tidak bisa diubah.')
      return
    }
    const schedules = [...form.schedules]
    schedules[index] = { ...schedules[index], [field]: value }
    setFormError('')
    setForm({ ...form, schedules })
  }

  const updateSession = (index, field, value) => {
    const sessions = [...form.sessions]
    sessions[index] = { ...sessions[index], [field]: value }
    setForm({ ...form, sessions })
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!isPrivateTrip) {
      const invalidSchedule = !form.schedules.length || form.schedules.some((schedule) => !schedule.date || Number(schedule.quota) <= 0)
      if (invalidSchedule) {
        setFormError('Open trip minimal punya 1 jadwal. Setiap jadwal wajib punya tanggal dan kuota.')
        return
      }
    }
    if (isPrivateTrip) {
      const invalidSession = !form.sessions.length || form.sessions.some((session) => !session.startTime || !session.endTime || session.endTime <= session.startTime)
      if (invalidSession) {
        setFormError('Private trip minimal punya 1 sesi. Jam selesai harus lebih besar dari jam mulai.')
        return
      }
      if (!form.availableStartDate || !form.availableEndDate || form.availableEndDate < form.availableStartDate) {
        setFormError('Isi rentang tanggal private trip dengan benar. Tanggal selesai tidak boleh lebih awal dari tanggal mulai.')
        return
      }
      const prices = Array.from(
        { length: Math.max(1, Number(form.maxCustomPax) || 1) },
        (_, index) => Number(form.pricePerPersonTiers?.[index + 1]),
      )
      if (prices.some((price) => !Number.isFinite(price) || price <= 0)) {
        setFormError('Semua harga per orang berdasarkan jumlah peserta wajib diisi dan harus lebih dari 0.')
        return
      }
    }
    const imageUrls = parseImageUrls(form.imageUrlsText || form.imageUrl)
    const tripForm = { ...form }
    delete tripForm.imageUrlsText
    delete tripForm.durationDays
    delete tripForm.itineraryDays
    delete tripForm.itinerary
    delete tripForm.descriptionId
    delete tripForm.descriptionEn
    delete tripForm.destinationId
    delete tripForm.destinationEn
    delete tripForm.activitiesId
    delete tripForm.activitiesEn
    delete tripForm.facilitiesId
    delete tripForm.facilitiesEn
    const normalizedPriceTiers = normalizePricePerPersonTiers(form.pricePerPersonTiers, form.price, form.maxCustomPax)
    const privateStartingPrice = Math.min(...Object.values(normalizedPriceTiers).map(Number))
    await saveTrip({
      ...tripForm,
      description: {
        id: form.descriptionId.trim(),
        en: form.descriptionEn.trim(),
      },
      destination: {
        id: form.destinationId.trim(),
        en: form.destinationEn.trim(),
      },
      activities: {
        id: textToLines(form.activitiesId),
        en: textToLines(form.activitiesEn),
      },
      facilities: {
        id: textToLines(form.facilitiesId),
        en: textToLines(form.facilitiesEn),
      },
      activity: form.activitiesId.trim(),
      price: isPrivateTrip ? privateStartingPrice : Number(form.price),
      pricePerPersonTiers: isPrivateTrip ? normalizedPriceTiers : {},
      maxCustomPax: isPrivateTrip ? Number(form.maxCustomPax) : 0,
      aboveMaxPaxRule: isPrivateTrip ? ABOVE_MAX_PAX_RULE : '',
      quota: isPrivateTrip ? Number(form.maxParticipants || form.quota) : Number(form.quota),
      slots: isPrivateTrip ? Number(form.maxParticipants || form.slots || form.quota) : Number(form.slots),
      minParticipants: isPrivateTrip ? Number(form.minParticipants) || 1 : 1,
      maxParticipants: isPrivateTrip ? Number(form.maxParticipants) || Number(form.quota) || 1 : Number(form.quota),
      privateNotes: isPrivateTrip ? form.privateNotes || '' : '',
      availableStartDate: isPrivateTrip ? form.availableStartDate : '',
      availableEndDate: isPrivateTrip ? form.availableEndDate : '',
      flexibleSchedule: isPrivateTrip,
      isPrivateTrip,
      schedules: isPrivateTrip ? [] : form.schedules.map((schedule, index) => newSchedule(index, schedule)),
      sessions: isPrivateTrip ? form.sessions.map((session, index) => newSession(index, session)) : [],
      imageUrl: imageUrls[0] || '',
      imageUrls,
    })
  }

  return (
    <AdminShell title={selected ? 'Edit Paket Trip' : 'Tambah Paket Trip'} navigate={navigate} {...props}>
      <section className="admin-page-stack trip-form-page">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">{selected ? 'Update paket' : 'Paket baru'}</p>
            <h2>{selected ? 'Perbarui detail paket trip.' : 'Lengkapi informasi paket trip baru.'}</h2>
            <p className="muted">Gunakan field sesuai jenis trip agar form tetap ringkas dan mudah dipakai admin.</p>
          </div>
          <button className="outline-btn" onClick={() => navigate('/admin/open-trip')}>Kembali</button>
        </div>
        {formError && <p className="form-error">{formError}</p>}
        <form className="trip-section-form" onSubmit={onSubmit}>
          <section className="form-section-card">
            <div className="form-section-title">
              <span>1</span>
              <div><h3>Informasi Dasar</h3><p>Identitas utama paket yang tampil di katalog customer.</p></div>
            </div>
            <div className="data-form section-fields">
              <label>{isPrivateTrip ? 'Nama private trip' : 'Nama trip'}<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Jenis trip<select value={isPrivateTrip ? 'private' : 'open'} onChange={(e) => setForm({ ...form, isPrivateTrip: e.target.value === 'private' })}><option value="open">Open Trip</option><option value="private">Private Trip</option></select><small>{isPrivateTrip ? 'Private Trip menerima request tanggal dari customer.' : 'Open Trip memakai tanggal keberangkatan tetap.'}</small></label>
              <label>Kategori paket<select value={getExperienceType(form)} onChange={(e) => setForm({ ...form, experienceType: e.target.value })}><option value="cave">Wisata Goa</option><option value="custom">Wisata / Kegiatan (Non-Goa)</option></select><small>Paket custom memakai isi dan alur pemesanan yang sama, tetapi dapat digunakan untuk wisata atau kegiatan selain goa.</small></label>
              <label>Destinasi Indonesia<input required value={form.destinationId} onChange={(e) => setForm({ ...form, destinationId: e.target.value })} /></label>
              <label>Destinasi English<input value={form.destinationEn} onChange={(e) => setForm({ ...form, destinationEn: e.target.value })} /></label>
              <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{tripStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            </div>
          </section>

          <section className="form-section-card">
            <div className="form-section-title">
              <span>2</span>
              <div><h3>Harga & Kapasitas</h3><p>{isPrivateTrip ? 'Gunakan jadwal fleksibel karena customer dapat request tanggal sendiri.' : 'Gunakan tanggal tetap karena trip ini memiliki jadwal keberangkatan tertentu.'}</p></div>
            </div>
            <div className="data-form section-fields">
              {!isPrivateTrip ? (
                <>
                  <label>Harga per orang<input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
                  <label>Jumlah jadwal<input required type="number" min="1" value={form.schedules.length} onChange={(e) => updateScheduleCount(e.target.value)} /><small>Atur berapa tanggal keberangkatan untuk paket open trip ini.</small></label>
                  {form.schedules.map((schedule, index) => (
                    <div className="admin-nested-fields full" key={schedule.id}>
                      <h4>Jadwal {index + 1}</h4>
                      <label>Tanggal jadwal {index + 1}<input required type="date" value={schedule.date} onChange={(e) => updateSchedule(index, 'date', e.target.value)} /></label>
                      <label>Kuota jadwal {index + 1}<input required type="number" min="1" value={schedule.quota} onChange={(e) => updateSchedule(index, 'quota', e.target.value)} /></label>
                      <label>Status jadwal<select value={schedule.status} onChange={(e) => updateSchedule(index, 'status', e.target.value)}><option value="active">Active</option><option value="full">Full</option><option value="inactive">Inactive</option></select></label>
                      {Number(schedule.bookedCount) > 0 && <small>Sudah ada {schedule.bookedCount} peserta disetujui pada jadwal ini.</small>}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <label>Jadwal fleksibel<input disabled value="Customer memilih tanggal saat checkout" /><small>Gunakan jadwal fleksibel karena customer dapat request tanggal sendiri.</small></label>
                  <label>Minimal peserta<input required type="number" min="1" value={form.minParticipants} onChange={(e) => setForm({ ...form, minParticipants: e.target.value })} /></label>
                  <label>Maksimal peserta<input required type="number" min="1" value={form.maxParticipants} onChange={(e) => updateMaxParticipants(e.target.value)} /></label>
                  <div className="admin-nested-fields price-tier-editor full">
                    <h4>Harga per Orang Berdasarkan Jumlah Peserta</h4>
                    <label className="full">Atur harga sampai berapa peserta?
                      <input required type="number" min="1" max={Math.max(1, Number(form.maxParticipants) || 1)} value={form.maxCustomPax} onChange={(e) => updatePriceTierCount(e.target.value)} />
                      <small>Jika jumlah peserta melebihi batas ini, sistem menggunakan harga per orang terakhir.</small>
                    </label>
                    {Array.from({ length: Math.max(1, Number(form.maxCustomPax) || 1) }, (_, index) => index + 1).map((pax) => (
                      <label key={pax}>Jika {pax} peserta, harga per orang
                        <input required type="number" min="1" value={form.pricePerPersonTiers?.[pax] ?? ''} onChange={(e) => updatePriceTier(pax, e.target.value)} />
                      </label>
                    ))}
                  </div>
                  <label>Private trip bisa dipesan dari tanggal<input required type="date" value={form.availableStartDate} onChange={(e) => setForm({ ...form, availableStartDate: e.target.value })} /></label>
                  <label>Sampai tanggal<input required type="date" min={form.availableStartDate || undefined} value={form.availableEndDate} onChange={(e) => setForm({ ...form, availableEndDate: e.target.value })} /></label>
                  <label>Jumlah sesi<input required type="number" min="1" value={form.sessions.length} onChange={(e) => updateSessionCount(e.target.value)} /><small>Customer akan memilih salah satu sesi setelah memilih tanggal.</small></label>
                  {form.sessions.map((session, index) => (
                    <div className="admin-nested-fields full" key={session.id}>
                      <h4>Sesi {index + 1}</h4>
                      <label>Nama sesi<input required value={session.name} onChange={(e) => updateSession(index, 'name', e.target.value)} /></label>
                      <label>Jam mulai<input required type="time" value={session.startTime} onChange={(e) => updateSession(index, 'startTime', e.target.value)} /></label>
                      <label>Jam selesai<input required type="time" value={session.endTime} onChange={(e) => updateSession(index, 'endTime', e.target.value)} /></label>
                      <label>Status sesi<select value={session.status} onChange={(e) => updateSession(index, 'status', e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>

          <section className="form-section-card">
            <div className="form-section-title">
              <span>3</span>
              <div><h3>Media</h3><p>Tambahkan satu atau beberapa URL gambar, pisahkan dengan baris baru.</p></div>
            </div>
            <div className="data-form section-fields">
              <label className="full">Link gambar trip<textarea placeholder={'https://static.uc.ac.id/htb/2019/01/maxresdefault.jpg\nhttps://contoh.com/gambar-kedua.jpg'} value={form.imageUrlsText} onChange={(e) => setForm({ ...form, imageUrlsText: e.target.value })} /></label>
              {previewImage && <div className="media-preview full"><img src={previewImage} alt="Preview trip" /><span>Preview gambar utama</span></div>}
            </div>
          </section>

          <section className="form-section-card">
            <div className="form-section-title">
              <span>4</span>
              <div><h3>Detail Trip</h3><p>Isi narasi dan fasilitas yang membantu customer memahami pengalaman trip.</p></div>
            </div>
            <div className="data-form section-fields">
              <label className="full">Deskripsi Indonesia<textarea required value={form.descriptionId} onChange={(e) => setForm({ ...form, descriptionId: e.target.value })} /></label>
              <label className="full">Deskripsi English<textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} /></label>
              <label className="full">Aktivitas Indonesia<textarea required placeholder={getExperienceType(form) === 'custom' ? 'Contoh: briefing, aktivitas utama, istirahat, sesi dokumentasi, dan kembali ke meeting point.' : 'Contoh: briefing keselamatan, eksplor lorong goa, cave tubing, sesi foto, dan kembali ke meeting point.'} value={form.activitiesId} onChange={(e) => setForm({ ...form, activitiesId: e.target.value })} /></label>
              <label className="full">Aktivitas English<textarea placeholder="One activity per line." value={form.activitiesEn} onChange={(e) => setForm({ ...form, activitiesEn: e.target.value })} /></label>
              <label className="full">Fasilitas Indonesia<textarea required value={form.facilitiesId} onChange={(e) => setForm({ ...form, facilitiesId: e.target.value })} /></label>
              <label className="full">Fasilitas English<textarea value={form.facilitiesEn} onChange={(e) => setForm({ ...form, facilitiesEn: e.target.value })} /></label>
              {isPrivateTrip && <label className="full">Catatan khusus private trip<textarea placeholder="Contoh: itinerary bisa menyesuaikan request keluarga/perusahaan." value={form.privateNotes} onChange={(e) => setForm({ ...form, privateNotes: e.target.value })} /></label>}
            </div>
          </section>

          <div className="form-sticky-actions">
            <button className="outline-btn" type="button" onClick={() => navigate('/admin/open-trip')}>Batal</button>
            <button className="primary-btn" type="submit">Simpan paket trip</button>
          </div>
        </form>
      </section>
    </AdminShell>
  )
}

export function AdminRegistrations(props) {
  return (
    <AdminShell title="Manajemen Pendaftaran" {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Approval customer</p>
            <h2>Review pendaftaran yang masuk dari customer.</h2>
            <p className="muted">Ubah status pendaftaran setelah data dan slot peserta sudah dicek.</p>
          </div>
        </div>
        <div className="admin-table-card"><RegistrationTable {...props} /></div>
      </section>
    </AdminShell>
  )
}

function RegistrationTable({ registrations, trips, setRegistrationStatus, compact }) {
  const rows = compact ? registrations.slice(0, 5) : registrations
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Customer</th><th>Kontak</th><th>Peserta</th><th>Paket</th><th>Tanggal / sesi</th><th>Data utama</th><th>Add-on</th><th>Catatan</th><th>Status</th></tr></thead>
        <tbody>{rows.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td><td>{item.whatsapp}<br />{item.email}</td><td>{item.participants}</td><td>{tripName(trips, item.tripId)}</td><td>{formatDate(getRegistrationDate(item) || trips.find((trip) => trip.id === item.tripId)?.date)}{item.sessionName ? <><br />{item.sessionName}{item.startTime && item.endTime ? ` (${item.startTime} - ${item.endTime})` : ''}</> : null}</td><td>{item.address || '-'}<br />{item.age ? `${item.age} tahun` : '-'} - {item.gender || '-'}<br />{item.healthNotes || '-'}</td><td>{getSelectedAddons(item).join(', ') || '-'}</td><td>{item.notes}</td>
            <td><select className="status-select" value={item.status} onChange={(e) => setRegistrationStatus(item.id, e.target.value)}>{registrationStatuses.map((status) => <option key={status}>{status}</option>)}</select></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function AdminJobResultsPanel({ jobs = [], emptyText = 'Belum ada hasil pekerjaan worker.' }) {
  return (
    <div className="table-wrap compact-table">
      <table>
        <thead><tr><th>Jenis pekerjaan</th><th>Worker</th><th>Status</th><th>Link hasil</th><th>Waktu selesai</th></tr></thead>
        <tbody>{jobs.length ? jobs.map((job) => {
          const resultLink = getJobResultLink(job)
          const completedAt = getJobCompletedAt(job)
          return (
            <tr key={job.id}>
              <td>{getJobAddonLabel(job)}</td>
              <td>{getJobWorkerName(job) || '-'}</td>
              <td>{getCustomerJobStatusLabel(job)}</td>
              <td>{resultLink ? <a href={resultLink} target="_blank" rel="noreferrer">Buka link</a> : 'Belum tersedia'}</td>
              <td>{completedAt ? formatDate(completedAt) : '-'}</td>
            </tr>
          )
        }) : <tr><td colSpan="5">{emptyText}</td></tr>}</tbody>
      </table>
    </div>
  )
}

export function AdminSchedule(props) {
  const { trips, registrations, jobs, scheduleTripId, scheduleId, scheduleRegistrationId, privateTripId } = props
  const [activeType, setActiveType] = useState('all')
  const [search, setSearch] = useState('')
  const selectedTrip = trips.find((trip) => trip.id === scheduleTripId)
  const selectedPrivateTrip = trips.find((trip) => trip.id === privateTripId)
  const selectedRegistration = registrations.find((item) => item.id === scheduleRegistrationId)
  if (scheduleTripId && selectedTrip) return <AdminScheduleDetail trip={selectedTrip} scheduleId={scheduleId} {...props} />
  if (privateTripId && selectedPrivateTrip) return <AdminPrivateTripScheduleDetail trip={selectedPrivateTrip} {...props} />
  if (scheduleRegistrationId && selectedRegistration) return <AdminPrivateScheduleDetail registration={selectedRegistration} {...props} />
  const openTrips = trips.filter((trip) => !trip.isPrivateTrip)
  const openScheduleItems = openTrips.map((trip) => {
    const schedules = getTripSchedules(trip)
    const scheduleItems = schedules.map((schedule) => {
      const scheduleRegistrations = registrations.filter((item) => Number(item.tripId) === Number(trip.id) && !item.isPrivateTrip && !item.isPrivateTour && item.tripType !== 'private' && isSameScheduleRegistration(item, schedule))
      const approvedRegistrations = scheduleRegistrations.filter((item) => item.status === 'Disetujui' || item.status === 'Selesai')
      const waitingRegistrations = scheduleRegistrations.filter(isPendingRegistration)
      const approvedParticipants = countParticipants(approvedRegistrations)
      const waitingParticipants = countParticipants(waitingRegistrations)
      const relatedJobs = jobs.filter((job) => Number(job.tripId) === Number(trip.id) && (!job.registrationId || scheduleRegistrations.some((registration) => Number(registration.id) === Number(job.registrationId))))
      const remaining = Math.max(Number(schedule.quota || 0) - approvedParticipants, 0)
      return {
        ...schedule,
        approvedParticipants,
        waitingParticipants,
        remaining,
        status: schedule.status === 'inactive' ? 'inactive' : remaining <= 0 ? 'full' : schedule.status,
        scheduleRegistrations,
        approvedRegistrations,
        waitingRegistrations,
        assignedWorkers: relatedJobs.filter((job) => job.worker).length,
        workerTarget: relatedJobs.length,
      }
    })
    return {
      type: 'open',
      key: `open-${trip.id}`,
      trip,
      schedules: scheduleItems,
      approvedParticipants: scheduleItems.reduce((total, schedule) => total + schedule.approvedParticipants, 0),
      waitingParticipants: scheduleItems.reduce((total, schedule) => total + schedule.waitingParticipants, 0),
      assignedWorkers: scheduleItems.reduce((total, schedule) => total + schedule.assignedWorkers, 0),
      workerTarget: scheduleItems.reduce((total, schedule) => total + schedule.workerTarget, 0),
      quota: scheduleItems.reduce((total, schedule) => total + Number(schedule.quota || 0), 0),
      remaining: scheduleItems.reduce((total, schedule) => total + Number(schedule.remaining || 0), 0),
      searchValues: [trip.name, adminText(trip.destination), ...scheduleItems.flatMap((schedule) => [schedule.date, formatDate(schedule.date), ...schedule.scheduleRegistrations.flatMap((item) => [item.name, item.whatsapp, item.email])])],
      date: scheduleItems[0]?.date || trip.date,
    }
  })
  const privateScheduleItems = registrations
    .map((registration) => ({ registration, trip: trips.find((trip) => Number(trip.id) === Number(registration.tripId)) }))
    .filter(({ registration, trip }) => trip && (trip.isPrivateTrip || registration.isPrivateTrip || registration.isPrivateTour || registration.tripType === 'private'))
    .map(({ registration, trip }) => {
    const relatedJobs = jobs.filter((job) => Number(job.registrationId) === Number(registration.id))
    const range = getPrivateDateRange(trip)
    return {
      type: 'private',
      key: `private-booking-${registration.id}`,
      trip,
      registration,
      range,
      bookingCount: 1,
      pendingCount: isPendingRegistration(registration) ? 1 : 0,
      waitingParticipants: isPendingRegistration(registration) ? Number(registration.participants || 1) : 0,
      assignedWorkers: relatedJobs.filter((job) => job.worker).length,
      workerTarget: relatedJobs.length || getSelectedAddons(registration).length || 0,
      searchValues: [trip.name, adminText(trip.destination), range.startDate, range.endDate, registration.name, registration.whatsapp, registration.email, getRegistrationDate(registration), registration.sessionName],
      date: getRegistrationDate(registration) || range.startDate || trip.date,
    }
  })
  const scheduleItems = [...openScheduleItems, ...privateScheduleItems]
  const pendingParticipants = scheduleItems.reduce((sum, item) => sum + item.waitingParticipants, 0)
  const pendingScheduleCount = scheduleItems.filter((item) => item.waitingParticipants > 0).length
  const searchTerm = search.trim().toLowerCase()
  const matchesSearch = (values) => {
    if (!searchTerm) return true
    return values
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(searchTerm)
  }
  const visibleScheduleItems = scheduleItems
    .filter((item) => {
      if (activeType === 'open') return item.type === 'open'
      if (activeType === 'private') return item.type === 'private'
      if (activeType === 'waiting') return item.waitingParticipants > 0
      return true
    })
    .filter((item) => matchesSearch(item.searchValues))
    .sort((a, b) => {
      if (b.waitingParticipants !== a.waitingParticipants) return b.waitingParticipants - a.waitingParticipants
      return String(a.date || '').localeCompare(String(b.date || ''))
    })
  const scheduleTabs = [
    ['all', 'Semua', scheduleItems.length],
    ['open', 'Open Trip', openScheduleItems.length],
    ['private', 'Private Trip', privateScheduleItems.length],
    ['waiting', 'Menunggu Approval', pendingScheduleCount],
  ]

  return (
    <AdminShell title="Monitoring Jadwal" {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Jadwal keberangkatan</p>
            <h2>Lihat trip berjalan dan peserta yang sudah disetujui.</h2>
            <p className="muted">Daftar ini membantu admin mengecek kesiapan peserta sebelum hari keberangkatan.</p>
          </div>
        </div>
        <section className="admin-list-toolbar">
          <div className="segmented-tabs compact-tabs" role="tablist" aria-label="Filter jenis jadwal">
            {scheduleTabs.map(([value, label, count]) => (
              <button className={activeType === value ? 'is-active' : ''} key={value} type="button" onClick={() => setActiveType(value)}>
                {label}<span>{count}</span>
              </button>
            ))}
          </div>
          <label className="admin-search-field">
            <span>Cari jadwal</span>
            <input placeholder="Nama trip, destinasi, atau pemesan" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </section>
        <p className={`schedule-review-summary ${pendingParticipants > 0 ? 'has-waiting' : ''}`}>
          {pendingParticipants > 0
            ? `Ada ${pendingParticipants} peserta menunggu approval dari ${pendingScheduleCount} jadwal.`
            : 'Tidak ada pendaftar yang menunggu approval.'}
        </p>
        <div className="schedule-list admin-card-grid">
          {visibleScheduleItems.map((item) => {
            if (item.type === 'open') {
              const { trip, schedules, approvedParticipants, waitingParticipants, assignedWorkers, workerTarget, quota, remaining } = item
              return (
                <article className={`schedule-card ${waitingParticipants > 0 ? 'needs-review' : ''}`} key={item.key}>
                <div className="schedule-card-head">
                  <div>
                    <h3>{trip.name}</h3>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{adminText(trip.destination)}</p>
                  </div>
                  <div className="card-badge-stack">
                    {waitingParticipants > 0 && <span className="review-badge">Ada Pendaftar Baru</span>}
                    <Badge status={trip.status} />
                  </div>
                </div>
                <div className="schedule-date-row">
                  <span><span className="asset-icon icon-calendar" aria-hidden="true" />Jadwal</span>
                  <strong>{schedules.length} tanggal</strong>
                </div>
                <div className="admin-schedule-action-list">
                  {schedules.map((schedule) => (
                    <div className={`admin-schedule-action-row ${schedule.waitingParticipants > 0 ? 'needs-review' : ''}`} key={schedule.id}>
                      <div>
                        <strong>{formatDate(schedule.date)} - {schedule.approvedParticipants}/{schedule.quota} peserta, sisa {schedule.remaining}</strong>
                        <small>Status: {scheduleStatusLabel(schedule.status)}{schedule.waitingParticipants > 0 ? ` - ${schedule.waitingParticipants} menunggu approval` : ''}</small>
                      </div>
                      <button className="outline-btn schedule-detail-btn" type="button" onClick={() => props.navigate(`/admin/jadwal/${trip.id}/${schedule.id}`)}>
                        Detail jadwal
                        {schedule.waitingParticipants > 0 && <span>{schedule.waitingParticipants}</span>}
                      </button>
                    </div>
                  ))}
                </div>
                <dl className="schedule-metrics">
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Peserta</dt><dd>{approvedParticipants}/{quota}</dd></div>
                  <div><dt>Sisa</dt><dd>{remaining}</dd></div>
                  <div className={waitingParticipants > 0 ? 'metric-highlight' : ''}><dt>Menunggu</dt><dd>{waitingParticipants}</dd></div>
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Pekerja</dt><dd>{assignedWorkers}/{workerTarget}</dd></div>
                </dl>
                
                <div className="schedule-card-footer">
                  <div className="participant-list">{schedules.some((schedule) => schedule.approvedRegistrations.length) ? schedules.flatMap((schedule) => schedule.approvedRegistrations).slice(0, 3).map((participant) => <span key={participant.id}>{participant.name} ({participant.participants})</span>) : <span>Belum ada peserta disetujui</span>}</div>
                </div>
              </article>
              )
            }

            const { trip, registration, range, bookingCount, pendingCount, assignedWorkers, workerTarget } = item
            const bookingDate = getRegistrationDate(registration)
            return (
              <article className={`schedule-card ${pendingCount > 0 ? 'needs-review' : ''}`} key={item.key}>
                <div className="schedule-card-head">
                  <div>
                    <h3>{trip.name}</h3>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{adminText(trip.destination)}</p>
                  </div>
                  <div className="card-badge-stack">
                    {pendingCount > 0 && <span className="review-badge">Butuh Review</span>}
                    <span className="trip-type-chip">{getAdminTripTypeLabel(trip)}</span>
                    <Badge status={trip.status} />
                  </div>
                </div>
                <div className="schedule-date-row">
                  <span><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal booking</span>
                  <strong>{bookingDate ? formatDate(bookingDate) : '-'}</strong>
                </div>
                <div className="admin-schedule-mini-list compact">
                  <span>{registration.sessionName || 'Sesi'}: {registration.startTime || '-'} - {registration.endTime || '-'}</span>
                  <span>Periode tersedia: {range.startDate ? formatDate(range.startDate) : '-'} - {range.endDate ? formatDate(range.endDate) : '-'}</span>
                </div>
                <dl className="schedule-metrics">
                  <div><dt>Booking</dt><dd>{bookingCount}</dd></div>
                  <div className={pendingCount > 0 ? 'metric-highlight' : ''}><dt>Pending</dt><dd>{pendingCount}</dd></div>
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Pekerja</dt><dd>{assignedWorkers}/{workerTarget}</dd></div>
                </dl>
                <div className="schedule-card-footer">
                  <div className="participant-list"><span>{registration.name} ({registration.participants || 1})</span><span>{registration.status}</span></div>
                  <button className="outline-btn" onClick={() => props.navigate(`/admin/jadwal/private/${registration.id}`)}>{pendingCount > 0 ? 'Review Booking' : 'Detail jadwal'}</button>
                </div>
              </article>
            )
          })}
          {!visibleScheduleItems.length && <p className="empty-state">Belum ada jadwal untuk filter ini.</p>}
        </div>
      </section>
    </AdminShell>
  )
}

function AdminPrivateScheduleDetail({ registration, trips, jobs, setRegistrationStatus, navigate, showToast, ...props }) {
  const trip = trips.find((item) => item.id === registration.tripId)
  const tripJobs = jobs.filter((job) => Number(job.registrationId) === Number(registration.id))
  const assignedJobs = tripJobs.filter((job) => job.worker)
  const participantDetails = Array.isArray(registration.participantDetails) && registration.participantDetails.length
    ? registration.participantDetails
    : [{ name: registration.name, address: registration.address, age: registration.age, gender: registration.gender, healthNotes: registration.healthNotes }]
  const registrationDate = getRegistrationDate(registration) || trip?.date
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [isSendingReminder, setIsSendingReminder] = useState(false)
  const canSendReminder = isReminderApprovedRegistration(registration) && Boolean(registration.email) && Boolean(trip)

  const sendPrivateTripReminder = async () => {
    if (isSendingReminder || !canSendReminder) return
    setIsSendingReminder(true)
    try {
      const response = await fetch('/.netlify/functions/sendTripReminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: trip.id,
          registrationId: registration.id,
          selectedDate: registrationDate,
        }),
      })
      const responseText = await response.text()
      let result = {}
      try {
        result = responseText ? JSON.parse(responseText) : {}
      } catch {
        result = {}
      }
      if (!response.ok) {
        throw new Error(result.message || responseText || 'Pengingat gagal dikirim.')
      }
      const sent = Number(result.sent || 0)
      const failed = Number(result.failed || 0)
      showToast?.(failed > 0 ? `${sent} berhasil, ${failed} gagal` : `Pengingat berhasil dikirim ke ${registration.name}`)
      setIsReminderModalOpen(false)
    } catch (error) {
      showToast?.(error.message || 'Pengingat gagal dikirim.')
    } finally {
      setIsSendingReminder(false)
    }
  }

  return (
    <AdminShell title="Detail Jadwal Private" navigate={navigate} {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Private booking</p>
            <h2>{trip?.name || 'Private cave tour'}</h2>
            <p className="muted">{adminText(trip?.destination)} - {formatDate(registrationDate)} - {registration.sessionName ? `${registration.sessionName} ` : ''}{registration.startTime && registration.endTime ? `(${registration.startTime} - ${registration.endTime}) - ` : ''}{registration.name}</p>
          </div>
          <div className="registration-management-actions">
            <div className="reminder-action-wrap">
              <button
                className="primary-btn"
                type="button"
                disabled={!canSendReminder || isSendingReminder}
                onClick={() => setIsReminderModalOpen(true)}
              >
                {isSendingReminder ? 'Mengirim...' : 'Kirim Pengingat'}
              </button>
              {!canSendReminder && <span>Booking harus disetujui dan punya email</span>}
            </div>
            <button className="outline-btn" onClick={() => navigate('/admin/jadwal')}>Kembali ke jadwal</button>
          </div>
        </div>

        <section className="stat-grid dashboard-stats">
          <Metric label="Jumlah peserta" value={registration.participants} />
          <Metric label="Status" value={registration.status} />
          <Metric label="Pekerja terisi" value={`${assignedJobs.length}/${tripJobs.length || getSelectedAddons(registration).length || 0}`} />
          <Metric label="Tanggal request" value={formatDate(registrationDate)} />
          <Metric label="Sesi" value={registration.sessionName ? `${registration.sessionName}${registration.startTime && registration.endTime ? ` (${registration.startTime} - ${registration.endTime})` : ''}` : '-'} />
        </section>

        <section className="schedule-detail-grid">
          <DataPanel title="Data Peserta">
            <div className="registration-status-list">
              {participantDetails.map((participant, index) => (
                <article className="registration-status-card" key={`${registration.id}-${index}`}>
                  <div className="registration-card-main">
                    <h4>{participant.name || `Peserta ${index + 1}`}</h4>
                    <dl>
                      <div><dt>Domisili</dt><dd>{participant.address || '-'}</dd></div>
                      <div><dt>Usia</dt><dd>{participant.age ? `${participant.age} tahun` : '-'}</dd></div>
                      <div><dt>Jenis kelamin</dt><dd>{participant.gender || '-'}</dd></div>
                      <div><dt>Kondisi kesehatan</dt><dd>{participant.healthNotes || '-'}</dd></div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          </DataPanel>

          <DataPanel title="Status Booking">
            <label className="registration-card-status">Status<select className="status-select" value={registration.status} onChange={(e) => setRegistrationStatus(registration.id, e.target.value)}>
              {registrationStatuses.map((status) => <option key={status}>{status}</option>)}
            </select></label>
            <div className="selected-addon-list">
              {getSelectedAddons(registration).length ? getSelectedAddons(registration).map((addon) => <span key={addon}>{addon}</span>) : <span>Tidak ada add-on</span>}
            </div>
            <p className="muted">{registration.notes || '-'}</p>
          </DataPanel>

          <DataPanel title="Hasil Pekerjaan Worker">
            <AdminJobResultsPanel jobs={tripJobs} />
          </DataPanel>
        </section>

        <AppModal
          isOpen={isReminderModalOpen}
          title="Kirim Pengingat Private Trip?"
          description="Pengingat akan dikirim hanya ke peserta pada booking private ini."
          confirmText={isSendingReminder ? 'Mengirim...' : 'Kirim pengingat'}
          cancelText="Batal"
          variant="warning"
          confirmDisabled={isSendingReminder}
          cancelDisabled={isSendingReminder}
          onConfirm={sendPrivateTripReminder}
          onCancel={() => {
            if (!isSendingReminder) setIsReminderModalOpen(false)
          }}
        >
          <div className="reminder-modal-count">
            <span>Penerima email</span>
            <strong>{registration.email || '-'}</strong>
          </div>
        </AppModal>
      </section>
    </AdminShell>
  )
}

function AdminPrivateTripScheduleDetail({ trip, registrations, jobs, setRegistrationStatus, navigate, ...props }) {
  const tripRegistrations = registrations
    .filter((item) => Number(item.tripId) === Number(trip.id))
    .filter((item) => item.isPrivateTrip || item.isPrivateTour || item.tripType === 'private')
    .sort((a, b) => String(getRegistrationDate(a)).localeCompare(String(getRegistrationDate(b))) || String(a.sessionName || '').localeCompare(String(b.sessionName || '')))
  const pendingRegistrations = tripRegistrations.filter(isPendingRegistration)
  const relatedJobs = jobs.filter((job) => Number(job.tripId) === Number(trip.id) && (!job.registrationId || tripRegistrations.some((registration) => Number(registration.id) === Number(job.registrationId))))
  const assignedJobs = relatedJobs.filter((job) => job.worker)
  const range = getPrivateDateRange(trip)
  const sessions = getTripSessions(trip)

  return (
    <AdminShell title="Detail Jadwal Private" navigate={navigate} {...props}>
      <section className="admin-page-stack registration-management-page">
        <div className="admin-page-head registration-management-head">
          <div>
            <p className="eyebrow">Private trip</p>
            <h2>{trip.name}</h2>
            <p className="muted">{adminText(trip.destination)} - {range.startDate ? formatDate(range.startDate) : '-'} sampai {range.endDate ? formatDate(range.endDate) : '-'}</p>
          </div>
          <button className="outline-btn" onClick={() => navigate('/admin/jadwal')}>Kembali ke jadwal</button>
        </div>

        <section className="stat-grid dashboard-stats">
          <Metric label="Booking masuk" value={tripRegistrations.length} />
          <Metric label="Booking pending" value={pendingRegistrations.length} />
          <Metric label="Pekerja terisi" value={`${assignedJobs.length}/${relatedJobs.length}`} />
        </section>

        <section className="schedule-detail-grid">
          <DataPanel title="Sesi Private Trip">
            <div className="selected-addon-list">
              {sessions.map((session) => <span key={session.id}>{session.name}: {session.startTime || '-'} - {session.endTime || '-'}</span>)}
            </div>
          </DataPanel>

          <DataPanel title="Booking Private">
            <div className="registration-card-grid">
              {tripRegistrations.length ? tripRegistrations.map((item) => (
                <RegistrationApprovalCard
                  item={item}
                  key={item.id}
                  onDetail={() => navigate(`/admin/jadwal/private/${item.id}`)}
                  setRegistrationStatus={setRegistrationStatus}
                />
              )) : <p className="empty-column">Belum ada booking untuk private trip ini.</p>}
            </div>
          </DataPanel>
        </section>
      </section>
    </AdminShell>
  )
}

function AdminScheduleDetail({ trip, scheduleId, registrations, jobs, setRegistrationStatus, navigate, showToast, ...props }) {
  const selectedSchedule = scheduleId ? getTripSchedules(trip).find((schedule) => schedule.id === scheduleId) : null
  const tripRegistrations = registrations
    .filter((item) => item.tripId === trip.id)
    .filter((item) => !selectedSchedule || isSameScheduleRegistration(item, selectedSchedule))
  const approvedParticipants = tripRegistrations.filter((item) => item.status === 'Disetujui' || item.status === 'Selesai')
  const reminderRecipients = tripRegistrations.filter((item) => isReminderApprovedRegistration(item) && item.email)
  const hasApprovedReminderParticipant = tripRegistrations.some(isReminderApprovedRegistration)
  const waitingRegistrations = tripRegistrations.filter(isPendingRegistration)
  const rejectedRegistrations = tripRegistrations.filter((item) => item.status === 'Ditolak')
  const tripJobs = jobs.filter((job) => job.tripId === trip.id && (!selectedSchedule || !job.registrationId || tripRegistrations.some((registration) => Number(registration.id) === Number(job.registrationId))))
  const tripSchedules = (selectedSchedule ? [selectedSchedule] : getTripSchedules(trip)).map((schedule) => {
    const approvedCount = approvedParticipants
      .filter((registration) => registration.scheduleId ? registration.scheduleId === schedule.id : getRegistrationDate(registration) === schedule.date)
      .reduce((total, registration) => total + Number(registration.participants || 0), 0)
    return { ...schedule, approvedCount, remaining: Math.max(Number(schedule.quota || 0) - approvedCount, 0) }
  })
  const [activeStatus, setActiveStatus] = useState('Menunggu Approval')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedRegistration, setSelectedRegistration] = useState(null)
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [isSendingReminder, setIsSendingReminder] = useState(false)
  const statusTabs = [
    ['Menunggu Approval', waitingRegistrations.length],
    ['Disetujui', approvedParticipants.length],
    ['Ditolak', rejectedRegistrations.length],
  ]
  const searchTerm = search.trim().toLowerCase()
  const activeItems = tripRegistrations
    .filter((item) => {
      if (activeStatus === 'Disetujui') return item.status === 'Disetujui' || item.status === 'Selesai'
      if (activeStatus === 'Menunggu Approval') return isPendingRegistration(item)
      return item.status === activeStatus
    })
    .filter((item) => {
      if (typeFilter === 'private') return item.isPrivateTrip || item.isPrivateTour
      if (typeFilter === 'open') return !item.isPrivateTrip && !item.isPrivateTour
      return true
    })
    .filter((item) => {
      if (!searchTerm) return true
      return [item.name, item.email, item.whatsapp]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm)
    })

  const sendTripReminder = async () => {
    if (isSendingReminder || !hasApprovedReminderParticipant) return
    setIsSendingReminder(true)
    try {
      const response = await fetch('/.netlify/functions/sendTripReminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: trip.id,
          tripScheduleId: selectedSchedule?.id || '',
          selectedDate: selectedSchedule?.date || '',
        }),
      })
      const responseText = await response.text()
      let result = {}
      try {
        result = responseText ? JSON.parse(responseText) : {}
      } catch {
        result = {}
      }
      if (!response.ok) {
        throw new Error(result.message || responseText || 'Pengingat gagal dikirim.')
      }
      const sent = Number(result.sent || 0)
      const failed = Number(result.failed || 0)
      showToast?.(failed > 0 ? `${sent} berhasil, ${failed} gagal` : `Pengingat berhasil dikirim ke ${sent} peserta`)
      setIsReminderModalOpen(false)
    } catch (error) {
      showToast?.(error.message || 'Pengingat gagal dikirim.')
    } finally {
      setIsSendingReminder(false)
    }
  }

  return (
    <AdminShell title="Manajemen Pendaftaran" navigate={navigate} {...props}>
      <section className="admin-page-stack registration-management-page">
        <div className="admin-page-head registration-management-head">
          <div>
            <p className="eyebrow">Approval peserta</p>
            <h2>Manajemen Pendaftaran</h2>
            <p className="muted">{trip.name} - {adminText(trip.destination)} - {selectedSchedule ? formatDate(selectedSchedule.date) : `${tripSchedules.length} jadwal`}</p>
          </div>
          <div className="registration-management-actions">
            <div className="reminder-action-wrap">
              <button
                className="primary-btn"
                type="button"
                disabled={!hasApprovedReminderParticipant || isSendingReminder}
                onClick={() => setIsReminderModalOpen(true)}
              >
                {isSendingReminder ? 'Mengirim...' : 'Kirim Pengingat'}
              </button>
              {!hasApprovedReminderParticipant && <span>Belum ada peserta disetujui</span>}
            </div>
            <button className="outline-btn" onClick={() => navigate('/admin/jadwal')}>Kembali ke jadwal</button>
          </div>
        </div>

        <section className="registration-summary-cards">
          <button className={activeStatus === 'Menunggu Approval' ? 'is-active' : ''} type="button" onClick={() => setActiveStatus('Menunggu Approval')}>
            <span>Menunggu</span>
            <strong>{waitingRegistrations.length}</strong>
          </button>
          <button className={activeStatus === 'Disetujui' ? 'is-active' : ''} type="button" onClick={() => setActiveStatus('Disetujui')}>
            <span>Disetujui</span>
            <strong>{approvedParticipants.length}</strong>
          </button>
          <button className={activeStatus === 'Ditolak' ? 'is-active' : ''} type="button" onClick={() => setActiveStatus('Ditolak')}>
            <span>Ditolak</span>
            <strong>{rejectedRegistrations.length}</strong>
          </button>
        </section>

        <section className="schedule-detail-grid">
          <DataPanel title="Jadwal Open Trip">
            <div className="registration-status-list">
              {tripSchedules.map((schedule) => (
                <article className="registration-status-card" key={schedule.id}>
                  <div className="registration-card-main">
                    <h4>{formatDate(schedule.date)}</h4>
                    <dl>
                      <div><dt>Kuota</dt><dd>{schedule.quota}</dd></div>
                      <div><dt>Disetujui</dt><dd>{schedule.approvedCount}</dd></div>
                      <div><dt>Sisa kuota</dt><dd>{schedule.remaining}</dd></div>
                      <div><dt>Status</dt><dd>{schedule.status}</dd></div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          </DataPanel>

          <DataPanel title="Pekerja Trip">
            <AdminJobResultsPanel jobs={tripJobs} emptyText="Belum ada job add-on untuk trip ini." />
          </DataPanel>
        </section>

        <section className="registration-approval-panel">
          <div className="registration-toolbar">
            <div className="segmented-tabs" role="tablist" aria-label="Filter status pendaftaran">
              {statusTabs.map(([status, count]) => (
                <button className={activeStatus === status ? 'is-active' : ''} key={status} type="button" onClick={() => setActiveStatus(status)}>
                  {status}
                  <span>{count}</span>
                </button>
              ))}
            </div>
            <div className="registration-filter-row">
              <label>
                <span>Cari peserta</span>
                <input placeholder="Nama, email, atau WhatsApp" value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
              <label>
                <span>Jenis trip</span>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                  <option value="all">Semua jenis</option>
                  <option value="open">Open trip goa</option>
                  <option value="private">Private cave tour</option>
                </select>
              </label>
            </div>
          </div>

          <div className="registration-card-grid">
            {activeItems.length ? activeItems.map((item) => (
              <RegistrationApprovalCard
                item={item}
                key={item.id}
                onDetail={() => setSelectedRegistration(item)}
                setRegistrationStatus={setRegistrationStatus}
              />
            )) : <p className="empty-column">Belum ada data untuk filter ini.</p>}
          </div>
        </section>

        {selectedRegistration && (
          <RegistrationDetailModal
            item={selectedRegistration}
            trip={trip}
            jobs={jobs}
            setRegistrationStatus={setRegistrationStatus}
            onClose={() => setSelectedRegistration(null)}
          />
        )}
        <AppModal
          isOpen={isReminderModalOpen}
          title="Kirim Pengingat Trip?"
          description="Pengingat akan dikirim ke semua peserta yang sudah disetujui pada jadwal ini."
          confirmText={isSendingReminder ? 'Mengirim...' : 'Kirim pengingat'}
          cancelText="Batal"
          variant="warning"
          confirmDisabled={isSendingReminder}
          cancelDisabled={isSendingReminder}
          onConfirm={sendTripReminder}
          onCancel={() => {
            if (!isSendingReminder) setIsReminderModalOpen(false)
          }}
        >
          <div className="reminder-modal-count">
            <span>Jumlah penerima email</span>
            <strong>{reminderRecipients.length} peserta</strong>
          </div>
        </AppModal>
      </section>
    </AdminShell>
  )
}

function RegistrationApprovalCard({ item, setRegistrationStatus, onDetail }) {
  return (
    <article className="registration-approval-card">
      <div className="registration-approval-card-head">
        <h3>{item.name}</h3>
        <Badge status={item.status} />
      </div>
      <dl>
        <div><dt>Jenis trip</dt><dd>{registrationTripType(item)}</dd></div>
        <div><dt>Tanggal</dt><dd>{formatDate(getRegistrationDate(item))}</dd></div>
        {item.sessionName && <div><dt>Sesi</dt><dd>{item.sessionName}{item.startTime && item.endTime ? ` (${item.startTime} - ${item.endTime})` : ''}</dd></div>}
        <div><dt>Peserta</dt><dd>{item.participants} orang</dd></div>
        <div><dt>Usia</dt><dd>{item.age ? `${item.age} tahun` : '-'}</dd></div>
        <div><dt>Domisili</dt><dd>{item.address || '-'}</dd></div>
        <div className="full"><dt>Add-on</dt><dd>{getSelectedAddons(item).join(', ') || '-'}</dd></div>
      </dl>
      <div className="registration-card-actions">
        <button className="outline-btn" type="button" onClick={onDetail}>Lihat Detail</button>
        <label>
          <span>Ubah Status</span>
          <select className="status-select" value={item.status} onChange={(event) => setRegistrationStatus(item.id, event.target.value)}>
            {registrationStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
      </div>
    </article>
  )
}

function RegistrationDetailModal({ item, trip, jobs = [], setRegistrationStatus, onClose }) {
  const participantDetails = Array.isArray(item.participantDetails) && item.participantDetails.length
    ? item.participantDetails
    : [{ name: item.name, address: item.address, age: item.age, gender: item.gender, healthNotes: item.healthNotes }]
  const registrationDate = getRegistrationDate(item) || trip.date
  const resultJobs = getRegistrationResultJobs(jobs, item)

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal-panel registration-detail-modal" role="dialog" aria-modal="true" aria-labelledby="registration-detail-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Detail pendaftaran</p>
            <h2 id="registration-detail-title">{item.name}</h2>
          </div>
          <button className="outline-btn" type="button" onClick={onClose}>Tutup</button>
        </div>

        <div className="registration-detail-sections">
          <section>
            <h3>Data Kontak</h3>
            <dl>
              <div><dt>Email</dt><dd>{item.email}</dd></div>
              <div><dt>WhatsApp</dt><dd>{item.whatsapp}</dd></div>
              <div><dt>Status</dt><dd><Badge status={item.status} /></dd></div>
            </dl>
          </section>

          <section>
            <h3>Detail Trip</h3>
            <dl>
              <div><dt>Paket</dt><dd>{trip.name}</dd></div>
              <div><dt>Jenis</dt><dd>{registrationTripType(item)}</dd></div>
              <div><dt>Tanggal</dt><dd>{formatDate(registrationDate)}</dd></div>
              {item.sessionName && <div><dt>Sesi</dt><dd>{item.sessionName}{item.startTime && item.endTime ? ` (${item.startTime} - ${item.endTime})` : ''}</dd></div>}
              <div><dt>Add-on</dt><dd>{getSelectedAddons(item).join(', ') || '-'}</dd></div>
            </dl>
          </section>

          <section>
            <h3>Informasi Peserta</h3>
            <div className="participant-detail-list">
              {participantDetails.map((participant, index) => (
                <div key={`${item.id}-${index}`}>
                  <strong>{participant.name || `Peserta ${index + 1}`}</strong>
                  <span>{participant.gender || '-'} - {participant.age || '-'} tahun - {participant.address || '-'}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3>Catatan & Kesehatan</h3>
            <dl>
              <div><dt>Kondisi kesehatan</dt><dd>{item.healthNotes || '-'}</dd></div>
              <div><dt>Catatan</dt><dd>{item.notes || '-'}</dd></div>
            </dl>
          </section>

          <section>
            <h3>Hasil Pekerjaan Worker</h3>
            <AdminJobResultsPanel jobs={resultJobs} />
          </section>
        </div>

        <label className="registration-card-status">Ubah status<select className="status-select" value={item.status} onChange={(event) => setRegistrationStatus(item.id, event.target.value)}>
          {registrationStatuses.map((status) => <option key={status}>{status}</option>)}
        </select></label>
      </section>
    </div>
  )
}

export function AdminWorkers(props) {
  const { workerAccounts, createWorkerAccount, jobs, trips } = props
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const workers = [accounts.worker, ...workerAccounts]

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!form.name || !form.email || !form.password) {
      setError('Lengkapi nama, email, dan password pekerja.')
      return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    const isCreated = await createWorkerAccount(form)
    if (!isCreated) {
      setError('Email pekerja sudah terdaftar.')
      return
    }

    setForm({ name: '', email: '', password: '' })
    setError('')
    setIsModalOpen(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setError('')
    setForm({ name: '', email: '', password: '' })
  }

  return (
    <AdminShell title="Akun Pekerja" {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Tim pekerja</p>
            <h2>Buat dan pantau akun pekerja operasional.</h2>
            <p className="muted">Akun ini dipakai pekerja untuk mengambil job dan mengubah status tugas.</p>
          </div>
          <button className="primary-btn" type="button" onClick={() => setIsModalOpen(true)}>Buat akun pekerja</button>
        </div>

        <section className="admin-workers-layout">
          <DataPanel title="Daftar Akun Pekerja">
            <div className="worker-accordion-list">
              {workers.map((worker) => {
                const workerJobs = jobs
                  .filter((job) => job.worker === worker.name)
                  .sort((a, b) => Number(b.id) - Number(a.id))
                return (
                  <details className="worker-accordion-item" key={worker.email}>
                    <summary>
                      <span>
                        <strong>{worker.name}</strong>
                        <small>{worker.email}</small>
                      </span>
                      <span className="worker-job-count">{workerJobs.length} job</span>
                    </summary>
                    <div className="worker-job-list">
                      {workerJobs.length ? workerJobs.map((job) => {
                        const trip = trips.find((item) => item.id === job.tripId)
                        return (
                          <article className="worker-job-item" key={job.id}>
                            <div>
                              <strong>{job.addonLabel || 'Job trip'}</strong>
                              <span>{trip?.name || 'Cave trip'} - {formatDate(job.requestedDate || trip?.date)}</span>
                            </div>
                            <p>{job.task}</p>
                            <Badge status={job.status} />
                          </article>
                        )
                      }) : <p className="empty-column">Pekerja ini belum mengambil job.</p>}
                    </div>
                  </details>
                )
              })}
            </div>
          </DataPanel>
        </section>

        {isModalOpen && (
          <div className="modal-backdrop" role="presentation" onClick={closeModal}>
            <section className="modal-panel worker-modal" role="dialog" aria-modal="true" aria-labelledby="worker-modal-title" onClick={(event) => event.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Akun pekerja baru</p>
                  <h2 id="worker-modal-title">Buat Akun Pekerja</h2>
                </div>
                <button className="outline-btn" type="button" onClick={closeModal}>Tutup</button>
              </div>
              <form className="data-form compact" onSubmit={onSubmit}>
                {error && <p className="form-error">{error}</p>}
                <label>Nama pekerja<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label>Password<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
                <button className="primary-btn" type="submit">Buat akun pekerja</button>
              </form>
            </section>
          </div>
        )}
      </section>
    </AdminShell>
  )
}

export function JobTable({ jobs, trips, compact }) {
  const rows = compact ? jobs.slice(0, 5) : jobs
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Paket</th><th>Destinasi</th><th>Tanggal</th><th>Kebutuhan</th><th>Tugas</th><th>Status job</th><th>Pekerja</th></tr></thead>
        <tbody>{rows.map((job) => {
          const trip = trips.find((item) => item.id === job.tripId)
          return <tr key={job.id}><td>{trip?.name}</td><td>{adminText(trip?.destination)}</td><td>{formatDate(job.requestedDate || trip?.date)}</td><td>{job.addonLabel || 'Job trip'}</td><td>{job.task}</td><td><Badge status={job.status} /></td><td>{job.worker || '-'}</td></tr>
        })}</tbody>
      </table>
    </div>
  )
}
