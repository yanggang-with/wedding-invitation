<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Camera, Play, Pause, X, Upload, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import {
  liveSnaps,
  weddingInfo,
  adminSettings,
  addLiveSnap,
  uploadLiveSnapMedia,
  formatDirectMediaUrl,
  isLiveSnapUploadActive,
  isStoryOpen,
  photos,
  initCloudSubscriptions
} from '../../services/storage'
import { DEFAULT_PHOTOS, WEDDING_ILLUSTRATION_SNAPS } from '../../constants/initialData'
import type { LiveSnapItem } from '../../types/wedding'

const scrollViewportRef = ref<HTMLElement | null>(null)
const isUserInteracting = ref(false)
let autoScrollAnimId: number | null = null
let userTouchTimer: any = null

const startAutoScroll = () => {
  if (autoScrollAnimId) cancelAnimationFrame(autoScrollAnimId)

  const step = () => {
    const el = scrollViewportRef.value
    if (el && !isPaused.value && !isUserInteracting.value) {
      el.scrollTop += 0.65

      const halfHeight = el.scrollHeight / 2
      if (halfHeight > 0 && el.scrollTop >= halfHeight) {
        el.scrollTop -= halfHeight
      }
    }
    autoScrollAnimId = requestAnimationFrame(step)
  }

  autoScrollAnimId = requestAnimationFrame(step)
}

const stopAutoScroll = () => {
  if (autoScrollAnimId) {
    cancelAnimationFrame(autoScrollAnimId)
    autoScrollAnimId = null
  }
  if (userTouchTimer) {
    clearTimeout(userTouchTimer)
    userTouchTimer = null
  }
}

let isTouching = false
const PAUSE_DURATION = 5000 // 5초 뒤 자동 스크롤 재개

const startPauseTimer = () => {
  if (userTouchTimer) clearTimeout(userTouchTimer)
  userTouchTimer = setTimeout(() => {
    if (!isTouching) {
      isUserInteracting.value = false
    }
  }, PAUSE_DURATION)
}

const onTouchStart = () => {
  // 기능이 OFF일 때는 사용자의 내부 터치 스크롤 차단 (본문 스크롤로 통과)
  if (!isUploadActive.value) return
  isTouching = true
  isUserInteracting.value = true
  if (userTouchTimer) clearTimeout(userTouchTimer)
}

const onTouchMove = () => {
  if (!isUploadActive.value) return
  isTouching = true
  isUserInteracting.value = true
  if (userTouchTimer) clearTimeout(userTouchTimer)
}

const onTouchEnd = () => {
  if (!isUploadActive.value) return
  isTouching = false
  startPauseTimer()
}

const onWheel = () => {
  if (!isUploadActive.value) return
  isUserInteracting.value = true
  startPauseTimer()
}

const showTopReachedIndicator = ref(false)
let topIndicatorTimer: any = null

const triggerTopReachedIndicator = () => {
  if (showTopReachedIndicator.value) return
  showTopReachedIndicator.value = true
  if (topIndicatorTimer) clearTimeout(topIndicatorTimer)
  topIndicatorTimer = setTimeout(() => {
    showTopReachedIndicator.value = false
  }, 1400)
}

const showBottomReachedIndicator = ref(false)
let bottomIndicatorTimer: any = null

const triggerBottomReachedIndicator = () => {
  if (showBottomReachedIndicator.value) return
  showBottomReachedIndicator.value = true
  if (bottomIndicatorTimer) clearTimeout(bottomIndicatorTimer)
  bottomIndicatorTimer = setTimeout(() => {
    showBottomReachedIndicator.value = false
  }, 1400)
}

const onViewportScroll = () => {
  const el = scrollViewportRef.value
  if (!el) return

  // 사용자가 직접 만지지 않는 평상시 자동스크롤일 때만 무한 루프 리셋 (중간 점프)
  if (!isUserInteracting.value) {
    const halfHeight = el.scrollHeight / 2
    if (halfHeight > 0 && el.scrollTop >= halfHeight) {
      el.scrollTop -= halfHeight
    }
  }

  // 사용자가 위로 스크롤하여 맨 위(최신 스냅 처음)에 도달했을 때 끝 표식
  if (el.scrollTop <= 2 && isUserInteracting.value) {
    triggerTopReachedIndicator()
  } else if (el.scrollTop > 18) {
    showTopReachedIndicator.value = false
  }

  // 사용자가 아래로 스크롤하여 맨 아래(스냅 목록 끝)에 도달했을 때 끝 표식
  const isBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4
  if (isBottom && isUserInteracting.value) {
    triggerBottomReachedIndicator()
  } else if (el.scrollTop + el.clientHeight < el.scrollHeight - 20) {
    showBottomReachedIndicator.value = false
  }
}

