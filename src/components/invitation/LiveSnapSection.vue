<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Camera, Play, Pause, X, Upload, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import {
  liveSnaps,
  weddingInfo,
  adminSettings,
  addLiveSnap,
  uploadLiveSnapMedia,
  isLiveSnapUploadActive,
  isStoryOpen,
  photos,
  initCloudSubscriptions
} from '../../services/storage'
import { DEFAULT_PHOTOS } from '../../constants/initialData'
import type { LiveSnapItem } from '../../types/wedding'

onMounted(() => {
  initCloudSubscriptions()
})

// Section is always visible even before wedding ceremony
const isVisible = computed(() => true)

// Upload button active starting 2 hours before ceremony or if forceShow is enabled
const isUploadActive = computed(() => {
  return isLiveSnapUploadActive(weddingInfo.value.date, adminSettings.value.forceShowLiveSnap)
})


// 실제 사용자가 업로드한 스냅 (더미 snap-1 등 제외)
const userUploadedSnaps = computed(() => {
  return liveSnaps.value.filter(s => !s.isHidden && !s.id.startsWith('snap-'))
})

// 사용자가 업로드한 사진이 1장 이상 있는지 여부
const hasUserSnaps = computed(() => {
  return userUploadedSnaps.value.length > 0
})

// 갤러리 섹션의 사진 중 6개를 선택하여 예시 스냅으로 사용 (2개 열에 각 3개씩 완벽 균형)
const galleryExampleSnaps = computed<LiveSnapItem[]>(() => {
  const source = (photos.value && photos.value.length > 0)
    ? photos.value.filter(p => !p.isHidden)
    : DEFAULT_PHOTOS
  const baseList = source.length > 0 ? source : DEFAULT_PHOTOS

  // 항상 6장을 채우도록 보장 (사진 수가 6장 미만인 경우 순환하여 채움)
  const selected: typeof baseList = []
  for (let i = 0; i < 6; i++) {
    selected.push(baseList[i % baseList.length])
  }

  // 메이슨리 룩을 위한 다양한 종횡비 지정
  const ratios = ['4/5', '1/1', '3/2', '4/5', '16/9', '4/5']

  return selected.map((p, idx) => ({
    id: `gallery-example-${p.id || idx}-${idx}`,
    type: 'image' as const,
    url: p.url,
    senderName: '웨딩 갤러리',
    message: p.caption || '',
    aspectRatio: ratios[idx % ratios.length],
    createdAt: p.createdAt || new Date().toISOString()
  }))
})

// 표시에 사용할 스냅 데이터
// 1) 사용자가 올린 사진이 없으면(ON/OFF 무관) 항상 갤러리 예시 사진 6장 사용
// 2) 사용자가 올린 사진이 1장 이상이면 실제 사용자 업로드 사진 사용
const currentDisplaySnaps = computed(() => {
  if (hasUserSnaps.value) {
    return userUploadedSnaps.value
  }
  return galleryExampleSnaps.value
})

// Auto-scroll Infinite Columns
const isPaused = ref(false)
const togglePause = () => {
  isPaused.value = !isPaused.value
}

interface StreamCardItem {
  id: string
  data: LiveSnapItem
  aspectRatio: string
  isExample: boolean
}

const MIN_COL_ITEMS = 3

