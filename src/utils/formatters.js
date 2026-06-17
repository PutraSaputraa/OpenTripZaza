export function tripName(trips, id) {
  return trips.find((trip) => trip.id === id)?.name || '-'
}

export function formatDate(date, locale = 'id-ID') {
  if (!date) return '-'
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0)
}
