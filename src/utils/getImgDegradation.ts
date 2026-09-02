import defaultCover from '@/assets/anno.png'

export function getImgDegradation(url?: string): string {
  if (!url || typeof url !== 'string') return defaultCover
  try {
    new URL(url)
    return url
  } catch {
    return url.startsWith('/') || url.startsWith('http') ? url : defaultCover
  }
}
