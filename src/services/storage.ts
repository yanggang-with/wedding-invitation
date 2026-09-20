import { ref, watch } from 'vue'
import type { PhotoItem, WeddingInfo, AccountItem, RsvpItem, GuestbookItem, AdminSettings, LiveSnapItem } from '../types/wedding'
import {
  DEFAULT_PHOTOS,
  DEFAULT_WEDDING_INFO,
  DEFAULT_ACCOUNTS,
  DEFAULT_GUESTBOOK,
  DEFAULT_ADMIN_SETTINGS,
  DEFAULT_LIVE_SNAPS
} from '../constants/initialData'
import {
  initFirebase,
  uploadToFirebaseStorage,
  isFirebaseStorageReady,
  fetchPhotosFromFirebaseStorage,
  deleteFromFirebaseStorage,
  isFirestoreReady,
  saveWeddingContentToFirestore,
  fetchWeddingContentFromFirestore,
  subscribeWeddingContent,
  subscribeGuestbook,
  saveGuestbookDoc,
  deleteGuestbookDoc,
  subscribeRsvp,
  saveRsvpDoc,
  deleteRsvpDoc,
  subscribeLiveSnaps,
  saveLiveSnapDoc,
  deleteLiveSnapDoc,
  checkFirestoreStatus
} from './firebase'

const STORAGE_KEYS = {
  PHOTOS: 'wedding_photos_v2',
  INFO: 'wedding_info_v2',
  ACCOUNTS: 'wedding_accounts_v2',
  RSVP: 'wedding_rsvp_v1',
  GUESTBOOK: 'wedding_guestbook_v1',
  SETTINGS: 'wedding_admin_settings_v2',
  LIVESNAPS: 'wedding_livesnaps_v1'
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
function loadInitialLiveSnaps(): LiveSnapItem[] {
  const loaded = loadFromStorage<LiveSnapItem[]>(STORAGE_KEYS.LIVESNAPS, DEFAULT_LIVE_SNAPS)
  if (!loaded || loaded.length === 0) return DEFAULT_LIVE_SNAPS
  // If only old default dummy items were stored, upgrade to the new varied default snaps
  const isAllDefaultDummies = loaded.every(s => s.id.startsWith('snap-'))
  if (isAllDefaultDummies && loaded.length < DEFAULT_LIVE_SNAPS.length) {
    try {
      localStorage.setItem(STORAGE_KEYS.LIVESNAPS, JSON.stringify(DEFAULT_LIVE_SNAPS))
    } catch (_) {}
    return DEFAULT_LIVE_SNAPS
  }
  return loaded
}

export const liveSnaps = ref<LiveSnapItem[]>(loadInitialLiveSnaps())

// 대표 사진이 항상 무조건 1번째(index 0)에 위치하도록 보장하는 헬퍼
export function ensureCoverPhotoFirst() {
  const list = photos.value
  if (!list || list.length === 0) return
  const coverIdx = list.findIndex(p => p.isCover)
  if (coverIdx > 0) {
    const [cover] = list.splice(coverIdx, 1)
    list.unshift(cover)
  } else if (coverIdx === -1 && list.length > 0) {
    list[0].isCover = true
  }
  list.forEach((p, idx) => {
    p.order = idx
    if (idx === 0) {
      p.isCover = true
      p.isHidden = false
    } else {
      p.isCover = false
    }
  })
}

// 시작 시 대표 사진 1번째 정렬 보장
ensureCoverPhotoFirst()

// Cloud Sync Reactive States
export const isCloudSyncing = ref(false)
export const lastCloudSyncTime = ref<string>('')
export const isCloudConnected = ref(isFirestoreReady())

// UI Overlay States
export const isStoryOpen = ref(false)

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

// Flag to prevent echo feedback loops between Firestore and Watchers
let isApplyingCloudUpdate = false
let cloudSaveTimer: any = null

function triggerCloudSave() {
  if (isApplyingCloudUpdate || !isFirestoreReady()) return

  if (cloudSaveTimer) clearTimeout(cloudSaveTimer)
  cloudSaveTimer = setTimeout(async () => {
    try {
      isCloudSyncing.value = true
      await saveWeddingContentToFirestore({
        weddingInfo: weddingInfo.value,
        photos: photos.value,
        accounts: accounts.value,
        adminSettings: adminSettings.value
      })
      lastCloudSyncTime.value = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      isCloudConnected.value = true
    } catch (err) {
      console.warn('Auto cloud sync failed:', err)
      isCloudConnected.value = false
    } finally {
      isCloudSyncing.value = false
    }
  }, 1000)
}

// Watchers to auto-persist to LocalStorage & Firestore
watch(photos, (val) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(val))
  } catch (e) {
    console.warn('Storage quota warning when saving photos:', e)
  }
  triggerCloudSave()
}, { deep: true })