const handleVideoLoaded = (e: Event) => {
  const video = e.target as HTMLVideoElement | null
  if (video) {
    video.muted = true
    video.play().catch(() => {})
  }
}

const playAllPreviewVideos = () => {
  if (typeof document === 'undefined') return
  const videos = document.querySelectorAll<HTMLVideoElement>('.snap-video')
  videos.forEach(video => {
    video.muted = true
    video.play().catch(() => {})
  })
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  initCloudSubscriptions()
  startAutoScroll()
  setTimeout(playAllPreviewVideos, 350)
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

// 갤러리 섹션의 사진 중 6개를 선택하여 예시 스냅으로 사용 (기능 OFF 시 배경용)
const galleryExampleSnaps = computed<LiveSnapItem[]>(() => {
  const source = (photos.value && photos.value.length > 0)
    ? photos.value.filter(p => !p.isHidden)
    : DEFAULT_PHOTOS
  const baseList = source.length > 0 ? source : DEFAULT_PHOTOS

  const selected: typeof baseList = []
  for (let i = 0; i < 6; i++) {
    selected.push(baseList[i % baseList.length])
  }

  const ratios = ['4/5', '16/9', '3/2', '4/5', '1/1', '4/5']

  return selected.map((p, idx) => {
    const isSampleVideo = idx === 1
    return {
      id: `gallery-example-${p.id || idx}-${idx}`,
      type: isSampleVideo ? ('video' as const) : ('image' as const),
      url: isSampleVideo
        ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        : p.url,
      senderName: isSampleVideo ? '웨딩 영상 스케치' : '웨딩 갤러리',
      message: isSampleVideo ? '아름다웠던 순간의 현장 영상입니다 🎬' : (p.caption || ''),
      aspectRatio: ratios[idx % ratios.length],
      createdAt: p.createdAt || new Date().toISOString()
    }
  })
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

// Column streams (clean snap photos)
const TARGET_ITEMS_PER_COL = 6

const streamColumns = computed(() => {
  // 1) 기능이 OFF일 때는 갤러리 사진 예시 분배
  if (!isUploadActive.value) {
    const snaps = galleryExampleSnaps.value
    const col1 = snaps.filter((_, i) => i % 2 === 0)
    const col2 = snaps.filter((_, i) => i % 2 === 1)
    const col1Base = col1.map((s, idx) => ({
      id: `off-c1-${idx}`,
      data: s,
      aspectRatio: s.aspectRatio || '4/5',
      isExample: true
    }))
    const col2Base = col2.map((s, idx) => ({
      id: `off-c2-${idx}`,
      data: s,
      aspectRatio: s.aspectRatio || '4/5',
      isExample: true
    }))
    return {
      col1: [...col1Base, ...col1Base],
      col2: [...col2Base, ...col2Base]
    }
  }

  // 2) 기능이 ON일 때: 사용자가 업로드한 사진 + 웨딩 감성 일러스트 분배
  // col1과 col2 간에 어떠한 예시 이미지도 절대 중복(겹침)되지 않도록 완전 분리된 풀 사용!
  // Pool 1 (짝수 인덱스 7종): [0, 2, 4, 6, 8, 10, 12]
  // Pool 2 (홀수 인덱스 7종): [1, 3, 5, 7, 9, 11, 13]
  const poolCol1 = WEDDING_ILLUSTRATION_SNAPS.filter((_, i) => i % 2 === 0)
  const poolCol2 = WEDDING_ILLUSTRATION_SNAPS.filter((_, i) => i % 2 === 1)

  const userSnaps = userUploadedSnaps.value
  const col1Base: StreamCardItem[] = []
  const col2Base: StreamCardItem[] = []

  // 사용자 업로드 스냅을 좌/우 열에 번갈아가며 배치
  userSnaps.forEach((snap, idx) => {
    const card: StreamCardItem = {
      id: snap.id,
      data: snap,
      aspectRatio: snap.aspectRatio || (idx % 3 === 0 ? '4/5' : idx % 3 === 1 ? '1/1' : '3/2'),
      isExample: false
    }
    if (idx % 2 === 0) {
      col1Base.push(card)
    } else {
      col2Base.push(card)
    }
  })

  // 자연스러운 무한 스크롤 높이를 위해 각 열당 최소 목표 개수 확보
  const targetCount = Math.max(TARGET_ITEMS_PER_COL, col1Base.length, col2Base.length)

  // col1의 부족분을 poolCol1의 고유 일러스트로 채움 (중복 없이 순차적 할당)
  let pool1Idx = 0
  while (col1Base.length < targetCount && pool1Idx < poolCol1.length) {
    const illust = poolCol1[pool1Idx++]
    col1Base.push({
      id: `illust-c1-${illust.id}`,
      data: illust,
      aspectRatio: illust.aspectRatio || '4/5',
      isExample: true
    })
  }

  // col2의 부족분을 poolCol2의 고유 일러스트로 채움 (중복 없이 순차적 할당)
  let pool2Idx = 0
  while (col2Base.length < targetCount && pool2Idx < poolCol2.length) {
    const illust = poolCol2[pool2Idx++]
    col2Base.push({
      id: `illust-c2-${illust.id}`,
      data: illust,
      aspectRatio: illust.aspectRatio || '4/5',
      isExample: true
    })
  }

  // 좌우 열 높이 균형 맞추기 (남은 고유 일러스트 활용)
  while (col1Base.length < col2Base.length && pool1Idx < poolCol1.length) {
    const illust = poolCol1[pool1Idx++]
    col1Base.push({
      id: `illust-c1-${illust.id}`,
      data: illust,
      aspectRatio: illust.aspectRatio || '4/5',
      isExample: true
    })
  }
  while (col2Base.length < col1Base.length && pool2Idx < poolCol2.length) {
    const illust = poolCol2[pool2Idx++]
    col2Base.push({
      id: `illust-c2-${illust.id}`,
      data: illust,
      aspectRatio: illust.aspectRatio || '4/5',
      isExample: true
    })
  }

  // 매끄러운 50% 무한 스크롤 루프를 위해 복제 반환
  return {
    col1: [...col1Base, ...col1Base],
    col2: [...col2Base, ...col2Base]
  }
})

const col1Items = computed(() => streamColumns.value.col1)
const col2Items = computed(() => streamColumns.value.col2)

const loadedSnapMedia = ref<Record<string, boolean>>({})

const onMediaLoaded = (id: string) => {
  loadedSnapMedia.value[id] = true
}

let isNavigatingBack = false
let savedLiveSnapScrollY = 0

function openCompleteModal() {
  isCompleteModalOpen.value = true
  isNavigatingBack = false
  history.pushState({ ...history.state, modal: 'livesnap-complete' }, '', window.location.href)
}

function handleCompleteConfirm(isFromPopState: boolean | Event = false) {
  if (!isCompleteModalOpen.value) return
  isCompleteModalOpen.value = false
  message.value = ''
  senderName.value = ''
  if (isFromPopState !== true && history.state?.modal === 'livesnap-complete' && !isNavigatingBack) {
    isNavigatingBack = true
    history.back()
    setTimeout(() => { isNavigatingBack = false }, 300)
  }
  setTimeout(() => {
    const el = document.querySelector('.livesnap-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 120)
}

const handlePopState = () => {
  if (selectedSnap.value) {
    closeSnapLightbox(true)
  } else if (isCompleteModalOpen.value) {
    handleCompleteConfirm(true)
  } else if (isUploadModalOpen.value) {
    closeUploadModal(true)
  }
  if (typeof savedLiveSnapScrollY === 'number' && savedLiveSnapScrollY >= 0) {
    window.scrollTo({ top: savedLiveSnapScrollY, behavior: 'instant' })
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedLiveSnapScrollY, behavior: 'instant' })
      setTimeout(() => {
        window.scrollTo({ top: savedLiveSnapScrollY, behavior: 'instant' })
      }, 50)
    })
  }
}

const handleImageError = (e: Event, id?: string) => {
  if (id) {
    loadedSnapMedia.value[id] = true
  }
  const target = e.target as HTMLImageElement | null
  if (target && !target.src.includes('unsplash.com')) {
    target.src = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80'
  }
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
const lightboxVideoRef = ref<HTMLVideoElement | null>(null)
const isLightboxMediaLoaded = ref(false)

function openSnapLightbox(snap: LiveSnapItem) {
  savedLiveSnapScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
  isLightboxMediaLoaded.value = false
  selectedSnap.value = snap
  isNavigatingBack = false
  history.pushState({ ...history.state, modal: 'livesnap-lightbox' }, '', window.location.href)

  if (snap.type === 'video') {
    nextTick(() => {
      if (lightboxVideoRef.value) {
        lightboxVideoRef.value.currentTime = 0
        const playPromise = lightboxVideoRef.value.play()
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.log('Video play catch:', err)
          })
        }
      }
    })
  }
}