// Column streams (clean snap photos)
const streamColumns = computed(() => {
  const snaps = currentDisplaySnaps.value
  const realCol1 = snaps.filter((_, i) => i % 2 === 0)
  const realCol2 = snaps.filter((_, i) => i % 2 === 1)

  const checkIsExample = (item: LiveSnapItem) => {
    return !hasUserSnaps.value || item.id.startsWith('gallery-example-') || item.id.startsWith('fallback-')
  }

  const col1Base: StreamCardItem[] = realCol1.map((s, idx) => ({
    id: s.id,
    data: s,
    aspectRatio: s.aspectRatio || (idx === 1 ? '1/1' : idx === 2 ? '3/2' : '4/5'),
    isExample: checkIsExample(s)
  }))

  const col2Base: StreamCardItem[] = realCol2.map((s, idx) => ({
    id: s.id,
    data: s,
    aspectRatio: s.aspectRatio || (idx === 0 ? '1/1' : idx === 2 ? '16/9' : '4/5'),
    isExample: checkIsExample(s)
  }))

  // 사용자들이 사진을 올린 상태일 때: 열 균형 유지를 위해 갤러리 사진으로 부족분 채움
  if (isUploadActive.value && hasUserSnaps.value) {
    const targetPerCol = Math.max(MIN_COL_ITEMS, realCol1.length, realCol2.length)
    while (col1Base.length < targetPerCol) {
      const fallbackSnap = galleryExampleSnaps.value[col1Base.length % galleryExampleSnaps.value.length]
      col1Base.push({
        id: `fallback-c1-${col1Base.length}`,
        data: fallbackSnap,
        aspectRatio: '4/5',
        isExample: true
      })
    }
    while (col2Base.length < targetPerCol) {
      const fallbackSnap = galleryExampleSnaps.value[(col2Base.length + 1) % galleryExampleSnaps.value.length]
      col2Base.push({
        id: `fallback-c2-${col2Base.length}`,
        data: fallbackSnap,
        aspectRatio: '4/5',
        isExample: true
      })
    }
  }

  // Duplicate for seamless translateY(-50%) infinite scroll
  return {
    col1: [...col1Base, ...col1Base],
    col2: [...col2Base, ...col2Base]
  }
})

const col1Items = computed(() => streamColumns.value.col1)
const col2Items = computed(() => streamColumns.value.col2)

function handleCompleteConfirm() {
  isCompleteModalOpen.value = false
  message.value = ''
  senderName.value = ''
}

// Upload Modal State
const isUploadModalOpen = ref(false)
const isCompleteModalOpen = ref(false)
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string>('')
const isVideoFile = ref(false)
const senderName = ref('')
const message = ref('')
const isUploading = ref(false)
const uploadProgress = ref(0)
const errorMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

// Lightbox State
const selectedSnap = ref<LiveSnapItem | null>(null)

// Hide navigation menu when any lightbox or modal is active
watch([selectedSnap, isUploadModalOpen, isCompleteModalOpen], ([snap, upload, complete]) => {
  isStoryOpen.value = Boolean(snap || upload || complete)
})

onUnmounted(() => {
  isStoryOpen.value = false
})

function handleSnapClick(snap?: LiveSnapItem, isExample?: boolean) {
  // When OFF (before wedding) or an example photo, preview lightbox is disabled
  if (!isUploadActive.value || !snap || isExample) return
  selectedSnap.value = snap
}

function handleUploadButtonClick() {
  if (!isUploadActive.value) {
    alert('현장 사진 및 동영상 올리기는 예식 당일 2시간 전부터 활성화됩니다.')
    return
  }
  openUploadModal()
}

function openUploadModal() {
  resetForm()
  isUploadModalOpen.value = true
}

function closeUploadModal() {
  if (isUploading.value) return
  isUploadModalOpen.value = false
  resetForm()
}

function resetForm() {
  selectedFile.value = null
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  isVideoFile.value = false
  senderName.value = ''
  message.value = ''
  isUploading.value = false
  uploadProgress.value = 0
  errorMessage.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  processFile(file)
}

function processFile(file: File) {
  errorMessage.value = ''
  const isVideo = file.type.startsWith('video/')
  isVideoFile.value = isVideo

  // Check 100MB limit for video
  if (isVideo) {
    const maxVideoBytes = 100 * 1024 * 1024 // 100MB
    if (file.size > maxVideoBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      errorMessage.value = `동영상 크기는 최대 100MB까지 가능합니다. (현재 파일: ${sizeMB}MB)`
      selectedFile.value = null
      previewUrl.value = ''
      return
    }
  }

  selectedFile.value = file
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = URL.createObjectURL(file)
}

