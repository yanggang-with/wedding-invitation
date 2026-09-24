import type { WeddingInfo, PhotoItem, AccountItem, GuestbookItem, AdminSettings, LiveSnapItem } from '../types/wedding'

export const DEFAULT_PHOTOS: PhotoItem[] = [
  {
    id: 'photo-1',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    caption: '따스한 햇살 아래, 우리의 첫 시작',
    isCover: true,
    order: 0,
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'photo-2',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    caption: '서로를 바라보며 미소 짓던 순간',
    isCover: false,
    order: 1,
    createdAt: '2026-09-01T00:00:01.000Z'
  },
  {
    id: 'photo-3',
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
    caption: '설레는 발걸음으로 함께 걷는 길',
    isCover: false,
    order: 2,
    createdAt: '2026-09-01T00:00:02.000Z'
  },
  {
    id: 'photo-4',
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80',
    caption: '영원한 약속을 손에 담아',
    isCover: false,
    order: 3,
    createdAt: '2026-09-01T00:00:03.000Z'
  },
  {
    id: 'photo-5',
    url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1200&q=80',
    caption: '꽃향기 가득했던 우리의 오후',
    isCover: false,
    order: 4,
    createdAt: '2026-09-01T00:00:04.000Z'
  },
  {
    id: 'photo-6',
    url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=80',
    caption: '마주 잡은 손, 놓지 않겠습니다',
    isCover: false,
    order: 5,
    createdAt: '2026-09-01T00:00:05.000Z'
  },
  {
    id: 'photo-7',
    url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80',
    caption: '순백의 설렘과 아름다운 동행',
    isCover: false,
    order: 6,
    createdAt: '2026-09-01T00:00:06.000Z'
  },
  {
    id: 'photo-8',
    url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
    caption: '함께 웃고 함께 걷는 우리',
    isCover: false,
    order: 7,
    createdAt: '2026-09-01T00:00:07.000Z'
  },
  {
    id: 'photo-9',
    url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80',
    caption: '언제나 곁에서 든든한 나무처럼',
    isCover: false,
    order: 8,
    createdAt: '2026-09-01T00:00:08.000Z'
  }
]

export const DEFAULT_WEDDING_INFO: WeddingInfo = {
  groom: {
    name: '경주원',
    phone: '010-6398-5170',
    relationRole: '장남',
    fatherName: '경대수',
    motherName: '차은숙',
    isFatherDeceased: false,
    isMotherDeceased: false
  },
  bride: {
    name: '양예진',
    phone: '010-5093-0643',
    relationRole: '장녀',
    fatherName: '양승훈',
    motherName: '조혜연',
    isFatherDeceased: false,
    isMotherDeceased: false
  },
  date: '2026-12-12T18:00:00',
  dateFormat: 'YYYY년 M월 D일 dddd A h시',
  venue: {
    name: '서울상록회관',
    hall: '상록아트홀',
    address: '서울특별시 강남구 언주로 508',
    addressDetail: '선릉역 5번 출구 도보 5분',
    tel: '02-560-2222',
    mapLat: 37.5041,
    mapLng: 127.0428,
    parkingInfo: '건물 내 지하 2~4층 무료 주차 (2시간 무료 지원)',
    subwayInfo: '2호선 / 수인분당선 선릉역 5번 출구에서 도보 5분 거리 (셔틀버스 운행)',
    busInfo: '간선 141, 242, 360 / 지선 3422, 4434'
  },
  greeting: {
    title: '소중한 분들을 초대합니다',
    content: `무채색 같던 일상 속에서 매일을 기대와 따뜻함으로 채워준 사람을 만났습니다.\n서로를 길이 배려하고 이해하며 매일 아침과 저녁을 함께 맞이하는 소소한 행복을 평생 지켜가겠습니다.\n저희 두 사람의 새로운 시작을 따뜻한 마음으로 축복해 주시면 감사하겠습니다`,
    subQuote: '서로의 계절이 되어 영원히 피어나겠습니다'
  },
  bgmUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-piano-112199.mp3',
  bgmTitle: 'Romantic Piano Wedding Melody',
  bgmAutoPlay: false,
  kakaoApiKey: '',
  naverMapClientId: ''
}


