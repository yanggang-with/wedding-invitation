<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  adminSettings,
  weddingInfo,
  resetToSampleData,
  isCloudSyncing,
  lastCloudSyncTime,
  isCloudConnected,
  forceUploadToCloud,
  forceDownloadFromCloud,
  initCloudSubscriptions
} from '../../services/storage'
import { initFirebase, checkFirestoreStatus } from '../../services/firebase'
import { sendKakaoNotification } from '../../services/kakaoNotify'
import { loginKakaoAccount, disconnectKakaoAccount, refreshKakaoAccessToken } from '../../services/kakaoAuth'
import {
  KeyRound,
  Cloud,
  RotateCcw,
  Check,
  Save,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Plus,
  Trash2,
  Mail,
  MapPin,
  ExternalLink,
  Copy,
  SlidersHorizontal,
  CheckSquare,
  Camera,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Send,
  LogOut,
  Sparkles,
  X
} from 'lucide-vue-next'


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

const isPinModalOpen = ref(false)
const currentPin = ref('')
const newPin = ref('')
const newPinConfirm = ref('')
const pinSuccessMsg = ref('')
const pinErrorMsg = ref('')

const openPinModal = () => {
  currentPin.value = ''
  newPin.value = ''
  newPinConfirm.value = ''
  pinErrorMsg.value = ''
  pinSuccessMsg.value = ''
  isPinModalOpen.value = true
}

const closePinModal = () => {
  isPinModalOpen.value = false
  currentPin.value = ''
  newPin.value = ''
  newPinConfirm.value = ''
  pinErrorMsg.value = ''
  pinSuccessMsg.value = ''
}

const firebaseSavedMsg = ref(false)
const isCheckingConnection = ref(false)
const testResult = ref<{ ok: boolean; message: string } | null>(null)

const handleUpdatePin = () => {
  pinErrorMsg.value = ''
  pinSuccessMsg.value = ''

  if (currentPin.value !== adminSettings.value.adminPin) {
    pinErrorMsg.value = '현재 비밀번호가 일치하지 않습니다.'
    return
  }

  if (!newPin.value || newPin.value.length < 4) {
    pinErrorMsg.value = '새 비밀번호는 4자리 이상이어야 합니다.'
    return
  }

  if (newPin.value !== newPinConfirm.value) {
    pinErrorMsg.value = '새 비밀번호가 일치하지 않습니다.'
    return
  }

  adminSettings.value.adminPin = newPin.value
  alert('관리자 비밀번호가 성공적으로 변경되었습니다.')
  closePinModal()
}

// Google Authentication Management
const newGoogleEmail = ref('')
const googleEmailMsg = ref('')

const addGoogleEmail = () => {
  googleEmailMsg.value = ''
  const email = newGoogleEmail.value.toLowerCase().trim()
  if (!email || !email.includes('@')) {
    googleEmailMsg.value = '올바른 이메일 주소를 입력해주세요.'
    return
  }
  if (!adminSettings.value.allowedGoogleEmails) {
    adminSettings.value.allowedGoogleEmails = []
  }
  if (adminSettings.value.allowedGoogleEmails.includes(email)) {
    googleEmailMsg.value = '이미 등록된 이메일입니다.'
    return
  }
  adminSettings.value.allowedGoogleEmails.push(email)
  newGoogleEmail.value = ''
  googleEmailMsg.value = `'${email}' 계정이 성공적으로 추가되었습니다.`
  setTimeout(() => { googleEmailMsg.value = '' }, 2500)
}

const removeGoogleEmail = (index: number) => {
  if (adminSettings.value.allowedGoogleEmails) {
    adminSettings.value.allowedGoogleEmails.splice(index, 1)
  }
}

const handleSaveFirebase = () => {
  if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
    initFirebase(adminSettings.value.firebaseConfig)
    initCloudSubscriptions()
  }
  firebaseSavedMsg.value = true
  setTimeout(() => {
    firebaseSavedMsg.value = false
  }, 2500)
}

const handleCheckConnection = async () => {
  isCheckingConnection.value = true
  testResult.value = null
  try {
    const res = await checkFirestoreStatus()
    testResult.value = res
  } catch (err: any) {
    testResult.value = { ok: false, message: `점검 실패: ${err.message || err}` }
  } finally {
    isCheckingConnection.value = false
  }
}

const handleForceUpload = async () => {
  if (confirm('현재 기기의 모든 설정값(예식 정보, 사진 목록, 계좌번호 등)을 클라우드(Firestore)로 즉시 저장하시겠습니까?')) {
    try {
      await forceUploadToCloud()
      alert('클라우드로 모든 설정이 안전하게 저장되었습니다!')
    } catch (err: any) {
      alert(`클라우드 업로드 실패: ${err.message || err}`)
    }
  }
}

const handleForceDownload = async () => {
  if (confirm('클라우드(Firestore)에 저장된 최신 데이터를 가져와 현재 화면에 적용하시겠습니까?')) {
    try {
      const ok = await forceDownloadFromCloud()
      if (ok) {
        alert('클라우드의 최신 데이터를 성공적으로 불러왔습니다!')
      } else {
        alert('클라우드에 저장된 데이터가 없습니다.')
      }
    } catch (err: any) {
      alert(`클라우드 불러오기 실패: ${err.message || err}`)
    }
  }
}

const handleResetSample = () => {
  const firstConfirm = confirm('모든 데이터를 최초의 기본 샘플 데이터(프리셋 사진 및 정보)로 초기화하시겠습니까? 현재 변경한 내용은 사라집니다.')
  if (!firstConfirm) return

  const secondConfirm = confirm('한 번 더 확인합니다.\n정말로 모든 데이터를 기본 샘플 데이터로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
  if (!secondConfirm) return

  resetToSampleData()
  alert('기본 샘플 데이터로 복원되었습니다.')
}

// Naver Maps API Key Management
const naverMapSavedMsg = ref(false)
const currentHostUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:5173'
})
const urlCopied = ref(false)
const copyHostUrl = () => {
  if (navigator?.clipboard) {
    navigator.clipboard.writeText(currentHostUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
  }
}

const handleSaveNaverKey = async () => {
  try {
    if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
      await forceUploadToCloud()
    }
    naverMapSavedMsg.value = true
    setTimeout(() => {
      naverMapSavedMsg.value = false
    }, 2500)
  } catch (err) {
    console.error('Failed to save naver map key:', err)
  }
}

