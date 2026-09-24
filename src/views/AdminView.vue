<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AdminLogin from '../components/admin/AdminLogin.vue'
import PhotoManager from '../components/admin/PhotoManager.vue'
import InfoEditor from '../components/admin/InfoEditor.vue'
import AccountManager from '../components/admin/AccountManager.vue'
import RsvpViewer from '../components/admin/RsvpViewer.vue'
import GuestbookModerator from '../components/admin/GuestbookModerator.vue'
import LiveSnapManager from '../components/admin/LiveSnapManager.vue'
import AdminSettings from '../components/admin/AdminSettings.vue'
import {
  Image as ImageIcon,
  FileText,
  CreditCard,
  Users,
  MessageSquare,
  Camera,
  Settings,
  ExternalLink,
  LogOut
} from 'lucide-vue-next'

const SESSION_KEY = 'wedding_admin_session_expiry'
const SESSION_DURATION_MS = 30 * 60 * 1000 // 30분 세션 유지

function checkSession(): boolean {
  try {
    const expiryStr = localStorage.getItem(SESSION_KEY)
    if (!expiryStr) return false
    const expiry = parseInt(expiryStr, 10)
    if (Date.now() < expiry) {
      // 세션 유효: 활동 감지로 30분 연장
      const newExpiry = Date.now() + SESSION_DURATION_MS
      localStorage.setItem(SESSION_KEY, newExpiry.toString())
      return true
    } else {
      localStorage.removeItem(SESSION_KEY)
      return false
    }
  } catch (e) {
    return false
  }
}

function updateSession() {
  try {
    const newExpiry = Date.now() + SESSION_DURATION_MS
    localStorage.setItem(SESSION_KEY, newExpiry.toString())
  } catch (e) {}
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (e) {}
}

const isAuthenticated = ref(checkSession())
const activeTab = ref<'photos' | 'info' | 'accounts' | 'rsvp' | 'guestbook' | 'livesnap' | 'settings'>('photos')

let originalTitle = document.title
onMounted(() => {
  originalTitle = document.title
  document.title = '청첩장 관리자 페이지'
})

onUnmounted(() => {
  document.title = originalTitle || '소중한 분들을 초대합니다'
})

const handleLoginSuccess = () => {
  updateSession()
  isAuthenticated.value = true
}

const handleLogout = () => {
  clearSession()
  isAuthenticated.value = false
}

const goToInvitation = () => {
  // 현재 URL에서 해시(#/admin 등)를 제거하고 기본 청첩장 메인 URL로 새 탭 열기
  // 예: https://yanggang-with.github.io/wedding-invitation/#/admin -> https://yanggang-with.github.io/wedding-invitation/
  // 예: https://oppsjw.github.io/wedding-invitation/#/admin -> https://oppsjw.github.io/wedding-invitation/
  const baseUrl = window.location.href.split('#')[0]
  window.open(baseUrl, '_blank')
}
</script>

