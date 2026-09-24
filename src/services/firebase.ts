import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  type Firestore,
  type Unsubscribe
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  deleteObject,
  type FirebaseStorage
} from 'firebase/storage'
import type { FirebaseConfigSetting, PhotoItem, WeddingInfo, AccountItem, RsvpItem, GuestbookItem, LiveSnapItem } from '../types/wedding'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

// Vite 환경 변수(VITE_FIREBASE_*)에서 설정 가져오기
export function getEnvFirebaseConfig(): FirebaseConfigSetting | null {
  const env = import.meta.env
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.VITE_FIREBASE_APP_ID || ''
    }
  }
  return null
}

export function initFirebase(config?: FirebaseConfigSetting) {
  const targetConfig = (config && config.apiKey && config.projectId)
    ? config
    : getEnvFirebaseConfig()

  if (!targetConfig || !targetConfig.apiKey || !targetConfig.projectId) {
    return { app: null, db: null, storage: null }
  }

  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      app = existingApps[0]
    } else {
      app = initializeApp(targetConfig)
    }
    db = getFirestore(app)
    storage = getStorage(app)
    // 10분의 기본 재시도 대기를 15초로 단축하여 무한 대기 현상 방지
    storage.maxUploadRetryTime = 15000
    storage.maxOperationRetryTime = 15000
    return { app, db, storage }
  } catch (err) {
    console.warn('Firebase initialization error:', err)
    return { app: null, db: null, storage: null }
  }
}

export function isFirebaseStorageReady(): boolean {
  return storage !== null
}

export function isFirestoreReady(): boolean {
  if (!db) {
    initFirebase()
  }
  return db !== null
}

export function getStorageBucketName(): string {
  if (!storage) return ''
  return storage.app.options.storageBucket || ''
}

export async function uploadToFirebaseStorage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!storage) {
    initFirebase()
    if (!storage) {
      throw new Error('Firebase Storage가 초기화되지 않았습니다. 관리자 설정에서 Firebase 정보를 입력해주세요.')
    }
  }

  const timestamp = Date.now()
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storageRef = ref(storage, `photos/${timestamp}_${cleanName}`)

  const metadata = {
    contentType: file.type || (cleanName.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream')
  }

  const uploadPromise = new Promise<string>((resolve, reject) => {
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata)
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            onProgress(Math.round(progress))
          }
        },
        (error) => {
          reject(error)
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)
            resolve(downloadUrl)
          } catch (e) {
            reject(e)
          }
        }
      )
    } else {
      uploadBytes(storageRef, file, metadata)
        .then(snapshot => getDownloadURL(snapshot.ref))
        .then(resolve)
        .catch(reject)
    }
  })

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const projectId = storage?.app.options.projectId || '프로젝트'
      reject(new Error(`Firebase Storage 연결 시간이 초과되었습니다 (20초).\n\nFirebase 콘솔(https://console.firebase.google.com/project/${projectId}/storage)에서 Storage 버킷이 생성되었는지 확인해주세요.`))
    }, 20000)
  })

  try {
    return await Promise.race([uploadPromise, timeoutPromise])
  } catch (err: any) {
    console.error('Firebase Storage upload error detail:', err)
    const projectId = storage?.app.options.projectId || ''
    if (err.code === 'storage/unknown' || err.code === 'storage/bucket-not-found' || err.message?.includes('404')) {
      throw new Error(`Firebase Storage 버킷을 찾을 수 없거나 아직 생성되지 않았습니다.\n\nFirebase 콘솔에서 Storage 메뉴 ➔ [시작하기]를 눌러 버킷을 먼저 생성해주세요.\n👉 https://console.firebase.google.com/project/${projectId}/storage`)
    } else if (err.code === 'storage/unauthorized' || err.message?.includes('unauthorized') || err.message?.includes('permission')) {
      throw new Error(`Firebase Storage 접근 권한(Rules)이 없습니다.\n\nFirebase 콘솔 Storage ➔ [Rules] 탭에서 아래와 같이 규칙을 변경하고 [게시]를 눌러주세요:\n\nallow read, write: if true;\n👉 https://console.firebase.google.com/project/${projectId}/storage/rules`)
    }
    throw err
  }
}