function closeSnapLightbox(isFromPopState: boolean | Event = false) {
  if (!selectedSnap.value) return
  if (lightboxVideoRef.value) {
    try {
      lightboxVideoRef.value.pause()
    } catch (_) {}
  }
  selectedSnap.value = null
  if (isFromPopState !== true && history.state?.modal === 'livesnap-lightbox' && !isNavigatingBack) {
    isNavigatingBack = true
    history.back()
    setTimeout(() => { isNavigatingBack = false }, 300)
  }
  if (typeof savedLiveSnapScrollY === 'number' && savedLiveSnapScrollY >= 0) {
    window.scrollTo({ top: savedLiveSnapScrollY, behavior: 'instant' })
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedLiveSnapScrollY, behavior: 'instant' })
      setTimeout(() => {
        window.scrollTo({ top: savedLiveSnapScrollY, behavior: 'instant' })
      }, 50)
    })
  }
}

// Hide navigation menu & prevent body scrolling when any lightbox or modal is active
watch([selectedSnap, isUploadModalOpen, isCompleteModalOpen], ([snap, upload, complete]) => {
  const isOpen = Boolean(snap || upload || complete)
  isStoryOpen.value = isOpen
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
  isStoryOpen.value = false
  document.body.style.overflow = ''
  stopAutoScroll()
  if (topIndicatorTimer) clearTimeout(topIndicatorTimer)
  if (bottomIndicatorTimer) clearTimeout(bottomIndicatorTimer)
})

