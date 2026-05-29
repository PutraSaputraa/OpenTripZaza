import { useState } from 'react'
import cinematicVideo from '../assets/cinematic1.mp4'
import { formatCurrency, formatDate } from '../utils/formatters'
import { Badge, InfoBlock, NotFound } from './shared'

export function PublicNav({ navigate, session, logout }) {
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

export function CustomerCatalog({ trips, navigate, session, logout }) {
  return (
    <main className="public-page home-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="hero-band">
        <video className="hero-video" src={cinematicVideo} autoPlay muted loop playsInline aria-hidden="true" />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow">Zaza Open Trip</p>
          <h1>Perjalanan kecil yang terasa rapi dari awal berangkat sampai pulang.</h1>
          <p className="hero-copy">Pilih jadwal, cek slot, lalu daftar ke trip yang paling pas. Semua pendaftaran masuk ke tim admin untuk diverifikasi sebelum keberangkatan.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => document.getElementById('open-trip-list')?.scrollIntoView({ behavior: 'smooth' })}>Lihat open trip</button>
            {!session?.role && <button className="hero-secondary-btn" onClick={() => navigate('/login')}>Masuk customer</button>}
          </div>
        </div>
        <button className="scroll-down-btn" onClick={() => document.getElementById('open-trip-list')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Lihat katalog open trip">
          <span />
        </button>
      </section>

      <section className="section-head" id="open-trip-list">
        <div>
          <p className="eyebrow">Katalog customer</p>
          <h2>Open trip tersedia</h2>
        </div>
      </section>

      <section className="trip-grid">
        {trips.length ? trips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />) : <p className="empty-state">Belum ada open trip yang tersedia.</p>}
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

export function TripDetail({ tripId, trips, navigate, session, logout }) {
  const trip = trips.find((item) => item.id === tripId)
  if (!trip) return <NotFound navigate={navigate} />
  const isOpen = trip.slots > 0 && trip.status === 'Tersedia'

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="trip-detail-page">
        <TripVisual trip={trip} large />
        <div className="trip-detail-layout">
          <article className="trip-detail-main">
            <Badge status={trip.status} />
            <h1>{trip.name}</h1>
            <p className="detail-destination">{trip.destination}</p>
            <TripVisual trip={trip} />
            <InfoBlock title="Deskripsi" text={trip.description} />
            <InfoBlock title="Destinasi" text={trip.destination} />
            <InfoBlock title="Itinerary" text={trip.itinerary} />
            <InfoBlock title="Fasilitas" text={trip.facilities} />
          </article>

          <aside className="trip-detail-sidebar">
            <section className="detail-side-card">
              <h2>Detail Tur</h2>
              <dl className="tour-detail-list">
                <div><dt>Tanggal</dt><dd>{formatDate(trip.date)}</dd></div>
                <div><dt>Kuota</dt><dd>{trip.quota} peserta</dd></div>
                <div><dt>Slot tersedia</dt><dd>{trip.slots} peserta</dd></div>
              </dl>
            </section>
            <section className="detail-side-card checkout-card">
              <span>Mulai dari</span>
              <div className="checkout-price"><strong>{formatCurrency(trip.price)}</strong><small>/ orang</small></div>
              <button className="primary-btn wide" disabled={!isOpen} onClick={() => navigate(`/daftar/${trip.id}`)}>
                {isOpen ? 'Checkout' : 'Pendaftaran ditutup'}
              </button>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}

export function RegistrationPage({ tripId, trips, submitRegistration, navigate, session, logout }) {
  const trip = trips.find((item) => item.id === tripId)
  const [form, setForm] = useState({ name: session?.role === 'customer' ? session.name : '', whatsapp: session?.whatsapp || '', email: session?.role === 'customer' ? session.email : '', participants: 1, tripId, notes: '' })
  const [error, setError] = useState('')
  const selectedTrip = trips.find((item) => item.id === Number(form.tripId)) || trip
  const participants = Number(form.participants) || 1
  const estimatedTotal = selectedTrip ? selectedTrip.price * participants : 0

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
      <section className="registration-page">
        <div className="registration-hero">
          <div>
            <p className="eyebrow">Pendaftaran trip</p>
            <h1>Lengkapi data untuk ikut {trip.name}</h1>
            <p className="muted">Data kamu akan dikirim ke dashboard admin dan masuk sebagai Menunggu Approval sebelum keberangkatan.</p>
          </div>
          <button className="outline-btn" onClick={() => navigate(`/open-trip/${trip.id}`)}>Kembali ke detail</button>
        </div>

        <div className="registration-layout">
          <aside className="registration-summary">
            <TripVisual trip={selectedTrip} />
            <div className="summary-body">
              <Badge status={selectedTrip.status} />
              <h2>{selectedTrip.name}</h2>
              <p>{selectedTrip.destination}</p>
              <dl className="summary-list">
                <div><dt>Tanggal</dt><dd>{formatDate(selectedTrip.date)}</dd></div>
                <div><dt>Harga</dt><dd>{formatCurrency(selectedTrip.price)} / orang</dd></div>
                <div><dt>Slot</dt><dd>{selectedTrip.slots} peserta tersedia</dd></div>
                <div><dt>Total estimasi</dt><dd>{formatCurrency(estimatedTotal)}</dd></div>
              </dl>
            </div>
          </aside>

          <form className="registration-form" onSubmit={onSubmit}>
            <div className="form-section-head">
              <span>1</span>
              <div>
                <h2>Data pemesan</h2>
                <p>Pastikan kontak aktif supaya admin mudah menghubungi kamu.</p>
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="registration-fields">
              <label>Nama lengkap<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Nomor WhatsApp<input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
              <label className="full">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="full">KTP<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            </div>

            <div className="form-section-head">
              <span>2</span>
              <div>
                <h2>Detail trip</h2>
                <p>Pilih trip dan jumlah peserta yang akan didaftarkan.</p>
              </div>
            </div>
            <div className="registration-fields">
              <label>Jumlah peserta<input type="number" min="1" max={selectedTrip.slots} value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} /></label>
              <label>Pilihan open trip<select value={form.tripId} onChange={(e) => setForm({ ...form, tripId: Number(e.target.value), participants: 1 })}>{trips.filter((item) => item.status === 'Tersedia').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="full">Catatan tambahan<textarea placeholder="Contoh: request pickup, alergi makanan, atau catatan rombongan." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            </div>

            <div className="registration-submit">
              <div>
                <span>Total estimasi</span>
                <strong>{formatCurrency(estimatedTotal)}</strong>
              </div>
              <button className="primary-btn" type="submit">Kirim pendaftaran</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

export function CustomerLoginPage({ loginCustomer, navigate }) {
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

export function CustomerSignupPage({ signupCustomer, navigate }) {
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