export async function checkStorageBucketStatus(): Promise<{ ok: boolean; message: string; statusCode?: number }> {
  if (!storage) {
    initFirebase()
    if (!storage) {
      return { ok: false, message: 'Firebase Storage가 초기화되지 않았습니다.' }
    }
  }

  const bucket = storage.app.options.storageBucket || ''
  const projectId = storage.app.options.projectId || ''
  if (!bucket) {
    return { ok: false, message: '스토리지 버킷 정보가 비어있습니다.' }
  }

  try {
    const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o?maxResults=1`)
    if (res.status === 404) {
      return {
        ok: false,
        statusCode: 404,
        message: `Storage 버킷(${bucket})이 아직 생성되지 않았습니다.\n\nFirebase 콘솔(https://console.firebase.google.com/project/${projectId}/storage)에서 [시작하기]를 눌러 버킷을 생성해주세요.`
      }
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: true,
        statusCode: res.status,
        message: `버킷(${bucket})은 정상 생성되어 있으나 Rules 권한(Rules 탭에서 allow read, write: if true)을 확인해주세요.`
      }
    }
    return {
      ok: true,
      statusCode: 200,
      message: `Firebase Storage 버킷(${bucket})이 정상적으로 연동되었습니다.`
    }
  } catch (err: any) {
    return {
      ok: false,
      message: `네트워크 확인 중 오류가 발생했습니다: ${err.message}`
    }
  }
}

export async function fetchPhotosFromFirebaseStorage(): Promise<Array<{ url: string; fullPath: string; name: string }>> {
  if (!storage) {
    initFirebase()
    if (!storage) {
      throw new Error('Firebase Storage가 초기화되지 않았습니다.')
    }
  }

  const photosFolderRef = ref(storage, 'photos')
  const result = await listAll(photosFolderRef)

  const items = await Promise.all(
    result.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef)
      return {
        url,
        fullPath: itemRef.fullPath,
        name: itemRef.name
      }
    })
  )

  return items
}

export async function deleteFromFirebaseStorage(urlOrPath: string): Promise<void> {
  if (!storage) return
  try {
    const targetRef = ref(storage, urlOrPath)
    await deleteObject(targetRef)
  } catch (err) {
    console.warn('Firebase Storage 파일 삭제 건너뜀 (외부 URL 또는 삭제 불가):', err)
  }
}

export function getFirebaseInstances() {
  return { app, db, storage }
}

// -------------------------------------------------------------
// Cloud Firestore Data Synchronization API
// -------------------------------------------------------------

export interface WeddingCloudData {
  weddingInfo: WeddingInfo
  photos: PhotoItem[]
  accounts: AccountItem[]
  adminSettings?: any
  updatedAt?: string
}

export async function saveWeddingContentToFirestore(data: {
  weddingInfo: WeddingInfo
  photos: PhotoItem[]
  accounts: AccountItem[]
  adminSettings?: any
}): Promise<void> {
  if (!db) {
    initFirebase()
    if (!db) throw new Error('Firestore가 초기화되지 않았습니다.')
  }
  const contentRef = doc(db, 'wedding_data', 'content')
  await setDoc(contentRef, {
    weddingInfo: JSON.parse(JSON.stringify(data.weddingInfo)),
    photos: JSON.parse(JSON.stringify(data.photos)),
    accounts: JSON.parse(JSON.stringify(data.accounts)),
    ...(data.adminSettings ? { adminSettings: JSON.parse(JSON.stringify(data.adminSettings)) } : {}),
    updatedAt: new Date().toISOString()
  }, { merge: true })
}

export async function fetchWeddingContentFromFirestore(): Promise<WeddingCloudData | null> {
  if (!db) {
    initFirebase()
    if (!db) return null
  }
  const contentRef = doc(db, 'wedding_data', 'content')
  const snap = await getDoc(contentRef)
  if (snap.exists()) {
    return snap.data() as WeddingCloudData
  }
  return null
}

export function subscribeWeddingContent(
  callback: (data: WeddingCloudData) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!db) {
    initFirebase()
    if (!db) return null
  }
  const contentRef = doc(db, 'wedding_data', 'content')
  return onSnapshot(contentRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as WeddingCloudData)
    }
  }, (err) => {
    console.warn('Firestore wedding_data/content subscription error:', err)
    if (onError) onError(err)
  })
}

