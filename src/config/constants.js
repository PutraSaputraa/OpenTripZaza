export const tripStatuses = ['Tersedia', 'Penuh', 'Ditutup', 'Selesai']
export const registrationStatuses = ['Menunggu Approval', 'Disetujui', 'Ditolak', 'Selesai']
export const jobStatuses = ['Tersedia', 'Diambil', 'Sedang Berjalan', 'Selesai']

export const addonOptions = [
  {
    id: 'drone',
    label: 'Drone',
    workerTitle: 'Operator drone',
    description: 'Dokumentasi aerial selama perjalanan dengan operator drone.',
    task: 'Mengoperasikan drone, mengambil footage aerial, menjaga area terbang tetap aman, dan menyerahkan hasil dokumentasi ke admin.',
  },
  {
    id: 'documentation',
    label: 'Videografer/fotografer',
    workerTitle: 'Videografer/fotografer',
    description: 'Dokumentasi foto dan video aktivitas peserta selama trip.',
    task: 'Mendokumentasikan aktivitas peserta, mengarahkan momen foto/video, dan menyiapkan file dokumentasi perjalanan.',
  },
  {
    id: 'camera360',
    label: 'Camera 360',
    workerTitle: 'Operator camera 360',
    description: 'Pengambilan konten 360 untuk momen utama perjalanan.',
    task: 'Mengoperasikan camera 360, mengatur antrean peserta saat pengambilan konten, dan memastikan hasil video tersimpan rapi.',
  },
  {
    id: 'transport',
    label: 'Transportasi',
    workerTitle: 'Koordinator transportasi',
    description: 'Bantuan transportasi dari titik jemput yang diisi customer.',
    task: 'Menghubungi peserta, mengoordinasikan titik jemput, memastikan keberangkatan transportasi tepat waktu, dan melaporkan status perjalanan.',
  },
]

export const accounts = {
  admin: { email: 'admin@zazatrip.com', password: 'admin123', role: 'admin', name: 'Admin Zaza' },
  worker: { email: 'pekerja@zazatrip.com', password: 'pekerja123', role: 'pekerja', name: 'Raka Field Crew' },
}
