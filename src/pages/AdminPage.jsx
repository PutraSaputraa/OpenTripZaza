import { useState } from 'react'
import { accounts, addonOptions, registrationStatuses, tripStatuses } from '../config/constants'
import { formatCurrency, formatDate, tripName } from '../utils/formatters'
import { Badge, DataPanel, Metric, Sidebar } from './shared'

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

function AdminShell({ title, children, navigate, logout, path }) {
  return (
    <main className="app-shell">
      <Sidebar title="Admin" links={[
        ['/admin/dashboard', 'Dashboard'],
        ['/admin/open-trip', 'Cave Trip'],
        ['/admin/jadwal', 'Jadwal'],
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
    ['Total cave trip', trips.length],
    ['Total pendaftar', registrations.length],
    ['Menunggu approval', registrations.filter((item) => item.status === 'Menunggu Approval').length],
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
            <button className="primary-btn" onClick={() => props.navigate('/admin/open-trip')}>Kelola cave trip</button>
            <button className="outline-btn" onClick={() => props.navigate('/admin/jadwal')}>Lihat jadwal</button>
          </div>
        </div>
        <section className="stat-grid dashboard-stats">{stats.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</section>
      </section>
    </AdminShell>
  )
}

export function AdminTrips(props) {
  return (
    <AdminShell title="Manajemen Cave Trip" {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Katalog trip</p>
            <h2>Atur paket open trip goa dan private cave tour yang tampil untuk customer.</h2>
            <p className="muted">Tambah, edit, atau tutup slot cave trip dari daftar utama ini.</p>
          </div>
          <button className="primary-btn" onClick={() => props.navigate('/admin/open-trip/tambah')}>Tambah cave trip</button>
        </div>
        <div className="admin-trip-grid">
          {props.trips.length ? props.trips.map((trip) => (
              <article className="admin-trip-card" key={trip.id}>
                <div className="admin-trip-card-head">
                  <div>
                    <h3>{trip.name}</h3>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip.destination}</p>
                  </div>
                  <div className="card-badge-stack">
                    {trip.isPrivateTrip && <span className="trip-type-chip">Private cave tour</span>}
                    <Badge status={trip.status} />
                  </div>
                </div>
                <div className="admin-trip-price">
                  <span><span className="asset-icon icon-currency" aria-hidden="true" />Harga</span>
                  <strong>{formatCurrency(trip.price)}</strong>
                </div>
                <dl className="admin-trip-meta">
                  <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal</dt><dd>{formatDate(trip.date)}</dd></div>
                  {!trip.isPrivateTrip && <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Kuota</dt><dd>{trip.quota} peserta</dd></div>}
                  {!trip.isPrivateTrip && <div><dt><span className="asset-icon icon-ticket" aria-hidden="true" />Slot</dt><dd>{trip.slots} tersedia</dd></div>}
                  <div><dt>Jenis</dt><dd>{trip.isPrivateTrip ? 'Private cave tour' : 'Open trip goa'}</dd></div>
                </dl>
                <div className="admin-trip-actions">
                  <button className="outline-btn" onClick={() => props.navigate(`/admin/open-trip/edit/${trip.id}`)}>Edit</button>
                  <button className="outline-btn danger-btn" onClick={() => props.deleteTrip(trip.id)}>Hapus</button>
                </div>
              </article>
          )) : <p className="empty-state">Belum ada cave trip.</p>}
        </div>
      </section>
    </AdminShell>
  )
}

export function TripForm({ tripId, trips, saveTrip, navigate, ...props }) {
  const selected = trips.find((item) => item.id === tripId)
  const [form, setForm] = useState(normalizeTripForm(selected))

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
      quota: Number(form.quota),
      slots: Number(form.slots),
      isPrivateTrip: Boolean(form.isPrivateTrip),
      imageUrl: imageUrls[0] || '',
      imageUrls,
    })
  }

  return (
    <AdminShell title={selected ? 'Edit Cave Trip' : 'Tambah Cave Trip'} navigate={navigate} {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">{selected ? 'Update cave trip' : 'Cave trip baru'}</p>
            <h2>{selected ? 'Perbarui detail cave trip.' : 'Lengkapi informasi cave trip baru.'}</h2>
            <p className="muted">Informasi ini akan muncul di katalog customer dan dipakai untuk monitoring internal.</p>
          </div>
          <button className="outline-btn" onClick={() => navigate('/admin/open-trip')}>Kembali</button>
        </div>
        <form className="data-form admin-form admin-form-card" onSubmit={onSubmit}>
          <label>Nama trip<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Destinasi<input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></label>
          <label>Tanggal keberangkatan<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label>Harga<input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
          <label>Kuota peserta<input required type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} /></label>
          <label>Slot tersedia<input required type="number" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} /></label>
          <label>Jenis trip<select value={form.isPrivateTrip ? 'private' : 'open'} onChange={(e) => setForm({ ...form, isPrivateTrip: e.target.value === 'private' })}><option value="open">Open trip goa</option><option value="private">Private cave tour</option></select></label>
          <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{tripStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="full">Link gambar trip<textarea placeholder={'https://static.uc.ac.id/htb/2019/01/maxresdefault.jpg\nhttps://contoh.com/gambar-kedua.jpg'} value={form.imageUrlsText} onChange={(e) => setForm({ ...form, imageUrlsText: e.target.value })} /></label>
          <label className="full">Deskripsi<textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="full">Activity<textarea required placeholder="Contoh: briefing keselamatan, eksplor lorong goa, cave tubing, sesi foto, dan kembali ke meeting point." value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></label>
          <label className="full">Fasilitas<textarea required value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} /></label>
          <button className="primary-btn full" type="submit">Simpan cave trip</button>
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
  const selectedTrip = trips.find((trip) => trip.id === scheduleTripId)
  const selectedRegistration = registrations.find((item) => item.id === scheduleRegistrationId)
  if (scheduleTripId && selectedTrip) return <AdminScheduleDetail trip={selectedTrip} {...props} />
  if (scheduleRegistrationId && selectedRegistration) return <AdminPrivateScheduleDetail registration={selectedRegistration} {...props} />
  const openTrips = trips.filter((trip) => !trip.isPrivateTrip)
  const privateSchedules = registrations
    .map((item) => ({ registration: item, trip: trips.find((trip) => trip.id === item.tripId) }))
    .filter(({ registration, trip }) => trip && (trip.isPrivateTrip || registration.isPrivateTour))

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
        <div className="schedule-list admin-card-grid">
          {openTrips.map((trip) => {
            const participants = registrations.filter((item) => item.tripId === trip.id && (item.status === 'Disetujui' || item.status === 'Selesai'))
            const waitingCount = registrations.filter((item) => item.tripId === trip.id && item.status === 'Menunggu Approval').length
            const tripJobs = jobs.filter((job) => job.tripId === trip.id)
            const assignedJobs = tripJobs.filter((job) => job.worker).length
            const approvedCount = participants.reduce((sum, item) => sum + Number(item.participants), 0)
            const workerTarget = tripJobs.length
            return (
              <article className="schedule-card" key={trip.id}>
                <div className="schedule-card-head">
                  <div>
                    <h3>{trip.name}</h3>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip.destination}</p>
                  </div>
                  <div className="card-badge-stack">
                    {trip.isPrivateTrip && <span className="trip-type-chip">Private cave tour</span>}
                    <Badge status={trip.status} />
                  </div>
                </div>
                <div className="schedule-date-row">
                  <span><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal</span>
                  <strong>{formatDate(trip.date)}</strong>
                </div>
                <dl className="schedule-metrics">
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Peserta</dt><dd>{approvedCount}/{trip.quota}</dd></div>
                  <div><dt>Menunggu</dt><dd>{waitingCount}</dd></div>
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Pekerja</dt><dd>{assignedJobs}/{workerTarget}</dd></div>
                </dl>
                <div className="schedule-card-footer">
                  <div className="participant-list">{participants.length ? participants.slice(0, 3).map((item) => <span key={item.id}>{item.name} ({item.participants})</span>) : <span>Belum ada peserta disetujui</span>}</div>
                  <button className="outline-btn" onClick={() => props.navigate(`/admin/jadwal/${trip.id}`)}>Detail jadwal</button>
                </div>
              </article>
            )
          })}
          {privateSchedules.map(({ registration, trip }) => {
            const tripJobs = jobs.filter((job) => Number(job.registrationId) === Number(registration.id))
            const assignedJobs = tripJobs.filter((job) => job.worker).length
            const workerTarget = tripJobs.length || getSelectedAddons(registration).length || 0
            const participantDetails = Array.isArray(registration.participantDetails) ? registration.participantDetails : []
            return (
              <article className="schedule-card" key={`private-${registration.id}`}>
                <div className="schedule-card-head">
                  <div>
                    <h3>{trip.name}</h3>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip.destination}</p>
                  </div>
                  <div className="card-badge-stack">
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
                  <div><dt>Pemesan</dt><dd>{registration.name}</dd></div>
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Pekerja</dt><dd>{assignedJobs}/{workerTarget}</dd></div>
                </dl>
                <div className="schedule-card-footer">
                  <div className="participant-list">{participantDetails.length ? participantDetails.slice(0, 3).map((item, index) => <span key={`${registration.id}-${index}`}>{item.name}</span>) : <span>{registration.name} ({registration.participants})</span>}</div>
                  <button className="outline-btn" onClick={() => props.navigate(`/admin/jadwal/private/${registration.id}`)}>Detail jadwal</button>
                </div>
              </article>
            )
          })}
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
  const waitingRegistrations = tripRegistrations.filter((item) => item.status === 'Menunggu Approval')
  const rejectedRegistrations = tripRegistrations.filter((item) => item.status === 'Ditolak')
  const tripJobs = jobs.filter((job) => job.tripId === trip.id)
  const assignedJobs = tripJobs.filter((job) => job.worker)
  const approvedCount = approvedParticipants.reduce((sum, item) => sum + Number(item.participants), 0)

  return (
    <AdminShell title="Detail Jadwal" navigate={navigate} {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Detail trip</p>
            <h2>{trip.name}</h2>
            <p className="muted">{trip.destination} - {formatDate(trip.date)} - {trip.isPrivateTrip ? 'Private cave tour' : 'Open trip goa'}</p>
          </div>
          <button className="outline-btn" onClick={() => navigate('/admin/jadwal')}>Kembali ke jadwal</button>
        </div>

        <section className="stat-grid dashboard-stats">
          <Metric label="Total pendaftar" value={tripRegistrations.length} />
          <Metric label="Menunggu approval" value={waitingRegistrations.length} />
          <Metric label="Peserta disetujui" value={`${approvedCount}/${trip.quota}`} />
          <Metric label="Pekerja terisi" value={`${assignedJobs.length}/${tripJobs.length}`} />
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

        <section className="registration-status-board">
          <RegistrationStatusColumn title="Menunggu Approval" items={waitingRegistrations} setRegistrationStatus={setRegistrationStatus} />
          <RegistrationStatusColumn title="Disetujui" items={approvedParticipants} setRegistrationStatus={setRegistrationStatus} />
          <RegistrationStatusColumn title="Ditolak" items={rejectedRegistrations} setRegistrationStatus={setRegistrationStatus} />
        </section>
      </section>
    </AdminShell>
  )
}

