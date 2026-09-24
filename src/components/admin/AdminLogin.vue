<script setup lang="ts">
import { ref } from 'vue'
import { adminSettings } from '../../services/storage'
import { signInWithGoogle } from '../../services/firebase'
import { Lock, KeyRound, ArrowLeft, AlertCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const emit = defineEmits<{
  (e: 'login-success'): void
}>()

const router = useRouter()
const pinInput = ref('')
const errorMsg = ref('')
const isGoogleLoading = ref(false)

const handleLogin = () => {
  errorMsg.value = ''
  if (pinInput.value === adminSettings.value.adminPin) {
    emit('login-success')
  } else {
    errorMsg.value = '비밀번호가 일치하지 않습니다.'
    pinInput.value = ''
  }
}

const handleGoogleLogin = async () => {
  errorMsg.value = ''
  isGoogleLoading.value = true

  try {
    const user = await signInWithGoogle()
    const userEmail = (user.email || '').toLowerCase().trim()

    if (!userEmail) {
      errorMsg.value = 'Google 계정의 이메일 정보를 가져올 수 없습니다.'
      return
    }

    const allowed = (adminSettings.value.allowedGoogleEmails || []).map(e => e.toLowerCase().trim())

    // 1) 등록된 관리자 이메일 목록이 있는 경우: 일치 여부 확인
    if (allowed.length > 0) {
      if (allowed.includes(userEmail)) {
        emit('login-success')
        return
      } else {
        errorMsg.value = `인증되지 않은 Google 계정입니다 (${userEmail}). 관리자 비밀번호로 로그인하여 [설정] 탭에서 해당 이메일을 허용 목록에 등록해주세요.`
        return
      }
    }

    // 2) 등록된 관리자 이메일이 아직 없는 경우: 최초 로그인 계정 자동 등록 안내
    const confirmAdd = confirm(`현재 등록된 Google 관리자 계정이 없습니다.\n\n'${userEmail}' 계정을 대표 관리자로 등록하고 로그인하시겠습니까?`)
    if (confirmAdd) {
      adminSettings.value = {
        ...adminSettings.value,
        allowedGoogleEmails: [userEmail]
      }
      emit('login-success')
    } else {
      errorMsg.value = 'Google 로그인이 취소되었습니다.'
    }
  } catch (err: any) {
    console.error('Google Sign-In error:', err)
    if (err.code === 'auth/popup-closed-by-user') {
      errorMsg.value = 'Google 로그인 창이 닫혔습니다.'
    } else if (err.code === 'auth/configuration-not-found' || (err.message && err.message.includes('configuration-not-found'))) {
      errorMsg.value = 'Firebase 프로젝트에 Google 로그인 제공업체(Provider)가 설정되지 않았습니다.\n👉 해결 방법: Firebase 콘솔 ➔ Authentication ➔ [Sign-in method] 탭에서 "Google"을 추가하고 "사용 설정"을 켜주세요.'
    } else if (err.code === 'auth/unauthorized-domain') {
      errorMsg.value = '현재 도메인이 Firebase 승인된 도메인에 등록되지 않았습니다.\n👉 해결 방법: Firebase 콘솔 ➔ Authentication ➔ [설정] ➔ [승인된 도메인]에 현재 사이트 주소(호스트명)를 추가해주세요.'
    } else {
      errorMsg.value = err.message || 'Google 로그인 중 오류가 발생했습니다. Firebase 설정을 확인해주세요.'
    }
  } finally {
    isGoogleLoading.value = false
  }
}


const goBackToInvitation = () => {
  router.push('/')
}
</script>

<template>
  <div class="login-wrapper font-sans">
    <div class="login-card card-paper">
      <button class="back-btn" @click="goBackToInvitation">
        <ArrowLeft :size="16" />
        <span>청첩장으로 돌아가기</span>
      </button>

      <div class="lock-icon-wrap">
        <Lock :size="32" class="lock-icon" />
      </div>

      <h2 class="login-title font-serif">관리자 모드</h2>
      <p class="login-sub">
        웨딩 사진 등록 및 청첩장 정보를 관리합니다.<br />
        비밀번호 또는 인증된 Google 계정으로 로그인해 주세요.
      </p>

      <!-- 1. Password (PIN) Login Form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-wrap">
          <KeyRound :size="18" class="input-icon" />
          <input
            v-model="pinInput"
            type="password"
            placeholder="관리자 비밀번호 입력"
            class="pin-input"
            autofocus
            required
          />
        </div>

        <button type="submit" class="btn-primary submit-btn">
          <span>비밀번호로 로그인</span>
        </button>
      </form>

      <!-- Divider -->
      <div class="login-divider">
        <span class="divider-line"></span>
        <span class="divider-text">또는</span>
        <span class="divider-line"></span>
      </div>

      <!-- 2. Google Account Login Button -->
      <button
        type="button"
        class="google-login-btn font-sans"
        :disabled="isGoogleLoading"
        @click="handleGoogleLogin"
      >
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>{{ isGoogleLoading ? 'Google 계정 확인 중...' : 'Google 계정으로 로그인' }}</span>
      </button>

      <!-- Error Alert Message -->
      <div v-if="errorMsg" class="error-alert font-sans">
        <AlertCircle :size="15" class="error-icon" />
        <span class="error-msg-text">{{ errorMsg }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 36px 28px;
  text-align: center;
  position: relative;
}

.back-btn {
  position: absolute;
  top: 18px;
  left: 18px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
}

.back-btn:hover {
  color: var(--gold-primary);
}

.lock-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--gold-soft);
  color: var(--gold-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px auto 16px;
}

.login-title {
  font-size: 22px;
  color: var(--text-main);
  margin-bottom: 8px;
}

.login-sub {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.5;
  margin-bottom: 24px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: var(--text-muted);
}

.pin-input {
  width: 100%;
  padding: 13px 14px 13px 44px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  font-size: 15px;
  outline: none;
  background: var(--bg-ivory);
}

.pin-input:focus {
  border-color: var(--gold-primary);
  background: #FFFFFF;
}

.error-text {
  font-size: 12px;
  color: var(--rose-accent);
}

.submit-btn {
  width: 100%;
  padding: 13px 0;
  font-size: 15px;
  margin-top: 4px;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 14px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background-color: var(--border-color);
}

.divider-text {
  font-size: 12px;
  color: var(--text-muted);
}

.google-login-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 16px;
  background: #FFFFFF;
  border: 1px solid #DADCE0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #3C4043;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.08);
}

.google-login-btn:hover {
  background: #F8F9FA;
  border-color: #C6C9CE;
  box-shadow: 0 2px 6px rgba(60, 64, 67, 0.15);
}

.google-login-btn:active {
  background: #EEEEEE;
  transform: scale(0.99);
}

.google-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.google-icon {
  flex-shrink: 0;
}

.error-alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 12px;
  background: #FCE8E6;
  border: 1px solid #FAD2CF;
  border-radius: 8px;
  color: #C5221F;
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
}

.error-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.error-msg-text {
  word-break: keep-all;
  overflow-wrap: break-word;
  white-space: pre-line;
}
</style>
