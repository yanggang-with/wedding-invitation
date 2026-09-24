<script setup lang="ts">
import { ref } from 'vue'
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
  ExternalLink
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

const currentPin = ref('')
const newPin = ref('')
const newPinConfirm = ref('')
const pinSuccessMsg = ref('')
const pinErrorMsg = ref('')

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
  pinSuccessMsg.value = '관리자 비밀번호가 성공적으로 변경되었습니다.'
  currentPin.value = ''
  newPin.value = ''
  newPinConfirm.value = ''
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
  if (confirm('모든 데이터를 최초의 고품질 샘플 데이터(프리셋 사진 및 정보)로 초기화하시겠습니까? 현재 변경한 내용은 사라집니다.')) {
    resetToSampleData()
    alert('기본 샘플 데이터로 복원되었습니다.')
  }
}

// Naver Maps API Key Management
const naverMapSavedMsg = ref(false)
const handleSaveNaverKey = () => {
  try {
    localStorage.setItem('wedding_info_v2', JSON.stringify(weddingInfo.value))
    naverMapSavedMsg.value = true
    setTimeout(() => {
      naverMapSavedMsg.value = false
    }, 2500)
  } catch (err) {
    console.error('Failed to save naver map key:', err)
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
      <div class="card-paper block-card">
        <div class="block-title-row">
          <KeyRound :size="18" class="block-icon" />
          <h4 class="block-title font-serif">관리자 비밀번호 변경</h4>
        </div>

        <form @submit.prevent="handleUpdatePin" class="pin-form">
          <div class="form-group">
            <label class="form-label">현재 비밀번호</label>
            <input
              v-model="currentPin"
              type="password"
              placeholder="현재 비밀번호"
              class="input-field"
              required
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
            />
          </div>

          <p v-if="pinErrorMsg" class="error-msg">{{ pinErrorMsg }}</p>
          <p v-if="pinSuccessMsg" class="success-msg">{{ pinSuccessMsg }}</p>

          <button type="submit" class="btn-primary sub-btn">
            비밀번호 변경
          </button>
        </form>
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

      <!-- 3. Naver Maps OpenAPI Key -->
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
          <p class="field-hint">
            * <a href="https://www.ncloud.com/product/applicationService/maps" target="_blank" rel="noopener noreferrer" class="text-link">네이버 클라우드 플랫폼(NCP)</a>에서 <code>Web Dynamic Map</code> 서비스를 신청하고 발급받은 Client ID를 입력하세요.
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

      <!-- 4. Reset Factory Sample Data -->
      <div class="card-paper block-card danger-zone">

        <div class="block-title-row">
          <RotateCcw :size="18" class="block-icon danger" />
          <h4 class="block-title font-serif">기본 샘플 데이터로 복원</h4>
        </div>

        <p class="block-desc">
          초기 고품질 감성 웨딩 샘플 사진 9장과 기본 예식 정보, 샘플 축하글로 즉시 초기화합니다.
        </p>

        <button class="reset-btn" @click="handleResetSample">
          <RotateCcw :size="15" />
          <span>샘플 데이터로 초기화</span>
        </button>
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

.pin-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 360px;
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

  .pin-form {
    max-width: 100%;
  }

  .sub-btn {
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
</style>