function RegistrationStatusColumn({ title, items, setRegistrationStatus }) {
  return (
    <section className="registration-status-column">
      <div className="registration-status-head">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      <div className="registration-status-list">
        {items.length ? items.map((item) => (
          <article className="registration-status-card" key={item.id}>
            <div className="registration-card-main">
              <h4>{item.name}</h4>
              <dl>
                <div><dt>Email</dt><dd>{item.email}</dd></div>
                <div><dt>WhatsApp</dt><dd>{item.whatsapp}</dd></div>
                <div><dt>Jenis</dt><dd>{registrationTripType(item)}</dd></div>
                <div><dt>Peserta</dt><dd>{item.participants} orang</dd></div>
                <div><dt>Tanggal</dt><dd>{formatDate(item.requestedDate)}</dd></div>
                <div><dt>Add-on</dt><dd>{getSelectedAddons(item).join(', ') || '-'}</dd></div>
                <div><dt>Domisili</dt><dd>{item.address || '-'}</dd></div>
                <div><dt>Usia</dt><dd>{item.age ? `${item.age} tahun` : '-'}</dd></div>
                <div><dt>Jenis kelamin</dt><dd>{item.gender || '-'}</dd></div>
                <div><dt>Kondisi kesehatan</dt><dd>{item.healthNotes || '-'}</dd></div>
                <div><dt>Catatan</dt><dd>{item.notes || '-'}</dd></div>
              </dl>
            </div>
            <label className="registration-card-status">Status<select className="status-select" value={item.status} onChange={(e) => setRegistrationStatus(item.id, e.target.value)}>
                {registrationStatuses.map((status) => <option key={status}>{status}</option>)}
              </select></label>
          </article>
        )) : <p className="empty-column">Belum ada data.</p>}
      </div>
    </section>
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