watch(weddingInfo, (val) => {
  localStorage.setItem(STORAGE_KEYS.INFO, JSON.stringify(val))
  triggerCloudSave()
}, { deep: true })

watch(accounts, (val) => {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(val))
  triggerCloudSave()
}, { deep: true })

watch(rsvpList, (val) => {
  localStorage.setItem(STORAGE_KEYS.RSVP, JSON.stringify(val))
}, { deep: true })

watch(guestbook, (val) => {
  localStorage.setItem(STORAGE_KEYS.GUESTBOOK, JSON.stringify(val))
}, { deep: true })

watch(liveSnaps, (val) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LIVESNAPS, JSON.stringify(val))
  } catch (e) {
    console.warn('Storage quota warning when saving live snaps:', e)
  }
}, { deep: true })

watch(adminSettings, (val) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(val))
  if (val.useFirebase && val.firebaseConfig?.apiKey) {
    initFirebase(val.firebaseConfig)
    initCloudSubscriptions()
  }
  triggerCloudSave()
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
  const index = photos.value.findIndex(p => p.id === id)
  if (index !== -1) {
    // 선택된 사진을 배열에서 제거 후 1번째(index 0)로 이동
    const [target] = photos.value.splice(index, 1)
    photos.value.forEach(p => {
      p.isCover = false
    })
    target.isCover = true
    target.isHidden = false // 대표 사진은 항상 노출
    photos.value.unshift(target)
    photos.value.forEach((p, idx) => {
      p.order = idx
    })
  }
}

