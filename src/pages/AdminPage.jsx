import { useState } from 'react'
import { accounts, addonOptions, registrationStatuses, tripStatuses } from '../config/constants'
import { formatCurrency, formatDate, tripName } from '../utils/formatters'
import { AppModal, Badge, DataPanel, Metric, Sidebar } from './shared'

const parseImageUrls = (value) => String(value || '')
  .split(/\r?\n|,/)
  .map((item) => item.trim())
  .filter(Boolean)

const getActivityText = (trip) => {
  if (trip?.activity) return trip.activity
  if (trip?.itinerary) return trip.itinerary
  if (!Array.isArray(trip?.itineraryDays)) return ''
  return trip.itineraryDays
    .map((item) => (typeof item === 'string' ? item : item?.text))
    .filter(Boolean)
    .join('\n')
}

const normalizeTripForm = (trip) => {
  return {
    name: '',
    destination: '',
    date: '',
    price: 0,
    quota: 10,
    slots: 10,
    minParticipants: 2,
    maxParticipants: 10,
    privateNotes: '',
    flexibleSchedule: true,
    isPrivateTrip: false,
    imageUrl: '',
    imageUrls: [],
    description: '',
    facilities: '',
    status: 'Tersedia',
    ...trip,
    activity: getActivityText(trip),
    imageUrlsText: parseImageUrls(Array.isArray(trip?.imageUrls) && trip.imageUrls.length ? trip.imageUrls.join('\n') : trip?.imageUrl).join('\n'),
  }
}

