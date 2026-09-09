export interface PhotoItem {
  id: string
  url: string
  caption?: string
  isCover?: boolean
  order: number
  createdAt: string
}

export interface PersonInfo {
  name: string
  phone: string
  relationRole?: string // e.g. '신랑', '신부', '장남', '장녀'
  fatherName?: string
  motherName?: string
  isFatherDeceased?: boolean
  isMotherDeceased?: boolean
}

export interface VenueInfo {
  name: string
  hall: string
  address: string
  addressDetail: string
  tel: string
  mapLat: number
  mapLng: number
  parkingInfo: string
  subwayInfo: string
  busInfo: string
  kakaoMapPlaceUrl?: string
}

export interface GreetingInfo {
  title: string
  content: string
  subQuote?: string
}

export interface WeddingInfo {
  groom: PersonInfo
  bride: PersonInfo
  date: string // ISO string '2026-10-24T12:30:00'
  venue: VenueInfo
  greeting: GreetingInfo
  bgmUrl: string
  bgmTitle: string
  bgmAutoPlay: boolean
  kakaoApiKey?: string
}

export interface AccountItem {
  id: string
  side: 'groom' | 'groomParents' | 'bride' | 'brideParents'
  title: string
  bankName: string
  accountNumber: string
  accountHolder: string
  kakaoPayUrl?: string
}

export interface RsvpItem {
  id: string
  side: 'groom' | 'bride'
  guestName: string
  isAttending: boolean
  mealNeeded: boolean
  guestCount: number
  phone: string
  message?: string
  createdAt: string
}

export interface GuestbookItem {
  id: string
  author: string
  message: string
  password?: string
  isHidden?: boolean
  createdAt: string
}

export interface FirebaseConfigSetting {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export interface AdminSettings {
  adminPin: string
  firebaseConfig?: FirebaseConfigSetting
  useFirebase: boolean
}
