import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import './App.css'
import { db } from './firebase'

const tripStatuses = ['Tersedia', 'Penuh', 'Selesai']
const registrationStatuses = ['Menunggu Approval', 'Disetujui', 'Ditolak', 'Selesai']
const jobStatuses = ['Tersedia', 'Diambil', 'Sedang Berjalan', 'Selesai']

const accounts = {
  admin: { email: 'admin@zazatrip.com', password: 'admin123', role: 'admin', name: 'Admin Zaza' },
  worker: { email: 'pekerja@zazatrip.com', password: 'pekerja123', role: 'pekerja', name: 'Raka Field Crew' },
}

const collections = {
  trips: 'trips',
  registrations: 'registrations',
  jobs: 'jobs',
  customers: 'customers',
}

const sortById = (items) => [...items].sort((a, b) => Number(a.id) - Number(b.id))
const withNumericId = (snapshot) => snapshot.docs.map((item) => ({ id: Number(item.data().id || item.id), ...item.data() }))

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [session, setSession] = useState(null)
  const [trips, setTrips] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [jobs, setJobs] = useState([])
  const [customerAccounts, setCustomerAccounts] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [toast, setToast] = useState('')

  const navigate = (target) => {
    window.history.pushState({}, '', target)
    setPath(target)
    window.scrollTo(0, 0)
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
        setIsLoadingData(false)
      }, () => setIsLoadingData(false)),
      onSnapshot(query(collection(db, collections.registrations), orderBy('id', 'desc')), (snapshot) => setRegistrations(withNumericId(snapshot))),
      onSnapshot(query(collection(db, collections.jobs), orderBy('id')), (snapshot) => setJobs(sortById(withNumericId(snapshot)))),
      onSnapshot(collection(db, collections.customers), (snapshot) => setCustomerAccounts(snapshot.docs.map((item) => item.data()))),
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [])

  const login = (role, form) => {
    const account = role === 'admin' ? accounts.admin : accounts.worker
    if (form.email === account.email && form.password === account.password) {
      const nextSession = { role: account.role, name: account.name, email: account.email }
      setSession(nextSession)
      navigate(role === 'admin' ? '/admin/dashboard' : '/pekerja/dashboard')
      return true
    }
    return false
  }

  const loginCustomer = (form) => {
    const account = customerAccounts.find((item) => item.email === form.email && item.password === form.password)
    if (!account) return false
    const nextSession = { role: 'customer', name: account.name, email: account.email, whatsapp: account.whatsapp || '' }
    setSession(nextSession)
    navigate('/open-trip')
    return true
  }

  const signupCustomer = async (form) => {
    const exists = customerAccounts.some((item) => item.email === form.email)
    if (exists) return false
    const nextAccount = { name: form.name, whatsapp: form.whatsapp, email: form.email, password: form.password, role: 'customer' }
    await setDoc(doc(db, collections.customers, form.email), nextAccount)
    setSession({ role: 'customer', name: form.name, email: form.email, whatsapp: form.whatsapp })
    navigate('/open-trip')
    showToast('Akun customer berhasil dibuat.')
    return true
  }

  const logout = () => {
    setSession(null)
    navigate('/')
  }

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
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
    const approvedCount = nextRegistrations
      .filter((item) => item.tripId === tripId && (item.status === 'Disetujui' || item.status === 'Selesai'))
      .reduce((total, item) => total + Number(item.participants), 0)

    const trip = trips.find((item) => item.id === tripId)
    if (!trip) return

    const slots = Math.max(trip.quota - approvedCount, 0)
    const status = trip.status === 'Selesai' ? 'Selesai' : slots === 0 ? 'Penuh' : 'Tersedia'
    await updateDoc(doc(db, collections.trips, String(tripId)), { slots, status })
  }

  const submitRegistration = async (form) => {
    const trip = trips.find((item) => item.id === Number(form.tripId))
    if (!trip || trip.slots < Number(form.participants) || trip.status !== 'Tersedia') return false
    const id = Date.now()
    const nextItem = {
      id,
      name: form.name,
      whatsapp: form.whatsapp,
      email: form.email,
      participants: Number(form.participants),
      tripId: Number(form.tripId),
      notes: form.notes || '-',
      status: 'Menunggu Approval',
    }
    await setDoc(doc(db, collections.registrations, String(id)), nextItem)
    showToast('Pendaftaran berhasil dikirim. Status awal: Menunggu Approval.')
    navigate('/open-trip')
    return true
  }

  const setRegistrationStatus = async (id, status) => {
    const current = registrations.find((item) => item.id === id)
    const next = registrations.map((item) => (item.id === id ? { ...item, status } : item))
    await updateDoc(doc(db, collections.registrations, String(id)), { status })
    if (current) await updateTripSlots(current.tripId, next)
  }

  const saveTrip = async (trip) => {
    if (trip.id) {
      await setDoc(doc(db, collections.trips, String(trip.id)), { ...trip, id: Number(trip.id) })
    } else {
      const id = Date.now()
      const nextTrip = { ...trip, id, slots: Number(trip.slots), quota: Number(trip.quota), price: Number(trip.price) }
      const nextJob = { id: Date.now() + 1, tripId: id, task: 'Briefing peserta, koordinasi operasional, dan laporan perjalanan.', status: 'Tersedia', worker: '' }
      await Promise.all([
        setDoc(doc(db, collections.trips, String(id)), nextTrip),
        setDoc(doc(db, collections.jobs, String(nextJob.id)), nextJob),
      ])
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
    await updateDoc(doc(db, collections.jobs, String(id)), { status: 'Diambil', worker: session?.name || accounts.worker.name })
    showToast('Job berhasil diambil.')
  }

  const updateJobStatus = async (id, status) => {
    await updateDoc(doc(db, collections.jobs, String(id)), { status })
  }

  const props = { path, session, trips, registrations, jobs, approvedByTrip, navigate, login, loginCustomer, signupCustomer, logout, submitRegistration, setRegistrationStatus, saveTrip, deleteTrip, takeJob, updateJobStatus }

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      {isLoadingData ? <LoadingPage /> : <RouteRenderer {...props} />}
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
  if (path === '/login' || path === '/customer/login') return <CustomerLoginPage {...props} />
  if (path === '/signup' || path === '/customer/signup') return <CustomerSignupPage {...props} />
  if (parts[0] === 'open-trip' && id) return <TripDetail tripId={id} {...props} />
  if (parts[0] === 'daftar' && id) return <RegistrationPage tripId={id} {...props} />
  if (path === '/admin/login') return <LoginPage role="admin" {...props} />
  if (path === '/admin/dashboard') return <AdminDashboard {...props} />
  if (path === '/admin/open-trip') return <AdminTrips {...props} />
  if (path === '/admin/open-trip/tambah') return <TripForm {...props} />
  if (parts[0] === 'admin' && parts[1] === 'open-trip' && parts[2] === 'edit') return <TripForm tripId={Number(parts[3])} {...props} />
  if (path === '/admin/pendaftaran') return <AdminRegistrations {...props} />
  if (path === '/admin/jadwal') return <AdminSchedule {...props} />
  if (path === '/admin/job') return <AdminJobs {...props} />
  if (path === '/pekerja/login') return <LoginPage role="pekerja" {...props} />
  if (path === '/pekerja/dashboard') return <WorkerDashboard {...props} />
  if (path === '/pekerja/job') return <WorkerJobs {...props} />
  if (parts[0] === 'pekerja' && parts[1] === 'job' && Number(parts[2])) return <WorkerJobDetail jobId={Number(parts[2])} {...props} />
  if (path === '/pekerja/job-saya') return <MyJobs {...props} />

  return <NotFound navigate={navigate} />
}

