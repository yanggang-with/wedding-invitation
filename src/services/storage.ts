import { ref, watch } from 'vue'
import type { PhotoItem, WeddingInfo, AccountItem, RsvpItem, GuestbookItem, AdminSettings } from '../types/wedding'
import {
  DEFAULT_PHOTOS,
  DEFAULT_WEDDING_INFO,
  DEFAULT_ACCOUNTS,
  DEFAULT_GUESTBOOK,
  DEFAULT_ADMIN_SETTINGS
} from '../constants/initialData'
import {
  initFirebase,
  uploadToFirebaseStorage,
  isFirebaseStorageReady,
  fetchPhotosFromFirebaseStorage,
  deleteFromFirebaseStorage
} from './firebase'

const STORAGE_KEYS = {
  PHOTOS: 'wedding_photos_v2',
  INFO: 'wedding_info_v2',
  ACCOUNTS: 'wedding_accounts_v2',
  RSVP: 'wedding_rsvp_v1',
  GUESTBOOK: 'wedding_guestbook_v1',
  SETTINGS: 'wedding_admin_settings_v2'
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key)
    if (item) {
      return JSON.parse(item)
    }
  } catch (e) {
    console.error(`Failed to load ${key} from storage:`, e)
  }
  return fallback
}

// Reactive state
export const photos = ref<PhotoItem[]>(loadFromStorage<PhotoItem[]>(STORAGE_KEYS.PHOTOS, DEFAULT_PHOTOS))
export const weddingInfo = ref<WeddingInfo>(loadFromStorage<WeddingInfo>(STORAGE_KEYS.INFO, DEFAULT_WEDDING_INFO))
export const accounts = ref<AccountItem[]>(loadFromStorage<AccountItem[]>(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS))
export const rsvpList = ref<RsvpItem[]>(loadFromStorage<RsvpItem[]>(STORAGE_KEYS.RSVP, []))
export const guestbook = ref<GuestbookItem[]>(loadFromStorage<GuestbookItem[]>(STORAGE_KEYS.GUESTBOOK, DEFAULT_GUESTBOOK))
export const adminSettings = ref<AdminSettings>(loadFromStorage<AdminSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_ADMIN_SETTINGS))

// Ensure firebaseConfig structure exists
if (!adminSettings.value.firebaseConfig) {
  adminSettings.value.firebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
}

// Initialize Firebase if configured
if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
  initFirebase(adminSettings.value.firebaseConfig)
} else {
  // Try environment variables fallback
  initFirebase()
}

// Watchers to auto-persist to LocalStorage
watch(photos, (val) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(val))
  } catch (e) {
    console.warn('Storage quota warning when saving photos:', e)
  }
}, { deep: true })

watch(weddingInfo, (val) => {
  localStorage.setItem(STORAGE_KEYS.INFO, JSON.stringify(val))
}, { deep: true })

watch(accounts, (val) => {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(val))
}, { deep: true })

watch(rsvpList, (val) => {
  localStorage.setItem(STORAGE_KEYS.RSVP, JSON.stringify(val))
}, { deep: true })

watch(guestbook, (val) => {
  localStorage.setItem(STORAGE_KEYS.GUESTBOOK, JSON.stringify(val))
}, { deep: true })

watch(adminSettings, (val) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(val))
  if (val.useFirebase && val.firebaseConfig?.apiKey) {
    initFirebase(val.firebaseConfig)
  }
}, { deep: true })

// Helper functions for Photo operations
export async function uploadImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
  // Try initializing if not already ready
  if (!isFirebaseStorageReady()) {
    if (adminSettings.value.firebaseConfig?.apiKey) {
      initFirebase(adminSettings.value.firebaseConfig)
    } else {
      initFirebase()
    }
  }

  // Upload to Firebase Storage
  if (isFirebaseStorageReady()) {
    return await uploadToFirebaseStorage(file, onProgress)
  }

  throw new Error('Firebase Storage가 연동되지 않았습니다. 관리자 설정에서 Firebase 정보를 입력해주세요.')
}

export function addPhotoItem(photo: Omit<PhotoItem, 'id' | 'order' | 'createdAt'>) {
  const newPhoto: PhotoItem = {
    ...photo,
    id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    order: photos.value.length,
    createdAt: new Date().toISOString()
  }
  if (photos.value.length === 0) {
    newPhoto.isCover = true
  }
  photos.value.push(newPhoto)
  return newPhoto
}

export function deletePhotoItem(id: string) {
  const index = photos.value.findIndex(p => p.id === id)
  if (index !== -1) {
    const target = photos.value[index]
    const wasCover = target.isCover
    // Delete from Firebase Storage if it's a firebase storage url
    if (target.url && (target.url.includes('firebasestorage.googleapis.com') || target.url.startsWith('photos/'))) {
      deleteFromFirebaseStorage(target.url)
    }
    photos.value.splice(index, 1)
    // If cover was deleted, make first photo cover
    if (wasCover && photos.value.length > 0) {
      photos.value[0].isCover = true
    }
    // Reindex order
    photos.value.forEach((p, idx) => {
      p.order = idx
    })
  }
}

export async function syncPhotosFromFirebaseStorage(): Promise<number> {
  const items = await fetchPhotosFromFirebaseStorage()
  if (items.length === 0) return 0

  let addedCount = 0
  for (const item of items) {
    const alreadyExists = photos.value.some(p => p.url === item.url || p.url.includes(item.name))
    if (!alreadyExists) {
      addPhotoItem({
        url: item.url,
        caption: '',
        isCover: photos.value.length === 0
      })
      addedCount++
    }
  }
  return addedCount
}

