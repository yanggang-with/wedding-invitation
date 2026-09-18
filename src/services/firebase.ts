import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
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
import type { FirebaseConfigSetting } from '../types/wedding'

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

  const uploadPromise = new Promise<string>((resolve, reject) => {
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file)
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
      uploadBytes(storageRef, file)
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