// Guestbook Firestore Operations
export function subscribeGuestbook(
  callback: (items: GuestbookItem[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!db) {
    initFirebase()
    if (!db) return null
  }
  const gbCol = collection(db, 'guestbook_entries')
  const q = query(gbCol, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (querySnap) => {
    const items: GuestbookItem[] = []
    querySnap.forEach((docSnap) => {
      items.push(docSnap.data() as GuestbookItem)
    })
    callback(items)
  }, (err) => {
    console.warn('Firestore guestbook subscription error:', err)
    if (onError) onError(err)
  })
}

export async function saveGuestbookDoc(item: GuestbookItem): Promise<void> {
  if (!db) {
    initFirebase()
    if (!db) return
  }
  const cleanItem = JSON.parse(JSON.stringify(item))
  await setDoc(doc(db, 'guestbook_entries', item.id), cleanItem)
}

export async function deleteGuestbookDoc(id: string): Promise<void> {
  if (!db) {
    initFirebase()
    if (!db) return
  }
  await deleteDoc(doc(db, 'guestbook_entries', id))
}

// RSVP Firestore Operations
export function subscribeRsvp(
  callback: (items: RsvpItem[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!db) {
    initFirebase()
    if (!db) return null
  }
  const rsvpCol = collection(db, 'rsvp_entries')
  const q = query(rsvpCol, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (querySnap) => {
    const items: RsvpItem[] = []
    querySnap.forEach((docSnap) => {
      items.push(docSnap.data() as RsvpItem)
    })
    callback(items)
  }, (err) => {
    console.warn('Firestore RSVP subscription error:', err)
    if (onError) onError(err)
  })
}

export async function saveRsvpDoc(item: RsvpItem): Promise<void> {
  if (!db) {
    initFirebase()
    if (!db) return
  }
  const cleanItem = JSON.parse(JSON.stringify(item))
  await setDoc(doc(db, 'rsvp_entries', item.id), cleanItem)
}

export async function deleteRsvpDoc(id: string): Promise<void> {
  if (!db) {
    initFirebase()
    if (!db) return
  }
  await deleteDoc(doc(db, 'rsvp_entries', id))
}

// LiveSnap Firestore Operations
export function subscribeLiveSnaps(
  callback: (items: LiveSnapItem[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!db) {
    initFirebase()
    if (!db) return null
  }
  const snapCol = collection(db, 'livesnap_entries')
  const q = query(snapCol, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (querySnap) => {
    const items: LiveSnapItem[] = []
    querySnap.forEach((docSnap) => {
      items.push(docSnap.data() as LiveSnapItem)
    })
    callback(items)
  }, (err) => {
    console.warn('Firestore LiveSnap subscription error:', err)
    if (onError) onError(err)
  })
}

export async function saveLiveSnapDoc(item: LiveSnapItem): Promise<void> {
  if (!db) {
    initFirebase()
    if (!db) return
  }
  const cleanItem = JSON.parse(JSON.stringify(item))
  await setDoc(doc(db, 'livesnap_entries', item.id), cleanItem)
}

export async function deleteLiveSnapDoc(id: string): Promise<void> {
  if (!db) {
    initFirebase()
    if (!db) return
  }
  await deleteDoc(doc(db, 'livesnap_entries', id))
}

export async function checkFirestoreStatus(): Promise<{ ok: boolean; message: string }> {
  if (!db) {
    initFirebase()
    if (!db) {
      return { ok: false, message: 'Firebase Firestore가 초기화되지 않았습니다.' }
    }
  }
  try {
    const testRef = doc(db, 'wedding_data', 'content')
    await getDoc(testRef)
    return { ok: true, message: 'Cloud Firestore가 정상적으로 연동되어 있습니다.' }
  } catch (err: any) {
    if (err.code === 'permission-denied' || err.message?.includes('permission')) {
      return {
        ok: false,
        message: 'Firestore 접근 권한이 없습니다. Firebase 콘솔의 Firestore ➔ [Rules] 탭에서 allow read, write: if true; 로 설정 후 [게시]해주세요.'
      }
    }
    return { ok: false, message: `Firestore 연결 오류: ${err.message || err}` }
  }
}