export function updatePhotoItem(id: string, updates: Partial<Omit<PhotoItem, 'id'>>) {
  const photo = photos.value.find(p => p.id === id)
  if (photo) {
    Object.assign(photo, updates)
    if (photo.isCover) {
      photo.isHidden = false
      setCoverPhotoItem(id)
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
  if (fromIndex === toIndex) return

  const sorted = [...photos.value].sort((a, b) => a.order - b.order)
  if (fromIndex < 0 || fromIndex >= sorted.length || toIndex < 0 || toIndex >= sorted.length) return

  const [movedItem] = sorted.splice(fromIndex, 1)
  sorted.splice(toIndex, 0, movedItem)

  // 1번째(0번) 자리에 위치한 사진이 자동으로 대표 사진이 되고, 나머지는 대표 해제
  sorted.forEach((p, idx) => {
    p.order = idx
    if (idx === 0) {
      p.isCover = true
      p.isHidden = false // 대표 사진은 항상 노출
    } else {
      p.isCover = false
    }
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
  if (isFirestoreReady()) {
    saveRsvpDoc(newItem).catch(err => console.warn('RSVP Firestore 저장 실패:', err))
  }
  return newItem
}

export function deleteRsvpItem(id: string) {
  const index = rsvpList.value.findIndex(r => r.id === id)
  if (index !== -1) {
    rsvpList.value.splice(index, 1)
    if (isFirestoreReady()) {
      deleteRsvpDoc(id).catch(err => console.warn('RSVP Firestore 삭제 실패:', err))
    }
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
  if (isFirestoreReady()) {
    saveGuestbookDoc(newItem).catch(err => console.warn('방명록 Firestore 저장 실패:', err))
  }
  return newItem
}

export function deleteGuestbookEntry(id: string, inputPass?: string, isAdmin = false): boolean {
  const index = guestbook.value.findIndex(g => g.id === id)
  if (index === -1) return false
  if (isAdmin || (inputPass && guestbook.value[index].password === inputPass)) {
    guestbook.value.splice(index, 1)
    if (isFirestoreReady()) {
      deleteGuestbookDoc(id).catch(err => console.warn('방명록 Firestore 삭제 실패:', err))
    }
    return true
  }
  return false
}

// Cloud Realtime Subscription Management
let unsubWedding: (() => void) | null = null
let unsubGuestbook: (() => void) | null = null
let unsubRsvp: (() => void) | null = null
let unsubLiveSnaps: (() => void) | null = null
let isInitialContentChecked = false

export function initCloudSubscriptions() {
  if (!isFirestoreReady()) return

  isCloudConnected.value = true

  // 1. 메인 청첩장 데이터 구독
  if (!unsubWedding) {
    unsubWedding = subscribeWeddingContent((cloudData) => {
      if (!cloudData || (!cloudData.weddingInfo && !cloudData.photos)) {
        // 클라우드가 비어있는 경우 로컬 데이터를 클라우드로 1회 자동 업로드 (초기화)
        if (!isInitialContentChecked) {
          isInitialContentChecked = true
          triggerCloudSave()
        }
        return
      }

      isInitialContentChecked = true
      isApplyingCloudUpdate = true

      try {
        if (cloudData.weddingInfo) {
          weddingInfo.value = cloudData.weddingInfo
          localStorage.setItem(STORAGE_KEYS.INFO, JSON.stringify(cloudData.weddingInfo))
        }
        if (cloudData.photos && Array.isArray(cloudData.photos)) {
          photos.value = cloudData.photos
          ensureCoverPhotoFirst()
          localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos.value))
        }
        if (cloudData.accounts && Array.isArray(cloudData.accounts)) {
          accounts.value = cloudData.accounts
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(cloudData.accounts))
        }
        if (cloudData.adminSettings) {
          adminSettings.value = {
            ...adminSettings.value,
            ...cloudData.adminSettings,
            firebaseConfig: cloudData.adminSettings.firebaseConfig?.apiKey
              ? cloudData.adminSettings.firebaseConfig
              : adminSettings.value.firebaseConfig
          }
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(adminSettings.value))
        }
        lastCloudSyncTime.value = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        isCloudConnected.value = true
      } finally {
        setTimeout(() => {
          isApplyingCloudUpdate = false
        }, 300)
      }
    }, (err) => {
      console.warn('Firestore wedding subscription error:', err)
      isCloudConnected.value = false
    })
  }

  // 2. 방명록 실시간 구독
  if (!unsubGuestbook) {
    unsubGuestbook = subscribeGuestbook((items) => {
      isApplyingCloudUpdate = true
      try {
        if (items && items.length > 0) {
          guestbook.value = items
          localStorage.setItem(STORAGE_KEYS.GUESTBOOK, JSON.stringify(items))
        }
      } finally {
        setTimeout(() => {
          isApplyingCloudUpdate = false
        }, 300)
      }
    })
  }

  // 3. RSVP 실시간 구독
  if (!unsubRsvp) {
    unsubRsvp = subscribeRsvp((items) => {
      isApplyingCloudUpdate = true
      try {
        if (items && items.length > 0) {
          rsvpList.value = items
          localStorage.setItem(STORAGE_KEYS.RSVP, JSON.stringify(items))
        }
      } finally {
        setTimeout(() => {
          isApplyingCloudUpdate = false
        }, 300)
      }
    })
  }

  // 4. 현장 스냅 실시간 구독 (추가/수정/삭제 실시간 반영)
  if (!unsubLiveSnaps) {
    unsubLiveSnaps = subscribeLiveSnaps((items) => {
      isApplyingCloudUpdate = true
      try {
        if (items) {
          liveSnaps.value = items
          try {
            localStorage.setItem(STORAGE_KEYS.LIVESNAPS, JSON.stringify(items))
          } catch (_) {}
        }
      } finally {
        setTimeout(() => {
          isApplyingCloudUpdate = false
        }, 300)
      }
    })
  }
}

// 브라우저 탭 간 실시간 동기화 (관리자 페이지에서 삭제/추가 시 청첩장 탭 즉시 반영)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.LIVESNAPS && e.newValue) {
      try {
        liveSnaps.value = JSON.parse(e.newValue)
      } catch (_) {}
    }
  })
}