const handleToggleRsvpSection = async () => {
  const currentVal = weddingInfo.value.showRsvp !== false
  const nextVal = !currentVal
  weddingInfo.value.showRsvp = nextVal
  adminSettings.value.showRsvpSection = nextVal

  try {
    if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
      await forceUploadToCloud()
    }
  } catch (err) {
    console.error('Failed to save RSVP visibility:', err)
  }
}

// KakaoTalk Notification Settings
const isKakaoGuideOpen = ref(false)
const kakaoKeySavedMsg = ref(false)
const kakaoTestSending = ref(false)
const kakaoTestResult = ref<{ ok: boolean; msg: string } | null>(null)
const kakaoLoginLoading = ref(false)
const kakaoLoginMsg = ref<{ ok: boolean; text: string } | null>(null)

const isKakaoConnected = computed(() => {
  return Boolean(adminSettings.value.kakaoRefreshToken || adminSettings.value.kakaoAccessToken)
})

const kakaoConnectedAccountName = computed(() => {
  return adminSettings.value.kakaoConnectedAccount || '연동된 카카오 계정'
})

const toggleKakaoGuide = () => {
  isKakaoGuideOpen.value = !isKakaoGuideOpen.value
}

const handleKakaoLogin = async () => {
  kakaoLoginLoading.value = true
  kakaoLoginMsg.value = null
  try {
    // 사용자가 저장을 안 눌렀더라도 입력값을 즉시 자동 저장
    await handleSaveKakaoKey()
    const res = await loginKakaoAccount()
    kakaoLoginMsg.value = {
      ok: res.success,
      text: res.message
    }
  } catch (err: any) {
    kakaoLoginMsg.value = {
      ok: false,
      text: `연동 오류: ${err.message || err}`
    }
  } finally {
    kakaoLoginLoading.value = false
  }
}

const handleKakaoDisconnect = async () => {
  if (confirm('카카오 계정 연동을 해제하시겠습니까? 토큰 자동 갱신이 중단됩니다.')) {
    await disconnectKakaoAccount()
    kakaoLoginMsg.value = null
  }
}

const handleManualRefreshToken = async () => {
  kakaoLoginLoading.value = true
  try {
    const newToken = await refreshKakaoAccessToken()
    if (newToken) {
      alert('카카오 Access Token이 성공적으로 갱신되었습니다!')
    } else {
      alert('토큰 갱신에 실패했습니다. 카카오 계정을 다시 로그인 연동해주세요.')
    }
  } finally {
    kakaoLoginLoading.value = false
  }
}

const handleSaveKakaoKey = async () => {
  try {
    if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
      await forceUploadToCloud()
    }
    kakaoKeySavedMsg.value = true
    setTimeout(() => {
      kakaoKeySavedMsg.value = false
    }, 2500)
  } catch (err) {
    console.error('Failed to save kakao key:', err)
  }
}

const handleSendKakaoTest = async () => {
  kakaoTestSending.value = true
  kakaoTestResult.value = null
  try {
    const res = await sendKakaoNotification({
      type: 'test',
      authorOrSender: '관리자 테스트',
      summary: '카카오톡 비즈니스 채널 알림 연동 테스트입니다.'
    })
    kakaoTestResult.value = {
      ok: res.success,
      msg: res.message
    }
  } catch (err: any) {
    kakaoTestResult.value = {
      ok: false,
      msg: `발송 오류: ${err.message || err}`
    }
  } finally {
    kakaoTestSending.value = false
  }
}

const formatPhoneNumber = (val: string) => {
  const clean = (val || '').replace(/[^0-9]/g, '')
  if (clean.length < 4) return clean
  if (clean.length < 8) return `${clean.slice(0, 3)}-${clean.slice(3)}`
  if (clean.length < 11) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 10)}`
  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`
}

const handlePhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const formatted = formatPhoneNumber(target.value)
  adminSettings.value.kakaoReceiverPhone = formatted
  target.value = formatted
}

const handleToggleLiveSnapSection = async () => {
  const currentVal = adminSettings.value.showLiveSnapSection !== false
  const nextVal = !currentVal
  adminSettings.value.showLiveSnapSection = nextVal

  try {
    if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
      await forceUploadToCloud()
    }
  } catch (err) {
    console.error('Failed to save LiveSnap visibility:', err)
  }
}
</script>


