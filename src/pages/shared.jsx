import { useState } from 'react'
import { createPortal } from 'react-dom'
import loadingVideo from '../assets/videoloading.mp4'
import horizontalLogo from '../assets/desainHorizontal.png'
import { accounts } from '../config/constants'

export function LoginPage({ role, login, navigate }) {
  const account = role === 'admin' ? accounts.admin : accounts.worker
  const [form, setForm] = useState({ email: account.email, password: account.password })
  const [error, setError] = useState('')

  const onSubmit = (event) => {
    event.preventDefault()
    if (!login(role, form)) setError('Email atau password tidak sesuai.')
  }

  const isAdmin = role === 'admin'
  const title = isAdmin ? 'Dashboard Admin' : 'Dashboard Pekerja'
  const eyebrow = isAdmin ? 'Login admin' : 'Login pekerja'
  const panelTitle = isAdmin ? 'Kelola operasional open trip goa dari satu tempat.' : 'Pantau dan ambil job trip goa dengan lebih rapi.'
  const panelCopy = isAdmin
    ? 'Masuk untuk mengatur paket goa, approval pendaftaran, jadwal, dan akun pekerja.'
    : 'Masuk untuk melihat job cave trip, mengambil tugas, dan memperbarui status pekerjaan.'

  return (
    <main className="login-page">
      <section className="auth-shell">
        <aside className="auth-brand-panel">
          <button className="brand brand-logo-btn" onClick={() => navigate('/')} aria-label="Open Cave Trip">
            <img src={horizontalLogo} alt="Open Cave Trip" />
          </button>
          <div>
            <p className="eyebrow">{isAdmin ? 'Admin area' : 'Pekerja area'}</p>
            <h2>{panelTitle}</h2>
            <p>{panelCopy}</p>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-head">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="muted">Demo: {account.email} / {account.password}</p>
          </div>
          <form className="auth-form" onSubmit={onSubmit}>
            {error && <p className="form-error">{error}</p>}
            <label>Email<input type="email" placeholder="nama@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Password<input type="password" placeholder="Masukkan password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <button className="primary-btn" type="submit">Masuk</button>
          </form>
        </section>
      </section>
    </main>
  )
}

export function LoadingPage({ onIntroFinished }) {
  return (
    <main className="loading-page">
      <section className="loading-panel" aria-label="Loading">
        <video className="loading-video" src={loadingVideo} autoPlay muted playsInline onEnded={onIntroFinished} onError={onIntroFinished} aria-label="Video loading Open Cave Trip" />
      </section>
    </main>
  )
}

export function Sidebar({ title, links, navigate, logout, path }) {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  const confirmLogout = () => {
    setIsLogoutModalOpen(false)
    logout?.()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <button className="brand inverse brand-logo-btn" onClick={() => navigate('/')} aria-label="Open Cave Trip">
          <img src={horizontalLogo} alt="Open Cave Trip" />
        </button>
        <span>{title}</span>
      </div>
      <nav className="sidebar-nav">
        {links.map(([href, label, badgeCount]) => {
          const isActive = path === href || path?.startsWith(`${href}/`)
          return (
            <button className={isActive ? 'active' : ''} disabled={isActive} aria-current={isActive ? 'page' : undefined} key={href} onClick={() => navigate(href)}>
              <span className="sidebar-nav-label">{label}</span>
              {Number(badgeCount) > 0 && <span className="sidebar-menu-badge">{badgeCount}</span>}
            </button>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={() => setIsLogoutModalOpen(true)}>Keluar</button>
      </div>
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
    </aside>
  )
}

export function DataPanel({ title, children }) {
  return <section className="data-panel"><h2>{title}</h2>{children}</section>
}

export function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

export function InfoBlock({ title, text }) {
  return <section className="info-block"><h3>{title}</h3><p>{text}</p></section>
}

export function Badge({ status, label }) {
  const className = `badge badge-${status.toLowerCase().replaceAll(' ', '-')}`
  return <span className={className}>{label || status}</span>
}

export function AppModal({
  isOpen,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  onBackdrop,
  variant = 'default',
  children,
  confirmDisabled = false,
  cancelDisabled = false,
}) {
  if (!isOpen) return null

  return createPortal((
    <div className="modal-backdrop app-modal-backdrop" role="presentation" onClick={onBackdrop || onCancel}>
      <section
        className={`modal-panel app-modal app-modal-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        aria-describedby="app-modal-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="app-modal-icon" aria-hidden="true" />
        <div className="app-modal-copy">
          <h2 id="app-modal-title">{title}</h2>
          <p id="app-modal-description">{description}</p>
        </div>
        {children && <div className="app-modal-extra">{children}</div>}
        <div className="app-modal-actions">
          <button className="outline-btn" type="button" disabled={cancelDisabled} onClick={onCancel}>{cancelText}</button>
          <button className="primary-btn" type="button" disabled={confirmDisabled} onClick={onConfirm}>{confirmText}</button>
        </div>
      </section>
    </div>
  ), document.body)
}

export function NotFound({ navigate }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Halaman tidak ditemukan</h1>
        <button className="primary-btn" onClick={() => navigate('/')}>Kembali ke katalog</button>
      </section>
    </main>
  )
}