async function handleUploadSubmit() {
  if (!selectedFile.value) {
    errorMessage.value = '업로드할 사진 또는 영상을 선택해주세요.'
    return
  }

  isUploading.value = true
  uploadProgress.value = 0
  errorMessage.value = ''

  try {
    const result = await uploadLiveSnapMedia(selectedFile.value, (percent) => {
      uploadProgress.value = percent
    })

    addLiveSnap({
      type: result.type,
      url: result.url,
      senderName: senderName.value.trim() || undefined,
      message: message.value.trim() || undefined,
      fileSize: selectedFile.value.size
    })

    closeUploadModal()
    isCompleteModalOpen.value = true
  } catch (err: any) {
    errorMessage.value = err.message || '업로드 중 오류가 발생했습니다. 다시 시도해주세요.'
  } finally {
    isUploading.value = false
  }
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}시간 전`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}일 전`
  } catch {
    return ''
  }
}
</script>

<template>
  <section v-if="isVisible" class="invitation-section livesnap-section">
    <div class="section-divider">
      <span class="section-label">LIVE SNAP</span>
    </div>

    <h2 class="section-title font-serif">현장 스냅</h2>
    <p class="section-subtitle font-serif">오늘의 소중한 순간들을 사진과 영상으로 함께 남겨주세요</p>

    <!-- Action Buttons Row (Only visible after live snap feature is active) -->
    <div v-if="isUploadActive" class="action-buttons-wrap font-sans">
      <button
        class="btn-primary snap-main-upload-btn"
        @click="handleUploadButtonClick"
      >
        <Camera :size="16" />
        <span>현장 사진 / 동영상 올리기</span>
      </button>
    </div>

    <!-- Scrolling Masonry Wall -->
    <div>
      <!-- Controls & Status Bar (Visible when snaps are active) -->
      <div v-if="isUploadActive" class="scroll-status-bar font-sans">
        <button class="scroll-pause-toggle" @click="togglePause">
          <Pause v-if="!isPaused" :size="12" />
          <Play v-else :size="12" />
          <span>{{ isPaused ? '자동 스크롤 재생' : '자동 스크롤 일시정지' }}</span>
        </button>
        <span class="tap-hint">사진을 누르면 크게 볼 수 있어요</span>
      </div>

      <div
        class="auto-scroll-viewport font-sans"
        :class="{ 'is-interactive': isUploadActive }"
      >
        <div class="masonry-columns-wrapper">
          <!-- Column 1 -->
          <div class="masonry-col">
            <div
              class="col-track col-track-1"
              :style="{ animationPlayState: isPaused ? 'paused' : 'running' }"
            >
              <template v-for="(item, idx) in col1Items" :key="'c1-' + item.id + '-' + idx">
                <div
                  v-if="item.data"
                  class="snap-card"
                  :style="{ aspectRatio: item.aspectRatio || '4/5' }"
                  :class="{ 'is-interactive': isUploadActive && !item.isExample }"
                  @click="handleSnapClick(item.data, item.isExample)"
                >
                  <img
                    v-if="item.data.type === 'image'"
                    :src="item.data.url"
                    alt="현장 스냅"
                    decoding="async"
                    class="snap-img"
                    :class="{ 'is-example-blur': isUploadActive && item.isExample }"
                  />
                  <div v-else class="snap-video-thumb">
                    <video :src="item.data.url" preload="metadata" playsinline muted></video>
                    <div class="play-badge">
                      <Play :size="15" class="play-icon" />
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Column 2 -->
          <div class="masonry-col">
            <div
              class="col-track col-track-2"
              :style="{ animationPlayState: isPaused ? 'paused' : 'running' }"
            >
              <template v-for="(item, idx) in col2Items" :key="'c2-' + item.id + '-' + idx">
                <div
                  v-if="item.data"
                  class="snap-card"
                  :style="{ aspectRatio: item.aspectRatio || '4/5' }"
                  :class="{ 'is-interactive': isUploadActive && !item.isExample }"
                  @click="handleSnapClick(item.data, item.isExample)"
                >
                  <img
                    v-if="item.data.type === 'image'"
                    :src="item.data.url"
                    alt="현장 스냅"
                    decoding="async"
                    class="snap-img"
                    :class="{ 'is-example-blur': isUploadActive && item.isExample }"
                  />
                  <div v-else class="snap-video-thumb">
                    <video :src="item.data.url" preload="metadata" playsinline muted></video>
                    <div class="play-badge">
                      <Play :size="15" class="play-icon" />
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Frosted Blurred Overlay covering the scrolling area before activation -->
        <div v-if="!isUploadActive" class="snap-scroll-frosted-overlay">
          <div class="frosted-overlay-card font-sans">
            <div class="overlay-icon-box">
              <Camera :size="28" class="overlay-camera-icon" />
            </div>
            <h3 class="overlay-main-text font-serif">
              이 자리에 여러분들이<br />
              찍어주신 사진을 올려주세요!
            </h3>
            <p class="overlay-sub-text font-sans">
              예식 당일 여러분이 담아주신 소중한 순간들이<br />
              이곳에 실시간으로 채워집니다.
            </p>

            <div class="overlay-btn-group font-sans">
              <button
                class="btn-primary overlay-action-btn font-sans"
                :disabled="!isUploadActive"
                @click="handleUploadButtonClick"
              >
                <Camera :size="15" />
                <span>사진 / 동영상 올리기</span>
              </button>
              <span class="overlay-time-notice font-sans">
                ※ 사진 및 영상 올리기는 예식 2시간 전부터 활성화됩니다
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Modal -->
    <Transition name="modal-fade">
      <div v-if="isUploadModalOpen" class="modal-backdrop" @click="closeUploadModal">
        <div class="modal-content font-sans" @click.stop>
          <button class="modal-close-btn" @click="closeUploadModal" :disabled="isUploading">
            <X :size="18" />
          </button>

          <h3 class="modal-title font-serif">현장 스냅 올리기</h3>
          <p class="modal-subtitle">예식의 순간을 담은 사진이나 영상을 남겨주세요.</p>

          <!-- File Upload Zone -->
          <div class="file-upload-area">
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*,video/*"
              class="hidden-file-input"
              @change="handleFileChange"
              :disabled="isUploading"
            />

            <div
              v-if="!selectedFile"
              class="dropzone-box"
              @click="fileInputRef?.click()"
            >
              <Upload :size="30" class="dropzone-icon" />
              <p class="dropzone-label">사진 또는 동영상 선택하기</p>
              <div class="dropzone-hints">
                <span>• 사진: 용량 무제한</span>
                <span>• 영상: 1개당 최대 100MB 이내</span>
              </div>
            </div>

            <div v-else class="preview-box">
              <img
                v-if="!isVideoFile"
                :src="previewUrl"
                alt="미리보기"
                class="preview-img"
              />
              <div v-else class="preview-video-wrap">
                <video :src="previewUrl" controls class="preview-video"></video>
              </div>

              <button
                v-if="!isUploading"
                type="button"
                class="reselect-btn"
                @click="fileInputRef?.click()"
              >
                다시 선택
              </button>
            </div>
          </div>

          <!-- Sender Name Input (Optional) -->
          <div class="form-group">
            <label class="form-label">
              보내시는 분 <span class="label-opt">(선택)</span>
            </label>
            <input
              v-model="senderName"
              type="text"
              maxlength="20"
              placeholder="예: 친구 지수, 신랑 직장 동료"
              class="input-field"
              :disabled="isUploading"
            />
          </div>

          <!-- Message Textarea (Optional, max 100 chars) -->
          <div class="form-group">
            <div class="form-label-row">
              <label class="form-label">
                축하 메시지 <span class="label-opt">(선택)</span>
              </label>
              <span class="char-count">{{ message.length }} / 100자</span>
            </div>
            <textarea
              v-model="message"
              rows="3"
              maxlength="100"
              placeholder="축하의 한마디를 적어주세요 (최대 100자)"
              class="input-field textarea"
              :disabled="isUploading"
            ></textarea>
          </div>

          <!-- Error Alert -->
          <div v-if="errorMessage" class="alert-box error">
            <AlertCircle :size="15" class="alert-icon" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Upload Progress -->
          <div v-if="isUploading" class="progress-wrap">
            <div class="progress-info">
              <span>업로드 중...</span>
              <span>{{ uploadProgress }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar" :style="{ width: `${uploadProgress}%` }"></div>
            </div>
          </div>

          <!-- Modal Action Buttons -->
          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary modal-cancel-btn"
              @click="closeUploadModal"
              :disabled="isUploading"
            >
              취소
            </button>
            <button
              type="button"
              class="btn-primary modal-submit-btn"
              :disabled="!selectedFile || isUploading"
              @click="handleUploadSubmit"
            >
              <template v-if="!isUploading">
                <span>등록하기</span>
              </template>
              <template v-else>
                <span class="btn-spinner"></span>
                <span>업로드 중...</span>
              </template>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Upload Complete Notification Modal -->
    <Transition name="modal-fade">
      <div v-if="isCompleteModalOpen" class="modal-backdrop" @click="handleCompleteConfirm">
        <div class="modal-content complete-modal font-sans" @click.stop>
          <div class="complete-icon-circle">
            <CheckCircle2 :size="36" class="complete-check-icon" />
          </div>
          <h3 class="complete-title font-serif">업로드가 완료되었습니다</h3>
          <p class="complete-desc">소중한 순간을 함께 공유해주셔서 진심으로 감사드립니다.</p>
          <button class="btn-primary complete-btn font-sans" @click="handleCompleteConfirm">
            확인
          </button>
        </div>
      </div>
    </Transition>

    <!-- Full Lightbox Modal -->
    <Transition name="modal-fade">
      <div
        v-if="selectedSnap"
        class="lightbox-backdrop"
        @click="selectedSnap = null"
      >
        <button class="lightbox-close-btn" @click="selectedSnap = null">
          <X :size="24" />
        </button>

        <div class="lightbox-dialog" @click.stop>
          <div class="lightbox-media-container">
            <img
              v-if="selectedSnap.type === 'image'"
              :src="selectedSnap.url"
              alt="현장 스냅 확대"
              class="lightbox-img"
            />
            <video
              v-else
              :src="selectedSnap.url"
              controls
              autoplay
              class="lightbox-video"
            ></video>
          </div>

          <div v-if="selectedSnap.senderName || selectedSnap.message" class="lightbox-caption">
            <div v-if="selectedSnap.senderName" class="caption-header">
              <span class="caption-author">{{ selectedSnap.senderName }}</span>
              <span class="caption-time">{{ formatRelativeTime(selectedSnap.createdAt) }}</span>
            </div>
            <p v-if="selectedSnap.message" class="caption-body font-sans">{{ selectedSnap.message }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.livesnap-section {
  background-color: var(--bg-ivory);
  padding-bottom: 60px;
}

/* Action Buttons */
.action-buttons-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 360px;
  margin: 0 auto 20px;
}

