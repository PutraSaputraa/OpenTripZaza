import { useState } from 'react'
import loadingVideo from '../assets/videoloading.mp4'
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
          <button className="brand" onClick={() => navigate('/')}>Zaza Cave Trip</button>
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
        <video className="loading-video" src={loadingVideo} autoPlay muted playsInline onEnded={onIntroFinished} onError={onIntroFinished} aria-label="Video loading Zaza Cave Trip" />
      </section>
    </main>
  )
}

export function Sidebar({ title, links, navigate, logout, path }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <button className="brand inverse" onClick={() => navigate('/')}>Zaza Cave</button>
        <span>{title}</span>
      </div>
      <nav className="sidebar-nav">
        {links.map(([href, label]) => {
          const isActive = path === href || path?.startsWith(`${href}/`)
          return <button className={isActive ? 'active' : ''} disabled={isActive} aria-current={isActive ? 'page' : undefined} key={href} onClick={() => navigate(href)}>{label}</button>
        })}
      </nav>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>Keluar</button>
      </div>
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

export function Badge({ status }) {
  const className = `badge badge-${status.toLowerCase().replaceAll(' ', '-')}`
  return <span className={className}>{status}</span>
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