function handleSnapClick(snap?: LiveSnapItem, _isExample?: boolean) {
  if (!snap) return
  // 클릭 시 자동 스크롤 일시정지
  isPaused.value = true
  // 비디오 파일인 경우 항상 라이트박스로 재생 시청 가능
  // 일반 사진/일러스트인 경우 현장 스냅 기능이 ON일 때 라이트박스 열림
  if (snap.type === 'video' || isUploadActive.value) {
    openSnapLightbox(snap)
  }
}

function handleUploadButtonClick() {
  if (!isUploadActive.value) {
    alert('현장 사진 및 동영상 올리기는 예식 당일 2시간 전부터 활성화됩니다.')
    return
  }
  openUploadModal()
}

function openUploadModal() {
  savedLiveSnapScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
  resetForm()
  isUploadModalOpen.value = true
  isNavigatingBack = false
  history.pushState({ ...history.state, modal: 'livesnap-upload' }, '', window.location.href)
}

function closeUploadModal(isFromPopState: boolean | Event = false) {
  if (isUploading.value) return
  if (!isUploadModalOpen.value) return
  isUploadModalOpen.value = false
  resetForm()
  if (isFromPopState !== true && history.state?.modal === 'livesnap-upload' && !isNavigatingBack) {
    isNavigatingBack = true
    history.back()
    setTimeout(() => { isNavigatingBack = false }, 300)
  }
  if (savedLiveSnapScrollY > 0) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedLiveSnapScrollY, behavior: 'instant' })
    })
  }
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

    closeUploadModal(true)
    openCompleteModal()
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
    <div class="scroll-masonry-container">
      <!-- Controls & Status Bar (Visible when snaps are active) -->
      <div v-if="isUploadActive" class="scroll-status-bar font-sans">
        <button class="scroll-pause-toggle" @click="togglePause">
          <Pause v-if="!isPaused" :size="12" />
          <Play v-else :size="12" />
          <span>{{ isPaused ? '자동 스크롤 재생' : '자동 스크롤 일시정지' }}</span>
        </button>
        <span class="tap-hint">사진을 누르면 크게 볼 수 있어요</span>
      </div>

      <div class="scroll-viewport-wrapper">
        <!-- Top Reached Boundary Indicator Mark -->
        <Transition name="indicator-fade-top">
          <div v-if="showTopReachedIndicator" class="top-reached-indicator-wrap" aria-hidden="true">
            <div class="reached-indicator-mark">
              <div class="reached-indicator-line"></div>
              <div class="reached-indicator-pip"></div>
            </div>
          </div>
        </Transition>

        <div
          ref="scrollViewportRef"
          class="auto-scroll-viewport font-sans"
          :class="{ 'is-interactive': isUploadActive }"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend.passive="onTouchEnd"
          @touchcancel.passive="onTouchEnd"
          @mousedown="onTouchStart"
          @mouseup="onTouchEnd"
          @wheel.passive="onWheel"
          @scroll.passive="onViewportScroll"
        >
          <div class="masonry-columns-wrapper">
            <!-- Column 1 -->
            <div class="masonry-col">
              <div class="col-track col-track-1">
                <template v-for="(item, idx) in col1Items" :key="'c1-' + item.id + '-' + idx">
                  <div
                    v-if="item.data"
                    class="snap-card"
                    :style="{ aspectRatio: item.aspectRatio || '4/5' }"
                    :class="{
                      'is-interactive': item.data.type === 'video' || (isUploadActive && !item.isExample),
                      'is-user-snap': !item.isExample,
                      'is-video-snap': item.data.type === 'video'
                    }"
                    @click="handleSnapClick(item.data, item.isExample)"
                  >
                    <!-- Skeleton Placeholder while loading -->
                    <div
                      v-if="!loadedSnapMedia[item.id]"
                      class="snap-card-skeleton"
                    >
                      <div class="snap-skeleton-shimmer"></div>
                    </div>

                    <img
                      v-if="item.data.type === 'image'"
                      :src="formatDirectMediaUrl(item.data.url, 'image')"
                      alt="현장 스냅"
                      decoding="async"
                      class="snap-img"
                      :class="{
                        'is-loaded': loadedSnapMedia[item.id],
                        'is-example-blur': !isUploadActive
                      }"
                      @load="onMediaLoaded(item.id)"
                      @error="handleImageError($event, item.id)"
                    />
                    <div v-else class="snap-video-thumb">
                      <video
                        :src="formatDirectMediaUrl(item.data.url, 'video')"
                        autoplay
                        loop
                        muted
                        playsinline
                        webkit-playsinline
                        preload="auto"
                        class="snap-video"
                        :class="{ 'is-loaded': loadedSnapMedia[item.id] }"
                        @loadeddata="onMediaLoaded(item.id)"
                        @canplay="onMediaLoaded(item.id)"
                        @loadedmetadata="handleVideoLoaded"
                      ></video>
                      <div class="video-indicator-badge">
                        <Play :size="11" class="video-play-icon" />
                      </div>
                    </div>

                    <!-- 사용자가 직접 올린 사진인 경우 빛나는 NEW 뱃지 효과 -->
                    <div v-if="!item.isExample" class="new-snap-badge font-sans">
                      <span>NEW</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Column 2 -->
            <div class="masonry-col">
              <div class="col-track col-track-2">
                <template v-for="(item, idx) in col2Items" :key="'c2-' + item.id + '-' + idx">
                  <div
                    v-if="item.data"
                    class="snap-card"
                    :style="{ aspectRatio: item.aspectRatio || '4/5' }"
                    :class="{
                      'is-interactive': item.data.type === 'video' || (isUploadActive && !item.isExample),
                      'is-user-snap': !item.isExample,
                      'is-video-snap': item.data.type === 'video'
                    }"
                    @click="handleSnapClick(item.data, item.isExample)"
                  >
                    <!-- Skeleton Placeholder while loading -->
                    <div
                      v-if="!loadedSnapMedia[item.id]"
                      class="snap-card-skeleton"
                    >
                      <div class="snap-skeleton-shimmer"></div>
                    </div>

                    <img
                      v-if="item.data.type === 'image'"
                      :src="formatDirectMediaUrl(item.data.url, 'image')"
                      alt="현장 스냅"
                      decoding="async"
                      class="snap-img"
                      :class="{
                        'is-loaded': loadedSnapMedia[item.id],
                        'is-example-blur': !isUploadActive
                      }"
                      @load="onMediaLoaded(item.id)"
                      @error="handleImageError($event, item.id)"
                    />
                    <div v-else class="snap-video-thumb">
                      <video
                        :src="formatDirectMediaUrl(item.data.url, 'video')"
                        autoplay
                        loop
                        muted
                        playsinline
                        webkit-playsinline
                        preload="auto"
                        class="snap-video"
                        :class="{ 'is-loaded': loadedSnapMedia[item.id] }"
                        @loadeddata="onMediaLoaded(item.id)"
                        @canplay="onMediaLoaded(item.id)"
                        @loadedmetadata="handleVideoLoaded"
                      ></video>
                      <div class="video-indicator-badge">
                        <Play :size="11" class="video-play-icon" />
                      </div>
                    </div>

                    <!-- 사용자가 직접 올린 사진인 경우 빛나는 NEW 뱃지 효과 -->
                    <div v-if="!item.isExample" class="new-snap-badge font-sans">
                      <span>NEW</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Reached Boundary Indicator Mark -->
        <Transition name="indicator-fade-bottom">
          <div v-if="showBottomReachedIndicator" class="bottom-reached-indicator-wrap" aria-hidden="true">
            <div class="reached-indicator-mark">
              <div class="reached-indicator-line"></div>
              <div class="reached-indicator-pip"></div>
            </div>
          </div>
        </Transition>

        <!-- Frosted Blurred Overlay covering the scrolling area before activation (Fixed in viewport wrapper) -->
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

    <!-- Upload Modal (브라우저 전체화면 텔레포트) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="isUploadModalOpen" class="modal-backdrop" @click.self="closeUploadModal()" @touchmove.prevent>
          <div class="modal-content font-sans" @click.stop>
            <button class="modal-close-btn" @click.stop="closeUploadModal()" :disabled="isUploading">
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
    </Teleport>

    <!-- Upload Complete Notification Modal (브라우저 전체화면 텔레포트) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="isCompleteModalOpen" class="modal-backdrop" @click.self="handleCompleteConfirm()" @touchmove.prevent>
          <div class="modal-content complete-modal font-sans" @click.stop>
            <div class="complete-icon-circle">
              <CheckCircle2 :size="36" class="complete-check-icon" />
            </div>
            <h3 class="complete-title font-serif">업로드가 완료되었습니다</h3>
            <p class="complete-desc">소중한 순간을 함께 공유해주셔서 진심으로 감사드립니다.</p>
            <button class="btn-primary complete-btn font-sans" @click.stop="handleCompleteConfirm()">
              확인
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Full Lightbox Modal (브라우저 전체화면 텔레포트) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="selectedSnap"
          class="lightbox-backdrop"
          @click.self="closeSnapLightbox()"
          @touchmove.prevent
        >
          <button class="lightbox-close-btn" @click.stop="closeSnapLightbox()">
            <X :size="24" />
          </button>

          <div class="lightbox-dialog" @click.stop>
            <div class="lightbox-media-container">
              <!-- Skeleton Loader while media is loading -->
              <div v-if="!isLightboxMediaLoaded" class="lightbox-skeleton">
                <div class="lightbox-skeleton-shimmer"></div>
                <div class="lightbox-spinner"></div>
              </div>

              <img
                v-if="selectedSnap.type === 'image'"
                :src="formatDirectMediaUrl(selectedSnap.url, 'image')"
                alt="현장 스냅 확대"
                class="lightbox-img"
                :class="{ 'is-loaded': isLightboxMediaLoaded }"
                @load="isLightboxMediaLoaded = true"
              />
              <video
                v-else
                ref="lightboxVideoRef"
                :src="formatDirectMediaUrl(selectedSnap.url, 'video')"
                controls
                autoplay
                playsinline
                webkit-playsinline
                class="lightbox-video"
                :class="{ 'is-loaded': isLightboxMediaLoaded }"
                @loadeddata="isLightboxMediaLoaded = true"
                @canplay="isLightboxMediaLoaded = true"
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
    </Teleport>
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

