import { useState } from 'react'
import { accounts } from '../config/constants'

export function LoginPage({ role, login, navigate }) {
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

export function LoadingPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Memuat data</h1>
        <p className="muted">Menghubungkan aplikasi ke Firebase...</p>
      </section>
    </main>
  )
}

export function Sidebar({ title, links, navigate, logout }) {
  return (
    <aside className="sidebar">
      <button className="brand inverse" onClick={() => navigate('/')}>Zaza Trip</button>
      <p>{title}</p>
      {links.map(([href, label]) => <button key={href} onClick={() => navigate(href)}>{label}</button>)}
      <button className="logout-btn" onClick={logout}>Keluar</button>
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
