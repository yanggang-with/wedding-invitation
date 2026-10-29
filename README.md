# 💍 Wedding Invitation (모바일 청첩장 & 관리자 CMS)

신랑(경주원) ♥ 신부(양예진)의 결혼을 기념하여 개발된 **고품질 반응형 모바일 청첩장 웹 애플리케이션**입니다.  
Vue 3, TypeScript, Vite 기반의 SPA로 제작되었으며, GitHub Pages 정적 호스팅 환경에서 별도의 서버 없이도 **Firebase(Storage & Firestore)**와 **카카오 비즈니스 알림톡/웹훅 파이프라인**을 통해 실시간 양방향 데이터 동기화 및 푸시 알림을 완벽하게 지원합니다.

---

## 🌟 주요 핵심 기능 요약

### 1. 💌 하객용 모바일 청첩장 기능
* **우아한 캘리그라피 인트로 애니메이션 (`WeddingDayCalligraphy.vue`)**:
  - 접속 시 'Our Wedding Day' 3단계 필기체 손글씨 드로잉 효과가 펼쳐진 후, 부드럽게 상단으로 슬라이드업 상승하며 메인 커버가 페이드인 등장.
* **풀스크린 커버 & IntersectionObserver 부드러운 스크롤 등장 (`CoverSection.vue` 등)**:
  - 각 섹션이 화면의 1/3(약 33%) 이상 진입 시 서서히 페이드인 등장(Scroll Reveal)하여 편안하고 자연스러운 시각적 경험 제공.
* **인스타그램 스토리 스타일 갤러리 (`GallerySection.vue`)**:
  - 3x3 썸네일 그리드와 롱프레스 픽(Peek) 미리보기(배경 블러 오버레이).
  - 전체화면 인스타그램 스토리 뷰어: 상단 세그먼트 프로그레스 바(4.5초 슬라이드), 화면 길게 누르면 일시정지, 좌/우 탭 이동 지원.
  - **스토리 좋아요(하트) 기능**: 플로팅 하트 버튼 및 바로 아래 누적 카운트 표시, 1인 1회 토글(빨간 하트 채움), 탭 이동 방지 이벤트 캡처 차단.
* **하객 참여형 '현장 스냅(Live Snap)' (`LiveSnapSection.vue`)**:
  - 결혼식 당일 하객들이 직접 촬영한 사진과 동영상(MP4 맛보기 및 사운드 재생)을 실시간으로 공유하는 무한 롤링 메이슨리 스트림 피드.
  - 14종 웨딩 일러스트 풀 분리 배분(Pool 1: 7종, Pool 2: 7종)으로 중복 노출 완벽 방지.
* **축하 방명록 (`GuestbookSection.vue`)**:
  - 비속어 및 욕설 사전 검출 필터링(`filter.ts`)으로 깨끗한 축하 환경 유지.
  - 비밀번호 양방향 암호화 보관(`XOR + Base64`).
  - **본인 작성 글 전용 삭제 제어**: 로컬스토리지(`wedding_my_guestbook_ids`) 연동으로 본인이 작성한 글에만 삭제(휴지통) 버튼 노출.
* **참석 여부(RSVP) 전달 (`RsvpSection.vue`)**:
  - 신랑/신부측 구분, 참석/불참 여부, 동행 인원수, 식사 여부를 간편하게 전달.
* **축의금 계좌 및 카카오페이 송금 (`AccountSection.vue`)**:
  - 신랑측/신부측 혼주 계좌 분리 아코디언, 원클릭 계좌번호 복사 및 카카오페이 송금 딥링크 지원.
* **오시는 길 및 내비게이션 길찾기 (`LocationSection.vue`)**:
  - 네이버 웹 다이내믹 맵(Naver Map OpenAPI) 연동 및 상록아트홀 위치 좌표 핀 마커.
  - 네이버 지도, 카카오맵, 티맵 3사 길찾기 딥링크 연동 (PC 접속 시 티맵 자동 비활성화).
* **모바일 뒤로가기(History & Popstate) 완벽 제어**:
  - 스토리 뷰어, 현장스냅 라이트박스, 모달 팝업 상태에서 뒤로가기 시 사이트 이탈 없이 **오직 팝업 레이어만 닫히도록** 연동 및 스크롤 위치(`savedScrollY`) 100% 복원.

---

### 2. 🛠️ 관리자 전용 CMS 대시보드 (`/admin`)
* **보안 PIN 번호 & Google OAuth 계정 인증 로그인**:
  - 관리자 전용 PIN 인증 및 Google 로그인 기반 허용 이메일 제어.