// 수동 클라우드 업로드 / 다운로드 함수
export async function forceUploadToCloud(): Promise<void> {
  if (!isFirestoreReady()) {
    initFirebase()
    if (!isFirestoreReady()) {
      throw new Error('Firebase Firestore가 연결되지 않았습니다.')
    }
  }
  isCloudSyncing.value = true
  try {
    await saveWeddingContentToFirestore({
      weddingInfo: weddingInfo.value,
      photos: photos.value,
      accounts: accounts.value,
      adminSettings: adminSettings.value
    })
    lastCloudSyncTime.value = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    isCloudConnected.value = true
  } finally {
    isCloudSyncing.value = false
  }
}

export async function forceDownloadFromCloud(): Promise<boolean> {
  if (!isFirestoreReady()) {
    initFirebase()
    if (!isFirestoreReady()) {
      throw new Error('Firebase Firestore가 연결되지 않았습니다.')
    }
  }
  isCloudSyncing.value = true
  try {
    const cloudData = await fetchWeddingContentFromFirestore()
    if (!cloudData) return false

    isApplyingCloudUpdate = true
    try {
      if (cloudData.weddingInfo) weddingInfo.value = cloudData.weddingInfo
      if (cloudData.photos) {
        photos.value = cloudData.photos
        ensureCoverPhotoFirst()
      }
      if (cloudData.accounts) accounts.value = cloudData.accounts
      if (cloudData.adminSettings) {
        adminSettings.value = {
          ...adminSettings.value,
          ...cloudData.adminSettings
        }
      }
      lastCloudSyncTime.value = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      isCloudConnected.value = true
      return true
    } finally {
      setTimeout(() => {
        isApplyingCloudUpdate = false
      }, 300)
    }
  } finally {
    isCloudSyncing.value = false
  }
}