const registrationTripType = (item) => {
  if (item.isPrivateTrip) return 'Private cave tour'
  if (item.isPrivateTour) return 'Private cave tour'
  return 'Open trip goa'
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
        <h1>{title}</h1>
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
  const [search, setSearch] = useState('')
  const [tripToDelete, setTripToDelete] = useState(null)
  const searchTerm = search.trim().toLowerCase()
  const filteredTrips = props.trips
    .filter((trip) => {
      if (activeType === 'open') return !trip.isPrivateTrip
      if (activeType === 'private') return trip.isPrivateTrip
      return true
    })
    .filter((trip) => {
      if (!searchTerm) return true
      return [trip.name, trip.destination, trip.description]
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
  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return
    await props.deleteTrip(tripToDelete.id)
    setTripToDelete(null)
  }

  return (
    <AdminShell title="Paket Trip" {...props}>
      <section className="admin-page-stack admin-trip-page">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Katalog trip</p>
            <h2>Kelola paket Open Trip dan Private Trip dari satu tempat.</h2>
            <p className="muted">Filter jenis trip, cek status, lalu update paket yang tampil untuk customer.</p>
          </div>
          <button className="primary-btn" onClick={() => props.navigate('/admin/open-trip/tambah')}>Tambah paket trip</button>
        </div>

        <section className="admin-list-toolbar">
          <div className="segmented-tabs compact-tabs" role="tablist" aria-label="Filter jenis paket trip">
            {typeTabs.map(([value, label, count]) => (
              <button className={activeType === value ? 'is-active' : ''} key={value} type="button" onClick={() => setActiveType(value)}>
                {label}<span>{count}</span>
              </button>
            ))}
          </div>
          <label className="admin-search-field">
            <span>Cari paket</span>
            <input placeholder="Nama trip, destinasi, atau deskripsi" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </section>

        <div className="admin-trip-grid">
          {filteredTrips.length ? filteredTrips.map((trip) => (
              <article className="admin-trip-card" key={trip.id}>
                <div className="admin-trip-card-head">
                  <div>
                    <h3>{trip.name}</h3>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip.destination}</p>
                  </div>
                  <div className="card-badge-stack">
                    <span className="trip-type-chip">{trip.isPrivateTrip ? 'Private Trip' : 'Open Trip'}</span>
                    <Badge status={trip.status} />
                  </div>
                </div>
                <div className="admin-trip-price">
                  <span><span className="asset-icon icon-currency" aria-hidden="true" />{trip.isPrivateTrip ? 'Mulai dari' : 'Harga per orang'}</span>
                  <strong>{formatCurrency(trip.price)}</strong>
                </div>
                <dl className="admin-trip-meta">
                  <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />Jadwal</dt><dd>{trip.isPrivateTrip ? 'Jadwal fleksibel' : formatDate(trip.date)}</dd></div>
                  {!trip.isPrivateTrip && <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Kuota / Slot</dt><dd>{trip.quota} / {trip.slots}</dd></div>}
                  {trip.isPrivateTrip && <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Peserta</dt><dd>Min {trip.minParticipants || 2} - Max {trip.maxParticipants || trip.quota || 10}</dd></div>}
                  <div><dt>Status</dt><dd>{trip.status}</dd></div>
                </dl>
                <div className="admin-trip-actions">
                  <button className="outline-btn" onClick={() => props.navigate(`/admin/jadwal/${trip.id}`)}>Detail</button>
                  <button className="outline-btn" onClick={() => props.navigate(`/admin/open-trip/edit/${trip.id}`)}>Edit</button>
                  <button className="outline-btn danger-btn" onClick={() => setTripToDelete(trip)}>Hapus</button>
                </div>
              </article>
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
  const isPrivateTrip = Boolean(form.isPrivateTrip)
  const previewImage = parseImageUrls(form.imageUrlsText || form.imageUrl)[0]

  const onSubmit = async (event) => {
    event.preventDefault()
    const imageUrls = parseImageUrls(form.imageUrlsText || form.imageUrl)
    const tripForm = { ...form }
    delete tripForm.imageUrlsText
    delete tripForm.durationDays
    delete tripForm.itineraryDays
    delete tripForm.itinerary
    await saveTrip({
      ...tripForm,
      activity: form.activity.trim(),
      price: Number(form.price),
      quota: isPrivateTrip ? Number(form.maxParticipants || form.quota) : Number(form.quota),
      slots: isPrivateTrip ? Number(form.maxParticipants || form.slots || form.quota) : Number(form.slots),
      minParticipants: isPrivateTrip ? Number(form.minParticipants) || 1 : 1,
      maxParticipants: isPrivateTrip ? Number(form.maxParticipants) || Number(form.quota) || 1 : Number(form.quota),
      privateNotes: isPrivateTrip ? form.privateNotes || '' : '',
      flexibleSchedule: isPrivateTrip,
      isPrivateTrip,
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
        <form className="trip-section-form" onSubmit={onSubmit}>
          <section className="form-section-card">
            <div className="form-section-title">
              <span>1</span>
              <div><h3>Informasi Dasar</h3><p>Identitas utama paket yang tampil di katalog customer.</p></div>
            </div>
            <div className="data-form section-fields">
              <label>{isPrivateTrip ? 'Nama private trip' : 'Nama trip'}<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Destinasi<input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></label>
              <label>Jenis trip<select value={isPrivateTrip ? 'private' : 'open'} onChange={(e) => setForm({ ...form, isPrivateTrip: e.target.value === 'private' })}><option value="open">Open Trip</option><option value="private">Private Trip</option></select><small>{isPrivateTrip ? 'Private Trip menerima request tanggal dari customer.' : 'Open Trip memakai tanggal keberangkatan tetap.'}</small></label>
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
                  <label>Tanggal keberangkatan<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /><small>Gunakan tanggal tetap untuk Open Trip.</small></label>
                  <label>Harga per orang<input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
                  <label>Kuota peserta<input required type="number" min="1" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} /></label>
                  <label>Slot tersedia<input required type="number" min="0" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} /><small>Biasanya sama dengan kuota saat paket baru dibuat.</small></label>
                </>
              ) : (
                <>
                  <label>Jadwal fleksibel<input disabled value="Customer memilih tanggal saat checkout" /><small>Gunakan jadwal fleksibel karena customer dapat request tanggal sendiri.</small></label>
                  <label>Harga mulai dari / harga paket<input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
                  <label>Minimal peserta<input required type="number" min="1" value={form.minParticipants} onChange={(e) => setForm({ ...form, minParticipants: e.target.value })} /></label>
                  <label>Maksimal peserta<input required type="number" min="1" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: e.target.value, quota: e.target.value, slots: e.target.value })} /></label>
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
              <label className="full">Deskripsi<textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label className="full">Activity<textarea required placeholder="Contoh: briefing keselamatan, eksplor lorong goa, cave tubing, sesi foto, dan kembali ke meeting point." value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></label>
              <label className="full">Fasilitas<textarea required value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} /></label>
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
        <thead><tr><th>Customer</th><th>Kontak</th><th>Peserta</th><th>Cave trip</th><th>Tanggal</th><th>Data utama</th><th>Add-on</th><th>Catatan</th><th>Status</th></tr></thead>
        <tbody>{rows.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td><td>{item.whatsapp}<br />{item.email}</td><td>{item.participants}</td><td>{tripName(trips, item.tripId)}</td><td>{formatDate(item.requestedDate || trips.find((trip) => trip.id === item.tripId)?.date)}</td><td>{item.address || '-'}<br />{item.age ? `${item.age} tahun` : '-'} - {item.gender || '-'}<br />{item.healthNotes || '-'}</td><td>{getSelectedAddons(item).join(', ') || '-'}</td><td>{item.notes}</td>
            <td><select className="status-select" value={item.status} onChange={(e) => setRegistrationStatus(item.id, e.target.value)}>{registrationStatuses.map((status) => <option key={status}>{status}</option>)}</select></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function AdminSchedule(props) {
  const { trips, registrations, jobs, scheduleTripId, scheduleRegistrationId } = props
  const [activeType, setActiveType] = useState('all')
  const [search, setSearch] = useState('')
  const selectedTrip = trips.find((trip) => trip.id === scheduleTripId)
  const selectedRegistration = registrations.find((item) => item.id === scheduleRegistrationId)
  if (scheduleTripId && selectedTrip) return <AdminScheduleDetail trip={selectedTrip} {...props} />
  if (scheduleRegistrationId && selectedRegistration) return <AdminPrivateScheduleDetail registration={selectedRegistration} {...props} />
  const openTrips = trips.filter((trip) => !trip.isPrivateTrip)
  const privateSchedules = registrations
    .map((item) => ({ registration: item, trip: trips.find((trip) => trip.id === item.tripId) }))
    .filter(({ registration, trip }) => trip && (trip.isPrivateTrip || registration.isPrivateTour))
  const openScheduleItems = openTrips.map((trip) => {
    const openTripRegistrations = registrations.filter((item) => item.tripId === trip.id && !item.isPrivateTrip && !item.isPrivateTour)
    const approvedRegistrations = openTripRegistrations.filter((item) => item.status === 'Disetujui' || item.status === 'Selesai')
    const waitingRegistrations = openTripRegistrations.filter(isPendingRegistration)
    return {
      type: 'open',
      key: `open-${trip.id}`,
      trip,
      approvedRegistrations,
      approvedParticipants: countParticipants(approvedRegistrations),
      waitingParticipants: countParticipants(waitingRegistrations),
      searchValues: [trip.name, trip.destination, trip.description],
      date: trip.date,
    }
  })
  const privateScheduleItems = privateSchedules.map(({ registration, trip }) => {
    const participantDetails = Array.isArray(registration.participantDetails) ? registration.participantDetails : []
    return {
      type: 'private',
      key: `private-${registration.id}`,
      registration,
      trip,
      participantDetails,
      waitingParticipants: isPendingRegistration(registration) ? Number(registration.participants || 0) : 0,
      searchValues: [trip.name, trip.destination, registration.name, registration.whatsapp, registration.email],
      date: registration.requestedDate || trip.date,
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
    ['open', 'Open Trip', openTrips.length],
    ['private', 'Private Trip', privateSchedules.length],
    ['waiting', 'Menunggu Approval', pendingParticipants],
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
              const { trip, approvedRegistrations, approvedParticipants, waitingParticipants } = item
              const tripJobs = jobs.filter((job) => job.tripId === trip.id)
              const assignedJobs = tripJobs.filter((job) => job.worker).length
              const workerTarget = tripJobs.length
              return (
                <article className={`schedule-card ${waitingParticipants > 0 ? 'needs-review' : ''}`} key={item.key}>
                <div className="schedule-card-head">
                  <div>
                    <h3>{trip.name}</h3>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip.destination}</p>
                  </div>
                  <div className="card-badge-stack">
                    {waitingParticipants > 0 && <span className="review-badge">Ada Pendaftar Baru</span>}
                    {trip.isPrivateTrip && <span className="trip-type-chip">Private cave tour</span>}
                    <Badge status={trip.status} />
                  </div>
                </div>
                <div className="schedule-date-row">
                  <span><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal</span>
                  <strong>{formatDate(trip.date)}</strong>
                </div>
                <dl className="schedule-metrics">
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Peserta</dt><dd>{approvedParticipants}/{trip.quota}</dd></div>
                  <div className={waitingParticipants > 0 ? 'metric-highlight' : ''}><dt>Menunggu</dt><dd>{waitingParticipants}</dd></div>
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Pekerja</dt><dd>{assignedJobs}/{workerTarget}</dd></div>
                </dl>
                
                <div className="schedule-card-footer">
                  <div className="participant-list">{approvedRegistrations.length ? approvedRegistrations.slice(0, 3).map((participant) => <span key={participant.id}>{participant.name} ({participant.participants})</span>) : <span>Belum ada peserta disetujui</span>}</div>
                  <button className="outline-btn" onClick={() => props.navigate(`/admin/jadwal/${trip.id}`)}>{waitingParticipants > 0 ? 'Review Pendaftar' : 'Detail jadwal'}</button>
                </div>
              </article>
              )
            }

            const { registration, trip, participantDetails, waitingParticipants } = item
            const tripJobs = jobs.filter((job) => Number(job.registrationId) === Number(registration.id))
            const assignedJobs = tripJobs.filter((job) => job.worker).length
            const workerTarget = tripJobs.length || getSelectedAddons(registration).length || 0
            return (
              <article className={`schedule-card ${waitingParticipants > 0 ? 'needs-review' : ''}`} key={item.key}>
                <div className="schedule-card-head">
                  <div>
                    <h3>{trip.name}</h3>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip.destination}</p>
                  </div>
                  <div className="card-badge-stack">
                    {waitingParticipants > 0 && <span className="review-badge">Butuh Review</span>}
                    <span className="trip-type-chip">Private booking</span>
                    <Badge status={registration.status} />
                  </div>
                </div>
                <div className="schedule-date-row">
                  <span><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal request</span>
                  <strong>{formatDate(registration.requestedDate || trip.date)}</strong>
                </div>
                <dl className="schedule-metrics">
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Peserta</dt><dd>{registration.participants}</dd></div>
                  <div className={waitingParticipants > 0 ? 'metric-highlight' : ''}><dt>Menunggu</dt><dd>{waitingParticipants}</dd></div>
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Pekerja</dt><dd>{assignedJobs}/{workerTarget}</dd></div>
                </dl>
                <div className="schedule-card-footer">
                  <div className="participant-list">{participantDetails.length ? participantDetails.slice(0, 3).map((item, index) => <span key={`${registration.id}-${index}`}>{item.name}</span>) : <span>{registration.name} ({registration.participants})</span>}</div>
                  <button className="outline-btn" onClick={() => props.navigate(`/admin/jadwal/private/${registration.id}`)}>{waitingParticipants > 0 ? 'Review Pendaftar' : 'Detail jadwal'}</button>
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

function AdminPrivateScheduleDetail({ registration, trips, jobs, setRegistrationStatus, navigate, ...props }) {
  const trip = trips.find((item) => item.id === registration.tripId)
  const tripJobs = jobs.filter((job) => Number(job.registrationId) === Number(registration.id))
  const assignedJobs = tripJobs.filter((job) => job.worker)
  const participantDetails = Array.isArray(registration.participantDetails) && registration.participantDetails.length
    ? registration.participantDetails
    : [{ name: registration.name, address: registration.address, age: registration.age, gender: registration.gender, healthNotes: registration.healthNotes }]

  return (
    <AdminShell title="Detail Jadwal Private" navigate={navigate} {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Private booking</p>
            <h2>{trip?.name || 'Private cave tour'}</h2>
            <p className="muted">{trip?.destination || '-'} - {formatDate(registration.requestedDate || trip?.date)} - {registration.name}</p>
          </div>
          <button className="outline-btn" onClick={() => navigate('/admin/jadwal')}>Kembali ke jadwal</button>
        </div>

        <section className="stat-grid dashboard-stats">
          <Metric label="Jumlah peserta" value={registration.participants} />
          <Metric label="Status" value={registration.status} />
          <Metric label="Pekerja terisi" value={`${assignedJobs.length}/${tripJobs.length || getSelectedAddons(registration).length || 0}`} />
          <Metric label="Tanggal request" value={formatDate(registration.requestedDate || trip?.date)} />
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
        </section>
      </section>
    </AdminShell>
  )
}

function AdminScheduleDetail({ trip, registrations, jobs, setRegistrationStatus, navigate, ...props }) {
  const tripRegistrations = registrations.filter((item) => item.tripId === trip.id)
  const approvedParticipants = tripRegistrations.filter((item) => item.status === 'Disetujui' || item.status === 'Selesai')
  const waitingRegistrations = tripRegistrations.filter(isPendingRegistration)
  const rejectedRegistrations = tripRegistrations.filter((item) => item.status === 'Ditolak')
  const tripJobs = jobs.filter((job) => job.tripId === trip.id)
  const [activeStatus, setActiveStatus] = useState('Menunggu Approval')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedRegistration, setSelectedRegistration] = useState(null)
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

  return (
    <AdminShell title="Manajemen Pendaftaran" navigate={navigate} {...props}>
      <section className="admin-page-stack registration-management-page">
        <div className="admin-page-head registration-management-head">
          <div>
            <p className="eyebrow">Approval peserta</p>
            <h2>Manajemen Pendaftaran</h2>
            <p className="muted">{trip.name} - {trip.destination} - {formatDate(trip.date)}</p>
          </div>
          <button className="outline-btn" onClick={() => navigate('/admin/jadwal')}>Kembali ke jadwal</button>
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
          <DataPanel title="Peserta Disetujui">
            <div className="participant-list">
              {approvedParticipants.length ? approvedParticipants.map((item) => <span key={item.id}>{item.name} ({item.participants})</span>) : <span>Belum ada peserta disetujui</span>}
            </div>
          </DataPanel>

          <DataPanel title="Pekerja Trip">
            <div className="table-wrap compact-table">
              <table>
                <thead><tr><th>Kebutuhan</th><th>Booking</th><th>Pekerja</th><th>Status</th></tr></thead>
                <tbody>{tripJobs.length ? tripJobs.map((job) => (
                  <tr key={job.id}><td>{job.addonLabel || 'Job trip'}</td><td>{job.customerName || '-'}</td><td>{job.worker || '-'}</td><td><Badge status={job.status} /></td></tr>
                )) : <tr><td colSpan="4">Belum ada job add-on untuk trip ini.</td></tr>}</tbody>
              </table>
            </div>
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
            setRegistrationStatus={setRegistrationStatus}
            onClose={() => setSelectedRegistration(null)}
          />
        )}
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

function RegistrationDetailModal({ item, trip, setRegistrationStatus, onClose }) {
  const participantDetails = Array.isArray(item.participantDetails) && item.participantDetails.length
    ? item.participantDetails
    : [{ name: item.name, address: item.address, age: item.age, gender: item.gender, healthNotes: item.healthNotes }]

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
              <div><dt>Cave trip</dt><dd>{trip.name}</dd></div>
              <div><dt>Jenis</dt><dd>{registrationTripType(item)}</dd></div>
              <div><dt>Tanggal</dt><dd>{formatDate(item.requestedDate || trip.date)}</dd></div>
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
        <thead><tr><th>Cave trip</th><th>Destinasi</th><th>Tanggal</th><th>Kebutuhan</th><th>Tugas</th><th>Status job</th><th>Pekerja</th></tr></thead>
        <tbody>{rows.map((job) => {
          const trip = trips.find((item) => item.id === job.tripId)
          return <tr key={job.id}><td>{trip?.name}</td><td>{trip?.destination}</td><td>{formatDate(job.requestedDate || trip?.date)}</td><td>{job.addonLabel || 'Job trip'}</td><td>{job.task}</td><td><Badge status={job.status} /></td><td>{job.worker || '-'}</td></tr>
        })}</tbody>
      </table>
    </div>
  )
}
