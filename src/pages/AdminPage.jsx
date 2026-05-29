import { useState } from 'react'
import { accounts, registrationStatuses, tripStatuses } from '../config/constants'
import { formatCurrency, formatDate, tripName } from '../utils/formatters'
import { Badge, DataPanel, Metric, Sidebar } from './shared'

const createItineraryDays = (count, existingDays = []) => {
  const totalDays = Math.max(1, Number(count) || 1)
  return Array.from({ length: totalDays }, (_, index) => {
    const current = existingDays[index]
    return {
      day: index + 1,
      text: typeof current === 'string' ? current : current?.text || '',
    }
  })
}

const normalizeTripForm = (trip) => {
  const itineraryDays = Array.isArray(trip?.itineraryDays) && trip.itineraryDays.length
    ? createItineraryDays(trip.itineraryDays.length, trip.itineraryDays)
    : createItineraryDays(1, trip?.itinerary ? [{ text: trip.itinerary }] : [])

  return {
    name: '',
    destination: '',
    date: '',
    price: 0,
    quota: 10,
    slots: 10,
    workerCount: 1,
    description: '',
    facilities: '',
    status: 'Tersedia',
    ...trip,
    durationDays: itineraryDays.length,
    itineraryDays,
  }
}

function AdminShell({ title, children, navigate, logout }) {
  return (
    <main className="app-shell">
      <Sidebar title="Admin" links={[
        ['/admin/dashboard', 'Dashboard'],
        ['/admin/open-trip', 'Open Trip'],
        ['/admin/jadwal', 'Jadwal'],
        ['/admin/job', 'Job Pekerja'],
        ['/admin/pekerja', 'Akun Pekerja'],
      ]} navigate={navigate} logout={logout} />
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
    ['Total open trip', trips.length],
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
            <h2>Kelola open trip, pendaftaran, dan pekerjaan tim dari menu admin.</h2>
            <p className="muted">Gunakan dashboard ini sebagai pintu masuk cepat. Detail lengkap tetap ada di halaman masing-masing menu.</p>
          </div>
          <div className="dashboard-actions">
            <button className="primary-btn" onClick={() => props.navigate('/admin/open-trip')}>Kelola open trip</button>
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
    <AdminShell title="Manajemen Open Trip" {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Katalog trip</p>
            <h2>Atur paket open trip yang tampil untuk customer.</h2>
            <p className="muted">Tambah, edit, atau tutup slot trip dari daftar utama ini.</p>
          </div>
          <button className="primary-btn" onClick={() => props.navigate('/admin/open-trip/tambah')}>Tambah open trip</button>
        </div>
        <div className="admin-table-card table-wrap">
          <table>
            <thead><tr><th>Nama</th><th>Destinasi</th><th>Tanggal</th><th>Harga</th><th>Kuota</th><th>Slot</th><th>Pekerja</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>{props.trips.map((trip) => (
              <tr key={trip.id}>
                <td>{trip.name}</td><td>{trip.destination}</td><td>{formatDate(trip.date)}</td><td>{formatCurrency(trip.price)}</td><td>{trip.quota}</td><td>{trip.slots}</td><td>{trip.workerCount || props.jobs.filter((job) => job.tripId === trip.id).length || 1} orang</td><td><Badge status={trip.status} /></td>
                <td className="table-actions"><button onClick={() => props.navigate(`/admin/open-trip/edit/${trip.id}`)}>Edit</button><button onClick={() => props.deleteTrip(trip.id)}>Hapus</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  )
}

export function TripForm({ tripId, trips, saveTrip, navigate, ...props }) {
  const selected = trips.find((item) => item.id === tripId)
  const selectedJobCount = selected ? props.jobs.filter((job) => job.tripId === selected.id).length : 1
  const [form, setForm] = useState({
    ...normalizeTripForm(selected),
    workerCount: selected?.workerCount || selectedJobCount || 1,
  })

  const updateDurationDays = (value) => {
    const durationDays = Math.max(1, Number(value) || 1)
    setForm({ ...form, durationDays, itineraryDays: createItineraryDays(durationDays, form.itineraryDays) })
  }

  const updateItineraryDay = (index, text) => {
    const itineraryDays = form.itineraryDays.map((item, itemIndex) => (
      itemIndex === index ? { ...item, text } : item
    ))
    setForm({ ...form, itineraryDays })
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const itineraryDays = createItineraryDays(form.durationDays, form.itineraryDays)
    await saveTrip({
      ...form,
      price: Number(form.price),
      quota: Number(form.quota),
      slots: Number(form.slots),
      workerCount: Math.max(1, Number(form.workerCount) || 1),
      durationDays: itineraryDays.length,
      itineraryDays,
      itinerary: itineraryDays.map((item) => `Hari ${item.day}: ${item.text}`).join('\n\n'),
    })
  }

  return (
    <AdminShell title={selected ? 'Edit Open Trip' : 'Tambah Open Trip'} navigate={navigate} {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">{selected ? 'Update trip' : 'Trip baru'}</p>
            <h2>{selected ? 'Perbarui detail open trip.' : 'Lengkapi informasi open trip baru.'}</h2>
            <p className="muted">Informasi ini akan muncul di katalog customer dan dipakai untuk monitoring internal.</p>
          </div>
          <button className="outline-btn" onClick={() => navigate('/admin/open-trip')}>Kembali</button>
        </div>
        <form className="data-form admin-form admin-form-card" onSubmit={onSubmit}>
          <label>Nama open trip<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Destinasi<input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></label>
          <label>Tanggal keberangkatan<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label>Harga<input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
          <label>Kuota peserta<input required type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} /></label>
          <label>Slot tersedia<input required type="number" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} /></label>
          <label>Kebutuhan pekerja<input required type="number" min="1" value={form.workerCount} onChange={(e) => setForm({ ...form, workerCount: e.target.value })} /></label>
          <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{tripStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="full">Deskripsi<textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="full">Fasilitas<textarea required value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} /></label>
          <div className="itinerary-builder full">
            <div className="itinerary-builder-head">
              <div>
                <h3>Itinerary per hari</h3>
                <p className="muted">Tentukan durasi trip, lalu isi detail kegiatan untuk tiap hari.</p>
              </div>
              <label>Jumlah hari<input required type="number" min="1" value={form.durationDays} onChange={(e) => updateDurationDays(e.target.value)} /></label>
            </div>
            <div className="itinerary-day-list">
              {form.itineraryDays.map((item, index) => (
                <label key={item.day}>
                  Hari {item.day}
                  <textarea required placeholder={`Kegiatan hari ${item.day}`} value={item.text} onChange={(e) => updateItineraryDay(index, e.target.value)} />
                </label>
              ))}
            </div>
          </div>
          <button className="primary-btn full" type="submit">Simpan open trip</button>
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
        <thead><tr><th>Customer</th><th>WhatsApp</th><th>Email</th><th>Peserta</th><th>Open trip</th><th>Catatan</th><th>Status</th></tr></thead>
        <tbody>{rows.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td><td>{item.whatsapp}</td><td>{item.email}</td><td>{item.participants}</td><td>{tripName(trips, item.tripId)}</td><td>{item.notes}</td>
            <td><select className="status-select" value={item.status} onChange={(e) => setRegistrationStatus(item.id, e.target.value)}>{registrationStatuses.map((status) => <option key={status}>{status}</option>)}</select></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function AdminSchedule(props) {
  const { trips, registrations, scheduleTripId } = props
  const selectedTrip = trips.find((trip) => trip.id === scheduleTripId)
  if (scheduleTripId && selectedTrip) return <AdminScheduleDetail trip={selectedTrip} {...props} />

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
          {trips.map((trip) => {
            const participants = registrations.filter((item) => item.tripId === trip.id && (item.status === 'Disetujui' || item.status === 'Selesai'))
            return (
              <article className="schedule-card" key={trip.id}>
                <div className="schedule-card-head"><div><h3>{trip.name}</h3><p>{trip.destination} - {formatDate(trip.date)}</p></div><Badge status={trip.status} /></div>
                <p className="muted">Peserta disetujui: {participants.reduce((sum, item) => sum + item.participants, 0)} dari {trip.quota}</p>
                <div className="participant-list">{participants.length ? participants.map((item) => <span key={item.id}>{item.name} ({item.participants})</span>) : <span>Belum ada peserta disetujui</span>}</div>
                <button className="outline-btn" onClick={() => props.navigate(`/admin/jadwal/${trip.id}`)}>Detail jadwal</button>
              </article>
            )
          })}
        </div>
      </section>
    </AdminShell>
  )
}

function AdminScheduleDetail({ trip, registrations, jobs, setRegistrationStatus, navigate, ...props }) {
  const tripRegistrations = registrations.filter((item) => item.tripId === trip.id)
  const approvedParticipants = tripRegistrations.filter((item) => item.status === 'Disetujui' || item.status === 'Selesai')
  const waitingRegistrations = tripRegistrations.filter((item) => item.status === 'Menunggu Approval')
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
            <p className="muted">{trip.destination} - {formatDate(trip.date)}</p>
          </div>
          <button className="outline-btn" onClick={() => navigate('/admin/jadwal')}>Kembali ke jadwal</button>
        </div>

        <section className="stat-grid dashboard-stats">
          <Metric label="Total pendaftar" value={tripRegistrations.length} />
          <Metric label="Menunggu approval" value={waitingRegistrations.length} />
          <Metric label="Peserta disetujui" value={`${approvedCount}/${trip.quota}`} />
          <Metric label="Pekerja terisi" value={`${assignedJobs.length}/${tripJobs.length || trip.workerCount || 1}`} />
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
                <thead><tr><th>Slot</th><th>Pekerja</th><th>Status</th></tr></thead>
                <tbody>{tripJobs.length ? tripJobs.map((job) => (
                  <tr key={job.id}><td>{job.slot || 1} dari {job.totalWorkers || trip.workerCount || 1}</td><td>{job.worker || '-'}</td><td><Badge status={job.status} /></td></tr>
                )) : <tr><td colSpan="3">Belum ada job untuk trip ini.</td></tr>}</tbody>
              </table>
            </div>
          </DataPanel>
        </section>

        <DataPanel title="Pendaftar Trip">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Customer</th><th>WhatsApp</th><th>Email</th><th>Peserta</th><th>Catatan</th><th>Status</th></tr></thead>
              <tbody>{tripRegistrations.length ? tripRegistrations.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td><td>{item.whatsapp}</td><td>{item.email}</td><td>{item.participants}</td><td>{item.notes}</td>
                  <td><select className="status-select" value={item.status} onChange={(e) => setRegistrationStatus(item.id, e.target.value)}>{registrationStatuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                </tr>
              )) : <tr><td colSpan="6">Belum ada pendaftar untuk trip ini.</td></tr>}</tbody>
            </table>
          </div>
        </DataPanel>
      </section>
    </AdminShell>
  )
}

export function AdminJobs(props) {
  return (
    <AdminShell title="Monitoring Job Pekerja" {...props}>
      <section className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Job operasional</p>
            <h2>Pantau tugas pekerja untuk setiap open trip.</h2>
            <p className="muted">Lihat status job, pekerja yang mengambil tugas, dan detail pekerjaan lapangan.</p>
          </div>
        </div>
        <div className="admin-table-card"><JobTable {...props} /></div>
      </section>
    </AdminShell>
  )
}

export function AdminWorkers(props) {
  const { workerAccounts, createWorkerAccount } = props
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')

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
        </div>
        <section className="two-col admin-workers-layout">
          <DataPanel title="Buat Akun Pekerja">
            <form className="data-form compact" onSubmit={onSubmit}>
              {error && <p className="form-error">{error}</p>}
              <label>Nama pekerja<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label>Password<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
              <button className="primary-btn" type="submit">Buat akun pekerja</button>
            </form>
          </DataPanel>
          <DataPanel title="Daftar Akun Pekerja">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nama</th><th>Email</th><th>Role</th></tr></thead>
                <tbody>
                  {[accounts.worker, ...workerAccounts].map((worker) => (
                    <tr key={worker.email}><td>{worker.name}</td><td>{worker.email}</td><td>{worker.role}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataPanel>
        </section>
      </section>
    </AdminShell>
  )
}

export function JobTable({ jobs, trips, compact }) {
  const rows = compact ? jobs.slice(0, 5) : jobs
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Open trip</th><th>Destinasi</th><th>Tanggal</th><th>Slot</th><th>Tugas</th><th>Status job</th><th>Pekerja</th></tr></thead>
        <tbody>{rows.map((job) => {
          const trip = trips.find((item) => item.id === job.tripId)
          return <tr key={job.id}><td>{trip?.name}</td><td>{trip?.destination}</td><td>{formatDate(trip?.date)}</td><td>{job.slot || 1} dari {job.totalWorkers || trip?.workerCount || 1}</td><td>{job.task}</td><td><Badge status={job.status} /></td><td>{job.worker || '-'}</td></tr>
        })}</tbody>
      </table>
    </div>
  )
}