* **사진 관리 탭 (`PhotoManager.vue`)**:
  - Firebase Storage 실시간 사진 업로드 및 순서 드래그 앤 드롭(Drag & Drop) 변경.
  - **1:1 얼굴 초점 맞춤 인터랙티브 크롭 모달**: 십자선 타깃 레티클로 얼굴 중심점(`objectPosition`) 지정.
  - 모바일 터치 환경 최적화(좌상단 드래그 핸들 전용 이동, 탭 시 2열 액션 버튼 오버레이).
  - **각 사진별 하객 좋아요 개수 뱃지 (`.photo-likes-pill`)**: 1개 이상 달성 시 하이라이트 표시.
* **실시간 카카오톡 알림 전송 설정 (`AdminSettings.vue`)**:
  - 하객이 **방명록 등록**, **참석여부(RSVP) 전달**, **본식촬영(현장스냅) 업로드** 시 등록된 신랑/신부 휴대폰으로 실시간 카톡 알림 발송.
  - **원클릭 카카오 1회 계정 연동**: 버튼 한 번으로 2달 수명의 `Refresh Token`을 저장하여, 6시간마다 토큰을 수동 복사할 필요 없이 백그라운드에서 **새 Access Token을 영구 자동 갱신(Auto Refresh)**.
  - 카카오 콘솔 등록용 현재 브라우저 주소 원클릭 복사 배너 제공 (`Javascript env validation failed` 방지).
  - [알림 테스트 전송해보기] 원클릭 검증 기능 및 수신 휴대폰 번호 실시간 자동 하이픈 포매팅(`010-XXXX-XXXX`).
* **참석 명단(RSVP) & 방명록 관리**:
  - 참석자 명단 실시간 조회 및 엑셀(CSV) 다운로드.
  - 부적절한 방명록 글 즉각 숨김/삭제 제어.
* **섹션 노출(ON/OFF) 토글 및 지그재그 교차 배경색 연동**:
  - RSVP, 현장스냅 등 개별 섹션의 노출 여부를 실시간 제어하며, 섹션이 숨겨져도 배경색(아이보리 vs 화이트)이 자연스럽게 교차 유지.

---

## 📅 단계별 상세 개발 히스토리

### 1단계: 프로젝트 초기 구축 및 정적 배포 안정화
> **주요 커밋**: `0649d2e` ~ `344b09e`
- Vue 3 (Composition API / `<script setup>`), TypeScript, Vite 환경 구축.
- GitHub Pages 정적 배포 파이프라인 정립 (`scripts/sync-assets.cjs`를 통한 `dist/` ➔ `assets/` 번들 자동 동기화).
- Pretendard, Gowun Batang, Noto Serif KR 웹 폰트 및 샴페인 골드 테마 시스템 확립.

### 2단계: 관리자(Admin) CMS 기능 도입 및 섹션별 인터랙션 기초
> **주요 커밋**: `f74c4b4` ~ `7dcd85e`
- `/admin` 전용 라우트 및 PIN 번호 보안 인증 체계 구축.
- 사진 순서 드래그 앤 드롭, 노출/숨김 토글, 축의금 계좌 복사 및 카카오페이 송금 연동.
- 참석 여부(RSVP) 폼, 방명록 작성/삭제, 오시는 길 네이버 지도 OpenAPI 연동.

### 3단계: 스크롤 제스처 튜닝 및 인스타그램 스토리 갤러리 전면 개편
> **주요 커밋**: `be40808` ~ `fe68ca1`
- 모바일에서 튕김을 유발하던 `scroll-snap`을 제거하고 IntersectionObserver 기반의 **Scroll Reveal (섹션 1/3 진입 시 서서히 페이드인)** 적용.
- 전체화면 인스타그램 스토리 뷰어 구축 (상단 세그먼트 타이머, 4.5초 슬라이드, 롱프레스 일시정지, 좌우 탭 네비게이션).

### 4단계: Firebase 클라우드 실시간 동기화 (Storage & Firestore)
> **주요 커밋**: `08f3201` ~ `ee2d578`
- Firebase Storage 사진 업로드 타임아웃(15초) 및 에러 방어 로직 적용.
- Cloud Firestore 기반 실시간 양방향 데이터 동기화(`onSnapshot`)로 기기 간 즉시 반영.

### 5단계: 하객 참여형 '현장 스냅(Live Snap)' 기능 추가 및 고도화
> **주요 커밋**: `f64b74d` ~ `6ffe9d7`
- 당일 하객 사진/동영상 실시간 피드 및 무한 롤링 메이슨리 스크롤 애니메이션.
- 터치 시 5초 자동 일시정지, 비디오 무음 맛보기 재생 및 라이트박스 사운드 재생.
- 14종 웨딩 일러스트 홀/짝 풀 분리 배분으로 중복 노출 차단.