export const DEFAULT_ACCOUNTS: AccountItem[] = [
  {
    id: 'acc-groom',
    side: 'groom',
    title: '신랑 경주원',
    bankName: '우리은행',
    accountNumber: '1002-080-051790',
    accountHolder: '경주원',
    kakaoPayUrl: 'https://qr.kakaopay.com/Ej1234567'
  },
  {
    id: 'acc-groom-father',
    side: 'groomParents',
    title: '신랑 혼주 (부) 경대수',
    bankName: 'ㅇㅇ은행',
    accountNumber: '110-123-456789',
    accountHolder: '경대수'
  },
  {
    id: 'acc-bride',
    side: 'bride',
    title: '신부 양예진',
    bankName: '우리은행',
    accountNumber: '1002-654-600692',
    accountHolder: '양예진',
    kakaoPayUrl: 'https://qr.kakaopay.com/Ej7654321'
  },
  {
    id: 'acc-bride-mother',
    side: 'brideParents',
    title: '신부 혼주 (모) 조혜연',
    bankName: '우리은행',
    accountNumber: '1002-123-456789',
    accountHolder: '조혜연'
  }
]

export const DEFAULT_GUESTBOOK: GuestbookItem[] = [
  {
    id: 'gb-1',
    author: '친구',
    message: '주원아, 예진씨 결혼 진심으로 축하해! 늘 지금처럼 예쁘게 행복하게 살아라~ 🎉',
    password: '12',
    createdAt: '2026-09-02T14:20:00.000Z'
  },
  {
    id: 'gb-2',
    author: '정혜진',
    message: '세상에서 제일 예쁜 신부 서연이! 사진 너무 예쁘다. 식장에서 보자 💍💐',
    password: '12',
    createdAt: '2026-09-03T18:05:00.000Z'
  },
  {
    id: 'gb-3',
    author: '박준영',
    message: '두 분의 새로운 앞날을 진심으로 축복합니다. 언제나 사랑 가득하시길 바라요!',
    password: '12',
    createdAt: '2026-09-05T11:40:00.000Z'
  }
]

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  adminPin: 'yyjkjw0809',
  useFirebase: false,
  forceShowLiveSnap: false,
  showLiveSnapSection: true,
  googleDriveScriptUrl: '',
  googleDriveFolderId: '',
  allowedGoogleEmails: [],
  naverMapClientId: ''
}


export const DEFAULT_LIVE_SNAPS: LiveSnapItem[] = [
  {
    id: 'snap-1',
    type: 'image',
    // Vertical portrait (3:4 ratio)
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&h=800&q=80',
    senderName: '친구 민우',
    message: '오늘 두 사람 너무 멋지고 아름다워요! 행복하게 잘 살아~ 🎉',
    createdAt: new Date().toISOString()
  },
  {
    id: 'snap-2',
    type: 'video',
    // Horizontal landscape (16:9 ratio)
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    senderName: '직장 동료',
    message: '결혼식장 생화 장식과 현장 분위기 영상으로 담아봤어요. 축하드립니다! 🎥',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'snap-3',
    type: 'image',
    // Tall vertical portrait (9:15 ratio)
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&h=950&q=80',
    senderName: '사촌 지은',
    message: '신부 입장할 때 눈물 날 뻔했어요 ㅠㅠ 너무 예뻐요!',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'snap-4',
    type: 'image',
    // Square (1:1 ratio)
    url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=600&h=600&q=80',
    senderName: '대학 동기',
    message: '선남선녀의 완벽한 결혼식! 꽃길만 걷자 ✨',
    createdAt: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 'snap-5',
    type: 'image',
    // Wide horizontal landscape (16:9 ratio)
    url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&h=450&q=80',
    senderName: '친구 소영',
    message: '반지 교환할 때 너무 감동적이었어요 💍',
    createdAt: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: 'snap-6',
    type: 'image',
    // Medium vertical portrait (4:5 ratio)
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=600&h=750&q=80',
    senderName: '친척 형',
    message: '새로운 인생의 출발을 진심으로 응원합니다!',
    createdAt: new Date(Date.now() - 18000000).toISOString()
  },
  {
    id: 'snap-7',
    type: 'image',
    // Horizontal landscape (4:3 ratio)
    url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&h=600&q=80',
    senderName: '고등학교 동창',
    message: '식장이 너무 화사하고 아름답네요. 축하해!',
    createdAt: new Date(Date.now() - 21600000).toISOString()
  },
  {
    id: 'snap-8',
    type: 'image',
    // Tall vertical portrait (2:3 ratio)
    url: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=600&h=900&q=80',
    senderName: '사촌 동생',
    message: '세상에서 가장 빛나는 신랑 신부님 축복합니다~',
    createdAt: new Date(Date.now() - 25200000).toISOString()
  }
]

