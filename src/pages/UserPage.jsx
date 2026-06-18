import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import testimoni1 from '../assets/testimoni1.png'
import testimoni2 from '../assets/testimoni2.png'
import testimoni3 from '../assets/testimoni3.png'
import backgroundLandingPageUser from '../assets/backgroundlandingpageuser.png'
import horizontalLogo from '../assets/desainHorizontal.png'
import verticalLogo from '../assets/desainvertikal.png'
import { addonOptions } from '../config/constants'
import { formatCurrency, formatDate, tripName } from '../utils/formatters'
import { getCustomerJobStatusLabel, getJobAddonLabel, getJobCompletedAt, getJobResultLink, getJobWorkerName, getNormalizedJobStatus, getRegistrationResultJobs } from '../utils/jobResults'
import { localizedList, localizedText } from '../utils/localization'
import { getPrivatePricePerPerson, getPrivatePriceRange, getTripStartingPrice } from '../utils/pricing'
import { getOpenTripScheduleOptions, getPrivateDateRange, getPrivateSessionOptions, getRegistrationDate, getTripSchedules, isDateWithinPrivateRange } from '../utils/schedules'
import { AppModal, Badge, InfoBlock, NotFound } from './shared'

const useCustomerLanguage = () => {
  const { t, i18n } = useTranslation()
  const activeLanguage = i18n.language || i18n.resolvedLanguage || 'id'
  const lang = activeLanguage.startsWith('en') ? 'en' : 'id'
  return {
    t,
    i18n,
    lang,
    dateLocale: lang === 'en' ? 'en-US' : 'id-ID',
    statusLabel: (status) => t(`status.${status}`, { defaultValue: status }),
  }
}

const getTripDestination = (trip, lang) => localizedText(trip?.destination, lang) || '-'
const getTripDescription = (trip, lang) => localizedText(trip?.description, lang)
const getTripActivities = (trip, lang) => localizedList(trip?.activities ?? trip?.activity ?? trip?.itinerary ?? trip?.itineraryDays, lang)
const getTripFacilities = (trip, lang) => localizedList(trip?.facilities, lang)
const isCustomExperience = (trip) => trip?.experienceType === 'custom'
const getTripTypeLabel = (trip, registration, t) => {
  const isPrivate = trip?.isPrivateTrip || registration?.isPrivateTrip || registration?.isPrivateTour || registration?.tripType === 'private'
  const isCustom = trip?.experienceType === 'custom' || registration?.experienceType === 'custom'
  if (isCustom) return isPrivate ? t('tripType.customPrivate') : t('tripType.customOpen')
  return isPrivate ? t('tripType.private') : t('tripType.open')
}
const getTripCardTypeLabel = (trip, t) => trip?.isPrivateTrip ? t('tripType.cardPrivate') : t('tripType.cardOpen')
const getTripCategoryLabel = (trip, t) => isCustomExperience(trip) ? t('tripCategory.custom') : t('tripCategory.cave')
const getScheduleLabel = (schedule, dateLocale, t) => {
  const dateText = formatDate(schedule.date, dateLocale)
  if (schedule.status === 'full' || schedule.remaining <= 0) return `${dateText} - ${t('schedule.full')}`
  if (schedule.status === 'inactive') return `${dateText} - ${t('schedule.inactive')}`
  return `${dateText} - ${t('schedule.remaining', { count: schedule.remaining ?? schedule.quota })}`
}
const getSessionLabel = (session, t) => {
  const timeText = session.startTime && session.endTime ? `${session.startTime} - ${session.endTime}` : t('schedule.flexibleSession')
  if (session.isBooked) return `${session.name} (${timeText}) - ${t('schedule.booked')}`
  if (session.status === 'inactive') return `${session.name} (${timeText}) - ${t('schedule.inactive')}`
  return `${session.name} (${timeText})`
}

export function PublicNav({ navigate, session, logout }) {
  const { t, i18n, lang } = useCustomerLanguage()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const isLoggedIn = Boolean(session)

  const changeLanguage = (nextLang) => {
    localStorage.setItem('customerLanguage', nextLang)
    i18n.changeLanguage(nextLang)
  }

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 28)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    const closeOnDesktop = () => {
      if (window.innerWidth > 760) setIsMenuOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeOnDesktop)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeOnDesktop)
    }
  }, [isMenuOpen])

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
      {isMenuOpen && (
        <button
          className="public-menu-backdrop"
          type="button"
          aria-label={t('nav.closeMenu')}
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      <header className={`public-nav ${isScrolled ? 'is-scrolled' : ''} ${isMenuOpen ? 'is-menu-open' : ''}`}>
        <button className="public-nav-logo" type="button" onClick={() => goToPage('/')} aria-label="MAUA home">
          <img src={horizontalLogo} alt="MAUA" />
        </button>

        <nav className="public-nav-menu" aria-label={t('nav.main')}>
          <button type="button" onClick={() => goToPage('/destinasi')}>{t('nav.trip')}</button>
          <button type="button" onClick={() => goToPage('/')}>{t('nav.home')}</button>
          <button type="button" onClick={() => goToSection('faq-list')}>{t('nav.faq')}</button>
        </nav>

        <div className="public-nav-actions">
          <div className="language-switcher" aria-label="Language">
            <button className={lang === 'id' ? 'is-active' : ''} type="button" aria-pressed={lang === 'id'} onClick={() => changeLanguage('id')}>ID</button>
            <button className={lang === 'en' ? 'is-active' : ''} type="button" aria-pressed={lang === 'en'} onClick={() => changeLanguage('en')}>EN</button>
          </div>
          {isLoggedIn ? (
            <>
              <button className="public-signup-btn" type="button" onClick={goToAccount}>{t('nav.account')}</button>
              <button className="public-login-btn" type="button" onClick={handleLogout}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <button className="public-login-btn" type="button" onClick={() => goToPage('/login')}>{t('nav.login')}</button>
              <button className="public-signup-btn" type="button" onClick={() => goToPage('/signup')}>{t('nav.signup')}</button>
            </>
          )}
        </div>

        <button
          className={`public-menu-toggle ${isMenuOpen ? 'is-open' : ''}`}
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={isMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`public-mobile-menu ${isMenuOpen ? 'is-open' : ''}`}
          aria-label={t('nav.main')}
          aria-hidden={!isMenuOpen}
          inert={!isMenuOpen}
        >
          <div className="language-switcher mobile-language-switcher" aria-label="Language">
            <button className={lang === 'id' ? 'is-active' : ''} type="button" aria-pressed={lang === 'id'} onClick={() => changeLanguage('id')}>ID</button>
            <button className={lang === 'en' ? 'is-active' : ''} type="button" aria-pressed={lang === 'en'} onClick={() => changeLanguage('en')}>EN</button>
          </div>
          <button type="button" onClick={() => goToPage('/destinasi')}>{t('nav.trip')}</button>
          <button type="button" onClick={() => goToPage('/')}>{t('nav.home')}</button>
          <button type="button" onClick={() => goToSection('faq-list')}>{t('nav.faq')}</button>
          {isLoggedIn ? (
            <>
              <button className="mobile-account-link" type="button" onClick={goToAccount}>{t('nav.account')}</button>
              <button className="mobile-login-link" type="button" onClick={handleLogout}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <button className="mobile-signup-link" type="button" onClick={() => goToPage('/signup')}>{t('nav.signup')}</button>
              <button className="mobile-login-link" type="button" onClick={() => goToPage('/login')}>{t('nav.login')}</button>
            </>
          )}
        </nav>
      </header>
      <AppModal
        isOpen={isLogoutModalOpen}
        title={t('nav.logoutTitle')}
        description={t('nav.logoutDescription')}
        confirmText={t('nav.logoutConfirm')}
        cancelText={t('nav.cancel')}
        variant="warning"
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  )
}