### 6단계: 모바일 뒤로가기(History & Popstate) 제어 및 인터랙션 안정화
> **주요 커밋**: `d7b507f` ~ `8930784`
- 스토리 뷰어, 현장스냅 모달에서 모바일 브라우저 뒤로가기 시 페이지 이탈 없이 **모달만 닫히도록** `history.pushState` 및 `popstate` 연동.
- 모달 종료 시 직전 스크롤 위치(`savedScrollY`) 100% 무오차 복원.
- 네이버 지도 OpenAPI 마이그레이션 및 길찾기 3사 최신 공식 로고/컬러 적용.
- 섹션 숨김 시 배경색 교차를 보장하는 `isEvenVisibleSection` 시스템 구축.

### 7단계: 정밀 기능 고도화 (비속어 필터, 1:1 얼굴 초점 크롭, 다이내믹 파비콘)
> **주요 커밋**: `086eec6` ~ `bc3d1d4`
- 방명록 비속어 필터링 엔진(`filter.ts`) 도입 및 카드 색상 자동 반전 연동.
- 관리자 사진 관리 1:1 얼굴 초점 맞춤 레티클 모달 구현 (`objectPosition`).
- 연락처 모달 화면 잘림 방지 (`<Teleport to="body">`).
- 라우트별 파비콘 분기: 청첩장(웨딩링+보석 `favicon.svg`) vs 관리자(웨딩링+설정기어 `favicon-admin.svg`).

### 8단계: 감성 인터랙션 & 모바일 제스처 고도화
> **주요 커밋**: `df5aca0` ~ `9dd76f7`
- SVG 손글씨 캘리그라피 인트로 완료 이벤트 수신 후 슬라이드업 상승 연출 연동 (`CoverSection.vue`).
- 방명록 비밀번호 암호화 보관(`XOR + Base64`).
- 모바일 썸네일 터치 스크롤 허용(`touch-action: pan-y`) 및 탭 시 2열 액션 버튼 오버레이 정렬.
- Google API Key 도메인 잠금(HTTP Referrer) 가이드 제공.

### 9단계: 하객 소통 & 카카오 실시간 알림 파이프라인 (최신)
> **주요 커밋**: `974fee8` ~ 최신
- **웨딩사진 스토리 좋아요(하트) & 누적 카운트 표시 (`GallerySection.vue`)**:
  - 플로팅 하트 버튼 바로 아래에 실시간 좋아요 개수 표기, 1인 1회 토글, 탭 넘김 방지 이벤트 캡처 차단.
- **방명록 본인 작성 글 전용 삭제 버튼 제어 (`GuestbookSection.vue`)**:
  - `wedding_my_guestbook_ids` 로컬스토리지 연동으로 본인이 쓴 글에만 삭제(휴지통) 버튼 표시.
- **카카오톡 비즈니스 채널 실시간 알림 시스템 (`kakaoNotify.ts`)**:
  - 방명록/RSVP/현장스냅 등록 시 신랑·신부 폰으로 즉시 카톡 푸시 알림 전송.
  - 웹훅(Webhook URL), 솔라피/알림톡 API, 카카오 직접 발송 파이프라인 구축.
- **카카오 OAuth2 원클릭 1회 계정 연동 및 무한 자동 갱신 (`kakaoAuth.ts`, `AdminSettings.vue`)**:
  - [카카오 계정 1회 연동하기] 버튼으로 2달 수명의 `Refresh Token`을 발급받아, 6시간 수명의 Access Token을 백그라운드에서 영구 자동 갱신(Auto Refresh).
  - 카카오 도메인 검증 오류(`Javascript env validation failed`) 대비 현재 접속 주소 원클릭 복사 배너 제공.
  - 수신 휴대폰 번호 실시간 자동 하이픈 포매팅(`handlePhoneInput`, `010-XXXX-XXXX`).
- **관리자 사진관리 탭 각 이미지별 좋아요 개수 뱃지 (`PhotoManager.vue`)**:
  - 갤러리 썸네일 우측 하단에 하트 아이콘과 함께 누적 좋아요 수 뱃지(`.photo-likes-pill`) 탑재 (1개 이상 시 하이라이트).

---

## 📂 프로젝트 파일 아키텍처