export function setCoverPhotoItem(id: string) {
  photos.value.forEach(p => {
    p.isCover = p.id === id
    if (p.isCover) {
      p.isHidden = false // 대표 사진은 항상 노출
    }
  })
}

export function updatePhotoItem(id: string, updates: Partial<Omit<PhotoItem, 'id'>>) {
  const photo = photos.value.find(p => p.id === id)
  if (photo) {
    Object.assign(photo, updates)
    if (photo.isCover) {
      photo.isHidden = false
    }
  }
}

export function togglePhotoVisibility(id: string) {
  const photo = photos.value.find(p => p.id === id)
  if (photo) {
    // 대표 사진은 숨김 처리할 수 없음
    if (photo.isCover) {
      photo.isHidden = false
      return
    }
    photo.isHidden = !photo.isHidden
  }
}

export function reorderPhotos(fromIndex: number, toIndex: number) {
  // sortedPhotos와 1:1로 일치하도록 order 기준 정렬본을 복사하여 작업
  const sorted = [...photos.value].sort((a, b) => a.order - b.order)
  if (fromIndex < 0 || fromIndex >= sorted.length || toIndex < 0 || toIndex >= sorted.length) return
  if (fromIndex === toIndex) return

  const [movedItem] = sorted.splice(fromIndex, 1)
  sorted.splice(toIndex, 0, movedItem)

  sorted.forEach((p, idx) => {
    p.order = idx
  })

  // 완전한 배열 교체로 Vue 반응성 및 로컬스토리지 watcher 트리거
  photos.value = sorted
}

export function movePhotoItem(index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  reorderPhotos(index, targetIndex)
}

// RSVP operations
export function addRsvpResponse(rsvp: Omit<RsvpItem, 'id' | 'createdAt'>) {
  const newItem: RsvpItem = {
    ...rsvp,
    id: 'rsvp_' + Date.now(),
    createdAt: new Date().toISOString()
  }
  rsvpList.value.unshift(newItem)
  return newItem
}

export function deleteRsvpItem(id: string) {
  const index = rsvpList.value.findIndex(r => r.id === id)
  if (index !== -1) {
    rsvpList.value.splice(index, 1)
  }
}

// Guestbook operations
export function addGuestbookEntry(entry: Omit<GuestbookItem, 'id' | 'createdAt'>) {
  const newItem: GuestbookItem = {
    ...entry,
    id: 'gb_' + Date.now(),
    createdAt: new Date().toISOString()
  }
  guestbook.value.unshift(newItem)
  return newItem
}

export function deleteGuestbookEntry(id: string, inputPass?: string, isAdmin = false): boolean {
  const index = guestbook.value.findIndex(g => g.id === id)
  if (index === -1) return false
  if (isAdmin || (inputPass && guestbook.value[index].password === inputPass)) {
    guestbook.value.splice(index, 1)
    return true
  }
  return false
}

// Reset to factory sample data
export function resetToSampleData() {
  photos.value = JSON.parse(JSON.stringify(DEFAULT_PHOTOS))
  weddingInfo.value = JSON.parse(JSON.stringify(DEFAULT_WEDDING_INFO))
  accounts.value = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS))
  guestbook.value = JSON.parse(JSON.stringify(DEFAULT_GUESTBOOK))
  rsvpList.value = []
}

// Date formatting helper
export function formatWeddingDate(dateStr: string, formatPattern?: string, customPattern?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''

  let pattern = formatPattern || 'YYYY년 M월 D일 dddd A h시'
  if (pattern === 'CUSTOM') {
    pattern = customPattern?.trim() || 'YYYY년 M월 D일 dddd A h시'
  }

  const year = d.getFullYear()
  const shortYear = String(year).slice(-2)
  const month = d.getMonth() + 1
  const padMonth = String(month).padStart(2, '0')
  const date = d.getDate()
  const padDate = String(date).padStart(2, '0')

  const fullDays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const shortDays = ['일', '월', '화', '수', '목', '금', '토']
  const engShortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayIndex = d.getDay()
  const dddd = fullDays[dayIndex]
  const ddd = shortDays[dayIndex]
  const engDdd = engShortDays[dayIndex]

  const hours = d.getHours()
  const padHours = String(hours).padStart(2, '0')
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  const padH12 = String(h12).padStart(2, '0')

  const minutes = d.getMinutes()
  const padMinutes = String(minutes).padStart(2, '0')

  const ampmKo = hours < 12 ? '오전' : '오후'
  const ampmEn = hours < 12 ? 'AM' : 'PM'

  // Replace tokens safely using regex
  return pattern
    .replace(/\bYYYY\b/g, String(year))
    .replace(/\bYY\b/g, shortYear)
    .replace(/\bMM\b/g, padMonth)
    .replace(/\bM\b/g, String(month))
    .replace(/\bDD\b/g, padDate)
    .replace(/\bD\b/g, String(date))
    .replace(/\bdddd\b/g, dddd)
    .replace(/\bddd\b/g, ddd)
    .replace(/\bEngDdd\b/g, engDdd)
    .replace(/\bHH\b/g, padHours)
    .replace(/\bH\b/g, String(hours))
    .replace(/\bhh\b/g, padH12)
    .replace(/\bh\b/g, String(h12))
    .replace(/\bmm\b/g, padMinutes)
    .replace(/\bm\b/g, String(minutes))
    .replace(/\bA\b/g, ampmKo)
    .replace(/\ba\b/g, ampmEn)
}