.snap-main-upload-btn {
  width: 100%;
  padding: 13px 20px;
  font-size: 14px;
  box-shadow: 0 4px 14px rgba(168, 131, 80, 0.28);
}


/* Controls & Status Bar */
.scroll-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 400px;
  margin: 0 auto 12px;
  padding: 0 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.scroll-pause-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #FFFFFF;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.15s;
}

.scroll-pause-toggle:hover {
  border-color: var(--gold-primary);
  color: var(--gold-dark);
}

.tap-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* Auto-Scrolling Masonry Viewport */
.auto-scroll-viewport {
  position: relative;
  height: 480px;
  max-height: 65vh;
  overflow: hidden;
  margin-top: 6px;
  padding: 8px 4px;
}

.masonry-columns-wrapper {
  display: flex;
  gap: 12px;
  height: 100%;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
}

/* Floating Overlay over the scrolling area (Transparent wrapper so images are visible and scroll behind the card) */
.snap-scroll-frosted-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  padding: 16px;
  text-align: center;
}

.frosted-overlay-card {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 320px;
  width: calc(100% - 24px);
  padding: 24px 18px;
  /* Frosted Glass: translucent white with backdrop blur so images scrolling behind are visible and softly blurred */
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    0 12px 36px rgba(45, 41, 38, 0.14),
    0 2px 8px rgba(45, 41, 38, 0.06),
    inset 0 1.5px 2px rgba(255, 255, 255, 0.95);
}