```
wedding-invitation/
├── index.html                   # HTML 진입점 (카카오 SDK, 웹폰트, Open Graph 메타태그)
├── package.json                 # 프로젝트 의존성 및 빌드 스크립트
├── vite.config.ts               # Vite 번들러 빌드 설정
├── scripts/
│   └── sync-assets.cjs          # dist/ 산출물을 root assets/ 로 자동 복사하는 동기화 스크립트
├── src/
│   ├── main.ts                  # Vue 애플리케이션 초기화 및 전역 라우터/파비콘 설정
│   ├── App.vue                  # 루트 Vue 컴포넌트
│   ├── style.css                # 전역 스타일 및 디자인 토큰 변수
│   ├── types/
│   │   └── wedding.ts           # 청첩장 및 관리자 전역 TypeScript 인터페이스 정의
│   ├── constants/
│   │   └── initialData.ts       # 예식 정보, 사진, 계좌, 샘플 방명록 등 초기 기본 데이터
│   ├── utils/
│   │   └── filter.ts            # 방명록 비속어 및 욕설 필터링 엔진
│   ├── services/
│   │   ├── storage.ts           # LocalStorage + Firestore 양방향 실시간 동기화 코어 엔진
│   │   ├── firebase.ts          # Firebase App, Firestore, Storage 초기화 및 상태 관리
│   │   ├── kakaoNotify.ts       # 방명록/RSVP/현장스냅 카카오톡 알림 전송 헬퍼
│   │   └── kakaoAuth.ts         # 카카오 SDK 1회 로그인, Refresh Token 발급 및 자동 갱신 모듈
│   ├── views/
│   │   ├── InvitationView.vue   # 하객용 모바일 청첩장 메인 뷰 (섹션 교차 배경 및 네비게이션)
│   │   └── AdminView.vue        # 관리자 로그인(PIN 인증) 및 통합 CMS 탭 관리 뷰
│   └── components/
│       ├── invitation/          # 하객용 청첩장 개별 섹션 컴포넌트
│       │   ├── CoverSection.vue             # 메인 풀스크린 커버 섹션
│       │   ├── WeddingDayCalligraphy.vue    # SVG 손글씨 캘리그라피 인트로 드로잉
│       │   ├── GreetingSection.vue          # 모시는 글 및 연락처 모달
│       │   ├── CalendarSection.vue          # 예식 디데이 캘린더 & 카운트다운
│       │   ├── GallerySection.vue           # 3x3 그리드, 스토리 뷰어, 좋아요 하트/카운트
│       │   ├── LocationSection.vue          # 네이버 지도 OpenAPI 및 길찾기 3사 딥링크
│       │   ├── LiveSnapSection.vue          # 실시간 하객 현장 스냅 피드 & 비디오 재생
│       │   ├── GuestbookSection.vue         # 축하 방명록 (비속어 차단, 본인 글 삭제)
│       │   ├── RsvpSection.vue              # 참석 여부(RSVP) 전달 폼
│       │   ├── AccountSection.vue           # 축의금 계좌 복사 및 카카오페이 송금
│       │   └── ShareFooter.vue              # 카카오톡/링크 공유 및 푸터
│       └── admin/               # 관리자 전용 CMS 컴포넌트
│           ├── PhotoManager.vue             # 사진 순서 드래그, 1:1 얼굴 초점 크롭, 좋아요 뱃지
│           ├── InfoEditor.vue               # 예식 일시/장소, 인사말, 계좌번호 편집
│           ├── RsvpViewer.vue               # 참석자 명단 실시간 조회 및 엑셀(CSV) 다운로드
│           ├── GuestbookModerator.vue       # 방명록 숨김 및 관리자 삭제 제어
│           ├── LiveSnapManager.vue          # 하객 업로드 현장스냅 승인/숨김/삭제 관리
│           └── AdminSettings.vue            # 카카오 실시간 알림 연동, 도메인 복사, 클라우드 동기화
├── AGENTS.md                    # Antigravity AI 협업 가이드라인 및 인터랙션/커밋 규칙
└── PROMPTS_LOG.md               # 1차부터 39차까지의 모든 사용자 요청 및 작업 프롬프트 로그
```

---

## 🚀 실행 및 빌드 방법

### 개발 서버 실행
```bash
npm run dev
```

### 프로덕션 빌드 (GitHub Pages 동기화 포함)
```bash
npm run build
```
> `npm run build`를 실행하면 `vue-tsc` 타입 검증 ➔ `vite build` 번들링 ➔ `scripts/sync-assets.cjs`가 순차적으로 실행되어 `assets/app.js`, `assets/style.css`, `index.html`이 루트에 자동 동기화됩니다.