function PublicNav({ navigate, session, logout }) {
  return (
    <header className="public-nav">
      <button className="brand" onClick={() => navigate('/')}>Zaza Open Trip</button>
      <nav>
        <button onClick={() => navigate('/open-trip')}>Katalog</button>
        {session?.role === 'customer' ? (
          <>
            <span className="customer-name">{session.name}</span>
            <button onClick={logout}>Keluar</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/login')}>Login</button>
            <button className="nav-accent" onClick={() => navigate('/signup')}>Signup</button>
          </>
        )}
      </nav>
    </header>
  )
}

function LoadingPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Memuat data</h1>
        <p className="muted">Menghubungkan aplikasi ke Firebase...</p>
      </section>
    </main>
  )
}

function CustomerCatalog({ trips, navigate, session, logout }) {
  const featuredTrip = trips[0] || { name: 'Open Trip Zaza' }

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="hero-band">
        <div>
          <p className="eyebrow">Open trip profesional</p>
          <h1>Temukan perjalanan kelompok yang rapi, aman, dan siap berangkat.</h1>
          <p className="hero-copy">Pilih destinasi, cek slot, lalu daftar. Tim admin akan memverifikasi pendaftaran sebelum peserta masuk jadwal keberangkatan.</p>
        </div>
        <TripVisual trip={featuredTrip} large />
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow">Katalog customer</p>
          <h2>Open trip tersedia</h2>
        </div>
      </section>

      <section className="trip-grid">
        {trips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />)}
      </section>
    </main>
  )
}