.overlay-icon-box {
  width: 54px;
  height: 54px;
  border-radius: 9999px;
  background: rgba(168, 131, 80, 0.1);
  color: var(--gold-dark, #A88350);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.overlay-main-text {
  font-size: 19px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-main, #2D2926);
  letter-spacing: -0.3px;
  margin-bottom: 8px;
}

.overlay-sub-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted, #79716B);
  letter-spacing: -0.2px;
  margin-bottom: 20px;
}

.overlay-btn-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.overlay-action-btn {
  width: 100%;
  max-width: 240px;
  padding: 12px 20px;
  font-size: 14px;
}

.overlay-action-btn:disabled,
.snap-main-upload-btn:disabled {
  background: #D8D2C9 !important;
  color: #8C827A !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  transform: none !important;
}

.overlay-time-notice {
  font-size: 11.5px;
  color: #8C827A;
  letter-spacing: -0.2px;
}

.main-upload-time-guide {
  font-size: 12px;
  color: #8C827A;
  text-align: center;
  margin-top: 6px;
  letter-spacing: -0.2px;
}

.masonry-col {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.col-track {
  display: flex;
  flex-direction: column;
  gap: 0;
  will-change: transform;
  transform: translate3d(0, 0, 0);
  -webkit-transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.col-track-1 {
  animation: autoScrollUp 22s linear infinite;
}

.col-track-2 {
  animation: autoScrollUp 26s linear infinite;
  animation-delay: -5s;
}

@keyframes autoScrollUp {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(0, -50%, 0);
  }
}

/* Single Snap Display */
.single-snap-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.single-snap-card {
  max-width: 290px;
  width: 100%;
}

.single-snap-img {
  width: 100%;
  max-height: 380px;
  object-fit: cover;
}

.single-snap-video {
  aspect-ratio: 4 / 5;
}

.single-tap-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 10px;
  text-align: center;
}