<template>
  <div class="admin-settings font-sans">
    <div class="settings-header">
      <h3 class="settings-title font-serif">관리자 환경 설정</h3>
      <p class="settings-desc">관리자 비밀번호 변경, Firebase 클라우드 연동, 데이터 초기화 등을 관리합니다.</p>
    </div>

    <div class="settings-blocks">
      <!-- 1. Change Admin PIN -->
      <div class="card-paper block-card pin-change-card">
        <div class="pin-card-content">
          <div class="block-title-row">
            <KeyRound :size="18" class="block-icon gold" />
            <h4 class="block-title font-serif">관리자 비밀번호 변경</h4>
          </div>
          <p class="block-desc">
            관리자 페이지 접속에 사용하는 4자리 이상의 PIN 비밀번호를 안전하게 변경합니다.
          </p>
        </div>

        <button type="button" class="btn-primary pin-trigger-btn" @click="openPinModal">
          <KeyRound :size="14" />
          <span>비밀번호 변경</span>
        </button>
      </div>

      <!-- 2. Google Authentication Accounts Integration -->
      <div class="card-paper block-card">
        <div class="block-title-row">
          <ShieldCheck :size="18" class="block-icon gold" />
          <h4 class="block-title font-serif">인증된 Google 관리자 계정</h4>
        </div>

        <p class="block-desc">
          비밀번호 입력 없이 <strong>Google 계정으로 원클릭 로그인</strong>할 수 있는 신랑/신부님의 Google 이메일을 등록합니다.
          등록된 계정으로만 관리자 로그인이 허용됩니다.
        </p>

        <!-- Add Email Form -->
        <div class="google-email-input-row">
          <div class="input-with-icon">
            <Mail :size="16" class="field-icon" />
            <input
              v-model="newGoogleEmail"
              type="email"
              placeholder="예: wedding@gmail.com"
              class="input-field email-field"
              @keyup.enter="addGoogleEmail"
            />
          </div>
          <button type="button" class="btn-primary add-email-btn" @click="addGoogleEmail">
            <Plus :size="15" />
            <span>이메일 추가</span>
          </button>
        </div>

        <p v-if="googleEmailMsg" class="success-msg">{{ googleEmailMsg }}</p>

        <!-- Allowed Emails Tag List -->
        <div class="allowed-emails-wrap">
          <label class="form-label">등록된 Google 관리자 계정 ({{ (adminSettings.allowedGoogleEmails || []).length }}개)</label>
          <div v-if="(adminSettings.allowedGoogleEmails || []).length > 0" class="email-tags-list">
            <div
              v-for="(email, idx) in adminSettings.allowedGoogleEmails"
              :key="email"
              class="email-tag font-sans"
            >
              <Mail :size="13" class="tag-icon" />
              <span class="tag-text">{{ email }}</span>
              <button
                type="button"
                class="tag-del-btn"
                @click="removeGoogleEmail(idx)"
                title="삭제"
              >
                <Trash2 :size="12" />
              </button>
            </div>
          </div>
          <div v-else class="empty-email-hint">
            <span>아직 등록된 Google 계정이 없습니다. 이메일을 추가하시면 해당 계정으로 비밀번호 없이 즉시 로그인할 수 있습니다.</span>
          </div>
        </div>
      </div>

      <!-- 3. Firebase Cloud Integration -->
      <div class="card-paper block-card">
        <div class="block-title-row">
          <Cloud :size="18" class="block-icon" />
          <h4 class="block-title font-serif">Firebase 클라우드 연동 (선택 사항)</h4>
        </div>

        <p class="block-desc">
          Firebase 프로젝트 정보를 입력하시면 사진이 Firebase Cloud Storage에 영구 저장되고 여러 기기에서 실시간 동기화됩니다. (미입력 시 브라우저 로컬 모드로 동작합니다.)
        </p>

        <div class="toggle-firebase-row">
          <label class="toggle-switch">
            <input v-model="adminSettings.useFirebase" type="checkbox" />
            <span class="slider"></span>
          </label>
          <span class="toggle-label">Firebase 클라우드 스토리지 활성화</span>
        </div>

        <div v-if="adminSettings.useFirebase" class="firebase-inputs">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">API Key</label>
              <input
                v-model="adminSettings.firebaseConfig!.apiKey"
                type="text"
                class="input-field"
                placeholder="AIzaSy..."
              />
            </div>

            <div class="form-group">
              <label class="form-label">Project ID</label>
              <input
                v-model="adminSettings.firebaseConfig!.projectId"
                type="text"
                class="input-field"
                placeholder="my-wedding-project"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Storage Bucket</label>
              <input
                v-model="adminSettings.firebaseConfig!.storageBucket"
                type="text"
                class="input-field"
                placeholder="my-wedding-project.appspot.com"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Auth Domain</label>
              <input
                v-model="adminSettings.firebaseConfig!.authDomain"
                type="text"
                class="input-field"
                placeholder="my-wedding-project.firebaseapp.com"
              />
            </div>

            <div class="form-group">
              <label class="form-label">App ID</label>
              <input
                v-model="adminSettings.firebaseConfig!.appId"
                type="text"
                class="input-field"
                placeholder="1:123456:web:..."
              />
            </div>
          </div>

          <div class="firebase-btn-row">
            <button class="btn-primary sub-btn" @click="handleSaveFirebase">
              <Check v-if="firebaseSavedMsg" :size="15" />
              <Save v-else :size="15" />
              <span>{{ firebaseSavedMsg ? '설정 저장됨' : 'Firebase 설정 저장' }}</span>
            </button>
          </div>

          <!-- Cloud Firestore Sync Status & Tools -->
          <div class="cloud-status-card">
            <div class="cloud-status-header">
              <div class="status-left">
                <span class="status-dot" :class="{ active: isCloudConnected, syncing: isCloudSyncing }"></span>
                <span class="status-title font-medium">
                  {{ isCloudSyncing ? '클라우드 실시간 동기화 중...' : (isCloudConnected ? 'Cloud Firestore 실시간 연동 활성화' : '클라우드 미연동 (로컬 모드)') }}
                </span>
              </div>
              <span v-if="lastCloudSyncTime" class="sync-time">최종 동기화: {{ lastCloudSyncTime }}</span>
            </div>

            <p class="cloud-help-text">
              어느 기기(PC, 스마트폰)에서든 관리자 설정을 변경하면 Cloud Firestore에 즉시 저장되고, 하객 및 다른 기기에 실시간 자동 반영됩니다.
            </p>

            <div class="cloud-actions-row">
              <button class="btn-tool" :disabled="isCheckingConnection" @click="handleCheckConnection">
                <RefreshCw :size="14" :class="{ 'spin-anim': isCheckingConnection }" />
                <span>{{ isCheckingConnection ? '확인 중...' : '연결 상태 점검' }}</span>
              </button>
              <button class="btn-tool" :disabled="isCloudSyncing" @click="handleForceUpload">
                <UploadCloud :size="14" />
                <span>클라우드로 전체 저장</span>
              </button>
              <button class="btn-tool" :disabled="isCloudSyncing" @click="handleForceDownload">
                <DownloadCloud :size="14" />
                <span>클라우드에서 불러오기</span>
              </button>
            </div>

            <div v-if="testResult" class="test-result-box" :class="testResult.ok ? 'success' : 'error'">
              <CheckCircle2 v-if="testResult.ok" :size="16" class="flex-shrink-0" />
              <AlertCircle v-else :size="16" class="flex-shrink-0" />
              <span class="test-msg">{{ testResult.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Section Visibility Settings -->
      <div class="card-paper block-card">
        <div class="block-title-row">
          <SlidersHorizontal :size="18" class="block-icon gold" />
          <h4 class="block-title font-serif">청첩장 섹션 노출 관리</h4>
        </div>

        <p class="block-desc">
          모바일 청첩장에 표시할 섹션을 원하는 대로 켜고 끌 수 있습니다.
          변경 즉시 하객들의 화면에 실시간 자동 반영되며, 섹션이 숨겨져도 배경색이 어색하게 겹치지 않고 자연스럽게 교차됩니다.
        </p>

        <div class="section-toggle-list">
          <!-- RSVP Section Toggle -->
          <div class="section-toggle-item">
            <div class="toggle-item-info">
              <div class="toggle-item-title-row">
                <CheckSquare :size="16" class="toggle-item-icon gold" />
                <span class="toggle-item-title font-medium">참석의사 전달 (RSVP) 섹션</span>
              </div>
              <p class="toggle-item-desc">하객들의 참석 여부, 동행 인원, 식사 여부를 조사하는 설문 양식입니다.</p>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="weddingInfo.showRsvp !== false"
                @change="handleToggleRsvpSection"
              />
              <span class="slider round"></span>
            </label>
          </div>

          <!-- LiveSnap Section Toggle -->
          <div class="section-toggle-item">
            <div class="toggle-item-info">
              <div class="toggle-item-title-row">
                <Camera :size="16" class="toggle-item-icon gold" />
                <span class="toggle-item-title font-medium">현장스냅 (Live Snap) 섹션</span>
              </div>
              <p class="toggle-item-desc">하객들이 결혼식 당일 사진과 짧은 영상을 실시간으로 올리는 피드입니다.</p>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="adminSettings.showLiveSnapSection !== false"
                @change="handleToggleLiveSnapSection"
              />
              <span class="slider round"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- 4. Naver Maps OpenAPI Key -->
      <div class="card-paper block-card">
        <div class="block-title-row">
          <MapPin :size="18" class="block-icon naver-green" />
          <h4 class="block-title font-serif">네이버 지도 OpenAPI 설정</h4>
        </div>

        <p class="block-desc">
          오시는 길(LOCATION) 섹션에 표시될 네이버 지도 Client ID를 설정합니다.
          별도의 재배포 없이 키를 입력하고 저장하면 청첩장에 네이버 지도가 실시간 연동됩니다.
        </p>

        <div class="form-group">
          <div class="label-with-action">
            <label class="form-label">Client ID (API Key)</label>
            <a
              href="https://www.ncloud.com/product/applicationService/maps"
              target="_blank"
              rel="noopener noreferrer"
              class="ext-link-btn"
            >
              <span>NCP 콘솔 열기</span>
              <ExternalLink :size="12" />
            </a>
          </div>
          <input
            v-model="weddingInfo.naverMapClientId"
            type="text"
            placeholder="예: ncpClientId 값 입력 (예: ab12cd34ef)"
            class="input-field font-mono"
          />
          <div class="naver-troubleshoot-box">
            <h5 class="troubleshoot-title">⚠️ "네이버 인증 실패" 오류 해결 체크리스트</h5>
            <ol class="troubleshoot-list">
              <li>
                <strong>NCP 콘솔의 [Web 서비스 URL] 등록 (가장 빈번)</strong><br />
                네이버 지도 API는 등록된 도메인에서만 동작합니다. NCP 콘솔의 Application [수정] ➔ [Web 서비스 URL]에 현재 접속 주소를 등록해야 합니다.
                <div class="host-url-box">
                  <span class="host-url-label">현재 브라우저 주소:</span>
                  <code class="host-url-code">{{ currentHostUrl }}</code>
                  <button type="button" class="btn-copy-small" @click="copyHostUrl">
                    <Check v-if="urlCopied" :size="12" class="text-green" />
                    <Copy v-else :size="12" />
                    <span>{{ urlCopied ? '복사됨!' : '주소 복사' }}</span>
                  </button>
                </div>
                <span class="url-tip">* 로컬 개발 중이라면 <code>http://localhost:5173</code>, 배포 사이트라면 배포된 도메인을 모두 등록하세요. (뒤에 슬래시 <code>/</code> 없이 등록)</span>
              </li>
              <li>
                <strong>Application 서비스 선택에서 [Web Dynamic Map] 체크 확인</strong><br />
                NCP 콘솔 Application 수정 시 <code>Maps</code> 아래의 <code>Web Dynamic Map</code>이 반드시 체크되어 있어야 합니다.
              </li>
              <li>
                <strong>Client ID 확인</strong><br />
                Secret Key가 아닌 <code>Client ID</code>(영문·숫자 조합)를 입력했는지 확인하세요.
              </li>
            </ol>
          </div>

          <p class="field-hint">
            * <a href="https://www.ncloud.com/product/applicationService/maps" target="_blank" rel="noopener noreferrer" class="text-link">네이버 클라우드 플랫폼(NCP)</a> 콘솔에서 설정을 수정한 후 아래 [저장]을 눌러주세요.
          </p>
        </div>

        <div class="save-row">
          <button class="btn-primary sub-btn" @click="handleSaveNaverKey">
            <Check v-if="naverMapSavedMsg" :size="15" />
            <Save v-else :size="15" />
            <span>{{ naverMapSavedMsg ? '네이버 지도 키 저장 완료!' : '네이버 지도 키 저장' }}</span>
          </button>
        </div>
      </div>

      <!-- 5. KakaoTalk Notification Settings -->
      <div class="card-paper block-card kakao-setting-card">
        <div class="block-title-row">
          <MessageCircle :size="18" class="block-icon kakao-yellow" />
          <h4 class="block-title font-serif">카카오톡 비즈니스 채널 알림 설정</h4>
        </div>

        <p class="block-desc">
          하객들이 <strong>방명록 작성</strong>, <strong>참석여부(RSVP) 전달</strong>, <strong>본식촬영(현장스냅) 업로드</strong>를 완료했을 때 비즈니스 채널을 통해 신랑·신부님의 카카오톡 또는 휴대폰으로 즉시 알림 메시지를 전송합니다.
        </p>

        <!-- 원클릭 카카오 계정 연동 및 토큰 자동 갱신 배너 -->
        <div class="kakao-connect-banner" :class="{ 'is-connected': isKakaoConnected }">
          <div class="banner-status-col">
            <div class="banner-title-row">
              <span class="status-indicator-dot" :class="{ active: isKakaoConnected }"></span>
              <span class="banner-main-title font-serif">
                {{ isKakaoConnected ? '카카오 알림 계정 연동 완료' : '카카오 1회 로그인으로 토큰 자동 갱신' }}
              </span>
              <span v-if="isKakaoConnected" class="auto-badge">
                <Sparkles :size="12" />
                <span>자동 갱신 활성화 중</span>
              </span>
            </div>
            <p class="banner-sub-desc">
              {{ isKakaoConnected 
                ? `계정: [${kakaoConnectedAccountName}] - 토큰이 만료되어도 백그라운드에서 Refresh Token으로 새 토큰을 자동 충전합니다.` 
                : '최초 1회만 로그인 연동해 두시면 6시간마다 토큰을 복사할 필요 없이 시스템이 알아서 새 토큰을 영구 자동 갱신합니다.' }}
            </p>
          </div>

          <div class="banner-action-col">
            <button 
              v-if="!isKakaoConnected"
              type="button" 
              class="btn-kakao-login" 
              :disabled="kakaoLoginLoading"
              @click="handleKakaoLogin"
            >
              <RefreshCw v-if="kakaoLoginLoading" :size="15" class="spin-anim" />
              <MessageCircle v-else :size="16" />
              <span>{{ kakaoLoginLoading ? '연동 중...' : '카카오 계정 1회 연동하기' }}</span>
            </button>

            <div v-else class="connected-btn-group">
              <button 
                type="button" 
                class="btn-tool-small" 
                :disabled="kakaoLoginLoading"
                @click="handleManualRefreshToken"
              >
                <RefreshCw :size="12" :class="{ 'spin-anim': kakaoLoginLoading }" />
                <span>토큰 즉시 갱신</span>
              </button>
              <button 
                type="button" 
                class="btn-tool-small danger" 
                @click="handleKakaoDisconnect"
              >
                <LogOut :size="12" />
                <span>연동 해제</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="kakaoLoginMsg" class="test-result-box" :class="kakaoLoginMsg.ok ? 'success' : 'error'">
          <CheckCircle2 v-if="kakaoLoginMsg.ok" :size="16" class="flex-shrink-0" />
          <AlertCircle v-else :size="16" class="flex-shrink-0" />
          <span class="test-msg" style="white-space: pre-line;">{{ kakaoLoginMsg.text }}</span>
        </div>

        <!-- 카카오 Web 플랫폼 등록 도메인 안내 박스 -->
        <div class="kakao-domain-tip-box">
          <div class="domain-tip-text">
            <strong>⚠️ 카카오 Web 플랫폼 사이트 도메인 등록 필수</strong>
            <p>카카오 디벨로퍼스 ➔ [앱 설정] ➔ [플랫폼] ➔ [Web]에 아래 접속 주소를 등록해야 로그인이 허용됩니다.</p>
          </div>
          <div class="host-url-box">
            <span class="host-url-label">현재 브라우저 주소:</span>
            <code class="host-url-code">{{ currentHostUrl }}</code>
            <button type="button" class="btn-copy-small" @click="copyHostUrl">
              <Check v-if="urlCopied" :size="12" class="text-green" />
              <Copy v-else :size="12" />
              <span>{{ urlCopied ? '복사됨!' : '주소 복사' }}</span>
            </button>
          </div>
        </div>

        <!-- 카카오 앱 키 설정 (JavaScript 키 & REST API 키) -->
        <div class="kakao-form-grid">
          <div class="form-group">
            <div class="label-with-action">
              <label class="form-label">카카오 JavaScript 키</label>
              <a
                href="https://developers.kakao.com/console/app"
                target="_blank"
                rel="noopener noreferrer"
                class="ext-link-btn"
              >
                <span>앱 키 확인</span>
                <ExternalLink :size="12" />
              </a>
            </div>
            <input
              v-model="adminSettings.kakaoJavascriptKey"
              type="text"
              placeholder="카카오 개발자 콘솔의 JavaScript 키 (로그인 연동용)"
              class="input-field font-mono"
            />
            <p class="field-hint">* 카카오 1회 로그인 팝업 연동 시 사용됩니다.</p>
          </div>

          <div class="form-group">
            <div class="label-with-action">
              <label class="form-label">카카오 REST API Key</label>
              <a
                href="https://developers.kakao.com/tool/rest-api/open/get/v2-user-me"
                target="_blank"
                rel="noopener noreferrer"
                class="ext-link-btn"
              >
                <span>REST API 도구</span>
                <ExternalLink :size="12" />
              </a>
            </div>
            <input
              v-model="adminSettings.kakaoRestApiKey"
              type="text"
              placeholder="카카오 개발자 콘솔의 REST API 키 (자동 갱신용)"
              class="input-field font-mono"
            />
            <p class="field-hint">* 백그라운드 토큰 자동 갱신 및 메시지 발송에 사용됩니다.</p>
          </div>
        </div>

        <!-- 비즈니스 채널 및 알림 기본 설정 폼 -->
        <div class="kakao-form-grid">
          <div class="form-group">
            <div class="label-with-action">
              <label class="form-label">카카오톡 채널 검색용 아이디</label>
              <a
                href="https://center-pf.kakao.com/"
                target="_blank"
                rel="noopener noreferrer"
                class="ext-link-btn"
              >
                <span>채널 관리자센터</span>
                <ExternalLink :size="12" />
              </a>
            </div>
            <input
              v-model="adminSettings.kakaoChannelId"
              type="text"
              placeholder="예: @우리결혼청첩장 또는 채널ID"
              class="input-field font-mono"
            />
            <p class="field-hint">* 개설하신 카카오톡 채널의 검색용 홈 ID(@아이디)를 입력하세요.</p>
          </div>

          <div class="form-group">
            <label class="form-label">알림 수신 휴대폰 번호</label>
            <input
              :value="adminSettings.kakaoReceiverPhone"
              type="tel"
              maxlength="13"
              placeholder="예: 010-1234-5678"
              class="input-field font-mono"
              @input="handlePhoneInput"
            />
            <p class="field-hint">* 알림을 수신할 신랑 또는 신부님의 휴대폰 번호입니다. (숫자만 입력 시 자동 포맷)</p>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">웹훅 URL (Make, Zapier, Cloud Function 등 연동 시 / 선택사항)</label>
          <input
            v-model="adminSettings.kakaoWebhookUrl"
            type="text"
            placeholder="예: https://hook.eu1.make.com/... 또는 사용자 지정 웹훅 URL"
            class="input-field font-mono"
          />
          <p class="field-hint">
            * 웹훅 URL이 등록되어 있으면 토큰 만료 없이 웹훅을 통해 비즈니스 채널 메시지가 가장 안정적으로 발송됩니다.
          </p>
        </div>

        <div class="kakao-btn-row">
          <button class="btn-primary sub-btn" @click="handleSaveKakaoKey">
            <Check v-if="kakaoKeySavedMsg" :size="15" />
            <Save v-else :size="15" />
            <span>{{ kakaoKeySavedMsg ? '카카오 설정 저장 완료!' : '카카오 설정 저장' }}</span>
          </button>

          <button 
            type="button" 
            class="btn-tool kakao-test-btn" 
            :disabled="kakaoTestSending" 
            @click="handleSendKakaoTest"
          >
            <RefreshCw v-if="kakaoTestSending" :size="14" class="spin-anim" />
            <Send v-else :size="14" />
            <span>{{ kakaoTestSending ? '테스트 발송 중...' : '알림 테스트 전송해보기' }}</span>
          </button>
        </div>

        <!-- 테스트 발송 결과 피드백 -->
        <div v-if="kakaoTestResult" class="test-result-box" :class="kakaoTestResult.ok ? 'success' : 'error'">
          <CheckCircle2 v-if="kakaoTestResult.ok" :size="16" class="flex-shrink-0" />
          <AlertCircle v-else :size="16" class="flex-shrink-0" />
          <span class="test-msg">{{ kakaoTestResult.msg }}</span>
        </div>

        <!-- 카카오톡 비즈니스 채널 연동 가이드 접고 펼치기 -->
        <div class="kakao-guide-collapsible">
          <div class="guide-accordion-header" @click="toggleKakaoGuide">
            <div class="guide-header-title">
              <span class="guide-bulb-icon">💡</span>
              <span class="guide-title-text font-serif">비즈니스 채널 연결 & 알림 연동 가이드</span>
              <span class="guide-toggle-badge">{{ isKakaoGuideOpen ? '가이드 접기' : '가이드 펼쳐보기' }}</span>
            </div>
            <button type="button" class="guide-toggle-arrow" aria-label="가이드 열기/닫기">
              <ChevronUp v-if="isKakaoGuideOpen" :size="16" />
              <ChevronDown v-else :size="16" />
            </button>
          </div>

          <Transition name="collapse-slide">
            <div v-show="isKakaoGuideOpen" class="guide-accordion-body">
              <div class="guide-steps-list">
                <!-- Step 1 -->
                <div class="guide-step-item">
                  <div class="step-num-badge">STEP 1</div>
                  <div class="step-content">
                    <h6 class="step-heading">카카오 개발자 콘솔에 비즈니스 채널 연결하기</h6>
                    <p class="step-desc">
                      1. <a href="https://developers.kakao.com/" target="_blank" rel="noopener noreferrer" class="text-link">카카오 디벨로퍼스</a> 접속 ➔ 내 애플리케이션 클릭<br />
                      2. 좌측 메뉴 <strong>[앱 설정] ➔ [카카오톡 채널]</strong>로 이동합니다.<br />
                      3. <strong>[카카오톡 채널 연결]</strong>을 클릭하여 방금 생성하신 비즈니스 채널을 검색 후 연결합니다.
                    </p>
                  </div>
                </div>

                <!-- Step 2 -->
                <div class="guide-step-item highlight-step">
                  <div class="step-num-badge gold">STEP 2</div>
                  <div class="step-content">
                    <h6 class="step-heading">채널 아이디 및 수신 휴대폰 번호 등록</h6>
                    <p class="step-desc">
                      1. <a href="https://center-pf.kakao.com/" target="_blank" rel="noopener noreferrer" class="text-link">카카오톡 채널 관리자센터</a>에서 채널의 <strong>홈 ID(검색용 아이디)</strong>를 확인합니다.<br />
                      2. 위 설정 화면의 <code>카카오톡 채널 검색용 아이디</code>와 <code>알림 수신 휴대폰 번호</code>에 각각 입력합니다.
                    </p>
                  </div>
                </div>

                <!-- Step 3 -->
                <div class="guide-step-item">
                  <div class="step-num-badge">STEP 3</div>
                  <div class="step-content">
                    <h6 class="step-heading">전송 키 등록 (Access Token 또는 Webhook)</h6>
                    <p class="step-desc">
                      • <strong>카카오 공식 테스트 도구 활용</strong>: 카카오 디벨로퍼스 [도구] ➔ [REST API 테스트] ➔ [토큰 발급]에서 발급받은 Access Token을 복사하여 위 입력창에 등록합니다.<br />
                      • <strong>무료 웹훅(Webhook) 활용 (영구 유효/강력 추천)</strong>: Make(구 Integromat), Zapier 등에서 Webhook URL을 생성하여 등록하면 토큰 만료 없이 영구적으로 신랑·신부님에게 실시간 푸시가 전달됩니다.
                    </p>
                  </div>
                </div>

                <!-- Step 4 -->
                <div class="guide-step-item">
                  <div class="step-num-badge">STEP 4</div>
                  <div class="step-content">
                    <h6 class="step-heading">[알림 테스트 전송해보기] 버튼으로 검증</h6>
                    <p class="step-desc">
                      설정을 저장한 후 바로 위의 <strong>[알림 테스트 전송해보기]</strong> 버튼을 누르면 즉시 알림 발송을 시도하고 상태(성공 또는 구체적 에러 메시지)를 화면에서 바로 확인하실 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>


      <!-- 5. Reset Factory Sample Data -->
      <div class="card-paper block-card danger-zone">
        <div class="danger-header">
          <div class="block-title-row">
            <RotateCcw :size="18" class="block-icon danger" />
            <h4 class="block-title font-serif">기본 샘플 데이터로 복원</h4>
          </div>
          <p class="block-desc">
            초기 고품질 감성 웨딩 샘플 사진과 기본 예식 정보, 샘플 축하글로 즉시 초기화합니다.
          </p>
        </div>

        <div class="danger-action-row">
          <button type="button" class="reset-btn" @click="handleResetSample">
            <RotateCcw :size="14" />
            <span>샘플 데이터 초기화</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Admin PIN Change Layer Popup Modal -->
    <div v-if="isPinModalOpen" class="modal-backdrop" @click.self="closePinModal">
      <div class="modal-card card-paper">
        <div class="modal-header">
          <div class="modal-header-with-icon">
            <KeyRound :size="18" class="modal-header-icon gold" />
            <h4 class="modal-title font-serif">관리자 비밀번호 변경</h4>
          </div>
          <button class="close-btn" @click="closePinModal" type="button" title="닫기">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleUpdatePin">
          <div class="modal-body">
            <p class="modal-desc">새로운 관리자 PIN 비밀번호를 설정해 주세요.</p>

            <div class="form-group">
              <label class="form-label">현재 비밀번호</label>
              <input
                v-model="currentPin"
                type="password"
                placeholder="현재 비밀번호를 입력하세요"
                class="input-field"
                required
                autocomplete="current-password"
              />
            </div>

            <div class="form-group">
              <label class="form-label">새 비밀번호</label>
              <input
                v-model="newPin"
                type="password"
                placeholder="새 비밀번호 (4자리 이상)"
                class="input-field"
                required
                autocomplete="new-password"
              />
            </div>

            <div class="form-group">
              <label class="form-label">새 비밀번호 확인</label>
              <input
                v-model="newPinConfirm"
                type="password"
                placeholder="새 비밀번호 다시 입력"
                class="input-field"
                required
                autocomplete="new-password"
              />
            </div>

            <p v-if="pinErrorMsg" class="error-msg">{{ pinErrorMsg }}</p>
            <p v-if="pinSuccessMsg" class="success-msg">{{ pinSuccessMsg }}</p>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary modal-btn" @click="closePinModal">
              <X :size="14" />
              <span>취소</span>
            </button>
            <button type="submit" class="btn-primary modal-btn">
              <Check :size="14" />
              <span>비밀번호 변경</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-settings {
  padding: 24px 0;
}

.settings-header {
  margin-bottom: 24px;
}

.settings-title {
  font-size: 20px;
  color: var(--text-main);
  margin-bottom: 4px;
}

.settings-desc {
  font-size: 13px;
  color: var(--text-sub);
}

.settings-blocks {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.block-card {
  padding: 24px;
}

.block-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.block-icon {
  color: var(--gold-primary);
}

.block-icon.danger {
  color: var(--rose-accent);
}

.block-icon.naver-green {
  color: #03C75A;
}

.label-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.ext-link-btn {
  font-size: 11.5px;
  color: #03C75A;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(3, 199, 90, 0.08);
  padding: 3px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.ext-link-btn:hover {
  background: #03C75A;
  color: #FFFFFF;
}

.text-link {
  color: #03C75A;
  text-decoration: underline;
}

.save-row {
  margin-top: 14px;
  display: flex;
  justify-content: flex-start;
}


.block-title {
  font-size: 16px;
  color: var(--text-main);
  font-weight: 700;
}

.block-desc {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.6;
  margin-bottom: 18px;
}

.pin-change-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pin-card-content {
  flex: 1;
}

.pin-card-content .block-desc {
  margin-bottom: 0;
}

.pin-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}

.danger-zone {
  border-left: 3px solid var(--rose-accent, #B85848);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
}

.danger-header .block-desc {
  margin-bottom: 0;
}

.danger-action-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

/* PIN Modal Styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-card {
  background: #FFFFFF;
  border-radius: 14px;
  max-width: 440px;
  width: 100%;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-ivory);
}

.modal-header-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-header-icon {
  color: var(--gold-primary);
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-sub);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.close-btn:hover {
  color: var(--text-main);
  background: var(--bg-warm);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-desc {
  font-size: 13px;
  color: var(--text-sub);
  margin: 0 0 4px 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-color);
  background: #FAF9F6;
}

.modal-btn {
  font-size: 13px;
  padding: 8px 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

.input-field {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  outline: none;
}

.input-field:focus {
  border-color: var(--gold-primary);
}

.sub-btn {
  align-self: flex-start;
  font-size: 13px;
  padding: 10px 18px;
  margin-top: 6px;
}

.error-msg {
  font-size: 12px;
  color: var(--rose-accent);
}

.success-msg {
  font-size: 12px;
  color: #2E7D32;
}

.toggle-firebase-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--border-color);
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--gold-primary);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* Section Toggle Styles */
.section-toggle-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.section-toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: rgba(239, 231, 218, 0.4);
  border: 1px solid rgba(168, 131, 80, 0.25);
  border-radius: 12px;
}

.toggle-item-info {
  flex: 1;
  min-width: 0;
}

.toggle-item-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.toggle-item-icon {
  color: var(--gold-dark);
}

.toggle-item-title {
  font-size: 14px;
  color: var(--text-main);
}

.toggle-item-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}

.toggle-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.firebase-inputs {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: #FFFFFF;
  color: var(--rose-accent);
  border: 1px solid var(--rose-accent);
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #FEECEB;
}

.firebase-btn-row {
  display: flex;
  margin-top: 4px;
}

.cloud-status-card {
  margin-top: 14px;
  padding: 16px;
  background: #FAF8F5;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cloud-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #CBD5E1;
  transition: all 0.3s;
}

.status-dot.active {
  background: #10B981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.status-dot.syncing {
  background: #F59E0B;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.status-title {
  font-size: 13.5px;
  color: var(--text-main);
}

.sync-time {
  font-size: 11.5px;
  color: var(--text-sub);
}

.cloud-help-text {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
  margin: 0;
}

.cloud-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: #FFFFFF;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-tool:hover:not(:disabled) {
  background: #F3F0EB;
  border-color: var(--gold-primary);
  color: var(--gold-primary);
}

.btn-tool:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-anim {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.test-result-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.test-result-box.success {
  background: #ECFDF5;
  color: #065F46;
  border: 1px solid #A7F3D0;
}

.test-result-box.error {
  background: #FEF2F2;
  color: #991B1B;
  border: 1px solid #FECACA;
}

.test-msg {
  white-space: pre-line;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .pin-change-card {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .pin-trigger-btn {
    width: 100%;
    justify-content: center;
  }

  .danger-action-row {
    justify-content: stretch;
  }

  .reset-btn {
    width: 100%;
    justify-content: center;
  }

  .block-card {
    padding: 18px 14px;
  }

  .cloud-actions-row {
    flex-direction: column;
  }

  .btn-tool {
    width: 100%;
    justify-content: center;
  }
}

/* Google Auth Account Styling */
.block-icon.gold {
  color: var(--gold-primary, #A88350);
}

.google-email-input-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.input-with-icon {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.email-field {
  padding-left: 36px;
}

.add-email-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  padding: 10px 18px;
  font-size: 13px;
  border-radius: 10px;
}

.allowed-emails-wrap {
  margin-top: 16px;
}

.email-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.email-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-warm, #EFE7DA);
  border: 1px solid rgba(168, 131, 80, 0.35);
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-main);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tag-icon {
  color: var(--gold-dark, #8C6D41);
}

.tag-text {
  font-weight: 500;
}

.tag-del-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.tag-del-btn:hover {
  color: #C5221F;
  background: rgba(197, 34, 31, 0.1);
}

.empty-email-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
  line-height: 1.5;
}

/* Naver Troubleshooting Box */
.naver-troubleshoot-box {
  margin-top: 14px;
  padding: 14px 16px;
  background: rgba(239, 231, 218, 0.55);
  border: 1px solid rgba(168, 131, 80, 0.3);
  border-radius: 8px;
}

.troubleshoot-title {
  font-size: 13px;
  font-weight: 700;
  color: #8C6D41;
  margin: 0 0 10px 0;
}

.troubleshoot-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.troubleshoot-list strong {
  color: var(--text-main);
}

.host-url-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  margin-bottom: 4px;
  padding: 4px 8px;
  background: #FFFFFF;
  border: 1px solid rgba(168, 131, 80, 0.35);
  border-radius: 6px;
}

.host-url-label {
  font-size: 11px;
  color: var(--text-muted);
}

.host-url-code {
  font-family: monospace;
  font-weight: 600;
  font-size: 12px;
  color: #03C75A;
}

.btn-copy-small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--gold-dark, #8C6D41);
  color: #FFFFFF;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-copy-small:hover {
  opacity: 0.85;
}

.url-tip {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* KakaoTalk Notification Section Styles */
.block-icon.kakao-yellow {
  color: #3A1D1D;
  background: #FEE500;
  border-radius: 6px;
  padding: 3px;
}

.clickable-title-row {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: opacity 0.15s;
}

.clickable-title-row:hover {
  opacity: 0.9;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapsible-badge {
  font-size: 11px;
  background: rgba(254, 229, 0, 0.35);
  color: #3A1D1D;
  border: 1px solid rgba(254, 229, 0, 0.8);
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 12px;
}

.collapse-toggle-btn {
  background: none;
  border: none;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.collapsible-content {
  margin-top: 16px;
}

.collapse-slide-enter-active,
.collapse-slide-leave-active {
  transition: all 0.25s ease;
}

.collapse-slide-enter-from,
.collapse-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.kakao-connect-banner {
  background: #FFFDF0;
  border: 1px solid #FEE500;
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  transition: all 0.25s ease;
}

.kakao-connect-banner.is-connected {
  background: #F4FAF5;
  border-color: #34A853;
}

.banner-status-col {
  flex: 1;
}

.banner-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #BDBDBD;
  flex-shrink: 0;
}

.status-indicator-dot.active {
  background: #34A853;
  box-shadow: 0 0 6px rgba(52, 168, 83, 0.6);
}

.banner-main-title {
  font-size: 14px;
  font-weight: 700;
  color: #3A1D1D;
}

.auto-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(52, 168, 83, 0.12);
  color: #1E7E34;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.banner-sub-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-sub, #6E6259);
  margin: 0;
}

.banner-action-col {
  flex-shrink: 0;
}

.btn-kakao-login {
  background: #FEE500;
  color: #3A1D1D;
  font-weight: 700;
  font-size: 13px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 6px rgba(58, 29, 29, 0.1);
  transition: transform 0.15s, opacity 0.15s;
}

.btn-kakao-login:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-kakao-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.connected-btn-group {
  display: flex;
  gap: 6px;
}

.btn-tool-small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #FFFFFF;
  border: 1px solid var(--border-color, #E8E2D9);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-tool-small:hover {
  background: #FAF8F5;
  border-color: #D4AF37;
}

.btn-tool-small.danger {
  color: #D32F2F;
}

.btn-tool-small.danger:hover {
  background: #FFEBEE;
  border-color: #FFCDD2;
}

@media (max-width: 640px) {
  .kakao-connect-banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .banner-action-col {
    width: 100%;
    margin-top: 6px;
  }
  .btn-kakao-login {
    width: 100%;
    justify-content: center;
  }
  .connected-btn-group {
    width: 100%;
  }
  .connected-btn-group .btn-tool-small {
    flex: 1;
    justify-content: center;
  }
}

.kakao-domain-tip-box {
  background: #FFFDF5;
  border: 1px dashed rgba(212, 175, 55, 0.6);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.domain-tip-text strong {
  display: block;
  font-size: 12px;
  color: #3A1D1D;
  margin-bottom: 2px;
}

.domain-tip-text p {
  font-size: 11px;
  color: var(--text-sub);
  margin: 0;
  line-height: 1.4;
}

.kakao-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 640px) {
  .kakao-form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.kakao-btn-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.kakao-test-btn {
  background: #FFFDF5;
  border-color: rgba(212, 175, 55, 0.5);
  color: #5C4B37;
  font-weight: 600;
}

.kakao-test-btn:hover {
  background: #FAF3E0;
  border-color: #D4AF37;
  color: #3A1D1D;
}

.kakao-guide-collapsible {
  margin-top: 24px;
  border: 1px solid var(--border-color, #E8E2D9);
  border-radius: 10px;
  background: #FAF8F5;
  overflow: hidden;
  transition: all 0.2s ease;
}

.kakao-guide-collapsible:hover {
  border-color: #D4AF37;
}

.guide-accordion-header {
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  background: rgba(254, 229, 0, 0.08);
  transition: background 0.2s ease;
}

.guide-accordion-header:hover {
  background: rgba(254, 229, 0, 0.16);
}

.guide-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guide-bulb-icon {
  font-size: 16px;
}

.guide-title-text {
  font-size: 14px;
  font-weight: 700;
  color: #3A1D1D;
}

.guide-toggle-badge {
  font-size: 11px;
  background: #FEE500;
  color: #3A1D1D;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: 4px;
}

.guide-toggle-arrow {
  background: none;
  border: none;
  color: #3A1D1D;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
}

.guide-accordion-body {
  padding: 16px 18px 20px;
  border-top: 1px solid var(--border-color, #E8E2D9);
  background: #FFFFFF;
}

.guide-steps-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.guide-step-item {
  display: flex;
  gap: 14px;
  padding: 12px 14px;
  background: #FAF8F5;
  border-radius: 8px;
  border: 1px solid var(--border-light, #EDE8E1);
  transition: background 0.2s ease;
}

.guide-step-item.highlight-step {
  background: #FFFDF5;
  border-color: rgba(212, 175, 55, 0.4);
}

.step-num-badge {
  flex-shrink: 0;
  height: 22px;
  padding: 0 8px;
  background: #4A4036;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 700;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.5px;
}

.step-num-badge.gold {
  background: #D4AF37;
  color: #FFFFFF;
}

.step-content {
  flex: 1;
}

.step-heading {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main, #2D241E);
  margin: 0 0 6px 0;
}

.step-desc {
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-sub, #6E6259);
  margin: 0;
}

.step-desc code {
  background: #EDE8E1;
  color: #3A1D1D;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
}

.step-desc .text-link {
  color: #1A73E8;
  text-decoration: underline;
  font-weight: 600;
}
</style>
