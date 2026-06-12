import { jobStatuses } from '../config/constants'
import { formatDate } from '../utils/formatters'
import { Badge, InfoBlock, Metric, NotFound, Sidebar } from './shared'

const getJobScope = (job) => job.registrationId ? `registration-${job.registrationId}` : `trip-${job.tripId}`

function WorkerShell({ title, children, navigate, logout, path }) {
  return (
    <main className="app-shell">
      <Sidebar title="Pekerja" links={[
        ['/pekerja/dashboard', 'Dashboard'],
        ['/pekerja/job', 'Job tersedia'],
        ['/pekerja/job-saya', 'Job saya'],
      ]} navigate={navigate} logout={logout} path={path} />
      <section className="workspace">
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  )
}

export function WorkerDashboard(props) {
  const ownJobs = props.jobs.filter((job) => job.worker === props.session?.name)
  const takenScopes = new Set(ownJobs.map(getJobScope))
  return (
    <WorkerShell title="Dashboard Pekerja" {...props}>
      <section className="stat-grid">
        <Metric label="Job tersedia" value={props.jobs.filter((job) => job.status === 'Tersedia' && !takenScopes.has(getJobScope(job))).length} />
        <Metric label="Job saya" value={ownJobs.length} />
        <Metric label="Sedang berjalan" value={ownJobs.filter((job) => job.status === 'Sedang Berjalan').length} />
      </section>
      <WorkerJobs {...props} embedded />
    </WorkerShell>
  )
}

export function WorkerJobs(props) {
  const takenScopes = new Set(props.jobs.filter((job) => job.worker === props.session?.name).map(getJobScope))
  const content = (
    <div className="job-grid">
      {props.jobs.filter((job) => job.status === 'Tersedia' && !takenScopes.has(getJobScope(job))).map((job) => <JobCard key={job.id} job={job} {...props} />)}
    </div>
  )
  if (props.embedded) return content
  return <WorkerShell title="Job Open Trip Tersedia" {...props}>{content}</WorkerShell>
}

export function MyJobs(props) {
  return (
    <WorkerShell title="Job Saya" {...props}>
      <div className="job-grid">
        {props.jobs.filter((job) => job.worker === props.session?.name).map((job) => <JobCard key={job.id} job={job} mine {...props} />)}
      </div>
    </WorkerShell>
  )
}

export function WorkerJobDetail({ jobId, jobs, trips, takeJob, updateJobStatus, navigate, ...props }) {
  const job = jobs.find((item) => item.id === jobId)
  if (!job) return <NotFound navigate={navigate} />
  const trip = trips.find((item) => item.id === job.tripId)
  const registration = props.registrations?.find((item) => item.id === job.registrationId)
  const alreadyTookScope = jobs.some((item) => getJobScope(item) === getJobScope(job) && item.worker === props.session?.name)
  return (
    <WorkerShell title="Detail Job" navigate={navigate} {...props}>
      <article className="detail-panel standalone">
        <Badge status={job.status} />
        <h2>{job.addonLabel || 'Job trip'} - {trip?.name || 'Cave trip'}</h2>
        <p className="muted">{trip?.destination || '-'} - {formatDate(job.requestedDate || trip?.date)}</p>
        <div className="metric-row">
          <Metric label="Customer" value={registration?.name || job.customerName || '-'} />
          <Metric label="Peserta" value={registration?.participants || (trip ? trip.quota - trip.slots : 0)} />
          <Metric label="Status job" value={job.status} />
          <Metric label="Pekerja" value={job.worker || '-'} />
        </div>
        <InfoBlock title="Detail tugas" text={job.task} />
        {job.status === 'Tersedia' ? <button className="primary-btn" disabled={alreadyTookScope} onClick={() => takeJob(job.id)}>{alreadyTookScope ? 'Sudah ambil booking ini' : 'Ambil job'}</button> : (
          <label className="status-control">Update status<select value={job.status} onChange={(e) => updateJobStatus(job.id, e.target.value)}>{jobStatuses.filter((status) => status !== 'Tersedia').map((status) => <option key={status}>{status}</option>)}</select></label>
        )}
      </article>
    </WorkerShell>
  )
}

function JobCard({ job, trips, registrations, navigate, takeJob, mine, updateJobStatus }) {
  const trip = trips.find((item) => item.id === job.tripId)
  const registration = registrations?.find((item) => item.id === job.registrationId)
  return (
    <article className="job-card">
      <div><h3>{job.addonLabel || 'Job trip'}</h3><p>{trip?.name} - {trip?.destination}</p></div>
      <Badge status={job.status} />
      <p className="job-slot-label">{job.addonLabel ? `Kebutuhan ${job.addonLabel}` : `Slot pekerja ${job.slot || 1} dari ${job.totalWorkers || trip?.workerCount || 1}`}</p>
      <p>{formatDate(job.requestedDate || trip?.date)} - {registration?.name || job.customerName || 'Customer'} ({registration?.participants || (trip ? trip.quota - trip.slots : 0)} peserta)</p>
      <p className="muted">{job.task}</p>
      {job.status === 'Tersedia' && !mine && <button className="primary-btn" onClick={() => takeJob(job.id)}>Ambil job</button>}
      {mine && <select className="status-select" value={job.status} onChange={(e) => updateJobStatus(job.id, e.target.value)}>{jobStatuses.filter((status) => status !== 'Tersedia').map((status) => <option key={status}>{status}</option>)}</select>}
      <button className="outline-btn" onClick={() => navigate(`/pekerja/job/${job.id}`)}>Detail</button>
    </article>
  )
}