/* Static 2-Column Masonry (2-3 items) */
.static-masonry-wrapper {
  margin-top: 8px;
}

.static-columns {
  height: auto;
}

.static-track {
  animation: none !important;
}

/* Clean Images Only Card */
.snap-card {
  width: 100%;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-warm, #EFE7DA);
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: default;
  flex-shrink: 0;
  display: block;
  margin-bottom: 12px;
  contain: layout paint;
}

/* Hover & Interactive effects (Only active when isUploadActive) */
.snap-card.is-interactive {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.snap-card.is-interactive:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-md);
}

.snap-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 0.2s ease, filter 0.3s ease, transform 0.3s ease;
}

.snap-img.is-example-blur {
  filter: blur(2.5px) brightness(0.98);
  -webkit-filter: blur(2.5px) brightness(0.98);
  transform: scale(1.06);
}

.snap-card.is-interactive:hover .snap-img {
  opacity: 0.95;
}

.snap-video-thumb {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1A1816;
}

.snap-video-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-badge {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.play-icon {
  margin-left: 2px;
  fill: currentColor;
}

/* Empty State */
.empty-snap-box {
  padding: 36px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.empty-icon {
  color: var(--border-color);
}

.empty-text {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.6;
}

.empty-btn {
  margin-top: 6px;
  padding: 10px 18px;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(168, 131, 80, 0.25);
}

.empty-gphotos-btn {
  margin-top: 4px;
}

/* Modal Styling */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: #FFFFFF;
  border-radius: 20px;
  padding: 26px 22px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  max-height: 90vh;
  overflow-y: auto;
  text-align: left;
}

.modal-close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  transition: color 0.15s;
}