function TripCard({ trip, navigate }) {
  return (
    <article className="trip-card">
      <TripVisual trip={trip} />
      <div className="trip-card-body">
        <div className="card-title-row">
          <h3>{trip.name}</h3>
          <Badge status={trip.status} />
        </div>
        <p>{trip.destination}</p>
        <dl>
          <div><dt>Tanggal</dt><dd>{formatDate(trip.date)}</dd></div>
          <div><dt>Harga</dt><dd>{formatCurrency(trip.price)}</dd></div>
          <div><dt>Kuota</dt><dd>{trip.quota} peserta</dd></div>
          <div><dt>Slot</dt><dd>{trip.slots} tersedia</dd></div>
        </dl>
        <button className="primary-btn" onClick={() => navigate(`/open-trip/${trip.id}`)}>Lihat detail</button>
      </div>
    </article>
  )
}

function TripVisual({ trip, large }) {
  return (
    <div className={large ? 'trip-visual trip-visual-large' : 'trip-visual'} role="img" aria-label={trip?.name || 'Open trip'}>
      <span>{trip?.name || 'Open Trip'}</span>
    </div>
  )
}

function TripDetail({ tripId, trips, navigate, session, logout }) {
  const trip = trips.find((item) => item.id === tripId)
  if (!trip) return <NotFound navigate={navigate} />

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="detail-layout">
        <TripVisual trip={trip} large />
        <div className="detail-panel">
          <Badge status={trip.status} />
          <h1>{trip.name}</h1>
          <p className="muted">{trip.destination}</p>
          <div className="metric-row">
            <Metric label="Tanggal" value={formatDate(trip.date)} />
            <Metric label="Harga" value={formatCurrency(trip.price)} />
            <Metric label="Kuota" value={trip.quota} />
            <Metric label="Slot" value={trip.slots} />
          </div>
          <InfoBlock title="Deskripsi perjalanan" text={trip.description} />
          <InfoBlock title="Fasilitas" text={trip.facilities} />
          <InfoBlock title="Itinerary singkat" text={trip.itinerary} />
          <button className="primary-btn wide" disabled={trip.slots <= 0 || trip.status !== 'Tersedia'} onClick={() => navigate(`/daftar/${trip.id}`)}>
            {trip.slots > 0 && trip.status === 'Tersedia' ? 'Daftar open trip' : 'Pendaftaran ditutup'}
          </button>
        </div>
      </section>
    </main>
  )
}

function RegistrationPage({ tripId, trips, submitRegistration, navigate, session, logout }) {
  const trip = trips.find((item) => item.id === tripId)
  const [form, setForm] = useState({ name: session?.role === 'customer' ? session.name : '', whatsapp: session?.whatsapp || '', email: session?.role === 'customer' ? session.email : '', participants: 1, tripId, notes: '' })
  const [error, setError] = useState('')
  const selectedTrip = trips.find((item) => item.id === Number(form.tripId)) || trip

  if (!trip) return <NotFound navigate={navigate} />

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!form.name || !form.whatsapp || !form.email || Number(form.participants) < 1) {
      setError('Lengkapi nama, WhatsApp, email, dan jumlah peserta.')
      return
    }
    if (Number(form.participants) > selectedTrip.slots) {
      setError('Jumlah peserta melebihi slot tersedia.')
      return
    }
    const isSubmitted = await submitRegistration(form)
    if (!isSubmitted) setError('Pendaftaran gagal dikirim. Cek slot dan koneksi Firebase.')
  }

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="form-shell">
        <div>
          <p className="eyebrow">Form pendaftaran</p>
          <h1>{trip.name}</h1>
          <p className="muted">Slot tersedia: {trip.slots} peserta. Status pendaftaran akan masuk dashboard admin sebagai Menunggu Approval.</p>
        </div>
        <form className="data-form" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <label>Nama lengkap<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Nomor WhatsApp<input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Jumlah peserta<input type="number" min="1" max={trip.slots} value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} /></label>
          <label>Pilihan open trip<select value={form.tripId} onChange={(e) => setForm({ ...form, tripId: Number(e.target.value) })}>{trips.filter((item) => item.status === 'Tersedia').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="full">Catatan tambahan<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <button className="primary-btn full" type="submit">Kirim pendaftaran</button>
        </form>
      </section>
    </main>
  )
}

