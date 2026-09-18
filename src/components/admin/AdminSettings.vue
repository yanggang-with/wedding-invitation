<script setup lang="ts">
import { ref } from 'vue'
import { adminSettings, resetToSampleData } from '../../services/storage'
import { initFirebase } from '../../services/firebase'
import { KeyRound, Cloud, RotateCcw, Check, Save } from 'lucide-vue-next'

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

const handleSaveFirebase = () => {
  if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
    initFirebase(adminSettings.value.firebaseConfig)
  }
  firebaseSavedMsg.value = true
  setTimeout(() => {
    firebaseSavedMsg.value = false
  }, 2500)
}

const handleResetSample = () => {
  if (confirm('모든 데이터를 최초의 고품질 샘플 데이터(프리셋 사진 및 정보)로 초기화하시겠습니까? 현재 변경한 내용은 사라집니다.')) {
    resetToSampleData()
    alert('기본 샘플 데이터로 복원되었습니다.')
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

      <!-- 2. Firebase Cloud Integration -->
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

          <button class="btn-primary sub-btn" @click="handleSaveFirebase">
            <Check v-if="firebaseSavedMsg" :size="15" />
            <Save v-else :size="15" />
            <span>{{ firebaseSavedMsg ? '설정 저장됨' : 'Firebase 설정 저장' }}</span>
          </button>
        </div>
      </div>

      <!-- 3. Reset Factory Sample Data -->
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
</style>
