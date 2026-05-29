import { jobStatuses } from '../config/constants'
import { formatDate } from '../utils/formatters'
import { Badge, InfoBlock, Metric, NotFound, Sidebar } from './shared'

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

export function WorkerDashboard(props) {
  const ownJobs = props.jobs.filter((job) => job.worker === props.session?.name)
  const takenTripIds = new Set(ownJobs.map((job) => job.tripId))
  return (
    <WorkerShell title="Dashboard Pekerja" {...props}>
      <section className="stat-grid">
        <Metric label="Job tersedia" value={props.jobs.filter((job) => job.status === 'Tersedia' && !takenTripIds.has(job.tripId)).length} />
        <Metric label="Job saya" value={ownJobs.length} />
        <Metric label="Sedang berjalan" value={ownJobs.filter((job) => job.status === 'Sedang Berjalan').length} />
      </section>
      <WorkerJobs {...props} embedded />
    </WorkerShell>
  )
}

export function WorkerJobs(props) {
  const takenTripIds = new Set(props.jobs.filter((job) => job.worker === props.session?.name).map((job) => job.tripId))
  const content = (
    <div className="job-grid">
      {props.jobs.filter((job) => job.status === 'Tersedia' && !takenTripIds.has(job.tripId)).map((job) => <JobCard key={job.id} job={job} {...props} />)}
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
  const alreadyTookTrip = jobs.some((item) => item.tripId === job.tripId && item.worker === props.session?.name)
  return (
    <WorkerShell title="Detail Job" navigate={navigate} {...props}>
      <article className="detail-panel standalone">
        <Badge status={job.status} />
        <h2>{trip.name}</h2>
        <p className="muted">{trip.destination} - {formatDate(trip.date)}</p>
        <div className="metric-row">
          <Metric label="Jumlah peserta" value={trip.quota - trip.slots} />
          <Metric label="Status job" value={job.status} />
          <Metric label="Slot pekerja" value={`${job.slot || 1}/${job.totalWorkers || trip.workerCount || 1}`} />
          <Metric label="Pekerja" value={job.worker || '-'} />
        </div>
        <InfoBlock title="Detail tugas" text={job.task} />
        {job.status === 'Tersedia' ? <button className="primary-btn" disabled={alreadyTookTrip} onClick={() => takeJob(job.id)}>{alreadyTookTrip ? 'Sudah ambil trip ini' : 'Ambil job'}</button> : (
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
      <p className="job-slot-label">Slot pekerja {job.slot || 1} dari {job.totalWorkers || trip?.workerCount || 1}</p>
      <p>{formatDate(trip?.date)} - peserta terdaftar {trip ? trip.quota - trip.slots : 0}</p>
      <p className="muted">{job.task}</p>
      {job.status === 'Tersedia' && !mine && <button className="primary-btn" onClick={() => takeJob(job.id)}>Ambil job</button>}
      {mine && <select className="status-select" value={job.status} onChange={(e) => updateJobStatus(job.id, e.target.value)}>{jobStatuses.filter((status) => status !== 'Tersedia').map((status) => <option key={status}>{status}</option>)}</select>}
      <button className="outline-btn" onClick={() => navigate(`/pekerja/job/${job.id}`)}>Detail</button>
    </article>
  )
}
