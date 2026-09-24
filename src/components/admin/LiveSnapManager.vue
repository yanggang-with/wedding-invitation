<script setup lang="ts">
import { ref } from 'vue'
import {
  liveSnaps,
  adminSettings,
  deleteLiveSnap,
  toggleLiveSnapVisibility,
  weddingInfo,
  isWeddingDayOrLater
} from '../../services/storage'
import type { LiveSnapItem } from '../../types/wedding'
import {
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  Play,
  Calendar,
  Sparkles,
  Eye,
  EyeOff,
  X,
  Maximize2,
  HardDrive,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-vue-next'
import { uploadToGoogleDrive } from '../../services/storage'

const showSection = ref(adminSettings.value.showLiveSnapSection !== false)
const forceShow = ref(!!adminSettings.value.forceShowLiveSnap)
const googleDriveScriptUrl = ref(adminSettings.value.googleDriveScriptUrl || '')
const googleDriveFolderId = ref(adminSettings.value.googleDriveFolderId || '')
const isTestingDrive = ref(false)
const driveTestResult = ref<{ ok: boolean; message: string } | null>(null)
const isCopiedScript = ref(false)
const showGuide = ref(false)
const saveFeedback = ref('')
const selectedSnap = ref<LiveSnapItem | null>(null)

const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderId = data.folderId || "YOUR_GOOGLE_DRIVE_FOLDER_ID";
    var folder = DriveApp.getFolderById(folderId);
    
    var decoded = Utilities.base64Decode(data.fileBase64);
    var blob = Utilities.newBlob(decoded, data.mimeType, data.fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    if (data.mimeType && data.mimeType.indexOf("video/") === 0) {
      directUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: fileId,
      url: directUrl,
      driveUrl: file.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`

function copyScriptCode() {
  navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE).then(() => {
    isCopiedScript.value = true
    setTimeout(() => {
      isCopiedScript.value = false
    }, 2500)
  })
}

async function testDriveUpload() {
  if (!googleDriveScriptUrl.value) {
    driveTestResult.value = { ok: false, message: 'Google Apps Script 웹 앱 URL을 먼저 입력해주세요.' }
    return
  }

  isTestingDrive.value = true
  driveTestResult.value = null

  try {
    // 1x1 transparent PNG file for testing
    const base64Pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    const byteCharacters = atob(base64Pixel)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const testFile = new File([byteArray], 'connection_test.png', { type: 'image/png' })

    const uploadedUrl = await uploadToGoogleDrive(
      testFile,
      googleDriveScriptUrl.value,
      googleDriveFolderId.value
    )

    driveTestResult.value = {
      ok: true,
      message: `구글 드라이브 업로드 테스트 성공! (URL: ${uploadedUrl})`
    }
  } catch (err: any) {
    driveTestResult.value = {
      ok: false,
      message: `연동 실패: ${err.message || err}`
    }
  } finally {
    isTestingDrive.value = false
  }
}

function saveSettings() {
  adminSettings.value = {
    ...adminSettings.value,
    showLiveSnapSection: showSection.value,
    forceShowLiveSnap: forceShow.value,
    googleDriveScriptUrl: googleDriveScriptUrl.value.trim(),
    googleDriveFolderId: googleDriveFolderId.value.trim()
  }
  saveFeedback.value = '설정이 성공적으로 저장되었습니다.'
  setTimeout(() => {
    saveFeedback.value = ''
  }, 2500)
}

function handleToggleVisibility(id: string) {
  toggleLiveSnapVisibility(id)
}

function handleDelete(id: string) {
  if (confirm('이 현장 스냅 사진/영상을 삭제하시겠습니까?\n\n• 청첩장 화면 및 서버 저장소에서 영구 삭제됩니다.')) {
    deleteLiveSnap(id)
    if (selectedSnap.value && selectedSnap.value.id === id) {
      selectedSnap.value = null
    }
  }
}
</script>

<template>
  <div class="livesnap-manager font-sans">
    <!-- Header -->
    <div class="manager-header">
      <h3 class="manager-title font-serif">현장 스냅 관리</h3>
      <p class="manager-desc">
        결혼식 당일 하객들이 직접 올리는 현장 사진 및 동영상을 관리하고, 구글 드라이브(Google Drive) 저장소를 연동합니다.
      </p>
    </div>

    <!-- 1. Display & Test Mode Settings Card -->
    <div class="card-paper manager-card">
      <div class="card-title-row">
        <Sparkles :size="18" class="title-icon gold" />
        <h4 class="card-title font-serif">현장 스냅 노출 및 테스트 모드</h4>
      </div>

      <!-- 1) Section Visibility (Show/Hide) Switch -->
      <div class="status-banner" :class="showSection ? 'is-active' : 'is-pending'">
        <div class="banner-left">
          <Eye v-if="showSection" :size="18" class="banner-icon" />
          <EyeOff v-else :size="18" class="banner-icon" />
          <div class="banner-text">
            <p class="banner-title">
              청첩장 현장스냅 섹션: <strong>{{ showSection ? '보이기 (노출)' : '숨기기 (비활성화)' }}</strong>
            </p>
            <p class="banner-desc">
              {{ showSection ? '하객들이 청첩장에서 현장스냅 섹션과 업로드 기능을 볼 수 있습니다.' : '청첩장에서 현장스냅 섹션이 완전히 숨겨집니다.' }}
            </p>
          </div>
        </div>

        <div class="banner-right">
          <div class="test-label-group">
            <span class="test-title">기능 노출</span>
            <span class="test-badge" :class="{ on: showSection }">
              {{ showSection ? 'ON' : 'OFF' }}
            </span>
          </div>
          <label class="switch">
            <input
              v-model="showSection"
              type="checkbox"
              @change="saveSettings"
            />
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <!-- 2) Wedding Date Status Banner with Test Mode Switch on Right End -->
      <div
        class="status-banner"
        :class="isWeddingDayOrLater(weddingInfo.date, forceShow) ? 'is-active' : 'is-pending'"
      >
        <div class="banner-left">
          <Calendar :size="18" class="banner-icon" />
          <div class="banner-text">
            <p class="banner-title">
              예식 일자: {{ weddingInfo.date ? weddingInfo.date.replace('T', ' ') : '미설정' }}
            </p>
            <p v-if="isWeddingDayOrLater(weddingInfo.date, forceShow)" class="banner-desc">
              현재 청첩장에 <strong>'현장 스냅' 영역이 정상 노출</strong>되고 있습니다.
            </p>
            <p v-else class="banner-desc">
              결혼식 날짜 전에는 청첩장에 숨겨집니다. 미리보기를 원하시면 우측의 테스트 모드를 켜주세요.
            </p>
          </div>
        </div>

        <div class="banner-right">
          <div class="test-label-group">
            <span class="test-title">테스트 모드</span>
            <span class="test-badge" :class="{ on: forceShow }">
              {{ forceShow ? 'ON' : 'OFF' }}
            </span>
          </div>
          <label class="switch">
            <input
              v-model="forceShow"
              type="checkbox"
              @change="saveSettings"
            />
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <!-- Save Feedback Message -->
      <div v-if="saveFeedback" class="save-feedback-box">
        <CheckCircle2 :size="15" />
        <span>{{ saveFeedback }}</span>
      </div>
    </div>

    <!-- 2. Google Drive Storage Integration Card -->
    <div class="card-paper manager-card">
      <div class="card-title-row">
        <HardDrive :size="18" class="title-icon gold" />
        <h4 class="card-title font-serif">Google Drive 저장소 연동 (Firebase Storage 대체)</h4>
        <span
          class="status-pill"
          :class="googleDriveScriptUrl ? 'status-pill-active' : 'status-pill-inactive'"
        >
          {{ googleDriveScriptUrl ? '구글 드라이브 연동 중' : '미연동 (Firebase / 로컬)' }}
        </span>
      </div>

      <p class="manager-desc-sm">
        하객이 올린 현장 사진/영상을 Firebase Storage 대신 <strong>신랑/신부님의 구글 드라이브 특정 폴더로 직접 저장</strong>합니다.
        (하객의 구글 로그인 없이 신랑/신부님의 구글 드라이브 15GB 무료 용량을 활용하여 안전하게 저장됩니다.)
      </p>

      <!-- Apps Script URL Input -->
      <div class="form-group-section">
        <label class="section-input-label">
          Google Apps Script 웹 앱(Web App) 배포 URL
          <span class="required-mark">*</span>
        </label>
        <div class="album-input-row">
          <input
            v-model="googleDriveScriptUrl"
            type="url"
            placeholder="예: https://script.google.com/macros/s/.../exec"
            class="input-field album-input"
          />
          <div class="album-btn-group">
            <button
              type="button"
              class="btn-secondary test-btn"
              :disabled="!googleDriveScriptUrl || isTestingDrive"
              @click="testDriveUpload"
            >
              <span v-if="!isTestingDrive">연동 테스트</span>
              <span v-else>테스트 중...</span>
            </button>
            <button
              type="button"
              class="btn-primary save-btn"
              @click="saveSettings"
            >
              <Save :size="14" />
              <span>저장</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Google Drive Folder ID Input -->
      <div class="form-group-section">
        <label class="section-input-label">
          저장 대상 Google Drive 폴더 ID <span class="label-opt">(선택 - 스크립트에 고정 작성 시 생략 가능)</span>
        </label>
        <input
          v-model="googleDriveFolderId"
          type="text"
          placeholder="예: 1A2b3C4d5E... (폴더 링크의 folders/ 뒤에 있는 영문숫자 ID)"
          class="input-field"
        />
        <p class="input-helper">
          * 구글 드라이브에서 만든 폴더 주소(예: https://drive.google.com/drive/folders/<strong>1AbC...</strong>)의 마지막 영문숫자 문자열입니다.
        </p>
      </div>

      <!-- Test Result Alert -->
      <div
        v-if="driveTestResult"
        class="drive-test-alert"
        :class="driveTestResult.ok ? 'test-success' : 'test-error'"
      >
        <CheckCircle2 v-if="driveTestResult.ok" :size="16" class="alert-icon" />
        <AlertCircle v-else :size="16" class="alert-icon" />
        <span>{{ driveTestResult.message }}</span>
      </div>

      <!-- 1-Minute Setup Guide & Code Snippet Box -->
      <div class="gas-guide-box">
        <div class="gas-guide-header" @click="showGuide = !showGuide">
          <div class="gas-guide-title">
            <Sparkles :size="15" class="gold" />
            <strong>구글 드라이브 1분 연동 가이드 & 스크립트 코드</strong>
          </div>
          <button type="button" class="guide-toggle-btn">
            <ChevronUp v-if="showGuide" :size="16" />
            <ChevronDown v-else :size="16" />
          </button>
        </div>

        <div v-show="showGuide" class="gas-guide-content">
          <ol class="gas-steps">
            <li>
              <strong>Google Drive 폴더 생성</strong>:
              두 분의 구글 드라이브에 현장 스냅 사진을 모을 새 폴더(예: <code>결혼식 현장스냅</code>)를 만듭니다.
            </li>
            <li>
              <strong>Apps Script 열기</strong>:
              브라우저에서 <a href="https://script.google.com/home/start" target="_blank" rel="noopener noreferrer" class="gas-link">script.google.com</a>에 접속 후 <strong>[새 프로젝트]</strong>를 누릅니다.
            </li>
            <li>
              <strong>코드 붙여넣기</strong>:
              기존 코드를 지우고, 아래 상자의 코드를 복사하여 붙여넣습니다. (<code>YOUR_GOOGLE_DRIVE_FOLDER_ID</code> 부분에 1번의 폴더 ID 입력)
            </li>
            <li>
              <strong>웹 앱으로 배포</strong>:
              우측 상단 <strong>[배포] ➔ [새 배포]</strong> 클릭 ➔ 톱니바퀴 [유형 선택: <strong>웹 앱</strong>] ➔
              설정: 실행할 사용자 <strong>[나]</strong>, 액세스 권한 <strong>[모든 사용자(Anyone)]</strong> ➔ <strong>[배포]</strong> 클릭
            </li>
            <li>
              <strong>배포 URL 복사</strong>:
              배포 완료 후 나오는 <strong>웹 앱 URL(끝이 /exec로 끝나는 주소)</strong>을 위 입력란에 붙여넣고 [저장] 및 [연동 테스트]를 누르면 완료됩니다!
            </li>
          </ol>

          <!-- Code Box with Copy Button -->
          <div class="code-box-wrapper">
            <div class="code-box-header">
              <span class="code-box-lang">Google Apps Script (doPost)</span>
              <button
                type="button"
                class="copy-code-btn"
                @click="copyScriptCode"
              >
                <Check v-if="isCopiedScript" :size="13" class="copy-check" />
                <Copy v-else :size="13" />
                <span>{{ isCopiedScript ? '복사 완료!' : '코드 복사' }}</span>
              </button>
            </div>
            <pre class="code-pre"><code>{{ APPS_SCRIPT_TEMPLATE }}</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Uploaded Snaps Management List -->
    <div class="card-paper manager-card">
      <div class="snaps-list-header">
        <div class="card-title-row no-margin">
          <Camera :size="18" class="title-icon" />
          <h4 class="card-title font-serif">등록된 현장 스냅 목록</h4>
          <span class="count-badge">총 {{ liveSnaps.length }}개</span>
        </div>
      </div>

      <!-- Snaps Grid -->
      <div v-if="liveSnaps.length > 0" class="admin-snaps-grid">
        <div
          v-for="snap in liveSnaps"
          :key="snap.id"
          class="admin-snap-card"
          :class="{ 'snap-item-hidden': snap.isHidden }"
        >
          <!-- Media Preview (Clickable to open lightbox) -->
          <div
            class="admin-snap-media"
            @click="selectedSnap = snap"
            title="클릭하여 원본 미리보기"
          >
            <img
              v-if="snap.type === 'image'"
              :src="snap.url"
              alt="현장 스냅"
              class="admin-media-thumb"
            />
            <div v-else class="admin-video-wrap">
              <video :src="snap.url" class="admin-media-thumb" preload="metadata"></video>
              <div class="video-overlay">
                <Play :size="20" class="play-symbol" />
              </div>
            </div>

            <!-- Hover Preview Overlay -->
            <div class="media-hover-overlay">
              <Maximize2 :size="18" class="zoom-icon" />
              <span>크게 보기</span>
            </div>

            <!-- Tags -->
            <span class="type-tag">{{ snap.type === 'image' ? '사진' : '동영상' }}</span>
            <span v-if="snap.isHidden" class="hidden-tag">숨김됨</span>
          </div>

          <!-- Snap Details -->
          <div class="admin-snap-body">
            <div class="snap-meta-row">
              <strong class="snap-author">{{ snap.senderName || '익명 하객' }}</strong>
              <span class="snap-date">{{ new Date(snap.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>
            <p v-if="snap.message" class="snap-caption">{{ snap.message }}</p>
            <p v-else class="snap-no-caption">(메시지 없음)</p>

            <!-- Card Footer Actions: Visibility Toggle & Delete -->
            <div class="snap-footer-action">
              <button
                type="button"
                class="visibility-toggle-btn"
                :class="{ 'is-hidden': snap.isHidden }"
                @click.stop="handleToggleVisibility(snap.id)"
                :title="snap.isHidden ? '청첩장에 다시 표시' : '청첩장에서 숨김'"
              >
                <Eye v-if="snap.isHidden" :size="13" />
                <EyeOff v-else :size="13" />
                <span>{{ snap.isHidden ? '보이기' : '숨김' }}</span>
              </button>

              <button
                type="button"
                class="delete-snap-btn"
                @click.stop="handleDelete(snap.id)"
                title="삭제하기"
              >
                <Trash2 :size="13" />
                <span>삭제</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="admin-empty-state">
        <Camera :size="32" class="empty-icon" />
        <p>등록된 현장 스냅이 없습니다.</p>
      </div>
    </div>

    <!-- Admin Preview Lightbox Modal -->
    <Transition name="modal-fade">
      <div
        v-if="selectedSnap"
        class="admin-lightbox-backdrop"
        @click="selectedSnap = null"
      >
        <div class="admin-lightbox-dialog" @click.stop>
          <button class="admin-lightbox-close" @click="selectedSnap = null">
            <X :size="20" />
          </button>

          <div class="admin-lightbox-media">
            <img
              v-if="selectedSnap.type === 'image'"
              :src="selectedSnap.url"
              alt="현장 스냅 확대 미리보기"
              class="admin-lightbox-img"
            />
            <video
              v-else
              :src="selectedSnap.url"
              controls
              autoplay
              class="admin-lightbox-video"
            ></video>
          </div>

          <div class="admin-lightbox-info">
            <div class="lightbox-info-top">
              <div class="lightbox-info-meta">
                <strong class="lightbox-author">{{ selectedSnap.senderName || '익명 하객' }}</strong>
                <span class="lightbox-time">{{ new Date(selectedSnap.createdAt).toLocaleString('ko-KR') }}</span>
              </div>
              <span v-if="selectedSnap.isHidden" class="lightbox-badge hidden">숨김 상태</span>
              <span v-else class="lightbox-badge visible">청첩장 노출 중</span>
            </div>

            <p v-if="selectedSnap.message" class="lightbox-message">{{ selectedSnap.message }}</p>
            <p v-else class="lightbox-no-message">작성된 축하 메시지가 없습니다.</p>

            <div class="lightbox-actions">
              <button
                type="button"
                class="btn-secondary lightbox-btn"
                @click="handleToggleVisibility(selectedSnap.id)"
              >
                <Eye v-if="selectedSnap.isHidden" :size="14" />
                <EyeOff v-else :size="14" />
                <span>{{ selectedSnap.isHidden ? '청첩장에 노출하기' : '청첩장에서 숨기기' }}</span>
              </button>

              <button
                type="button"
                class="delete-snap-btn lightbox-del-btn"
                @click="handleDelete(selectedSnap.id)"
              >
                <Trash2 :size="14" />
                <span>삭제</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.livesnap-manager {
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.manager-header {
  margin-bottom: 8px;
}

.manager-title {
  font-size: 20px;
  color: var(--text-main);
  margin-bottom: 4px;
}

.manager-desc {
  font-size: 13px;
  color: var(--text-sub);
}

.manager-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title-row.no-margin {
  margin: 0;
}

.title-icon {
  color: var(--text-main);
}

.title-icon.gold {
  color: var(--gold-primary);
}

.card-title {
  font-size: 16px;
  color: var(--text-main);
  font-weight: 700;
}

.count-badge {
  font-size: 11px;
  background: var(--bg-subtle);
  color: var(--text-sub);
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
  margin-left: 4px;
}

/* Status Pill */
.status-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  margin-left: 6px;
}

.status-pill-active {
  background: #E6F4EA;
  color: #137333;
  border: 1px solid #CEEAD6;
}

.status-pill-inactive {
  background: var(--bg-subtle);
  color: var(--text-muted);
  border: 1px solid var(--border-light);
}

.manager-desc-sm {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
  margin: -6px 0 4px 0;
}

.required-mark {
  color: #E53935;
  font-weight: 700;
  margin-left: 2px;
}

.label-opt {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}

/* Drive Test Alert */
.drive-test-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.drive-test-alert.test-success {
  background: #E6F4EA;
  color: #137333;
  border: 1px solid #CEEAD6;
}

.drive-test-alert.test-error {
  background: #FEECEB;
  color: #C5221F;
  border: 1px solid #F8B4B0;
}

/* Google Apps Script Guide Box */
.gas-guide-box {
  background: #F9F7F4;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  margin-top: 4px;
}

.gas-guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #F4EFEA;
  cursor: pointer;
  user-select: none;
}

.gas-guide-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-main);
}

.guide-toggle-btn {
  background: none;
  border: none;
  color: var(--text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.gas-guide-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gas-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--text-main);
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gas-steps code {
  background: #EDE6DE;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--gold-dark);
}

.gas-link {
  color: #1A73E8;
  font-weight: 600;
  text-decoration: underline;
}

/* Code Box */
.code-box-wrapper {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #333333;
  background: #1E1E1E;
}

.code-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #2D2D2D;
  border-bottom: 1px solid #3D3D3D;
}

.code-box-lang {
  font-size: 11px;
  font-weight: 600;
  color: #B0B0B0;
  font-family: monospace;
}

.copy-code-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #3E3E3E;
  border: 1px solid #555555;
  color: #FFFFFF;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.copy-code-btn:hover {
  background: #4E4E4E;
}

.copy-check {
  color: #4CAF50;
}

.code-pre {
  margin: 0;
  padding: 14px;
  font-size: 11px;
  line-height: 1.45;
  color: #D4D4D4;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  overflow-x: auto;
  max-height: 240px;
}

/* Status Banner */
.status-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  font-size: 12px;
  flex-wrap: wrap;
}

.status-banner.is-active {
  background: #E6F4EA;
  color: #137333;
  border: 1px solid #CEEAD6;
}

.status-banner.is-pending {
  background: #FEF7E0;
  color: #B06000;
  border: 1px solid #FEEFC3;
}

.banner-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 220px;
}

.banner-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.banner-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.banner-title {
  font-weight: 700;
  font-size: 13px;
}

.banner-desc {
  font-size: 12px;
  line-height: 1.4;
  opacity: 0.9;
}

.banner-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding-left: 10px;
}

.test-label-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.test-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
}

.test-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: #D3C9BE;
  color: #FFFFFF;
}

.test-badge.on {
  background: var(--gold-primary);
}

/* Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #D3C9BE;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--gold-primary);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* Album URL Input */
.form-group-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-input-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.album-input-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.album-input {
  flex: 1;
  min-width: 240px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  background: var(--bg-ivory);
  color: var(--text-main);
  outline: none;
}

.album-input:focus {
  border-color: var(--gold-primary);
  background: #FFFFFF;
}

.album-btn-group {
  display: flex;
  gap: 8px;
}

.test-btn {
  padding: 10px 14px;
  font-size: 12px;
  border-radius: 10px;
}

.save-btn {
  padding: 10px 16px;
  font-size: 12px;
  border-radius: 10px;
}

.input-helper {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}

.save-feedback-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #E6F4EA;
  color: #137333;
  font-size: 12px;
  font-weight: 500;
}

/* Snaps Grid */
.snaps-list-header {
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 12px;
}

.admin-snaps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.admin-snap-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-ivory);
  display: flex;
  flex-direction: column;
  transition: transform 0.15s, box-shadow 0.15s;
}

.admin-snap-card:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.admin-snap-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #1A1816;
  overflow: hidden;
  cursor: pointer;
}

.admin-media-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.admin-video-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

.video-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-symbol {
  color: #FFFFFF;
  fill: #FFFFFF;
}

.type-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.65);
  color: #FFFFFF;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.media-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s ease;
  backdrop-filter: blur(2px);
  z-index: 1;
}

.admin-snap-media:hover .media-hover-overlay {
  opacity: 1;
}

.zoom-icon {
  color: #FFFFFF;
}

.snap-item-hidden {
  opacity: 0.72;
  border-style: dashed;
  border-color: #D3C9BE;
}

.snap-item-hidden .admin-media-thumb {
  filter: grayscale(45%);
}

.hidden-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(198, 40, 40, 0.88);
  color: #FFFFFF;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.admin-snap-body {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  background: #FFFFFF;
}

.snap-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.snap-author {
  font-size: 12px;
  color: var(--text-main);
  font-weight: 600;
}

.snap-date {
  color: var(--text-muted);
}

.snap-caption {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.4;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.snap-no-caption {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.snap-footer-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
  gap: 8px;
}

.visibility-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.15s;
}

.visibility-toggle-btn:hover {
  background: #EFEBE7;
  color: var(--text-main);
}

.visibility-toggle-btn.is-hidden {
  background: #FFF8E1;
  border-color: #FFE082;
  color: #F57F17;
  font-weight: 600;
}

.visibility-toggle-btn.is-hidden:hover {
  background: #FFECB3;
}

/* Admin Lightbox Modal */
.admin-lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.admin-lightbox-dialog {
  position: relative;
  background: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  max-width: 520px;
  width: 100%;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: dialog-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dialog-pop {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.admin-lightbox-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #FFFFFF;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.admin-lightbox-close:hover {
  background: rgba(0, 0, 0, 0.8);
}

.admin-lightbox-media {
  width: 100%;
  max-height: 60vh;
  background: #111111;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.admin-lightbox-img {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
}

.admin-lightbox-video {
  max-width: 100%;
  max-height: 60vh;
  width: 100%;
}

.admin-lightbox-info {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lightbox-info-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lightbox-info-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lightbox-author {
  font-size: 14px;
  color: var(--text-main);
}

.lightbox-time {
  font-size: 11px;
  color: var(--text-muted);
}

.lightbox-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}

.lightbox-badge.visible {
  background: #E6F4EA;
  color: #137333;
}

.lightbox-badge.hidden {
  background: #FEECEB;
  color: #C5221F;
}

.lightbox-message {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.5;
  background: var(--bg-ivory);
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  margin: 0;
  word-break: break-word;
}

.lightbox-no-message {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.lightbox-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

.lightbox-btn {
  padding: 8px 14px;
  font-size: 12px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lightbox-del-btn {
  padding: 8px 14px;
  font-size: 12px;
  border-radius: 8px;
}

.delete-snap-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--border-color);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--rose-accent);
  cursor: pointer;
  transition: all 0.15s;
}

.delete-snap-btn:hover {
  background: #FEECEB;
  border-color: #F8B4B0;
}

.admin-empty-state {
  text-align: center;
  padding: 36px 0;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.empty-icon {
  color: var(--border-color);
}

@media (max-width: 640px) {
  .manager-card {
    padding: 16px;
  }
  .album-input-row {
    flex-direction: column;
  }
  .album-btn-group {
    width: 100%;
  }
  .test-btn, .save-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
