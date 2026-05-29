import { useState } from 'react'
import { accounts, registrationStatuses, tripStatuses } from '../config/constants'
import { formatCurrency, formatDate, tripName } from '../utils/formatters'
import { Badge, DataPanel, Metric, Sidebar } from './shared'

function AdminShell({ title, children, navigate, logout }) {
  return (
    <main className="app-shell">
      <Sidebar title="Admin" links={[
        ['/admin/dashboard', 'Dashboard'],
        ['/admin/open-trip', 'Open Trip'],
        ['/admin/pendaftaran', 'Pendaftaran'],
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
      <section className="stat-grid">{stats.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</section>
      <section className="two-col">
        <DataPanel title="Approval terbaru"><RegistrationTable {...props} compact /></DataPanel>
        <DataPanel title="Monitoring job"><JobTable {...props} compact /></DataPanel>
      </section>
    </AdminShell>
  )
}

export function AdminTrips(props) {
  return (
    <AdminShell title="Manajemen Open Trip" {...props}>
      <div className="toolbar"><button className="primary-btn" onClick={() => props.navigate('/admin/open-trip/tambah')}>Tambah open trip</button></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nama</th><th>Destinasi</th><th>Tanggal</th><th>Harga</th><th>Kuota</th><th>Slot</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>{props.trips.map((trip) => (
            <tr key={trip.id}>
              <td>{trip.name}</td><td>{trip.destination}</td><td>{formatDate(trip.date)}</td><td>{formatCurrency(trip.price)}</td><td>{trip.quota}</td><td>{trip.slots}</td><td><Badge status={trip.status} /></td>
              <td className="table-actions"><button onClick={() => props.navigate(`/admin/open-trip/edit/${trip.id}`)}>Edit</button><button onClick={() => props.deleteTrip(trip.id)}>Hapus</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </AdminShell>
  )
}

export function TripForm({ tripId, trips, saveTrip, navigate, ...props }) {
  const selected = trips.find((item) => item.id === tripId)
  const [form, setForm] = useState(selected || { name: '', destination: '', date: '', price: 0, quota: 10, slots: 10, description: '', facilities: '', itinerary: '', status: 'Tersedia' })

  const onSubmit = async (event) => {
    event.preventDefault()
    await saveTrip({ ...form, price: Number(form.price), quota: Number(form.quota), slots: Number(form.slots) })
  }

  return (
    <AdminShell title={selected ? 'Edit Open Trip' : 'Tambah Open Trip'} navigate={navigate} {...props}>
      <form className="data-form admin-form" onSubmit={onSubmit}>
        <label>Nama open trip<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Destinasi<input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></label>
        <label>Tanggal keberangkatan<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label>Harga<input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
        <label>Kuota peserta<input required type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} /></label>
        <label>Slot tersedia<input required type="number" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{tripStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="full">Deskripsi<textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="full">Fasilitas<textarea required value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} /></label>
        <label className="full">Itinerary<textarea required value={form.itinerary} onChange={(e) => setForm({ ...form, itinerary: e.target.value })} /></label>
        <button className="primary-btn full" type="submit">Simpan open trip</button>
      </form>
    </AdminShell>
  )
}

export function AdminRegistrations(props) {
  return (
    <AdminShell title="Manajemen Pendaftaran" {...props}>
      <RegistrationTable {...props} />
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
  const { trips, registrations } = props
  return (
    <AdminShell title="Monitoring Jadwal" {...props}>
      <div className="schedule-list">
        {trips.map((trip) => {
          const participants = registrations.filter((item) => item.tripId === trip.id && (item.status === 'Disetujui' || item.status === 'Selesai'))
          return (
            <article className="schedule-card" key={trip.id}>
              <div><h3>{trip.name}</h3><p>{trip.destination} - {formatDate(trip.date)}</p></div>
              <Badge status={trip.status} />
              <p className="muted">Peserta disetujui: {participants.reduce((sum, item) => sum + item.participants, 0)} dari {trip.quota}</p>
              <div className="participant-list">{participants.length ? participants.map((item) => <span key={item.id}>{item.name} ({item.participants})</span>) : <span>Belum ada peserta disetujui</span>}</div>
            </article>
          )
        })}
      </div>
    </AdminShell>
  )
}

export function AdminJobs(props) {
  return (
    <AdminShell title="Monitoring Job Pekerja" {...props}>
      <JobTable {...props} />
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
      <section className="two-col">
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
    </AdminShell>
  )
}

export function JobTable({ jobs, trips, compact }) {
  const rows = compact ? jobs.slice(0, 5) : jobs
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Open trip</th><th>Destinasi</th><th>Tanggal</th><th>Tugas</th><th>Status job</th><th>Pekerja</th></tr></thead>
        <tbody>{rows.map((job) => {
          const trip = trips.find((item) => item.id === job.tripId)
          return <tr key={job.id}><td>{trip?.name}</td><td>{trip?.destination}</td><td>{formatDate(trip?.date)}</td><td>{job.task}</td><td><Badge status={job.status} /></td><td>{job.worker || '-'}</td></tr>
        })}</tbody>
      </table>
    </div>
  )
}