function CustomerLoginPage({ loginCustomer, navigate }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!form.email || !form.password) {
      setError('Email dan password wajib diisi.')
      return
    }
    if (!loginCustomer(form)) setError('Akun customer tidak ditemukan atau password salah.')
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <button className="brand" onClick={() => navigate('/')}>Zaza Open Trip</button>
        <p className="eyebrow">Login customer</p>
        <h1>Masuk Customer</h1>
        <p className="muted">Masuk dengan akun customer yang sudah terdaftar.</p>
        <form className="data-form compact" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <button className="primary-btn" type="submit">Masuk</button>
        </form>
        <p className="auth-switch">Belum punya akun? <button onClick={() => navigate('/signup')}>Signup customer</button></p>
      </section>
    </main>
  )
}

function CustomerSignupPage({ signupCustomer, navigate }) {
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!form.name || !form.whatsapp || !form.email || !form.password) {
      setError('Lengkapi nama, WhatsApp, email, dan password.')
      return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password belum sama.')
      return
    }
    const isCreated = await signupCustomer(form)
    if (!isCreated) setError('Email sudah terdaftar. Silakan login.')
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <button className="brand" onClick={() => navigate('/')}>Zaza Open Trip</button>
        <p className="eyebrow">Signup customer</p>
        <h1>Buat Akun</h1>
        <p className="muted">Akun customer dipakai untuk mengisi data pendaftaran lebih cepat.</p>
        <form className="data-form compact" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <label>Nama lengkap<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Nomor WhatsApp<input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>Konfirmasi password<input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
          <button className="primary-btn" type="submit">Buat akun</button>
        </form>
        <p className="auth-switch">Sudah punya akun? <button onClick={() => navigate('/login')}>Login customer</button></p>
      </section>
    </main>
  )
}

function LoginPage({ role, login, navigate }) {
  const account = role === 'admin' ? accounts.admin : accounts.worker
  const [form, setForm] = useState({ email: account.email, password: account.password })
  const [error, setError] = useState('')

  const onSubmit = (event) => {
    event.preventDefault()
    if (!login(role, form)) setError('Email atau password tidak sesuai.')
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <button className="brand" onClick={() => navigate('/')}>Zaza Open Trip</button>
        <p className="eyebrow">{role === 'admin' ? 'Login admin' : 'Login pekerja'}</p>
        <h1>{role === 'admin' ? 'Dashboard Admin' : 'Dashboard Pekerja'}</h1>
        <p className="muted">Demo: {account.email} / {account.password}</p>
        <form className="data-form compact" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <button className="primary-btn" type="submit">Masuk</button>
        </form>
      </section>
    </main>
  )
}

function AdminShell({ title, children, navigate, logout }) {
  return (
    <main className="app-shell">
      <Sidebar title="Admin" links={[
        ['/admin/dashboard', 'Dashboard'],
        ['/admin/open-trip', 'Open Trip'],
        ['/admin/pendaftaran', 'Pendaftaran'],
        ['/admin/jadwal', 'Jadwal'],
        ['/admin/job', 'Job Pekerja'],
      ]} navigate={navigate} logout={logout} />
      <section className="workspace">
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  )
}

function WorkerShell({ title, children, navigate, logout }) {
  return (
    <main className="app-shell">
      <Sidebar title="Pekerja" links={[
        ['/pekerja/dashboard', 'Dashboard'],
        ['/pekerja/job', 'Job tersedia'],
        ['/pekerja/job-saya', 'Job saya'],
      ]} navigate={navigate} logout={logout} />
      <section className="workspace">
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  )
}

function Sidebar({ title, links, navigate, logout }) {
  return (
    <aside className="sidebar">
      <button className="brand inverse" onClick={() => navigate('/')}>Zaza Trip</button>
      <p>{title}</p>
      {links.map(([href, label]) => <button key={href} onClick={() => navigate(href)}>{label}</button>)}
      <button className="logout-btn" onClick={logout}>Keluar</button>
    </aside>
  )
}