.modal-close-btn:hover {
  color: var(--text-main);
}

.modal-title {
  font-size: 18px;
  color: var(--text-main);
  margin-bottom: 4px;
}

.modal-subtitle {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 18px;
}

.file-upload-area {
  margin-bottom: 16px;
}

.hidden-file-input {
  display: none;
}

.dropzone-box {
  border: 2px dashed var(--border-color);
  background: var(--bg-ivory);
  border-radius: 14px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.dropzone-box:hover {
  border-color: var(--gold-primary);
  background: var(--bg-subtle);
}

.dropzone-icon {
  color: var(--gold-primary);
  margin-bottom: 8px;
}

.dropzone-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
}

.dropzone-hints {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--text-muted);
}

.preview-box {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: #111;
  max-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
}

.preview-video-wrap {
  width: 100%;
  max-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-video {
  width: 100%;
  max-height: 220px;
}

.reselect-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #FFFFFF;
  border: none;
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.form-group {
  margin-bottom: 14px;
}

.form-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
  display: block;
}

.label-opt {
  font-weight: 400;
  color: var(--text-muted);
}

.char-count {
  font-size: 11px;
  color: var(--text-muted);
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  background: var(--bg-ivory);
  color: var(--text-main);
  outline: none;
  transition: all 0.2s;
}

.input-field:focus {
  border-color: var(--gold-primary);
  background: #FFFFFF;
}

.textarea {
  resize: none;
  min-height: 72px;
  line-height: 1.5;
}

.alert-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  margin-bottom: 12px;
}

.alert-box.error {
  background: #FCE8E6;
  color: #C5221F;
}

.alert-box.success {
  background: #E6F4EA;
  color: #137333;
}

.alert-icon {
  flex-shrink: 0;
}

.progress-wrap {
  margin-bottom: 14px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-sub);
  margin-bottom: 4px;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: var(--bg-subtle);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--gold-primary);
  transition: width 0.2s ease;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.modal-cancel-btn {
  flex: 1;
  padding: 11px 0;
  border-radius: 12px;
}

.modal-submit-btn {
  flex: 1;
  padding: 11px 0;
  border-radius: 12px;
}

.modal-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Lightbox Modal */
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.lightbox-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #FFFFFF;
  cursor: pointer;
  padding: 8px;
  opacity: 0.8;
  transition: opacity 0.2s;
  z-index: 10;
}

.lightbox-close-btn:hover {
  opacity: 1;
}

.lightbox-dialog {
  max-width: 440px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lightbox-media-container {
  width: 100%;
  max-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  background: #000000;
}

.lightbox-img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.lightbox-video {
  max-width: 100%;
  max-height: 70vh;
}

.lightbox-caption {
  width: 100%;
  margin-top: 12px;
  padding: 12px 16px;
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 14px;
  color: #FFFFFF;
}

.caption-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.caption-author {
  font-size: 12px;
  font-weight: 600;
  color: var(--gold-light);
  background: rgba(168, 131, 80, 0.3);
  padding: 2px 8px;
  border-radius: 6px;
}

.caption-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.caption-body {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  word-break: break-word;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Complete Modal & Spinner */
.complete-modal {
  max-width: 320px;
  width: 90%;
  text-align: center;
  padding: 32px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.complete-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #EBF7EE;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.complete-check-icon {
  color: #2E7D32;
}

.complete-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.complete-desc {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.5;
  margin: 0 0 10px 0;
  word-break: keep-all;
}

.complete-btn {
  width: 100%;
  padding: 12px 20px;
  font-size: 14px;
  border-radius: 10px;
}

.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
