import { ref, watch } from 'vue'
import type { PhotoItem, WeddingInfo, AccountItem, RsvpItem, GuestbookItem, AdminSettings } from '../types/wedding'
import {
  DEFAULT_PHOTOS,
  DEFAULT_WEDDING_INFO,
  DEFAULT_ACCOUNTS,
  DEFAULT_GUESTBOOK,
  DEFAULT_ADMIN_SETTINGS
} from '../constants/initialData'
import { initFirebase, uploadToFirebaseStorage } from './firebase'

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

// Initialize Firebase if configured
if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig) {
  initFirebase(adminSettings.value.firebaseConfig)
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
  if (val.useFirebase && val.firebaseConfig) {
    initFirebase(val.firebaseConfig)
  }
}, { deep: true })

// Helper functions for Photo operations
export async function uploadImage(file: File): Promise<string> {
  // If Firebase is enabled and configured, upload to Firebase Storage
  if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
    try {
      return await uploadToFirebaseStorage(file)
    } catch (err) {
      console.warn('Firebase upload failed, falling back to local compressed image:', err)
    }
  }

  // Fallback: Compress and read as base64 data URL for local storage demo
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        // Export as WebP or JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve(dataUrl)
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
    const wasCover = photos.value[index].isCover
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

export function setCoverPhotoItem(id: string) {
  photos.value.forEach(p => {
    p.isCover = p.id === id
  })
}

export function updatePhotoItem(id: string, updates: Partial<Omit<PhotoItem, 'id'>>) {
  const photo = photos.value.find(p => p.id === id)
  if (photo) {
    Object.assign(photo, updates)
  }
}

export function reorderPhotos(fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || fromIndex >= photos.value.length || toIndex < 0 || toIndex >= photos.value.length) return
  const item = photos.value.splice(fromIndex, 1)[0]
  photos.value.splice(toIndex, 0, item)
  photos.value.forEach((p, idx) => {
    p.order = idx
  })
}

export function movePhotoItem(index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= photos.value.length) return
  const temp = photos.value[index]
  photos.value[index] = photos.value[targetIndex]
  photos.value[targetIndex] = temp
  photos.value.forEach((p, idx) => {
    p.order = idx
  })
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