// Firestore 준비 시 자동 구독 활성화
if (isFirestoreReady()) {
  initCloudSubscriptions()
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

/**
 * Returns an optimized image URL for fast thumbnail rendering.
 * Automatically resizes remote images (such as Unsplash) to lightweight dimensions and quality.
 */
export function getOptimizedImageUrl(url: string, width = 360, quality = 75): string {
  if (!url) return ''
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0]
    return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`
  }
  return url
}

/**
 * Helper to compress image client-side to keep under storage limits
 */
function compressImage(file: File, maxWidth = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function uploadToGoogleDrive(
  file: File,
  scriptUrl: string,
  folderId?: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  onProgress?.(10)

  // 1. Read file as base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      const base64 = res.split(',')[1] || ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  onProgress?.(40)

  const payload = {
    fileBase64: base64Data,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    folderId: folderId?.trim() || undefined
  }

  onProgress?.(65)

  // Send request using text/plain to avoid CORS preflight rejection by Google Apps Script
  const response = await fetch(scriptUrl.trim(), {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    }
  })

  onProgress?.(90)

  if (!response.ok) {
    throw new Error(`구글 드라이브 업로드 응답 오류 (${response.status}): 구글 앱스 스크립트 웹앱 주소를 확인해주세요.`)
  }

  const result = await response.json()
  if (!result.success && result.error) {
    throw new Error(`구글 드라이브 업로드 실패: ${result.error}`)
  }

  if (!result.url) {
    throw new Error('구글 드라이브 업로드 후 파일 링크를 받아오지 못했습니다.')
  }

  onProgress?.(100)
  return result.url
}

export async function uploadLiveSnapMedia(file: File, onProgress?: (percent: number) => void): Promise<{ url: string; type: 'image' | 'video' }> {
  const isVideo = file.type.startsWith('video/')
  if (isVideo) {
    const maxVideoBytes = 100 * 1024 * 1024 // 100MB
    if (file.size > maxVideoBytes) {
      throw new Error(`동영상 파일 크기는 최대 100MB까지 업로드할 수 있습니다. (현재: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`)
    }
  }

  // 1. Google Drive upload if configured
  if (adminSettings.value.googleDriveScriptUrl) {
    try {
      const driveUrl = await uploadToGoogleDrive(
        file,
        adminSettings.value.googleDriveScriptUrl,
        adminSettings.value.googleDriveFolderId,
        onProgress
      )
      return { url: driveUrl, type: isVideo ? 'video' : 'image' }
    } catch (err: any) {
      console.error('Google Drive upload failed:', err)
      throw new Error(`Google Drive 업로드 실패: ${err.message || '알 수 없는 오류'}`)
    }
  }

  // 2. Firebase Storage upload if available
  if (isFirebaseStorageReady() || adminSettings.value.firebaseConfig?.apiKey) {
    if (!isFirebaseStorageReady()) {
      initFirebase(adminSettings.value.firebaseConfig)
    }
    if (isFirebaseStorageReady()) {
      const uploadedUrl = await uploadToFirebaseStorage(file, onProgress)
      return { url: uploadedUrl, type: isVideo ? 'video' : 'image' }
    }
  }

  // 3. Client-side fallback if neither connected
  if (isVideo) {
    const objectUrl = URL.createObjectURL(file)
    return { url: objectUrl, type: 'video' }
  } else {
    const compressedDataUrl = await compressImage(file)
    return { url: compressedDataUrl, type: 'image' }
  }
}

export function addLiveSnap(snap: Omit<LiveSnapItem, 'id' | 'createdAt'>): LiveSnapItem {
  const newItem: LiveSnapItem = {
    ...snap,
    id: 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString()
  }
  liveSnaps.value.unshift(newItem)
  try {
    localStorage.setItem(STORAGE_KEYS.LIVESNAPS, JSON.stringify(liveSnaps.value))
  } catch (e) {
    console.warn('LocalStorage save error for live snap:', e)
  }
  if (isFirestoreReady()) {
    saveLiveSnapDoc(newItem).catch(err => console.warn('현장스냅 Firestore 저장 실패:', err))
  }
  return newItem
}

export function deleteLiveSnap(id: string) {
  const index = liveSnaps.value.findIndex(s => s.id === id)
  if (index !== -1) {
    liveSnaps.value.splice(index, 1)
    try {
      localStorage.setItem(STORAGE_KEYS.LIVESNAPS, JSON.stringify(liveSnaps.value))
    } catch (e) {
      console.warn('LocalStorage error deleting snap:', e)
    }
    if (isFirestoreReady()) {
      deleteLiveSnapDoc(id).catch(err => console.warn('현장스냅 Firestore 삭제 실패:', err))
    }
  }
}

export function toggleLiveSnapVisibility(id: string): boolean {
  const snap = liveSnaps.value.find(s => s.id === id)
  if (snap) {
    snap.isHidden = !snap.isHidden
    try {
      localStorage.setItem(STORAGE_KEYS.LIVESNAPS, JSON.stringify(liveSnaps.value))
    } catch (e) {
      console.warn('LocalStorage save error:', e)
    }
    if (isFirestoreReady()) {
      saveLiveSnapDoc(snap).catch(err => console.warn('현장스냅 상태 Firestore 저장 실패:', err))
    }
    return !snap.isHidden
  }
  return false
}

export function isWeddingDayOrLater(weddingDateStr?: string, forceShow?: boolean): boolean {
  if (forceShow) return true
  if (!weddingDateStr) return false
  const targetDate = new Date(weddingDateStr)
  if (isNaN(targetDate.getTime())) return false

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`

  return todayStr >= targetDateStr
}

/**
 * Checks if live snap uploading is currently active:
 * Active starting 2 hours before the wedding ceremony time, or if forceShow is enabled.
 */
export function isLiveSnapUploadActive(weddingDateStr?: string, forceShow?: boolean): boolean {
  if (forceShow) return true
  if (!weddingDateStr) return true
  const weddingTime = new Date(weddingDateStr).getTime()
  if (isNaN(weddingTime)) return true

  const now = Date.now()
  const twoHoursBefore = weddingTime - (2 * 60 * 60 * 1000)
  return now >= twoHoursBefore
}

export { checkFirestoreStatus }
