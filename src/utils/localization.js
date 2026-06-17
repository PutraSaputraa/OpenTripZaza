export function getLocalizedValue(value, lang, fallbackLang = 'id') {
  if (value == null || value === '') return ''
  if (typeof value === 'string' || typeof value === 'number') return value
  if (Array.isArray(value)) {
    return value
      .map((item) => getLocalizedValue(item, lang, fallbackLang))
      .filter((item) => item !== '' && item != null)
  }
  if (typeof value !== 'object') return ''

  const localized = value[lang]
  const fallback = value[fallbackLang]
  const legacyFallback = value.value || value.text || value.label || ''

  if (localized != null && localized !== '') return getLocalizedValue(localized, lang, fallbackLang)
  if (fallback != null && fallback !== '') return getLocalizedValue(fallback, fallbackLang, fallbackLang)
  return getLocalizedValue(legacyFallback, fallbackLang, fallbackLang)
}

export function localizedText(value, lang, fallbackLang = 'id') {
  const localized = getLocalizedValue(value, lang, fallbackLang)
  if (Array.isArray(localized)) return localized.join('\n')
  return String(localized || '')
}

export function localizedList(value, lang, fallbackLang = 'id') {
  const localized = getLocalizedValue(value, lang, fallbackLang)
  if (Array.isArray(localized)) return localized
  return String(localized || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function textToLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function multilingualText(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      id: localizedText(value.id ?? value, 'id'),
      en: localizedText(value.en ?? '', 'en'),
    }
  }
  const legacy = localizedText(value, 'id')
  return { id: legacy, en: '' }
}

export function multilingualLines(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      id: localizedList(value.id ?? value, 'id').join('\n'),
      en: localizedList(value.en ?? '', 'en').join('\n'),
    }
  }
  return {
    id: localizedList(value, 'id').join('\n'),
    en: '',
  }
}