const testimonials = [
  {
    name: 'Rakabumink',
    trip: 'Goa Pindul Cave Tubing',
    image: testimoni1,
    quoteKey: 'testimonials.quote1',
  },
  {
    name: 'Anisa Azizah',
    trip: 'Goa Jomblang Vertical Cave',
    image: testimoni2,
    quoteKey: 'testimonials.quote2',
  },
  {
    name: 'Maya Lestari',
    trip: 'Private Cave Tour Pacitan',
    image: testimoni3,
    quoteKey: 'testimonials.quote3',
  },
]

const normalizeSearch = (value) => value.trim().toLowerCase()

const filterTripsBySearch = (trips, search, lang) => {
  const keyword = normalizeSearch(search)
  if (!keyword) return trips
  return trips.filter((trip) => {
    const haystack = [
      trip.name,
      getTripDestination(trip, lang),
      getTripDescription(trip, lang),
      getTripActivities(trip, lang).join(' '),
      getTripFacilities(trip, lang).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(keyword)
  })
}

function SearchTripForm({ navigate, initialValue = '', compact = false }) {
  const { t } = useCustomerLanguage()
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
          aria-label={t('search.aria')}
          placeholder={t('search.placeholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <button className="search-submit" type="submit" aria-label={t('search.submit')}>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}

function DestinationCarousel({ trips, navigate }) {
  const { t, lang } = useCustomerLanguage()
  const featuredTrips = trips.slice(0, 8)
  const [activeIndex, setActiveIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState('next')

  if (!featuredTrips.length) {
    return <p className="empty-state">{t('search.emptyFeatured')}</p>
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
    <section className="destination-carousel" aria-label={t('search.carousel')}>
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
            <span className="trip-type-chip">{getTripTypeLabel(trip, null, t)}</span>
            <strong>{trip.name}</strong>
            <small>{getTripDestination(trip, lang)}</small>
            <span className="destination-price">{formatCurrency(getTripStartingPrice(trip))}</span>
          </button>
        ))}
      </div>
      <div className="destination-carousel-controls" aria-label="Kontrol carousel destinasi">
        <button onClick={goToPrevious} type="button" aria-label={t('search.previous')}>‹</button>
        <div className="destination-dots">
          {featuredTrips.map((trip, index) => (
            <button
              className={index === activeIndex ? 'is-active' : ''}
              key={trip.id}
              onClick={() => setActiveIndex(index)}
              type="button"
              aria-label={t('search.show', { number: index + 1 })}
            />
          ))}
        </div>
        <button onClick={goToNext} type="button" aria-label={t('search.next')}>›</button>
      </div>
    </section>
  )
}

function TestimonialCarousel() {
  const { t } = useCustomerLanguage()
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
    <section className="testimonial-carousel reveal-on-scroll" aria-label={t('testimonials.carousel')}>
      <button className="carousel-control carousel-control-prev" onClick={goToPrevious} aria-label={t('testimonials.previous')}>&lsaquo;</button>
      <div className="testimonial-carousel-track">
        {visibleTestimonials.map(({ item, position }) => (
          <article className={`testimonial-card testimonial-slide testimonial-slide-${position}`} key={`${position}-${item.name}`}>
            <img src={item.image} alt={`Testimoni ${item.name}`} />
            <div>
              <p>{t(item.quoteKey)}</p>
              <h3>{item.name}</h3>
              <span>{item.trip}</span>
            </div>
          </article>
        ))}
      </div>
      <button className="carousel-control carousel-control-next" onClick={goToNext} aria-label={t('testimonials.next')}>&rsaquo;</button>
    </section>
  )
}

export function CustomerCatalog({ trips, navigate, session, logout }) {
  const { t } = useCustomerLanguage()
  const featuredTrips = trips
  const faqs = t('faqs', { returnObjects: true })
  const openCaveTrips = trips.filter((trip) => !isCustomExperience(trip) && !trip.isPrivateTrip)
  const privateCaveTrips = trips.filter((trip) => !isCustomExperience(trip) && trip.isPrivateTrip)
  const otherTrips = trips.filter((trip) => isCustomExperience(trip))

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
  }, [openCaveTrips.length, privateCaveTrips.length, otherTrips.length])

  return (
    <main className="public-page home-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="search-hero" style={{ '--landing-bg': `url(${backgroundLandingPageUser})` }}>
        <div className="hero-content">
          <div className="hero-brand">
            <img src={verticalLogo} alt="MAUA" />
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.subtitle')}</p>
          </div>
          <SearchTripForm navigate={navigate} />
        </div>
        <DestinationCarousel trips={featuredTrips} navigate={navigate} />
      </section>

      <div className="catalog-section-list">
        {openCaveTrips.length > 0 && (
          <section className="catalog-trip-section" id="open-trip-list">
            <div className="section-head compact-section-head">
              <div>
                <p className="eyebrow">{t('catalog.openEyebrow')}</p>
                <h2>{t('catalog.openTitle')}</h2>
              </div>
              <span>{openCaveTrips.length} {t('catalog.packageCount')}</span>
            </div>
            <div className="trip-grid catalog-trip-grid">
              {openCaveTrips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />)}
            </div>
          </section>
        )}

        {privateCaveTrips.length > 0 && (
          <section className="catalog-trip-section">
            <div className="section-head compact-section-head">
              <div>
                <p className="eyebrow">{t('catalog.privateEyebrow')}</p>
                <h2>{t('catalog.privateTitle')}</h2>
              </div>
              <span>{privateCaveTrips.length} {t('catalog.packageCount')}</span>
            </div>
            <div className="trip-grid catalog-trip-grid">
              {privateCaveTrips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />)}
            </div>
          </section>
        )}

        {otherTrips.length > 0 && (
          <section className="catalog-trip-section">
            <div className="section-head compact-section-head">
              <div>
                <p className="eyebrow">{t('catalog.otherEyebrow')}</p>
                <h2>{t('catalog.otherTitle')}</h2>
              </div>
              <span>{otherTrips.length} {t('catalog.packageCount')}</span>
            </div>
            <div className="trip-grid catalog-trip-grid">
              {otherTrips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />)}
            </div>
          </section>
        )}
      </div>

      <section className="section-head compact-section-head" id="testimoni-list">
        <div>
          <p className="eyebrow">{t('catalog.testimonialEyebrow')}</p>
          <h2>{t('catalog.testimonialTitle')}</h2>
        </div>
      </section>

      <TestimonialCarousel />

      <section className="faq-section" id="faq-list">
        <div className="faq-head">
          <p className="eyebrow">{t('catalog.faqEyebrow')}</p>
          <h2>{t('catalog.faqTitle')}</h2>
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
          <h2>{t('catalog.footerTitle')}</h2>
          <p>{t('catalog.footerCopy')}</p>
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
  const { t, lang, dateLocale } = useCustomerLanguage()
  const typeLabel = getTripCardTypeLabel(trip, t)
  const categoryLabel = getTripCategoryLabel(trip, t)
  const schedules = !trip.isPrivateTrip ? getTripSchedules(trip) : []
  const privateRange = trip.isPrivateTrip ? getPrivateDateRange(trip) : { startDate: '', endDate: '' }
  const hasPrivateRange = Boolean(privateRange.startDate || privateRange.endDate)
  const totalSlots = schedules.length
    ? schedules.reduce((total, schedule) => total + Math.max(Number(schedule.quota || 0) - Number(schedule.bookedCount || 0), 0), 0)
    : Number(trip.slots || 0)

  return (
    <article className="trip-card reveal-on-scroll">
      <TripVisual trip={trip} />
      <div className="trip-card-body">
        <div className="card-title-row">
          <h3>{trip.name}</h3>
          <div className="card-badge-stack">
            <span className={`trip-type-chip ${trip.isPrivateTrip ? 'is-private' : 'is-open'}`}>{typeLabel}</span>
            <span className={`trip-category-chip ${isCustomExperience(trip) ? 'is-custom' : 'is-cave'}`}>{categoryLabel}</span>
          </div>
        </div>
        <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{getTripDestination(trip, lang)}</p>
        <dl>
          <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />{trip.isPrivateTrip ? t('schedule.schedule') : t('common.date')}</dt><dd>{trip.isPrivateTrip ? t('schedule.flexibleBooking') : schedules.length > 1 ? t('schedule.optionCount', { count: schedules.length }) : formatDate(trip.date, dateLocale)}</dd></div>
          {trip.isPrivateTrip && hasPrivateRange && <div className="trip-card-booking-range"><dt>{t('schedule.availableRange')}</dt><dd>{privateRange.startDate ? formatDate(privateRange.startDate, dateLocale) : '-'} - {privateRange.endDate ? formatDate(privateRange.endDate, dateLocale) : '-'}</dd></div>}
          {!trip.isPrivateTrip && <div><dt><span className="asset-icon icon-ticket" aria-hidden="true" />{t('common.availableSlots')}</dt><dd>{t('common.participantCount', { count: totalSlots })}</dd></div>}
        </dl>
        <div className="trip-card-footer">
          <div className="trip-start-price"><span>{t('common.from')}</span><strong>{formatCurrency(getTripStartingPrice(trip))}</strong></div>
          <button className="text-link-btn" onClick={() => navigate(`/open-trip/${trip.id}`)}>{t('common.details')} <span aria-hidden="true">&rarr;</span></button>
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
  const { t, lang } = useCustomerLanguage()
  const [activeFilter, setActiveFilter] = useState('all')
  const searchParams = new URLSearchParams(path.split('?')[1] || '')
  const initialSearch = searchParams.get('search') || ''
  const searchedTrips = filterTripsBySearch(trips, initialSearch, lang)
  const visibleTrips = searchedTrips.filter((trip) => {
    if (activeFilter === 'open') return !trip.isPrivateTrip
    if (activeFilter === 'private') return trip.isPrivateTrip
    if (activeFilter === 'cave') return !isCustomExperience(trip)
    if (activeFilter === 'custom') return isCustomExperience(trip)
    return true
  })
  const filterOptions = [
    ['all', t('catalog.filterAll')],
    ['open', t('catalog.filterOpen')],
    ['private', t('catalog.filterPrivate')],
    ['cave', t('catalog.filterCave')],
    ['custom', t('catalog.filterCustom')],
  ]

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
        <section className="destination-toolbar">
          <div className="destination-page-head">
            <div>
              <p className="eyebrow">{t('destination.eyebrow')}</p>
              <h1>{t('destination.title')}</h1>
              <p className="destination-subtitle">{t('destination.subtitle')}</p>
            </div>
            <SearchTripForm key={initialSearch} navigate={navigate} initialValue={initialSearch} />
          </div>

          <div className="destination-filter-chips catalog-filter-chips" role="tablist" aria-label={t('catalog.filterLabel')}>
            {filterOptions.map(([value, label]) => (
              <button className={activeFilter === value ? 'is-active' : ''} key={value} onClick={() => setActiveFilter(value)} type="button" role="tab" aria-selected={activeFilter === value}>
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="trip-grid destination-grid">
          {visibleTrips.length ? visibleTrips.map((trip) => <TripCard key={trip.id} trip={trip} navigate={navigate} />) : <p className="empty-state destination-empty-state">{t('destination.filterEmpty')}</p>}
        </section>
      </section>
    </main>
  )
}

function TripGallery({ trip }) {
  const { t } = useCustomerLanguage()
  const images = getTripImages(trip)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = images[activeIndex]

  if (!images.length) return <TripVisual trip={trip} />

  return (
    <section className="trip-gallery" aria-label={t('detail.gallery', { name: trip.name })}>
      <div className="trip-gallery-main">
        <img src={activeImage} alt={t('detail.preview', { name: trip.name })} />
      </div>
      {images.length > 1 && (
        <div className="trip-gallery-thumbs">
          {images.map((image, index) => (
            <button className={index === activeIndex ? 'is-active' : ''} key={image} onClick={() => setActiveIndex(index)} type="button" aria-label={t('detail.showImage', { number: index + 1 })}>
              <img src={image} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function TripBreadcrumb({ trip, navigate, checkout }) {
  const { t } = useCustomerLanguage()
  return (
    <div className="trip-breadcrumb">
      <button onClick={() => navigate('/')} type="button">{t('common.home')}</button>
      <span>-</span>
      {checkout ? <button onClick={() => navigate(`/open-trip/${trip.id}`)} type="button">{trip.name}</button> : <span>{trip.name}</span>}
    </div>
  )
}

function ActivityBlock({ trip }) {
  const { t, lang } = useCustomerLanguage()
  const activities = getTripActivities(trip, lang)
  return <InfoBlock title={t('detail.activity')} text={activities.join('\n') || t('detail.activityEmpty')} />
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

function CustomerWorkResults({ jobs = [], t, dateLocale, compact = false }) {
  const visibleJobs = jobs.filter((job) => job)

  return (
    <section className={`account-work-results ${compact ? 'is-compact' : ''}`}>
      <h3>{t('workResult.title')}</h3>
      {visibleJobs.length ? (
        <div className="account-work-result-list">
          {visibleJobs.map((job) => {
            const status = getNormalizedJobStatus(job)
            const resultLink = getJobResultLink(job)
            const completedAt = getJobCompletedAt(job)
            const workerName = getJobWorkerName(job)
            return (
              <article className="account-work-result-item" key={job.id}>
                <div>
                  <strong>{getJobAddonLabel(job)}</strong>
                  <span>{t('workResult.statusLabel')}: {getCustomerJobStatusLabel(job, t)}</span>
                  {workerName && <span>{t('workResult.worker')}: {workerName}</span>}
                  {completedAt && <span>{t('workResult.completedAt')}: {formatDate(completedAt, dateLocale)}</span>}
                  {status === 'pending' && <span>{t('workResult.pendingMessage')}</span>}
                  {status === 'in_progress' && <span>{t('workResult.processingMessage')}</span>}
                  {status === 'completed' && !resultLink && <span>{t('workResult.completedNoLink')}</span>}
                </div>
                {status === 'completed' && resultLink && (
                  <a className="outline-btn" href={resultLink} target="_blank" rel="noreferrer">{t('workResult.openLink')}</a>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="muted">{t('workResult.unavailable')}</p>
      )}
    </section>
  )
}

export function TripDetail({ tripId, trips, registrations, navigate, session, logout }) {
  const { t, lang, dateLocale } = useCustomerLanguage()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const trip = trips.find((item) => item.id === tripId)
  if (!trip) return <NotFound navigate={navigate} />
  const scheduleOptions = trip.isPrivateTrip ? [] : getOpenTripScheduleOptions(trip, registrations)
  const privateRange = getPrivateDateRange(trip)
  const privatePriceRange = trip.isPrivateTrip ? getPrivatePriceRange(trip) : null
  const isOpen = trip.isPrivateTrip
    ? trip.status === 'Tersedia'
    : trip.status === 'Tersedia' && scheduleOptions.some((schedule) => schedule.isSelectable)
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
              <span className="trip-type-chip">{getTripTypeLabel(trip, null, t)}</span>
            </div>
            <h1>{trip.name}</h1>
            <p className="detail-destination">{getTripDestination(trip, lang)}</p>
            <TripGallery trip={trip} />
            <InfoBlock title={t('detail.description')} text={getTripDescription(trip, lang)} />
            <InfoBlock title={t('detail.destination')} text={getTripDestination(trip, lang)} />
            <ActivityBlock trip={trip} />
            <InfoBlock title={t('detail.facilities')} text={getTripFacilities(trip, lang).join('\n')} />
          </article>

          <aside className="trip-detail-sidebar">
            <section className="detail-side-card">
              <h2>{t('detail.tourDetails')}</h2>
              <dl className="tour-detail-list">
                <div><dt>{t('common.date')}</dt><dd>{!trip.isPrivateTrip && scheduleOptions.length > 1 ? t('schedule.optionCount', { count: scheduleOptions.length }) : formatDate(trip.date, dateLocale)}</dd></div>
                {trip.isPrivateTrip && (privateRange.startDate || privateRange.endDate) && (
                  <div><dt>{t('schedule.availableRange')}</dt><dd>{privateRange.startDate ? formatDate(privateRange.startDate, dateLocale) : '-'} - {privateRange.endDate ? formatDate(privateRange.endDate, dateLocale) : '-'}</dd></div>
                )}
                <div><dt>{t('common.type')}</dt><dd>{getTripTypeLabel(trip, null, t)}</dd></div>
                {!trip.isPrivateTrip && <div><dt>{t('common.quota')}</dt><dd>{t('common.participantCount', { count: trip.quota })}</dd></div>}
                {!trip.isPrivateTrip && <div><dt>{t('common.availableSlots')}</dt><dd>{t('common.participantCount', { count: scheduleOptions.reduce((total, schedule) => total + schedule.remaining, 0) })}</dd></div>}
              </dl>
              {!trip.isPrivateTrip && scheduleOptions.length > 0 && (
                <div className="schedule-option-list">
                  {scheduleOptions.map((schedule) => (
                    <span className={!schedule.isSelectable ? 'is-disabled' : ''} key={schedule.id}>{getScheduleLabel(schedule, dateLocale, t)}</span>
                  ))}
                </div>
              )}
            </section>
            <section className="detail-side-card checkout-card">
              {trip.isPrivateTrip ? (
                <>
                  <span>{t('common.estimatedPrice')}</span>
                  <div className="checkout-price private-price-range">
                    <strong>
                      {privatePriceRange.min === privatePriceRange.max
                        ? formatCurrency(privatePriceRange.min)
                        : `${formatCurrency(privatePriceRange.min)} - ${formatCurrency(privatePriceRange.max)}`}
                    </strong>
                    <small>{t('common.perPerson')}</small>
                  </div>
                  <p className="price-range-note">{t('common.dependsOnParticipants')}</p>
                </>
              ) : (
                <>
                  <span>{t('common.from')}</span>
                  <div className="checkout-price"><strong>{formatCurrency(getTripStartingPrice(trip))}</strong><small>{t('common.perPerson')}</small></div>
                </>
              )}
              <button className="primary-btn wide" disabled={!isOpen} onClick={startCheckout}>
                {isOpen ? t('common.checkout') : t('common.closed')}
              </button>
            </section>
          </aside>
        </div>
      </section>
      <AppModal
        isOpen={isLoginModalOpen}
        title={t('detail.loginTitle')}
        description={t('detail.loginDescription')}
        confirmText={t('nav.login')}
        cancelText={t('nav.signup')}
        variant="default"
        onConfirm={() => navigate('/login')}
        onCancel={() => navigate('/signup')}
        onBackdrop={() => setIsLoginModalOpen(false)}
      />
    </main>
  )
}

export function RegistrationPage({ tripId, trips, submitRegistration, navigate, session, logout, customerAccounts, registrations }) {
  const { t, lang, dateLocale, statusLabel } = useCustomerLanguage()
  const trip = trips.find((item) => item.id === tripId)
  const customerProfile = customerAccounts.find((item) => item.email === session?.email) || session || {}
  const [form, setForm] = useState({
    name: session?.role === 'customer' ? session.name : '',
    whatsapp: session?.whatsapp || customerProfile.whatsapp || '',
    email: session?.role === 'customer' ? session.email : '',
    participants: trip?.isPrivateTrip ? Number(trip.minParticipants) || 1 : 1,
    requestedDate: '',
    scheduleId: '',
    sessionId: '',
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
  const scheduleOptions = selectedTrip && !selectedTrip.isPrivateTrip ? getOpenTripScheduleOptions(selectedTrip, registrations) : []
  const selectedSchedule = scheduleOptions.find((schedule) => schedule.id === form.scheduleId)
  const privateRange = selectedTrip?.isPrivateTrip ? getPrivateDateRange(selectedTrip) : { startDate: '', endDate: '' }
  const isPrivateDateInRange = selectedTrip?.isPrivateTrip && form.requestedDate ? isDateWithinPrivateRange(selectedTrip, form.requestedDate) : true
  const sessionOptions = selectedTrip?.isPrivateTrip && isPrivateDateInRange ? getPrivateSessionOptions(selectedTrip, registrations, form.requestedDate) : []
  const selectedSession = sessionOptions.find((sessionItem) => sessionItem.id === form.sessionId)
  const participants = Number(form.participants) || 1
  const isPrivateTrip = Boolean(selectedTrip?.isPrivateTrip)
  const isPrivateBooking = isPrivateTrip || form.isPrivateTour
  const pricePerPerson = selectedTrip
    ? isPrivateBooking ? getPrivatePricePerPerson(selectedTrip, participants) : Number(selectedTrip.price || 0)
    : 0
  const estimatedTotal = participants * pricePerPerson

  if (!trip) return <NotFound navigate={navigate} />

  const onSubmit = async (event) => {
    event.preventDefault()
    const participantDetails = resizeParticipants(form.participantDetails, participants, { name: form.name })
    const hasIncompleteParticipant = participantDetails.some((item) => !item.name || !item.address || !item.age || !item.gender)
    if (!form.name || !form.whatsapp || !form.email || hasIncompleteParticipant) {
      setError(t('error.checkoutRequired'))
      return
    }
    if (isPrivateBooking && !form.requestedDate) {
      setError(t('error.privateDateRequired'))
      return
    }
    if (isPrivateBooking && !isDateWithinPrivateRange(selectedTrip, form.requestedDate)) {
      setError(t('error.privateDateOutOfRange'))
      return
    }
    if (!isPrivateBooking && !selectedSchedule) {
      setError(t('error.scheduleRequired'))
      return
    }
    if (!isPrivateBooking && (!selectedSchedule.isSelectable || Number(form.participants) > selectedSchedule.remaining)) {
      setError(t('error.slotsExceeded'))
      return
    }
    if (isPrivateBooking && !selectedSession) {
      setError(t('error.sessionRequired'))
      return
    }
    if (isPrivateBooking && !selectedSession.isSelectable) {
      setError(t('error.sessionUnavailable'))
      return
    }
    if (isPrivateBooking && participants < Number(selectedTrip.minParticipants || 1)) {
      setError(t('error.participantRange', {
        min: selectedTrip.minParticipants || 1,
        max: selectedTrip.maxParticipants || selectedTrip.quota || participants,
      }))
      return
    }
    if (isPrivateBooking && participants > Number(selectedTrip.maxParticipants || selectedTrip.quota || participants)) {
      setError(t('error.participantRange', {
        min: selectedTrip.minParticipants || 1,
        max: selectedTrip.maxParticipants || selectedTrip.quota || participants,
      }))
      return
    }
    if (form.addons.includes('transport') && !form.transportFrom.trim()) {
      setError(t('error.pickupRequired'))
      return
    }
    setPendingSubmission({
      ...form,
      participantDetails,
      participants: isPrivateBooking ? participants : 1,
      isPrivateTour: isPrivateBooking,
      selectedDate: isPrivateBooking ? form.requestedDate : selectedSchedule.date,
      scheduleId: isPrivateBooking ? '' : selectedSchedule.id,
      sessionId: isPrivateBooking ? selectedSession.id : '',
      sessionName: isPrivateBooking ? selectedSession.name : '',
      startTime: isPrivateBooking ? selectedSession.startTime : '',
      endTime: isPrivateBooking ? selectedSession.endTime : '',
      hargaPerOrang: pricePerPerson,
      totalHarga: estimatedTotal,
    })
    setError('')
  }

  const confirmSubmitRegistration = async () => {
    if (!pendingSubmission) return
    const isSubmitted = await submitRegistration(pendingSubmission)
    if (!isSubmitted) setError(t('error.submitFailed'))
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
            <h1>{t('checkout.title', { name: trip.name })}</h1>
            <p className="muted">{t('checkout.subtitle')}</p>
          </div>
          <span className="trip-type-chip">{getTripTypeLabel(trip, null, t)}</span>
        </div>

        <div className="registration-layout">
          <aside className="registration-summary">
            <TripVisual trip={selectedTrip} />
            <div className="summary-body">
              <Badge status={selectedTrip.status} label={statusLabel(selectedTrip.status)} />
              <h2>{selectedTrip.name}</h2>
              <p>{getTripDestination(selectedTrip, lang)}</p>
              <dl className="summary-list">
                <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />{t('common.date')}</dt><dd>{isPrivateBooking ? form.requestedDate ? formatDate(form.requestedDate, dateLocale) : t('common.chooseDate') : selectedSchedule ? formatDate(selectedSchedule.date, dateLocale) : t('schedule.chooseSchedule')}</dd></div>
                {isPrivateBooking && selectedSession && <div><dt>{t('schedule.session')}</dt><dd>{getSessionLabel(selectedSession, t)}</dd></div>}
                <div><dt>{t('checkout.participantTotal')}</dt><dd>{t('common.participantCount', { count: participants })}</dd></div>
                <div><dt><span className="asset-icon icon-currency" aria-hidden="true" />{t('common.pricePerPerson')}</dt><dd>{formatCurrency(pricePerPerson)}</dd></div>
                {!isPrivateBooking && <div><dt><span className="asset-icon icon-ticket" aria-hidden="true" />{t('common.availableSlots')}</dt><dd>{selectedSchedule ? t('common.participantCount', { count: selectedSchedule.remaining }) : '-'}</dd></div>}
                <div><dt>{t('common.type')}</dt><dd>{getTripTypeLabel(selectedTrip, { isPrivateTour: isPrivateBooking }, t)}</dd></div>
                <div><dt>{t('common.totalPrice')}</dt><dd>{formatCurrency(estimatedTotal)}</dd></div>
              </dl>
            </div>
          </aside>

          <form className="registration-form" onSubmit={onSubmit}>
            <div className="form-section-head">
              <span>1</span>
              <div>
                <h2>{t('checkout.booker')}</h2>
                <p>{t('checkout.bookerHelp')}</p>
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="registration-fields">
              <label>{t('checkout.fullName')}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>{t('checkout.whatsapp')}<input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
              <label className="full">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            </div>

            <div className="form-section-head">
              <span>2</span>
              <div>
                <h2>{t('checkout.participantDetails')}</h2>
                <p>{isPrivateBooking ? t('checkout.privateHelp') : t('checkout.openHelp')}</p>
              </div>
            </div>
            <div className="registration-fields">
              {!isPrivateBooking && (
                <label className="full">{t('schedule.departureSchedule')}<select required value={form.scheduleId} onChange={(e) => setForm({ ...form, scheduleId: e.target.value })}>
                  <option value="">{t('schedule.chooseSchedule')}</option>
                  {scheduleOptions.map((schedule) => (
                    <option disabled={!schedule.isSelectable} key={schedule.id} value={schedule.id}>{getScheduleLabel(schedule, dateLocale, t)}</option>
                  ))}
                </select></label>
              )}
              {isPrivateBooking && (
                <>
                  <label>{t('checkout.participantTotal')}<input type="number" min={selectedTrip.minParticipants || 1} max={selectedTrip.maxParticipants || selectedTrip.quota || undefined} value={form.participants} onChange={(e) => updateParticipantCount(e.target.value)} /></label>
                  <label>{t('checkout.privateDate')}<input type="date" min={privateRange.startDate || undefined} max={privateRange.endDate || undefined} value={form.requestedDate} onChange={(e) => setForm({ ...form, requestedDate: e.target.value, sessionId: '' })} />{(privateRange.startDate || privateRange.endDate) && <small>{t('schedule.availableRange')}: {privateRange.startDate ? formatDate(privateRange.startDate, dateLocale) : '-'} - {privateRange.endDate ? formatDate(privateRange.endDate, dateLocale) : '-'}</small>}</label>
                  <label className="full">{t('schedule.session')}<select required value={form.sessionId} disabled={!form.requestedDate || !isPrivateDateInRange} onChange={(e) => setForm({ ...form, sessionId: e.target.value })}>
                    <option value="">{!form.requestedDate ? t('schedule.chooseDateFirst') : !isPrivateDateInRange ? t('schedule.dateUnavailable') : t('schedule.chooseSession')}</option>
                    {sessionOptions.map((sessionItem) => (
                      <option disabled={!sessionItem.isSelectable} key={sessionItem.id} value={sessionItem.id}>{getSessionLabel(sessionItem, t)}</option>
                    ))}
                  </select></label>
                </>
              )}
              <label className="full">{t('checkout.notes')}<textarea placeholder={t('checkout.notesPlaceholder')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            </div>

            <div className="form-section-head">
              <span>3</span>
              <div>
                <h2>{t('checkout.addons')}</h2>
                <p>{t('checkout.addonsHelp')}</p>
              </div>
            </div>
            <section className="addon-option-grid">
              {addonOptions.map((option) => (
                <label className="addon-option-card" key={option.id}>
                  <input type="checkbox" checked={form.addons.includes(option.id)} onChange={() => toggleAddon(option.id)} />
                  <span>
                    <strong>{t(`addons.${option.id}.label`, { defaultValue: option.label })}</strong>
                    <small>{t(`addons.${option.id}.description`, { defaultValue: option.description })}</small>
                  </span>
                </label>
              ))}
            </section>
            {form.addons.includes('transport') && (
              <div className="registration-fields">
                <label className="full">{t('checkout.pickupPoint')}<input placeholder={t('checkout.pickupPlaceholder')} value={form.transportFrom} onChange={(e) => setForm({ ...form, transportFrom: e.target.value })} /></label>
              </div>
            )}

            <div className="participant-form-list">
              {resizeParticipants(form.participantDetails, participants, { name: form.name }).map((participant, index) => (
                <section className="participant-form-card" key={index}>
                  <div className="form-section-head compact-form-section-head">
                    <span>{index + 1}</span>
                    <div>
                      <h2>{isPrivateBooking ? t('checkout.participant', { number: index + 1 }) : t('checkout.participantData')}</h2>
                      <p>{t('checkout.participantHelp')}</p>
                    </div>
                  </div>
                  <div className="registration-fields">
                    <label>{t('checkout.participantName')}<input value={participant.name} onChange={(e) => updateParticipant(index, 'name', e.target.value)} /></label>
                    <label>{t('checkout.age')}<input type="number" min="1" value={participant.age} onChange={(e) => updateParticipant(index, 'age', e.target.value)} /></label>
                    <label>{t('checkout.gender')}<select value={participant.gender} onChange={(e) => updateParticipant(index, 'gender', e.target.value)}><option value="">{t('checkout.selectGender')}</option><option value="Laki-laki">{t('checkout.male')}</option><option value="Perempuan">{t('checkout.female')}</option></select></label>
                    <label>{t('checkout.address')}<input value={participant.address} onChange={(e) => updateParticipant(index, 'address', e.target.value)} /></label>
                    <label className="full">{t('checkout.healthNotes')}<textarea placeholder={t('checkout.healthPlaceholder')} value={participant.healthNotes} onChange={(e) => updateParticipant(index, 'healthNotes', e.target.value)} /></label>
                  </div>
                </section>
              ))}
            </div>

            <div className="registration-submit">
              <div>
                <span>{t('common.totalPrice')}</span>
                <strong>{formatCurrency(estimatedTotal)}</strong>
              </div>
              <button className="primary-btn" type="submit">{t('checkout.submit')}</button>
            </div>
          </form>
        </div>
      </section>
      <AppModal
        isOpen={Boolean(pendingSubmission)}
        title={t('checkout.confirmTitle')}
        description={t('checkout.confirmDescription')}
        confirmText={t('checkout.confirmSubmit')}
        cancelText={t('checkout.reviewAgain')}
        variant="warning"
        onConfirm={confirmSubmitRegistration}
        onCancel={() => setPendingSubmission(null)}
      />
    </main>
  )
}

export function CustomerAccountPage({ registrations, trips, jobs = [], navigate, session, logout }) {
  const { t, lang, dateLocale, statusLabel } = useCustomerLanguage()
  const [activeFilter, setActiveFilter] = useState('Semua')
  const [selectedOrder, setSelectedOrder] = useState(null)

  if (session?.role !== 'customer') {
    navigate('/login')
    return null
  }

  const myRegistrations = registrations.filter((item) => {
    if (item.email === session.email) return true
    const participants = Array.isArray(item.participantDetails) ? item.participantDetails : []
    return participants.some((participant) => participant.email === session.email || (session.whatsapp && participant.whatsapp === session.whatsapp))
  })
  const waitingCount = myRegistrations.filter((item) => item.status === 'Menunggu Approval').length
  const approvedCount = myRegistrations.filter((item) => item.status === 'Disetujui' || item.status === 'Selesai').length
  const rejectedCount = myRegistrations.filter((item) => item.status === 'Ditolak').length
  const filterOptions = [
    ['Semua', t('account.all'), myRegistrations.length],
    ['Menunggu', t('account.waiting'), waitingCount],
    ['Disetujui', t('account.approved'), approvedCount],
    ['Ditolak', t('account.rejected'), rejectedCount],
  ]
  const visibleRegistrations = myRegistrations.filter((item) => {
    if (activeFilter === 'Semua') return true
    if (activeFilter === 'Menunggu') return item.status === 'Menunggu Approval'
    if (activeFilter === 'Disetujui') return item.status === 'Disetujui' || item.status === 'Selesai'
    return item.status === 'Ditolak'
  })
  const selectedTrip = selectedOrder ? trips.find((tripItem) => tripItem.id === selectedOrder.tripId) : null
  const selectedAddons = selectedOrder ? getSelectedAddons(selectedOrder) : []
  const selectedWorkResults = selectedOrder ? getRegistrationResultJobs(jobs, selectedOrder) : []

  return (
    <main className="public-page">
      <PublicNav navigate={navigate} session={session} logout={logout} />
      <section className="account-page">
        <div className="account-hero">
          <div>
            <p className="eyebrow">{t('account.eyebrow')}</p>
            <h1>{t('account.title')}</h1>
            <p className="account-greeting">{t('account.greeting', { name: session.name })}</p>
            <p className="muted">{t('account.subtitle')}</p>
          </div>
          <button className="primary-btn" onClick={() => navigate('/open-trip')}>{t('account.bookAgain')}</button>
        </div>

        <section className="account-summary-grid">
          <div className="metric account-metric"><span>{t('account.totalOrders')}</span><strong>{myRegistrations.length}</strong></div>
          <div className="metric account-metric"><span>{t('account.waitingApproval')}</span><strong>{waitingCount}</strong></div>
          <div className="metric account-metric"><span>{t('account.approved')}</span><strong>{approvedCount}</strong></div>
          <div className="metric account-metric"><span>{t('account.rejected')}</span><strong>{rejectedCount}</strong></div>
        </section>

        <div className="account-filter-tabs" role="tablist" aria-label={t('account.filterLabel')}>
          {filterOptions.map(([value, label, count]) => (
            <button
              className={activeFilter === value ? 'is-active' : ''}
              key={value}
              onClick={() => setActiveFilter(value)}
              type="button"
              role="tab"
              aria-selected={activeFilter === value}
            >
              {label}<span>{count}</span>
            </button>
          ))}
        </div>

        <section className="account-registration-list">
          {visibleRegistrations.length ? visibleRegistrations.map((item) => {
            const trip = trips.find((tripItem) => tripItem.id === item.tripId)
            const totalPrice = Number(item.totalHarga ?? item.totalPrice ?? (trip ? Number(trip.price || 0) * Number(item.participants || 1) : 0))
            const registrationDate = getRegistrationDate(item)
            const workResults = getRegistrationResultJobs(jobs, item)
            return (
              <article className="account-registration-card" key={item.id}>
                <div className="account-registration-head">
                  <div>
                    <h2>{tripName(trips, item.tripId)}</h2>
                    <p className="icon-line"><span className="asset-icon icon-geo" aria-hidden="true" />{trip ? getTripDestination(trip, lang) : t('common.unavailableDestination')}</p>
                  </div>
                  <Badge status={item.status} label={statusLabel(item.status)} />
                </div>
                <dl className="account-order-meta">
                  <div><dt><span className="asset-icon icon-calendar" aria-hidden="true" />{t('common.date')}</dt><dd>{registrationDate ? formatDate(registrationDate, dateLocale) : trip ? formatDate(trip.date, dateLocale) : '-'}</dd></div>
                  {(item.tripType === 'private' || item.isPrivateTrip || item.isPrivateTour) && item.sessionName && <div><dt>{t('schedule.session')}</dt><dd>{item.sessionName}{item.startTime && item.endTime ? ` (${item.startTime} - ${item.endTime})` : ''}</dd></div>}
                  <div><dt>{t('common.type')}</dt><dd>{getTripTypeLabel(trip, item, t)}</dd></div>
                  <div><dt><span className="asset-icon icon-people" aria-hidden="true" />{t('common.participants')}</dt><dd>{t('common.participantCount', { count: item.participants })}</dd></div>
                  <div><dt>{t('common.totalPrice')}</dt><dd>{trip || item.totalHarga != null || item.totalPrice != null ? formatCurrency(totalPrice) : '-'}</dd></div>
                  <div><dt>{t('common.bookingCode')}</dt><dd>MAUA-{item.id}</dd></div>
                </dl>
                <CustomerWorkResults jobs={workResults} t={t} dateLocale={dateLocale} compact />
                <div className="account-card-actions">
                  <button className="outline-btn" onClick={() => setSelectedOrder(item)} type="button">{t('account.viewDetail')}</button>
                  <a className="outline-btn" href="https://wa.me/62882005881248" target="_blank" rel="noreferrer">{t('common.contactAdmin')}</a>
                  <button className="text-link-btn" onClick={() => navigate(`/open-trip/${item.tripId}`)} type="button">{t('common.viewTrip')}</button>
                </div>
              </article>
            )
          }) : (
            <div className="account-empty-state">
              <span className="account-empty-icon"><span className="asset-icon icon-ticket" aria-hidden="true" /></span>
              <h2>{t('account.noOrders')}</h2>
              <p>{myRegistrations.length ? t('account.noStatusOrders') : t('account.emptyCopy')}</p>
              <button className="primary-btn" onClick={() => navigate('/open-trip')} type="button">{t('common.viewTrip')}</button>
            </div>
          )}
        </section>
      </section>
      {selectedOrder && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedOrder(null)}>
          <section className="modal-panel account-detail-modal" role="dialog" aria-modal="true" aria-label={t('account.orderDetail')} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">{t('account.orderDetail')}</p>
                <h2>{tripName(trips, selectedOrder.tripId)}</h2>
              </div>
              <button className="outline-btn" onClick={() => setSelectedOrder(null)} type="button">{t('common.close')}</button>
            </div>
            <div className="account-detail-grid">
              <section>
                <h3>{t('account.bookerData')}</h3>
                <dl>
                  <div><dt>{t('account.bookerName')}</dt><dd>{selectedOrder.name || '-'}</dd></div>
                  <div><dt>{t('checkout.whatsapp')}</dt><dd>{selectedOrder.whatsapp || '-'}</dd></div>
                  <div><dt>Email</dt><dd>{selectedOrder.email || '-'}</dd></div>
                  <div><dt>{t('account.extraNotes')}</dt><dd>{selectedOrder.notes || '-'}</dd></div>
                  <div><dt>{t('common.bookingCode')}</dt><dd>MAUA-{selectedOrder.id}</dd></div>
                </dl>
              </section>
              <section>
                <h3>{t('account.tripSummary')}</h3>
                <dl>
                  <div><dt>{t('common.location')}</dt><dd>{selectedTrip ? getTripDestination(selectedTrip, lang) : '-'}</dd></div>
                  <div><dt>{t('account.tripType')}</dt><dd>{getTripTypeLabel(selectedTrip, selectedOrder, t)}</dd></div>
                  <div><dt>{t('common.date')}</dt><dd>{getRegistrationDate(selectedOrder) ? formatDate(getRegistrationDate(selectedOrder), dateLocale) : selectedTrip ? formatDate(selectedTrip.date, dateLocale) : '-'}</dd></div>
                  {(selectedOrder.tripType === 'private' || selectedOrder.isPrivateTrip || selectedOrder.isPrivateTour) && selectedOrder.sessionName && <div><dt>{t('schedule.session')}</dt><dd>{selectedOrder.sessionName}{selectedOrder.startTime && selectedOrder.endTime ? ` (${selectedOrder.startTime} - ${selectedOrder.endTime})` : ''}</dd></div>}
                  <div><dt>{t('checkout.participantTotal')}</dt><dd>{t('common.participantCount', { count: selectedOrder.participants || 1 })}</dd></div>
                  <div><dt>{t('account.approvalStatus')}</dt><dd><Badge status={selectedOrder.status} label={statusLabel(selectedOrder.status)} /></dd></div>
                </dl>
              </section>
            </div>
            {selectedAddons.length > 0 && (
              <div className="selected-addon-list account-addon-list">
                {selectedAddons.map((addon) => (
                  <span key={addon.id}>{t(`addons.${addon.id}.label`, { defaultValue: addon.label })}{addon.detail ? t('account.addonFrom', { detail: addon.detail }) : ''}</span>
                ))}
              </div>
            )}
            <CustomerWorkResults jobs={selectedWorkResults} t={t} dateLocale={dateLocale} />
            <section className="account-participant-section">
              <h3>{t('account.participantData')}</h3>
              <div className="participant-detail-list">
                {(Array.isArray(selectedOrder.participantDetails) && selectedOrder.participantDetails.length ? selectedOrder.participantDetails : [selectedOrder]).map((participant, index) => (
                  <div key={`${selectedOrder.id}-${index}`}>
                    <strong>{selectedOrder.participants > 1 ? t('account.participant', { number: index + 1 }) : ''}{participant.name || '-'}</strong>
                    <span>{participant.gender || '-'} - {participant.age || '-'} {t('account.yearsOld')} - {participant.address || '-'}</span>
                    <span>{t('account.healthCondition')}: {participant.healthNotes || '-'}</span>
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
  const { t } = useCustomerLanguage()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!form.email || !form.password) {
      setError(t('error.loginRequired'))
      return
    }
    if (!loginCustomer(form, afterLoginPath)) setError(t('error.loginFailed'))
  }

  return (
    <AuthShell navigate={navigate}>
      <section className="auth-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">{t('auth.loginEyebrow')}</p>
          <h1>{t('auth.loginTitle')}</h1>
          <p className="muted">{t('auth.loginCopy')}</p>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <label>Email<input type="email" placeholder={t('auth.emailPlaceholder')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" placeholder={t('auth.passwordPlaceholder')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <button className="primary-btn" type="submit">{t('auth.loginButton')}</button>
        </form>
        <p className="auth-switch">{t('auth.noAccount')} <button onClick={() => navigate('/signup')}>{t('auth.createAccount')}</button></p>
      </section>
    </AuthShell>
  )
}

export function CustomerSignupPage({ signupCustomer, navigate }) {
  const { t } = useCustomerLanguage()
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', address: '', age: '', gender: '', healthNotes: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!form.name || !form.whatsapp || !form.email || !form.password) {
      setError(t('error.signupRequired'))
      return
    }
    if (form.password.length < 6) {
      setError(t('error.passwordMin'))
      return
    }
    if (form.password !== form.confirmPassword) {
      setError(t('error.passwordMismatch'))
      return
    }
    const isCreated = await signupCustomer(form)
    if (!isCreated) setError(t('error.emailExists'))
  }

  return (
    <AuthShell navigate={navigate}>
      <section className="auth-panel auth-panel-wide">
        <div className="auth-panel-head">
          <p className="eyebrow">{t('auth.signupEyebrow')}</p>
          <h1>{t('auth.signupTitle')}</h1>
          <p className="muted">{t('auth.signupCopy')}</p>
        </div>
        <form className="auth-form auth-form-grid" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <label>{t('checkout.fullName')}<input placeholder={t('auth.namePlaceholder')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>{t('checkout.whatsapp')}<input placeholder={t('auth.whatsappPlaceholder')} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
          <label className="full">Email<input type="email" placeholder={t('auth.emailPlaceholder')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>{t('checkout.address')}<input placeholder={t('auth.addressPlaceholder')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label>{t('checkout.age')}<input type="number" min="1" placeholder={t('auth.agePlaceholder')} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
          <label>{t('checkout.gender')}<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">{t('checkout.selectGender')}</option><option value="Laki-laki">{t('checkout.male')}</option><option value="Perempuan">{t('checkout.female')}</option></select></label>
          <label className="full">{t('checkout.healthNotes')}<textarea placeholder={t('checkout.healthPlaceholder')} value={form.healthNotes} onChange={(e) => setForm({ ...form, healthNotes: e.target.value })} /></label>
          <label>Password<input type="password" placeholder={t('auth.passwordMinPlaceholder')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>{t('auth.confirmPassword')}<input type="password" placeholder={t('auth.confirmPasswordPlaceholder')} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
          <button className="primary-btn full" type="submit">{t('auth.createAccount')}</button>
        </form>
        <p className="auth-switch">{t('auth.haveAccount')} <button onClick={() => navigate('/login')}>{t('auth.customerLogin')}</button></p>
      </section>
    </AuthShell>
  )
}

function AuthShell({ children, navigate }) {
  const { t } = useCustomerLanguage()
  return (
    <main className="login-page">
      <section className="auth-shell">
        <aside className="auth-brand-panel">
          <button className="brand brand-logo-btn" onClick={() => navigate('/')} aria-label="Open Cave Trip">
            <img src={horizontalLogo} alt="Open Cave Trip" />
          </button>
          <div>
            <p className="eyebrow">{t('auth.customerArea')}</p>
            <h2>{t('auth.sideTitle')}</h2>
            <p>{t('auth.sideCopy')}</p>
          </div>
        </aside>
        {children}
      </section>
    </main>
  )
}