// ==============================================================
// 웨딩 테마 전용 감성 일러스트 및 샘플 비디오 (현장스냅 ON 시 기본 예시용)
// ==============================================================
export const WEDDING_ILLUSTRATION_SNAPS: LiveSnapItem[] = [
  {
    id: 'illust-snap-1',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=80',
    senderName: '웨딩 아뜰리에',
    message: '두 사람의 가장 눈부신 순간을 담은 일러스트 🎨',
    aspectRatio: '4/5',
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'illust-snap-2',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    senderName: '현장 영상 스케치',
    message: '축복으로 가득했던 오늘의 생생한 현장 영상입니다 🎬',
    aspectRatio: '16/9',
    createdAt: '2026-09-01T00:00:01.000Z'
  },
  {
    id: 'illust-snap-3',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=700&q=80',
    senderName: '플라워 & 부케',
    message: '설렘 가득한 버진로드를 수놓은 웨딩 플라워 💐',
    aspectRatio: '1/1',
    createdAt: '2026-09-01T00:00:02.000Z'
  },
  {
    id: 'illust-snap-4',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80',
    senderName: '영원의 약속',
    message: '마주 잡은 두 손에 깃든 영원한 사랑의 서약 💍',
    aspectRatio: '3/2',
    createdAt: '2026-09-01T00:00:03.000Z'
  },
  {
    id: 'illust-snap-5',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=700&q=80',
    senderName: '샴페인 셀러브레이션',
    message: '새로운 시작을 축복하는 달콤한 축배 🥂',
    aspectRatio: '4/5',
    createdAt: '2026-09-01T00:00:04.000Z'
  },
  {
    id: 'illust-snap-6',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=700&q=80',
    senderName: '웨딩 세레머니',
    message: '함께 걸어갈 눈부신 꽃길의 첫걸음 ✨',
    aspectRatio: '4/5',
    createdAt: '2026-09-01T00:00:05.000Z'
  },
  {
    id: 'illust-snap-7',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=700&q=80',
    senderName: '클래식 웨딩카',
    message: '영원한 행복을 향해 출발하는 웨딩 로드 🚗🌸',
    aspectRatio: '16/9',
    createdAt: '2026-09-01T00:00:06.000Z'
  },
  {
    id: 'illust-snap-8',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=700&q=80',
    senderName: '순백의 베일',
    message: '수줍은 미소와 함께 피어난 순백의 설렘 👰',
    aspectRatio: '4/5',
    createdAt: '2026-09-01T00:00:07.000Z'
  },
  {
    id: 'illust-snap-9',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=700&q=80',
    senderName: '3단 플라워 케이크',
    message: '가장 달콤한 오늘, 함께 나누는 축복의 케이크 🎂',
    aspectRatio: '1/1',
    createdAt: '2026-09-01T00:00:08.000Z'
  },
  {
    id: 'illust-snap-10',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=700&q=80',
    senderName: '캔들라이트 디너',
    message: '은은한 촛불 아래 따뜻하게 피어오른 이야기 🕯️',
    aspectRatio: '3/2',
    createdAt: '2026-09-01T00:00:09.000Z'
  },
  {
    id: 'illust-snap-11',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=700&q=80',
    senderName: '사랑의 서약서',
    message: '마음 깊이 새겨둔 평생의 약속과 진심 💌',
    aspectRatio: '4/5',
    createdAt: '2026-09-01T00:00:10.000Z'
  },
  {
    id: 'illust-snap-12',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    senderName: '세레머니 하이라이트',
    message: '모두의 환호와 박수가 쏟아지던 감동의 순간 🎥',
    aspectRatio: '16/9',
    createdAt: '2026-09-01T00:00:11.000Z'
  },
  {
    id: 'illust-snap-13',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=700&q=80',
    senderName: '컨페티 세레머니',
    message: '하늘 가득 흩날리는 축복의 꽃비 🎉',
    aspectRatio: '4/5',
    createdAt: '2026-09-01T00:00:12.000Z'
  },
  {
    id: 'illust-snap-14',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=700&q=80',
    senderName: '황홀한 샹들리에',
    message: '별빛처럼 쏟아지는 아름다운 예식의 밤 ✨',
    aspectRatio: '1/1',
    createdAt: '2026-09-01T00:00:13.000Z'
  }
]