<template>
  <div class="admin-page">
    <!-- 1. If not authenticated, show login form -->
    <AdminLogin v-if="!isAuthenticated" @login-success="handleLoginSuccess" />

    <!-- 2. Authenticated Admin Dashboard -->
    <div v-else class="admin-frame font-sans">
      <!-- Admin Top Bar -->
      <header class="admin-topbar">
        <div class="topbar-left">
          <h1 class="brand-title font-serif">웨딩 청첩장 관리자 센터</h1>
          <span class="auth-badge">관리자 인증됨</span>
        </div>

        <div class="topbar-actions">
          <button class="top-btn preview" @click="goToInvitation">
            <ExternalLink :size="14" />
            <span>청첩장 보러가기</span>
          </button>

          <button class="top-btn logout" @click="handleLogout">
            <LogOut :size="14" />
            <span>로그아웃</span>
          </button>
        </div>
      </header>

      <!-- Admin Tab Navigation -->
      <nav class="admin-tabs-nav">
        <button
          class="tab-btn"
          :class="{ 'active': activeTab === 'photos' }"
          @click="activeTab = 'photos'"
        >
          <ImageIcon :size="16" />
          <span>사진 관리</span>
        </button>

        <button
          class="tab-btn"
          :class="{ 'active': activeTab === 'info' }"
          @click="activeTab = 'info'"
        >
          <FileText :size="16" />
          <span>예식 정보</span>
        </button>

        <button
          class="tab-btn"
          :class="{ 'active': activeTab === 'accounts' }"
          @click="activeTab = 'accounts'"
        >
          <CreditCard :size="16" />
          <span>계좌번호</span>
        </button>

        <button
          class="tab-btn"
          :class="{ 'active': activeTab === 'rsvp' }"
          @click="activeTab = 'rsvp'"
        >
          <Users :size="16" />
          <span>참석 명단</span>
        </button>

        <button
          class="tab-btn"
          :class="{ 'active': activeTab === 'guestbook' }"
          @click="activeTab = 'guestbook'"
        >
          <MessageSquare :size="16" />
          <span>방명록</span>
        </button>

        <button
          class="tab-btn"
          :class="{ 'active': activeTab === 'livesnap' }"
          @click="activeTab = 'livesnap'"
        >
          <Camera :size="16" />
          <span>현장 스냅</span>
        </button>

        <button
          class="tab-btn"
          :class="{ 'active': activeTab === 'settings' }"
          @click="activeTab = 'settings'"
        >
          <Settings :size="16" />
          <span>설정</span>
        </button>
      </nav>

      <!-- Tab Content Panels -->
      <main class="admin-content-wrap">
        <PhotoManager v-if="activeTab === 'photos'" />
        <InfoEditor v-else-if="activeTab === 'info'" />
        <AccountManager v-else-if="activeTab === 'accounts'" />
        <RsvpViewer v-else-if="activeTab === 'rsvp'" />
        <GuestbookModerator v-else-if="activeTab === 'guestbook'" />
        <LiveSnapManager v-else-if="activeTab === 'livesnap'" />
        <AdminSettings v-else-if="activeTab === 'settings'" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  width: 100%;
  min-height: 100vh;
  background-color: var(--bg-ivory);
  display: flex;
  justify-content: center;
}

.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: #FFFFFF;
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
  gap: 12px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
}

.auth-badge {
  font-size: 11px;
  background: #E6F4EA;
  color: #137333;
  padding: 3px 8px;
  border-radius: 9999px;
  font-weight: 600;
}

.topbar-actions {
  display: flex;
  gap: 8px;
}

.top-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: #FFFFFF;
  color: var(--text-main);
  transition: all 0.15s;
}

.top-btn.preview {
  background: var(--gold-soft);
  color: var(--gold-dark);
  border-color: var(--gold-light);
}

.top-btn.logout:hover {
  background: #FEECEB;
  color: var(--rose-accent);
}

/* Tabs Navigation */
.admin-tabs-nav {
  display: flex;
  background: #FFFFFF;
  border-bottom: 1px solid var(--border-light);
  padding: 0 20px;
  overflow-x: auto;
  gap: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-sub);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--gold-dark);
}

.tab-btn.active {
  color: var(--gold-primary);
  border-bottom-color: var(--gold-primary);
  font-weight: 600;
}

.admin-frame {
  width: 100%;
  max-width: 1000px;
  box-sizing: border-box;
  overflow-x: hidden;
}

.admin-content-wrap {
  padding: 0 28px;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .admin-topbar {
    padding: 14px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .topbar-left {
    width: 100%;
    justify-content: space-between;
  }

  .topbar-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .admin-tabs-nav {
    padding: 0 10px;
    gap: 2px;
    -webkit-overflow-scrolling: touch;
  }

  .tab-btn {
    padding: 12px 10px;
    font-size: 12px;
    gap: 4px;
  }

  .admin-content-wrap {
    padding-left: 12px;
    padding-right: 12px;
  }
}
</style>