function AdminDashboard(props) {
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

function AdminTrips(props) {
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

function TripForm({ tripId, trips, saveTrip, navigate, ...props }) {
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

function AdminRegistrations(props) {
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

function AdminSchedule(props) {
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

function AdminJobs(props) {
  return (
    <AdminShell title="Monitoring Job Pekerja" {...props}>
      <JobTable {...props} />
    </AdminShell>
  )
}

function JobTable({ jobs, trips, compact }) {
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

function WorkerDashboard(props) {
  const ownJobs = props.jobs.filter((job) => job.worker === props.session?.name)
  return (
    <WorkerShell title="Dashboard Pekerja" {...props}>
      <section className="stat-grid">
        <Metric label="Job tersedia" value={props.jobs.filter((job) => job.status === 'Tersedia').length} />
        <Metric label="Job saya" value={ownJobs.length} />
        <Metric label="Sedang berjalan" value={ownJobs.filter((job) => job.status === 'Sedang Berjalan').length} />
      </section>
      <WorkerJobs {...props} embedded />
    </WorkerShell>
  )
}

function WorkerJobs(props) {
  const content = (
    <div className="job-grid">
      {props.jobs.filter((job) => job.status === 'Tersedia').map((job) => <JobCard key={job.id} job={job} {...props} />)}
    </div>
  )
  if (props.embedded) return content
  return <WorkerShell title="Job Open Trip Tersedia" {...props}>{content}</WorkerShell>
}

function MyJobs(props) {
  return (
    <WorkerShell title="Job Saya" {...props}>
      <div className="job-grid">
        {props.jobs.filter((job) => job.worker === props.session?.name).map((job) => <JobCard key={job.id} job={job} mine {...props} />)}
      </div>
    </WorkerShell>
  )
}

function WorkerJobDetail({ jobId, jobs, trips, takeJob, updateJobStatus, navigate, ...props }) {
  const job = jobs.find((item) => item.id === jobId)
  if (!job) return <NotFound navigate={navigate} />
  const trip = trips.find((item) => item.id === job.tripId)
  return (
    <WorkerShell title="Detail Job" navigate={navigate} {...props}>
      <article className="detail-panel standalone">
        <Badge status={job.status} />
        <h2>{trip.name}</h2>
        <p className="muted">{trip.destination} - {formatDate(trip.date)}</p>
        <div className="metric-row">
          <Metric label="Jumlah peserta" value={trip.quota - trip.slots} />
          <Metric label="Status job" value={job.status} />
          <Metric label="Pekerja" value={job.worker || '-'} />
        </div>
        <InfoBlock title="Detail tugas" text={job.task} />
        {job.status === 'Tersedia' ? <button className="primary-btn" onClick={() => takeJob(job.id)}>Ambil job</button> : (
          <label className="status-control">Update status<select value={job.status} onChange={(e) => updateJobStatus(job.id, e.target.value)}>{jobStatuses.filter((status) => status !== 'Tersedia').map((status) => <option key={status}>{status}</option>)}</select></label>
        )}
      </article>
    </WorkerShell>
  )
}

function JobCard({ job, trips, navigate, takeJob, mine, updateJobStatus }) {
  const trip = trips.find((item) => item.id === job.tripId)
  return (
    <article className="job-card">
      <div><h3>{trip?.name}</h3><p>{trip?.destination}</p></div>
      <Badge status={job.status} />
      <p>{formatDate(trip?.date)} - peserta terdaftar {trip ? trip.quota - trip.slots : 0}</p>
      <p className="muted">{job.task}</p>
      {job.status === 'Tersedia' && !mine && <button className="primary-btn" onClick={() => takeJob(job.id)}>Ambil job</button>}
      {mine && <select className="status-select" value={job.status} onChange={(e) => updateJobStatus(job.id, e.target.value)}>{jobStatuses.filter((status) => status !== 'Tersedia').map((status) => <option key={status}>{status}</option>)}</select>}
      <button className="outline-btn" onClick={() => navigate(`/pekerja/job/${job.id}`)}>Detail</button>
    </article>
  )
}

function DataPanel({ title, children }) {
  return <section className="data-panel"><h2>{title}</h2>{children}</section>
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

function InfoBlock({ title, text }) {
  return <section className="info-block"><h3>{title}</h3><p>{text}</p></section>
}

function Badge({ status }) {
  const className = `badge badge-${status.toLowerCase().replaceAll(' ', '-')}`
  return <span className={className}>{status}</span>
}

function NotFound({ navigate }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Halaman tidak ditemukan</h1>
        <button className="primary-btn" onClick={() => navigate('/')}>Kembali ke katalog</button>
      </section>
    </main>
  )
}

function tripName(trips, id) {
  return trips.find((trip) => trip.id === id)?.name || '-'
}

function formatDate(date) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0)
}

export default App