.scroll-masonry-container {
  position: relative;
  width: 100%;
}

.scroll-viewport-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.auto-scroll-viewport {
  position: relative;
  height: 500px;
  max-height: 65vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
  margin-top: 6px;
  padding: 8px 4px;
}

/* When live snap feature is OFF, completely disable user scrolling of the viewport */
.auto-scroll-viewport:not(.is-interactive) {
  overflow-y: hidden !important;
  touch-action: pan-y !important;
  pointer-events: none !important;
}

.auto-scroll-viewport::-webkit-scrollbar {
  display: none;
}

.masonry-columns-wrapper {
  display: flex;
  gap: 12px;
  min-height: 100%;
  /* 상단 페이드아웃(서서히 흐려지는 디자인) 제거, 하단만 부드럽게 흐려짐 */
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 92%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 0%, black 92%, transparent 100%);
}

/* Top & Bottom Reached Scroll Boundary Indicators (No text badge, clean gold mark) */
.top-reached-indicator-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 25;
}

.bottom-reached-indicator-wrap {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 25;
}

.reached-indicator-mark {
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reached-indicator-line {
  width: 100%;
  height: 2.5px;
  background: linear-gradient(90deg, transparent 0%, var(--gold-primary, #C5A059) 50%, transparent 100%);
  box-shadow: 0 0 10px rgba(197, 160, 89, 0.85);
}

.reached-indicator-pip {
  position: absolute;
  width: 24px;
  height: 4.5px;
  background: var(--gold-primary, #C5A059);
  border-radius: 9999px;
  box-shadow: 0 0 10px rgba(197, 160, 89, 0.95);
}

.indicator-fade-top-enter-active,
.indicator-fade-top-leave-active,
.indicator-fade-bottom-enter-active,
.indicator-fade-bottom-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.indicator-fade-top-enter-from,
.indicator-fade-top-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.indicator-fade-bottom-enter-from,
.indicator-fade-bottom-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* Floating Overlay over the scrolling area (Fixed over the viewport so it never scrolls up) */
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
}

.col-track-1,
.col-track-2 {
  animation: none;
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

/* Hover & Interactive effects */
.snap-card.is-interactive,
.snap-card.is-video-snap {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.snap-card.is-interactive:hover,
.snap-card.is-video-snap:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-md);
}

/* User uploaded snap special highlight & appear effect */
.snap-card.is-user-snap {
  border: 1.5px solid rgba(197, 160, 89, 0.7);
  box-shadow: 0 4px 18px rgba(168, 131, 80, 0.2);
  animation: snapPopIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes snapPopIn {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.new-snap-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: linear-gradient(135deg, var(--gold-primary, #C5A059), var(--gold-dark, #A88350));
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border-radius: 9999px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  z-index: 3;
}

/* Skeleton shimmer placeholder for snap card loading */
.snap-card-skeleton {
  position: absolute;
  inset: 0;
  background: #EFE7DA;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  overflow: hidden;
  border-radius: 12px;
}

.snap-skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(239, 231, 218, 0) 0%,
    rgba(255, 255, 255, 0.75) 50%,
    rgba(239, 231, 218, 0) 100%
  );
  background-size: 200% 100%;
  animation: snapSkeletonShimmer 1.4s infinite ease-in-out;
}

@keyframes snapSkeletonShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.snap-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.35s ease, filter 0.3s ease, transform 0.3s ease;
}

.snap-img.is-loaded {
  opacity: 1;
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
  overflow: hidden;
}

.snap-video-thumb video,
.snap-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.snap-video.is-loaded {
  opacity: 1;
}

.video-indicator-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  pointer-events: none;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.video-play-icon {
  fill: currentColor;
  margin-left: 1px;
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
  position: relative;
  width: 100%;
  min-height: 240px;
  max-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  background: #000000;
}

.lightbox-skeleton {
  position: absolute;
  inset: 0;
  background: #181614;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  overflow: hidden;
}

.lightbox-skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite ease-in-out;
}

.lightbox-spinner {
  width: 32px;
  height: 32px;
  border: 2.5px solid rgba(255, 255, 255, 0.15);
  border-top-color: var(--gold-primary, #C8A97E);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  z-index: 3;
}

.lightbox-img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lightbox-img.is-loaded {
  opacity: 1;
}

.lightbox-video {
  max-width: 100%;
  max-height: 70vh;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lightbox-video.is-loaded {
  opacity: 1;
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
