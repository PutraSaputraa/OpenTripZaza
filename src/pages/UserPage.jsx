import { useEffect, useState } from 'react'
import testimoni1 from '../assets/testimoni1.png'
import testimoni2 from '../assets/testimoni2.png'
import testimoni3 from '../assets/testimoni3.png'
import backgroundLandingPageUser from '../assets/backgroundlandingpageuser.png'
import horizontalLogo from '../assets/desainHorizontal.png'
import verticalLogo from '../assets/desainvertikal.png'
import { addonOptions } from '../config/constants'
import { formatCurrency, formatDate, tripName } from '../utils/formatters'
import { AppModal, Badge, InfoBlock, NotFound } from './shared'

export function PublicNav({ navigate, session, logout }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const isLoggedIn = Boolean(session)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 28)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const goToSection = (id) => {
    setIsMenuOpen(false)
    if (window.location.pathname !== '/' && window.location.pathname !== '/open-trip') {
      navigate('/')
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      return
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goToPage = (target) => {
    setIsMenuOpen(false)
    navigate(target)
  }

  const goToAccount = () => {
    if (session?.role === 'admin') {
      goToPage('/admin/dashboard')
      return
    }
    if (session?.role === 'pekerja') {
      goToPage('/pekerja/dashboard')
      return
    }
    goToPage('/akun')
  }

  const handleLogout = () => {
    setIsMenuOpen(false)
    setIsLogoutModalOpen(true)
  }

  const confirmLogout = () => {
    setIsLogoutModalOpen(false)
    logout?.()
  }

  return (
    <>
      <header className={`public-nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <button className="public-nav-logo" type="button" onClick={() => goToPage('/')} aria-label="MAUA home">
          <img src={horizontalLogo} alt="MAUA" />
        </button>

        <nav className="public-nav-menu" aria-label="Navigasi utama">
          <button type="button" onClick={() => goToPage('/destinasi')}>Trip</button>
          <button type="button" onClick={() => goToPage('/')}>Home</button>
          <button type="button" onClick={() => goToSection('faq-list')}>FAQ</button>
        </nav>

        <div className="public-nav-actions">
          {isLoggedIn ? (
            <>
              <button className="public-signup-btn" type="button" onClick={goToAccount}>Akun</button>
              <button className="public-login-btn" type="button" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button className="public-login-btn" type="button" onClick={() => goToPage('/login')}>Login</button>
              <button className="public-signup-btn" type="button" onClick={() => goToPage('/signup')}>Sign Up</button>
            </>
          )}
        </div>

        <button
          className={`public-menu-toggle ${isMenuOpen ? 'is-open' : ''}`}
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-label={isMenuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={isMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`public-mobile-menu ${isMenuOpen ? 'is-open' : ''}`}>
          <button type="button" onClick={() => goToPage('/destinasi')}>Trip</button>
          <button type="button" onClick={() => goToPage('/')}>Home</button>
          <button type="button" onClick={() => goToSection('faq-list')}>FAQ</button>
          {isLoggedIn ? (
            <>
              <button type="button" onClick={goToAccount}>Akun</button>
              <button type="button" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => goToPage('/signup')}>Sign Up</button>
              <button type="button" onClick={() => goToPage('/login')}>Login</button>
            </>
          )}
        </div>
      </header>
      <AppModal
        isOpen={isLogoutModalOpen}
        title="Keluar dari akun?"
        description="Kamu akan keluar dari akun ini dan perlu login kembali untuk mengakses fitur akun."
        confirmText="Ya, Logout"
        cancelText="Batal"
        variant="warning"
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  )
}

const tripTypeLabel = (trip, registration) => {
  if (trip?.isPrivateTrip || registration?.isPrivateTrip) return 'Private cave tour'
  if (registration?.isPrivateTour) return 'Private cave tour'
  return 'Open trip goa'
}

const testimonials = [
  {
    name: 'Rakabumink',
    trip: 'Goa Pindul Cave Tubing',
    image: testimoni1,
    quote: 'Trip goanya rapi, admin responsif, dan briefing keselamatannya jelas. Tinggal datang, pakai perlengkapan, lalu eksplor.',
  },
  {
    name: 'Anisa Azizah',
    trip: 'Goa Jomblang Vertical Cave',
    image: testimoni2,
    quote: 'Suka banget karena detail peserta dan jadwalnya transparan. Rasanya lebih tenang untuk ikut trip goa yang medannya khusus.',
  },
  {
    name: 'Maya Lestari',
    trip: 'Private Cave Tour Pacitan',
    image: testimoni3,
    quote: 'Private cave tournya nyaman untuk keluarga. Bisa lebih fleksibel tanpa campur rombongan lain, tapi tetap dipandu aman.',
  },
]

const faqs = [
  ['Bagaimana cara daftar cave trip?', 'Pilih goa yang kamu mau, buka detailnya, lalu isi form pendaftaran. Status awal akan masuk sebagai menunggu approval admin.'],
  ['Apa bedanya open trip dan private cave tour?', 'Open trip digabung dengan peserta lain sesuai kuota, sedangkan private cave tour hanya untuk satu rombongan kamu setelah disetujui admin.'],
  ['Apakah pendaftaran langsung disetujui?', 'Belum. Admin akan mengecek data, slot, dan kebutuhan trip goa sebelum mengubah status menjadi disetujui atau ditolak.'],
  ['Di mana melihat status pendaftaran?', 'Setelah login sebagai customer, buka halaman akun untuk melihat cave trip yang kamu daftar dan status terbarunya.'],
]

const normalizeSearch = (value) => value.trim().toLowerCase()

const filterTripsBySearch = (trips, search) => {
  const keyword = normalizeSearch(search)
  if (!keyword) return trips
  return trips.filter((trip) => {
    const haystack = [trip.name, trip.destination, trip.description, trip.facilities]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(keyword)
  })
}

function SearchTripForm({ navigate, initialValue = '', compact = false }) {
  const [search, setSearch] = useState(initialValue)

  const onSubmit = (event) => {
    event.preventDefault()
    const keyword = search.trim()
    navigate(keyword ? `/destinasi?search=${encodeURIComponent(keyword)}` : '/destinasi')
  }

  return (
    <form className={compact ? 'hero-search-form compact-search-form' : 'hero-search-form'} onSubmit={onSubmit} role="search">
      <span className="search-icon" aria-hidden="true" />
      <label>
        <input
          aria-label="Cari destinasi cave trip"
          placeholder="Cari Destinasi"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <button className="search-submit" type="submit" aria-label="Cari destinasi">
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}

function DestinationCarousel({ trips, navigate }) {
  const featuredTrips = trips.slice(0, 8)
  const [activeIndex, setActiveIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState('next')

  if (!featuredTrips.length) {
    return <p className="empty-state">Belum ada destinasi cave trip yang tersedia.</p>
  }

  const total = featuredTrips.length
  const getLoopItem = (offset) => featuredTrips[(activeIndex + offset + total) % total]
  const visibleItems = [-2, -1, 0, 1, 2].map((offset) => ({ trip: getLoopItem(offset), offset }))
  const goToPrevious = () => {
    setSlideDirection('prev')
    setActiveIndex((current) => (current - 1 + total) % total)
  }
  const goToNext = () => {
    setSlideDirection('next')
    setActiveIndex((current) => (current + 1) % total)
  }

  return (
    <section className="destination-carousel" aria-label="Carousel destinasi wisata">
      <div className={`destination-carousel-stage is-moving-${slideDirection}`} key={activeIndex}>
        {visibleItems.map(({ trip, offset }) => (
          <button
            className={`destination-slide destination-slide-${offset === 0 ? 'active' : offset < 0 ? `prev-${Math.abs(offset)}` : `next-${offset}`}`}
            key={offset}
            onClick={() => {
              if (offset === 0) {
                navigate(`/open-trip/${trip.id}`)
                return
              }
              setSlideDirection(offset > 0 ? 'next' : 'prev')
              setActiveIndex((current) => (current + offset + total) % total)
            }}
            type="button"
          >
            <TripVisual trip={trip} />
            <span className="trip-type-chip">{trip.isPrivateTrip ? 'Private cave tour' : 'Open trip goa'}</span>
            <strong>{trip.name}</strong>
            <small>{trip.destination}</small>
            <span className="destination-price">{formatCurrency(trip.price)}</span>
          </button>
        ))}
      </div>
      <div className="destination-carousel-controls" aria-label="Kontrol carousel destinasi">
        <button onClick={goToPrevious} type="button" aria-label="Destinasi sebelumnya">‹</button>
        <div className="destination-dots">
          {featuredTrips.map((trip, index) => (
            <button
              className={index === activeIndex ? 'is-active' : ''}
              key={trip.id}
              onClick={() => setActiveIndex(index)}
              type="button"
              aria-label={`Tampilkan destinasi ${index + 1}`}
            />
          ))}
        </div>
        <button onClick={goToNext} type="button" aria-label="Destinasi berikutnya">›</button>
      </div>
    </section>
  )
}

function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const total = testimonials.length
  const visibleTestimonials = [
    { item: testimonials[(activeIndex - 1 + total) % total], position: 'prev' },
    { item: testimonials[activeIndex], position: 'active' },
    { item: testimonials[(activeIndex + 1) % total], position: 'next' },
  ]

  const goToPrevious = () => setActiveIndex((current) => (current - 1 + total) % total)
  const goToNext = () => setActiveIndex((current) => (current + 1) % total)

  return (
    <section className="testimonial-carousel reveal-on-scroll" aria-label="Carousel testimoni">
      <button className="carousel-control carousel-control-prev" onClick={goToPrevious} aria-label="Testimoni sebelumnya">&lsaquo;</button>
      <div className="testimonial-carousel-track">
        {visibleTestimonials.map(({ item, position }) => (
          <article className={`testimonial-card testimonial-slide testimonial-slide-${position}`} key={`${position}-${item.name}`}>
            <img src={item.image} alt={`Testimoni ${item.name}`} />
            <div>
              <p>{item.quote}</p>
              <h3>{item.name}</h3>
              <span>{item.trip}</span>
            </div>
          </article>
        ))}
      </div>
      <button className="carousel-control carousel-control-next" onClick={goToNext} aria-label="Testimoni berikutnya">&rsaquo;</button>
    </section>
  )
}

export function CustomerCatalog({ trips, navigate, session, logout }) {
  const openTrips = trips.filter((trip) => !trip.isPrivateTrip)
  const privateTrips = trips.filter((trip) => trip.isPrivateTrip)
  const featuredTrips = [...openTrips, ...privateTrips]

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.16 })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [openTrips.length, privateTrips.length])

  return (
    <main className="public-page home-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="search-hero" style={{ '--landing-bg': `url(${backgroundLandingPageUser})` }}>
        <div className="hero-content">
          <div className="hero-brand">
            <img src={verticalLogo} alt="MAUA" />
            <h1>Temukan Pengalaman Menjelajahi Goa</h1>
            <p>Pilih jadwal, cek paket, dan daftar trip dalam satu tempat.</p>
          </div>
          <SearchTripForm navigate={navigate} />
        </div>
        <DestinationCarousel trips={featuredTrips} navigate={navigate} />
      </section>

      <section className="section-head" id="open-trip-list">
        <div>
          <p className="eyebrow">Eksplor goa dengan peserta baru</p>
          <h2>Open trip goa</h2>
        </div>
      </section>

      <section className="trip-grid">
        {openTrips.length ? openTrips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />) : <p className="empty-state">Belum ada open trip goa yang tersedia.</p>}
      </section>

      <section className="section-head compact-section-head">
        <div>
          <p className="eyebrow">Masuk goa bersama rombongan sendiri</p>
          <h2>Private cave tour</h2>
        </div>
      </section>

      <section className="trip-grid">
        {privateTrips.length ? privateTrips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />) : <p className="empty-state">Belum ada private cave tour yang tersedia.</p>}
      </section>

      <section className="section-head compact-section-head" id="testimoni-list">
        <div>
          <p className="eyebrow">Cerita perjalanan</p>
          <h2>Testimoni</h2>
        </div>
      </section>

      <TestimonialCarousel />

      <section className="faq-section" id="faq-list">
        <div className="faq-head">
          <p className="eyebrow">Pertanyaan umum</p>
          <h2>FAQ</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details className="faq-item reveal-on-scroll" key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="public-footer reveal-on-scroll">
        <div>
          <h2>Open Cave Trip</h2>
          <p>Siap bantu rencana open trip goa dan private cave tour kamu.</p>
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
  const typeLabel = trip.isPrivateTrip ? 'Private cave tour' : 'Open trip goa'

  return (
    <article className="trip-card reveal-on-scroll">
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
          {!trip.isPrivateTrip && <div><dt><span className="asset-icon icon-ticket" aria-hidden="true" />Slot</dt><dd>{trip.slots} tersedia</dd></div>}
        </dl>
        <div className="trip-card-footer">
          <div className="trip-start-price"><span>Mulai dari</span><strong>{formatCurrency(trip.price)}</strong></div>
          <button className="text-link-btn" onClick={() => navigate(`/open-trip/${trip.id}`)}>Lihat detail <span aria-hidden="true">&rarr;</span></button>
        </div>
      </div>
    </article>
  )
}

const getTripImages = (trip) => {
  const urls = Array.isArray(trip?.imageUrls) ? trip.imageUrls : []
  return [...urls, trip?.imageUrl].filter(Boolean)
}

function TripVisual({ trip, large }) {
  const [firstImage] = getTripImages(trip)

  return (
    <div className={large ? 'trip-visual trip-visual-large' : 'trip-visual'} role="img" aria-label={trip?.name || 'Open trip goa'}>
      {firstImage && <img src={firstImage} alt="" loading="lazy" />}
      {!firstImage && <span>{trip?.name || 'Open Trip Goa'}</span>}
    </div>
  )
}

export function DestinationPage({ path, trips, navigate, session, logout }) {
  const searchParams = new URLSearchParams(path.split('?')[1] || '')
  const initialSearch = searchParams.get('search') || ''
  const visibleTrips = filterTripsBySearch(trips, initialSearch)

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.16 })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [visibleTrips.length])

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="destination-page">
        <div className="destination-page-head">
          <div>
            <p className="eyebrow">Semua destinasi</p>
            <h1>Destinasi cave trip</h1>
          </div>
          <SearchTripForm key={initialSearch} navigate={navigate} initialValue={initialSearch} />
        </div>

        <section className="trip-grid destination-grid">
          {visibleTrips.length ? visibleTrips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />) : <p className="empty-state">Destinasi tidak ditemukan. Coba kata kunci lain.</p>}
        </section>
      </section>
    </main>
  )
}

function TripGallery({ trip }) {
  const images = getTripImages(trip)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = images[activeIndex]

  if (!images.length) return <TripVisual trip={trip} />

  return (
    <section className="trip-gallery" aria-label={`Galeri ${trip.name}`}>
      <div className="trip-gallery-main">
        <img src={activeImage} alt={`Preview ${trip.name}`} />
      </div>
      {images.length > 1 && (
        <div className="trip-gallery-thumbs">
          {images.map((image, index) => (
            <button className={index === activeIndex ? 'is-active' : ''} key={image} onClick={() => setActiveIndex(index)} type="button" aria-label={`Tampilkan gambar ${index + 1}`}>
              <img src={image} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function TripBreadcrumb({ trip, navigate, checkout }) {
  return (
    <div className="trip-breadcrumb">
      <button onClick={() => navigate('/')} type="button">Home</button>
      <span>-</span>
      {checkout ? <button onClick={() => navigate(`/open-trip/${trip.id}`)} type="button">{trip.name}</button> : <span>{trip.name}</span>}
    </div>
  )
}

const getActivityText = (trip) => {
  if (trip?.activity) return trip.activity
  if (trip?.itinerary) return trip.itinerary
  if (!Array.isArray(trip?.itineraryDays)) return ''
  return trip.itineraryDays
    .map((item) => (typeof item === 'string' ? item : item?.text))
    .filter(Boolean)
    .join('\n')
}

function ActivityBlock({ trip }) {
  return <InfoBlock title="Activity" text={getActivityText(trip) || 'Activity belum tersedia.'} />
}

const emptyParticipant = {
  name: '',
  address: '',
  age: '',
  gender: '',
  healthNotes: '',
}

const buildParticipant = (source = {}) => ({
  name: source.name || '',
  address: source.address || '',
  age: source.age || '',
  gender: source.gender || '',
  healthNotes: source.healthNotes || '',
})

const resizeParticipants = (items, count, profile) => {
  const targetCount = Math.max(1, Number(count) || 1)
  return Array.from({ length: targetCount }, (_, index) => items[index] || (index === 0 ? buildParticipant(profile) : { ...emptyParticipant }))
}

const getSelectedAddons = (registration) => {
  const selectedIds = Array.isArray(registration?.addons) ? registration.addons : []
  return addonOptions
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => ({
      ...option,
      detail: option.id === 'transport' ? registration?.transportFrom || '' : '',
    }))
}

export function TripDetail({ tripId, trips, navigate, session, logout }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const trip = trips.find((item) => item.id === tripId)
  if (!trip) return <NotFound navigate={navigate} />
  const isOpen = trip.slots > 0 && trip.status === 'Tersedia'
  const startCheckout = () => {
    if (session?.role !== 'customer') {
      setIsLoginModalOpen(true)
      return
    }
    navigate(`/daftar/${trip.id}`)
  }

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="trip-detail-page">
        <div className="trip-detail-layout">
          <article className="trip-detail-main">
            <div className="trip-detail-topline">
              <TripBreadcrumb trip={trip} navigate={navigate} />
              <span className="trip-type-chip">{trip.isPrivateTrip ? 'Private cave tour' : 'Open trip goa'}</span>
            </div>
            <h1>{trip.name}</h1>
            <p className="detail-destination">{trip.destination}</p>
            <TripGallery trip={trip} />
            <InfoBlock title="Deskripsi" text={trip.description} />
            <InfoBlock title="Destinasi" text={trip.destination} />
            <ActivityBlock trip={trip} />
            <InfoBlock title="Fasilitas" text={trip.facilities} />
          </article>

          <aside className="trip-detail-sidebar">
            <section className="detail-side-card">
              <h2>Detail Tur</h2>
              <dl className="tour-detail-list">
                <div><dt>Tanggal</dt><dd>{formatDate(trip.date)}</dd></div>
                <div><dt>Jenis</dt><dd>{trip.isPrivateTrip ? 'Private cave tour' : 'Open trip goa'}</dd></div>
                {!trip.isPrivateTrip && <div><dt>Kuota</dt><dd>{trip.quota} peserta</dd></div>}
                {!trip.isPrivateTrip && <div><dt>Slot tersedia</dt><dd>{trip.slots} peserta</dd></div>}
              </dl>
            </section>
            <section className="detail-side-card checkout-card">
              <span>Mulai dari</span>
              <div className="checkout-price"><strong>{formatCurrency(trip.price)}</strong><small>/ orang</small></div>
              <button className="primary-btn wide" disabled={!isOpen} onClick={startCheckout}>
                {isOpen ? 'Checkout' : 'Pendaftaran ditutup'}
              </button>
            </section>
          </aside>
        </div>
      </section>
      <AppModal
        isOpen={isLoginModalOpen}
        title="Login terlebih dahulu"
        description="Silakan login atau buat akun terlebih dahulu sebelum melanjutkan checkout dan mengirim pendaftaran trip."
        confirmText="Login"
        cancelText="Sign Up"
        variant="default"
        onConfirm={() => navigate('/login')}
        onCancel={() => navigate('/signup')}
        onBackdrop={() => setIsLoginModalOpen(false)}
      />
    </main>
  )
}

export function RegistrationPage({ tripId, trips, submitRegistration, navigate, session, logout, customerAccounts }) {
  const trip = trips.find((item) => item.id === tripId)
  const customerProfile = customerAccounts.find((item) => item.email === session?.email) || session || {}
  const [form, setForm] = useState({
    name: session?.role === 'customer' ? session.name : '',
    whatsapp: session?.whatsapp || customerProfile.whatsapp || '',
    email: session?.role === 'customer' ? session.email : '',
    participants: trip?.isPrivateTrip ? 2 : 1,
    requestedDate: '',
    tripId,
    notes: '',
    isPrivateTour: Boolean(trip?.isPrivateTrip),
    addons: [],
    transportFrom: '',
    participantDetails: [buildParticipant({ ...customerProfile, name: session?.name || customerProfile.name })],
  })
  const [error, setError] = useState('')
  const [pendingSubmission, setPendingSubmission] = useState(null)
  const selectedTrip = trips.find((item) => item.id === Number(form.tripId)) || trip
  const participants = Number(form.participants) || 1
  const estimatedTotal = selectedTrip ? selectedTrip.price * participants : 0
  const isPrivateTrip = Boolean(selectedTrip?.isPrivateTrip)
  const isPrivateBooking = isPrivateTrip || form.isPrivateTour

  if (!trip) return <NotFound navigate={navigate} />

  const onSubmit = async (event) => {
    event.preventDefault()
    const participantDetails = resizeParticipants(form.participantDetails, participants, { name: form.name })
    const hasIncompleteParticipant = participantDetails.some((item) => !item.name || !item.address || !item.age || !item.gender)
    if (!form.name || !form.whatsapp || !form.email || hasIncompleteParticipant) {
      setError('Lengkapi data pemesan dan data setiap peserta.')
      return
    }
    if (isPrivateBooking && !form.requestedDate) {
      setError('Pilih tanggal private cave tour yang kamu inginkan.')
      return
    }
    if (!isPrivateBooking && Number(form.participants) > selectedTrip.slots) {
      setError('Jumlah peserta melebihi slot tersedia.')
      return
    }
    if (form.addons.includes('transport') && !form.transportFrom.trim()) {
      setError('Isi titik jemput atau asal transportasi.')
      return
    }
    setPendingSubmission({ ...form, participantDetails, participants: isPrivateBooking ? participants : 1, isPrivateTour: isPrivateBooking })
    setError('')
  }

  const confirmSubmitRegistration = async () => {
    if (!pendingSubmission) return
    const isSubmitted = await submitRegistration(pendingSubmission)
    if (!isSubmitted) setError('Pendaftaran gagal dikirim. Cek slot dan koneksi Firebase.')
    setPendingSubmission(null)
  }

  const updateParticipant = (index, field, value) => {
    const nextParticipants = resizeParticipants(form.participantDetails, participants, { name: form.name })
    nextParticipants[index] = { ...nextParticipants[index], [field]: value }
    const nextForm = { ...form, participantDetails: nextParticipants }
    if (index === 0 && field === 'name') nextForm.name = value
    setForm(nextForm)
  }

  const updateParticipantCount = (value) => {
    const nextCount = Math.max(1, Number(value) || 1)
    setForm({ ...form, participants: nextCount, participantDetails: resizeParticipants(form.participantDetails, nextCount, { name: form.name }) })
  }

  const toggleAddon = (addonId) => {
    const hasAddon = form.addons.includes(addonId)
    const nextAddons = hasAddon ? form.addons.filter((item) => item !== addonId) : [...form.addons, addonId]
    setForm({
      ...form,
      addons: nextAddons,
      transportFrom: addonId === 'transport' && hasAddon ? '' : form.transportFrom,
    })
  }

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="registration-page">
        <div className="registration-hero">
          <div>
            <TripBreadcrumb trip={trip} navigate={navigate} checkout />
            <h1>Lengkapi data untuk ikut {trip.name}</h1>
            <p className="muted">Data kamu akan dikirim ke dashboard admin dan masuk sebagai Menunggu Approval sebelum keberangkatan.</p>
          </div>
          <span className="trip-type-chip">{trip.isPrivateTrip ? 'Private cave tour' : 'Open trip goa'}</span>
        </div>

        <div className="registration-layout">
          <aside className="registration-summary">
            <TripVisual trip={selectedTrip} />
            <div className="summary-body">
              <Badge status={selectedTrip.status} />
              <h2>{selectedTrip.name}</h2>
              <p>{selectedTrip.destination}</p>
              <dl className="summary-list">
                <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal</dt><dd>{isPrivateBooking ? form.requestedDate ? formatDate(form.requestedDate) : 'Pilih tanggal' : formatDate(selectedTrip.date)}</dd></div>
                <div><dt><span className="asset-icon icon-currency" aria-hidden="true" />Harga</dt><dd>{formatCurrency(selectedTrip.price)} / orang</dd></div>
                {!isPrivateBooking && <div><dt><span className="asset-icon icon-ticket" aria-hidden="true" />Slot</dt><dd>{selectedTrip.slots} peserta tersedia</dd></div>}
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
                <h2>Detail peserta</h2>
                <p>{isPrivateBooking ? 'Tentukan tanggal, jumlah peserta, lalu lengkapi data setiap peserta.' : 'Satu akun hanya dapat mendaftarkan satu peserta untuk open trip.'}</p>
              </div>
            </div>
            <div className="registration-fields">
              {isPrivateBooking && (
                <>
                  <label>Jumlah peserta<input type="number" min="1" value={form.participants} onChange={(e) => updateParticipantCount(e.target.value)} /></label>
                  <label>Tanggal private tour<input type="date" value={form.requestedDate} onChange={(e) => setForm({ ...form, requestedDate: e.target.value })} /></label>
                </>
              )}
              <label className="full">Catatan tambahan<textarea placeholder="Contoh: request pickup, alergi makanan, atau catatan rombongan." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            </div>

            <div className="form-section-head">
              <span>3</span>
              <div>
                <h2>Add-on trip</h2>
                <p>Pilih kebutuhan tambahan. Jika disetujui admin, kebutuhan ini akan muncul sebagai job untuk pekerja.</p>
              </div>
            </div>
            <section className="addon-option-grid">
              {addonOptions.map((option) => (
                <label className="addon-option-card" key={option.id}>
                  <input type="checkbox" checked={form.addons.includes(option.id)} onChange={() => toggleAddon(option.id)} />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </section>
            {form.addons.includes('transport') && (
              <div className="registration-fields">
                <label className="full">Titik jemput / asal transportasi<input placeholder="Contoh: Stasiun Yogyakarta, Hotel area Malioboro, atau alamat lengkap." value={form.transportFrom} onChange={(e) => setForm({ ...form, transportFrom: e.target.value })} /></label>
              </div>
            )}

            <div className="participant-form-list">
              {resizeParticipants(form.participantDetails, participants, { name: form.name }).map((participant, index) => (
                <section className="participant-form-card" key={index}>
                  <div className="form-section-head compact-form-section-head">
                    <span>{index + 1}</span>
                    <div>
                      <h2>{isPrivateBooking ? `Peserta ${index + 1}` : 'Data peserta'}</h2>
                      <p>Data ini membantu admin mengecek kesiapan peserta sebelum trip.</p>
                    </div>
                  </div>
                  <div className="registration-fields">
                    <label>Nama peserta<input value={participant.name} onChange={(e) => updateParticipant(index, 'name', e.target.value)} /></label>
                    <label>Usia peserta<input type="number" min="1" value={participant.age} onChange={(e) => updateParticipant(index, 'age', e.target.value)} /></label>
                    <label>Jenis kelamin<select value={participant.gender} onChange={(e) => updateParticipant(index, 'gender', e.target.value)}><option value="">Pilih jenis kelamin</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></label>
                    <label>Alamat domisili<input value={participant.address} onChange={(e) => updateParticipant(index, 'address', e.target.value)} /></label>
                    <label className="full">Riwayat penyakit atau kondisi kesehatan penting<textarea placeholder="Isi '-' jika tidak ada." value={participant.healthNotes} onChange={(e) => updateParticipant(index, 'healthNotes', e.target.value)} /></label>
                  </div>
                </section>
              ))}
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
      <AppModal
        isOpen={Boolean(pendingSubmission)}
        title="Kirim pendaftaran trip?"
        description="Pastikan data diri, jumlah peserta, addon, dan bukti pembayaran sudah benar sebelum dikirim ke admin."
        confirmText="Kirim Pendaftaran"
        cancelText="Periksa Lagi"
        variant="warning"
        onConfirm={confirmSubmitRegistration}
        onCancel={() => setPendingSubmission(null)}
      />
    </main>
  )
}

export function CustomerAccountPage({ registrations, trips, navigate, session, logout }) {
  const [activeFilter, setActiveFilter] = useState('Semua')
  const [selectedOrder, setSelectedOrder] = useState(null)

  if (session?.role !== 'customer') {
    navigate('/login')
    return null
  }

  const myRegistrations = registrations.filter((item) => item.email === session.email)
  const waitingCount = myRegistrations.filter((item) => item.status === 'Menunggu Approval').length
  const approvedCount = myRegistrations.filter((item) => item.status === 'Disetujui' || item.status === 'Selesai').length
  const rejectedCount = myRegistrations.filter((item) => item.status === 'Ditolak').length
  const filterOptions = [
    ['Semua', myRegistrations.length],
    ['Menunggu', waitingCount],
    ['Disetujui', approvedCount],
    ['Ditolak', rejectedCount],
  ]
  const visibleRegistrations = myRegistrations.filter((item) => {
    if (activeFilter === 'Semua') return true
    if (activeFilter === 'Menunggu') return item.status === 'Menunggu Approval'
    if (activeFilter === 'Disetujui') return item.status === 'Disetujui' || item.status === 'Selesai'
    return item.status === 'Ditolak'
  })
  const selectedTrip = selectedOrder ? trips.find((tripItem) => tripItem.id === selectedOrder.tripId) : null
  const selectedAddons = selectedOrder ? getSelectedAddons(selectedOrder) : []

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="account-page">
        <div className="account-hero">
          <div>
            <p className="eyebrow">Akun customer</p>
            <h1>Pemesanan Saya</h1>
            <p className="account-greeting">Halo, {session.name}</p>
            <p className="muted">Pantau semua pemesanan trip kamu di sini, termasuk status approval dari admin.</p>
          </div>
          <button className="primary-btn" onClick={() => navigate('/open-trip')}>Pesan Trip Lagi</button>
        </div>

        <section className="account-summary-grid">
          <div className="metric account-metric"><span>Total Pemesanan</span><strong>{myRegistrations.length}</strong></div>
          <div className="metric account-metric"><span>Menunggu Approval</span><strong>{waitingCount}</strong></div>
          <div className="metric account-metric"><span>Disetujui</span><strong>{approvedCount}</strong></div>
          <div className="metric account-metric"><span>Ditolak</span><strong>{rejectedCount}</strong></div>
        </section>

        <div className="account-filter-tabs" role="tablist" aria-label="Filter status pemesanan">
          {filterOptions.map(([label, count]) => (
            <button
              className={activeFilter === label ? 'is-active' : ''}
              key={label}
              onClick={() => setActiveFilter(label)}
              type="button"
              role="tab"
              aria-selected={activeFilter === label}
            >
              {label}<span>{count}</span>
            </button>
          ))}
        </div>

        <section className="account-registration-list">
          {visibleRegistrations.length ? visibleRegistrations.map((item) => {
            const trip = trips.find((tripItem) => tripItem.id === item.tripId)
            const totalPrice = trip ? Number(trip.price || 0) * Number(item.participants || 1) : 0
            return (
              <article className="account-registration-card" key={item.id}>
                <div className="account-registration-head">
                  <div>
                    <h2>{tripName(trips, item.tripId)}</h2>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip?.destination || 'Destinasi belum tersedia'}</p>
                  </div>
                  <Badge status={item.status} />
                </div>
                <dl className="account-order-meta">
                  <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />Tanggal</dt><dd>{item.requestedDate ? formatDate(item.requestedDate) : trip ? formatDate(trip.date) : '-'}</dd></div>
                  <div><dt>Jenis</dt><dd>{tripTypeLabel(trip, item)}</dd></div>
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />Peserta</dt><dd>{item.participants} orang</dd></div>
                  <div><dt>Harga total</dt><dd>{trip ? formatCurrency(totalPrice) : '-'}</dd></div>
                  <div><dt>Kode booking</dt><dd>MAUA-{item.id}</dd></div>
                </dl>
                <div className="account-card-actions">
                  <button className="outline-btn" onClick={() => setSelectedOrder(item)} type="button">Lihat Detail</button>
                  <a className="outline-btn" href="https://wa.me/62882005881248" target="_blank" rel="noreferrer">Hubungi Admin</a>
                  <button className="text-link-btn" onClick={() => navigate(`/open-trip/${item.tripId}`)} type="button">Lihat Trip</button>
                </div>
              </article>
            )
          }) : (
            <div className="account-empty-state">
              <span className="account-empty-icon"><span className="asset-icon icon-ticket" aria-hidden="true" /></span>
              <h2>Belum ada pemesanan trip</h2>
              <p>{myRegistrations.length ? 'Tidak ada pemesanan dengan status ini.' : 'Pilih open trip atau private trip favoritmu, lalu pantau status approval-nya di sini.'}</p>
              <button className="primary-btn" onClick={() => navigate('/open-trip')} type="button">Lihat Trip</button>
            </div>
          )}
        </section>
      </section>
      {selectedOrder && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedOrder(null)}>
          <section className="modal-panel account-detail-modal" role="dialog" aria-modal="true" aria-label="Detail pemesanan" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">Detail pemesanan</p>
                <h2>{tripName(trips, selectedOrder.tripId)}</h2>
              </div>
              <button className="outline-btn" onClick={() => setSelectedOrder(null)} type="button">Tutup</button>
            </div>
            <div className="account-detail-grid">
              <section>
                <h3>Data pemesan</h3>
                <dl>
                  <div><dt>Nama pemesan</dt><dd>{selectedOrder.name || '-'}</dd></div>
                  <div><dt>Nomor WhatsApp</dt><dd>{selectedOrder.whatsapp || '-'}</dd></div>
                  <div><dt>Email</dt><dd>{selectedOrder.email || '-'}</dd></div>
                  <div><dt>Catatan tambahan</dt><dd>{selectedOrder.notes || '-'}</dd></div>
                  <div><dt>Kode booking</dt><dd>MAUA-{selectedOrder.id}</dd></div>
                </dl>
              </section>
              <section>
                <h3>Ringkasan trip</h3>
                <dl>
                  <div><dt>Lokasi</dt><dd>{selectedTrip?.destination || '-'}</dd></div>
                  <div><dt>Jenis trip</dt><dd>{tripTypeLabel(selectedTrip, selectedOrder)}</dd></div>
                  <div><dt>Tanggal</dt><dd>{selectedOrder.requestedDate ? formatDate(selectedOrder.requestedDate) : selectedTrip ? formatDate(selectedTrip.date) : '-'}</dd></div>
                  <div><dt>Jumlah peserta</dt><dd>{selectedOrder.participants || 1} orang</dd></div>
                  <div><dt>Status approval</dt><dd><Badge status={selectedOrder.status} /></dd></div>
                </dl>
              </section>
            </div>
            {selectedAddons.length > 0 && (
              <div className="selected-addon-list account-addon-list">
                {selectedAddons.map((addon) => (
                  <span key={addon.id}>{addon.label}{addon.detail ? ` dari ${addon.detail}` : ''}</span>
                ))}
              </div>
            )}
            <section className="account-participant-section">
              <h3>Data peserta</h3>
              <div className="participant-detail-list">
                {(Array.isArray(selectedOrder.participantDetails) && selectedOrder.participantDetails.length ? selectedOrder.participantDetails : [selectedOrder]).map((participant, index) => (
                  <div key={`${selectedOrder.id}-${index}`}>
                    <strong>{selectedOrder.participants > 1 ? `Peserta ${index + 1}: ` : ''}{participant.name || '-'}</strong>
                    <span>{participant.gender || '-'} - {participant.age || '-'} tahun - {participant.address || '-'}</span>
                    <span>Kondisi kesehatan: {participant.healthNotes || '-'}</span>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </div>
      )}
    </main>
  )
}

export function CustomerLoginPage({ loginCustomer, navigate, afterLoginPath = '/open-trip' }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!form.email || !form.password) {
      setError('Email dan password wajib diisi.')
      return
    }
    if (!loginCustomer(form, afterLoginPath)) setError('Akun customer tidak ditemukan atau password salah.')
  }

  return (
    <AuthShell navigate={navigate}>
      <section className="auth-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">Login customer</p>
          <h1>Masuk Customer</h1>
          <p className="muted">Gunakan akun yang sudah terdaftar untuk lanjut memilih dan mendaftar cave trip.</p>
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
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', address: '', age: '', gender: '', healthNotes: '', password: '', confirmPassword: '' })
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
          <p className="muted">Simpan data kontak sekali, lalu gunakan lagi saat mendaftar open trip goa berikutnya.</p>
        </div>
        <form className="auth-form auth-form-grid" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <label>Nama lengkap<input placeholder="Nama sesuai identitas" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Nomor WhatsApp<input placeholder="08xxxxxxxxxx" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
          <label className="full">Email<input type="email" placeholder="nama@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Alamat domisili<input placeholder="Kota domisili" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label>Usia peserta<input type="number" min="1" placeholder="Usia" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
          <label>Jenis kelamin<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Pilih jenis kelamin</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></label>
          <label className="full">Riwayat penyakit atau kondisi kesehatan penting<textarea placeholder="Isi '-' jika tidak ada." value={form.healthNotes} onChange={(e) => setForm({ ...form, healthNotes: e.target.value })} /></label>
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
          <button className="brand brand-logo-btn" onClick={() => navigate('/')} aria-label="Open Cave Trip">
            <img src={horizontalLogo} alt="Open Cave Trip" />
          </button>
          <div>
            <p className="eyebrow">Customer area</p>
            <h2>Mulai eksplor goa dari data yang rapi.</h2>
            <p>Masuk atau buat akun untuk menyimpan kontak pendaftaran dan melanjutkan proses cave trip dengan lebih nyaman.</p>
          </div>
        </aside>
        {children}
      </section>
    </main>
  )
}
