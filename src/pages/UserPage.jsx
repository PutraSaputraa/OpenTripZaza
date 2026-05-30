import { useState } from 'react'
import cinematicVideo from '../assets/cinematic1.mp4'
import testimoni1 from '../assets/testimoni1.png'
import testimoni2 from '../assets/testimoni2.png'
import testimoni3 from '../assets/testimoni3.png'
import { formatCurrency, formatDate, tripName } from '../utils/formatters'
import { Badge, InfoBlock, NotFound } from './shared'

export function PublicNav({ navigate, session, logout }) {
  return (
    <header className="public-nav">
      <button className="brand" onClick={() => navigate('/')}>{session?.role === 'customer' ? `Welcome, ${session.name}` : 'Zaza Open Trip'}</button>
      <nav>
        {session?.role === 'customer' ? (
          <>
            <button className="nav-icon-btn" onClick={() => navigate('/akun')} aria-label="Akun customer" title="Akun">
              <span className="nav-icon nav-icon-account" aria-hidden="true" />
            </button>
            <button className="nav-icon-btn" onClick={logout} aria-label="Keluar" title="Keluar">
              <span className="nav-icon nav-icon-logout" aria-hidden="true" />
            </button>
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

const tripTypeLabel = (trip, registration) => {
  if (trip?.isPrivateTrip || registration?.isPrivateTrip) return 'Private trip'
  if (registration?.isPrivateTour) return 'Private tour'
  return 'Open trip reguler'
}

const testimonials = [
  {
    name: 'Nadia Putri',
    trip: 'Labuan Bajo Sailing Trip',
    image: testimoni1,
    quote: 'Tripnya rapi, admin responsif, dan itinerary tiap hari jelas. Aku tinggal siapin barang dan menikmati perjalanan.',
  },
  {
    name: 'Raka Aditya',
    trip: 'Raja Ampat Explorer',
    image: testimoni2,
    quote: 'Suka banget karena detail peserta dan jadwalnya transparan. Rasanya lebih tenang dari awal daftar sampai pulang.',
  },
  {
    name: 'Maya Lestari',
    trip: 'Private Tour Yogyakarta',
    image: testimoni3,
    quote: 'Private tournya nyaman untuk keluarga. Bisa lebih fleksibel tanpa campur dengan rombongan lain.',
  },
]

const faqs = [
  ['Bagaimana cara daftar trip?', 'Pilih trip yang kamu mau, buka detailnya, lalu isi form pendaftaran. Status awal akan masuk sebagai menunggu approval admin.'],
  ['Apa bedanya open trip dan private tour?', 'Open trip digabung dengan peserta lain sesuai kuota, sedangkan private tour hanya untuk satu rombongan kamu setelah disetujui admin.'],
  ['Apakah pendaftaran langsung disetujui?', 'Belum. Admin akan mengecek data, slot, dan kebutuhan trip sebelum mengubah status menjadi disetujui atau ditolak.'],
  ['Di mana melihat status pendaftaran?', 'Setelah login sebagai customer, buka halaman akun untuk melihat trip yang kamu daftar dan status terbarunya.'],
]

export function CustomerCatalog({ trips, navigate, session, logout }) {
  const openTrips = trips.filter((trip) => !trip.isPrivateTrip)
  const privateTrips = trips.filter((trip) => trip.isPrivateTrip)

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
            <button className="primary-btn" onClick={() => document.getElementById('open-trip-list')?.scrollIntoView({ behavior: 'smooth' })}>Lihat trip</button>
            {!session?.role && <button className="hero-secondary-btn" onClick={() => navigate('/login')}>Masuk customer</button>}
          </div>
        </div>
        <button className="scroll-down-btn" onClick={() => document.getElementById('open-trip-list')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Lihat katalog open trip">
          <span />
        </button>
      </section>

      <section className="section-head" id="open-trip-list">
        <div>
          <p className="eyebrow">Berpergian kemana saja dengan orang baru</p>
          <h2>Open trip</h2>
        </div>
      </section>

      <section className="trip-grid">
        {openTrips.length ? openTrips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />) : <p className="empty-state">Belum ada open trip yang tersedia.</p>}
      </section>

      <section className="section-head compact-section-head">
        <div>
          <p className="eyebrow">Berpergian dengan orang terdekat</p>
          <h2>Private trip</h2>
        </div>
      </section>

      <section className="trip-grid">
        {privateTrips.length ? privateTrips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />) : <p className="empty-state">Belum ada private trip yang tersedia.</p>}
      </section>

      <section className="section-head compact-section-head">
        <div>
          <p className="eyebrow">Cerita perjalanan</p>
          <h2>Testimoni</h2>
        </div>
      </section>

      <section className="testimonial-grid">
        {testimonials.map((item) => (
          <article className="testimonial-card" key={item.name}>
            <img src={item.image} alt={`Testimoni ${item.name}`} />
            <div>
              <p>{item.quote}</p>
              <h3>{item.name}</h3>
              <span>{item.trip}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="faq-section">
        <div className="faq-head">
          <p className="eyebrow">Pertanyaan umum</p>
          <h2>FAQ</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="public-footer">
        <div>
          <h2>Zaza Open Trip</h2>
          <p>Siap bantu rencana perjalanan open trip dan private tour kamu.</p>
        </div>
        <div className="footer-contact">
          <a href="https://www.instagram.com/mauaproject/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://wa.me/62882005881248" target="_blank" rel="noreferrer">0882005881248</a>
        </div>
      </footer>
    </main>
  )
}

function TripCard({ trip, navigate }) {
  const typeLabel = trip.isPrivateTrip ? 'Private tour' : 'Open trip'

  return (
    <article className="trip-card">
      <TripVisual trip={trip} />
      <div className="trip-card-body">
        <div className="card-title-row">
          <h3>{trip.name}</h3>
          <div className="card-badge-stack">
            <span className="trip-type-chip">{typeLabel}</span>
          </div>
        </div>
        <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip.destination}</p>
        <dl>
          <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal</dt><dd>{formatDate(trip.date)}</dd></div>
          <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Kuota</dt><dd>{trip.quota} peserta</dd></div>
          <div><dt><span className="asset-icon icon-ticket" aria-hidden="true" />Slot</dt><dd>{trip.slots} tersedia</dd></div>
        </dl>
        <div className="trip-card-footer">
          <div className="trip-start-price"><span>Mulai dari</span><strong>{formatCurrency(trip.price)}</strong></div>
          <button className="text-link-btn" onClick={() => navigate(`/open-trip/${trip.id}`)}>Lihat detail <span aria-hidden="true">&rarr;</span></button>
        </div>
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

function ItineraryBlock({ trip }) {
  const days = Array.isArray(trip.itineraryDays) && trip.itineraryDays.length
    ? trip.itineraryDays.map((item, index) => ({
      day: item.day || index + 1,
      text: typeof item === 'string' ? item : item.text,
    })).filter((item) => item.text)
    : []

  if (!days.length) return <InfoBlock title="Itinerary" text={trip.itinerary} />

  return (
    <section className="info-block itinerary-block">
      <h3>Itinerary</h3>
      <div className="itinerary-timeline">
        {days.map((item) => (
          <article key={item.day} className="itinerary-day">
            <span>Hari {item.day}</span>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
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
            <div className="card-badge-stack">
              <span className="trip-type-chip">{trip.isPrivateTrip ? 'Private tour' : 'Open trip'}</span>
            </div>
            <h1>{trip.name}</h1>
            <p className="detail-destination">{trip.destination}</p>
            <TripVisual trip={trip} />
            <InfoBlock title="Deskripsi" text={trip.description} />
            <InfoBlock title="Destinasi" text={trip.destination} />
            <ItineraryBlock trip={trip} />
            <InfoBlock title="Fasilitas" text={trip.facilities} />
          </article>

          <aside className="trip-detail-sidebar">
            <section className="detail-side-card">
              <h2>Detail Tur</h2>
              <dl className="tour-detail-list">
                <div><dt>Tanggal</dt><dd>{formatDate(trip.date)}</dd></div>
                <div><dt>Jenis</dt><dd>{trip.isPrivateTrip ? 'Private trip' : 'Open trip'}</dd></div>
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
  const [form, setForm] = useState({ name: session?.role === 'customer' ? session.name : '', whatsapp: session?.whatsapp || '', email: session?.role === 'customer' ? session.email : '', participants: 1, tripId, notes: '', isPrivateTour: Boolean(trip?.isPrivateTrip) })
  const [error, setError] = useState('')
  const selectedTrip = trips.find((item) => item.id === Number(form.tripId)) || trip
  const participants = Number(form.participants) || 1
  const estimatedTotal = selectedTrip ? selectedTrip.price * participants : 0
  const isPrivateTrip = Boolean(selectedTrip?.isPrivateTrip)
  const isPrivateBooking = isPrivateTrip || form.isPrivateTour
  const availableTrips = trips.filter((item) => item.status === 'Tersedia')

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
    const isSubmitted = await submitRegistration({ ...form, isPrivateTour: isPrivateBooking })
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
                <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal</dt><dd>{formatDate(selectedTrip.date)}</dd></div>
                <div><dt><span className="asset-icon icon-currency" aria-hidden="true" />Harga</dt><dd>{formatCurrency(selectedTrip.price)} / orang</dd></div>
                <div><dt><span className="asset-icon icon-ticket" aria-hidden="true" />Slot</dt><dd>{selectedTrip.slots} peserta tersedia</dd></div>
                <div><dt>Jenis</dt><dd>{tripTypeLabel(selectedTrip, { isPrivateTour: isPrivateBooking })}</dd></div>
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
              <label>Pilihan trip<select value={form.tripId} onChange={(e) => {
                const nextTripId = Number(e.target.value)
                const nextTrip = trips.find((item) => item.id === nextTripId)
                setForm({ ...form, tripId: nextTripId, participants: 1, isPrivateTour: Boolean(nextTrip?.isPrivateTrip) })
              }}>{availableTrips.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.isPrivateTrip ? 'Private trip' : 'Open trip'}</option>)}</select></label>
              <label className="private-tour-option full">
                <input type="checkbox" disabled={isPrivateTrip} checked={isPrivateBooking} onChange={(e) => setForm({ ...form, isPrivateTour: e.target.checked })} />
                <span><strong>{isPrivateTrip ? 'Private trip' : 'Private tour'}</strong><small>{isPrivateTrip ? 'Paket ini dibuat khusus untuk 1 rombongan saja.' : 'Trip hanya untuk 1 rombongan kamu setelah disetujui admin.'}</small></span>
              </label>
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

export function CustomerAccountPage({ registrations, trips, navigate, session, logout }) {
  if (session?.role !== 'customer') {
    navigate('/login')
    return null
  }

  const myRegistrations = registrations.filter((item) => item.email === session.email)

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="account-page">
        <div className="account-hero">
          <div>
            <p className="eyebrow">Akun customer</p>
            <h1>Halo, {session.name}</h1>
            <p className="muted">Pantau semua pendaftaran open trip kamu dari sini, termasuk status approval dari admin.</p>
          </div>
          <button className="outline-btn" onClick={() => navigate('/open-trip')}>Lihat open trip</button>
        </div>

        <section className="account-summary-grid">
          <div className="metric"><span>Total pendaftaran</span><strong>{myRegistrations.length}</strong></div>
          <div className="metric"><span>Menunggu approval</span><strong>{myRegistrations.filter((item) => item.status === 'Menunggu Approval').length}</strong></div>
          <div className="metric"><span>Disetujui</span><strong>{myRegistrations.filter((item) => item.status === 'Disetujui').length}</strong></div>
          <div className="metric"><span>Ditolak</span><strong>{myRegistrations.filter((item) => item.status === 'Ditolak').length}</strong></div>
        </section>

        <section className="account-registration-list">
          {myRegistrations.length ? myRegistrations.map((item) => {
            const trip = trips.find((tripItem) => tripItem.id === item.tripId)
            return (
              <article className="account-registration-card" key={item.id}>
                <div className="account-registration-head">
                  <div>
                    <h2>{tripName(trips, item.tripId)}</h2>
              <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip?.destination || 'Destinasi belum tersedia'}</p>
                  </div>
                  <Badge status={item.status} />
                </div>
                <dl>
                  <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal</dt><dd>{trip ? formatDate(trip.date) : '-'}</dd></div>
                  <div><dt>Jenis</dt><dd>{tripTypeLabel(trip, item)}</dd></div>
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Peserta</dt><dd>{item.participants} orang</dd></div>
                  <div><dt>WhatsApp</dt><dd>{item.whatsapp}</dd></div>
                  <div><dt>Catatan</dt><dd>{item.notes || '-'}</dd></div>
                </dl>
                <button className="outline-btn" onClick={() => navigate(`/open-trip/${item.tripId}`)}>Lihat detail trip</button>
              </article>
            )
          }) : (
            <div className="empty-state">
              Belum ada pendaftaran. Pilih open trip dulu untuk mulai mendaftar.
            </div>
          )}
        </section>
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
    <AuthShell navigate={navigate}>
      <section className="auth-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">Login customer</p>
          <h1>Masuk Customer</h1>
          <p className="muted">Gunakan akun yang sudah terdaftar untuk lanjut memilih dan mendaftar trip.</p>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <label>Email<input type="email" placeholder="nama@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" placeholder="Masukkan password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <button className="primary-btn" type="submit">Masuk</button>
        </form>
        <p className="auth-switch">Belum punya akun? <button onClick={() => navigate('/signup')}>Buat akun</button></p>
      </section>
    </AuthShell>
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
    <AuthShell navigate={navigate}>
      <section className="auth-panel auth-panel-wide">
        <div className="auth-panel-head">
          <p className="eyebrow">Signup customer</p>
          <h1>Buat Akun</h1>
          <p className="muted">Simpan data kontak sekali, lalu gunakan lagi saat mendaftar open trip berikutnya.</p>
        </div>
        <form className="auth-form auth-form-grid" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <label>Nama lengkap<input placeholder="Nama sesuai identitas" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Nomor WhatsApp<input placeholder="08xxxxxxxxxx" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
          <label className="full">Email<input type="email" placeholder="nama@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" placeholder="Minimal 6 karakter" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>Konfirmasi password<input type="password" placeholder="Ulangi password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
          <button className="primary-btn full" type="submit">Buat akun</button>
        </form>
        <p className="auth-switch">Sudah punya akun? <button onClick={() => navigate('/login')}>Masuk customer</button></p>
      </section>
    </AuthShell>
  )
}

function AuthShell({ children, navigate }) {
  return (
    <main className="login-page">
      <section className="auth-shell">
        <aside className="auth-brand-panel">
          <button className="brand" onClick={() => navigate('/')}>Zaza Open Trip</button>
          <div>
            <p className="eyebrow">Customer area</p>
            <h2>Mulai perjalanan dari data yang rapi.</h2>
            <p>Masuk atau buat akun untuk menyimpan kontak pendaftaran dan melanjutkan proses trip dengan lebih nyaman.</p>
          </div>
        </aside>
        {children}
      </section>
    </main>
  )
}
