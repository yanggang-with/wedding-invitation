<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { photos, weddingInfo, getOptimizedImageUrl, isStoryOpen } from '../../services/storage'
import type { PhotoItem } from '../../types/wedding'
import { X, ChevronLeft, ChevronRight, ChevronDown, Play, Pause } from 'lucide-vue-next'

const selectedIndex = ref<number | null>(null)
const isExpanded = ref(false)
const isMoreLoading = ref(false)
const INITIAL_COUNT = 9

// --- Thumbnail Loading Delay Optimization ---
const loadedThumbnails = ref<Record<string, boolean>>({})
const onThumbnailLoad = (id: string) => {
  loadedThumbnails.value[id] = true
}

const toggleExpand = () => {
  if (isExpanded.value) {
    isExpanded.value = false
  } else {
    isMoreLoading.value = true
    isExpanded.value = true
    setTimeout(() => {
      isMoreLoading.value = false
    }, 550)
  }
}

// --- Mobile Long-Press Peek Preview Popup ---
const peekPhoto = ref<PhotoItem | null>(null)
const isPeeking = ref(false)
const isPeekImageLoaded = ref(false)
let peekTimer: any = null
let touchStartX = 0
let touchStartY = 0
let isLongPressActive = false

const handleThumbnailTouchStart = (photo: PhotoItem, e: TouchEvent) => {
  if (!e.touches.length) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  isLongPressActive = false
  clearTimeout(peekTimer)

  peekTimer = setTimeout(() => {
    isLongPressActive = true
    isPeekImageLoaded.value = false
    peekPhoto.value = photo
    isPeeking.value = true
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(35)
      } catch (_) {}
    }
  }, 320)
}

const handleThumbnailTouchMove = (e: TouchEvent) => {
  if (!e.touches.length) return
  const touch = e.touches[0]
  const dist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY)
  if (dist > 12) {
    clearTimeout(peekTimer)
  }
}

const handleThumbnailTouchEnd = (e: TouchEvent) => {
  clearTimeout(peekTimer)
  if (isPeeking.value) {
    isPeeking.value = false
    peekPhoto.value = null
    e.preventDefault()
  }
}

const handleThumbnailClick = (index: number) => {
  if (isLongPressActive) {
    isLongPressActive = false
    return
  }
  openLightbox(index)
}

const sortedPhotos = computed(() => {
  return photos.value
    .filter(p => !p.isHidden)
    .sort((a, b) => a.order - b.order)
})

const displayedPhotos = computed(() => {
  if (isExpanded.value) return sortedPhotos.value
  return sortedPhotos.value.slice(0, INITIAL_COUNT)
})

const remainingPhotosCount = computed(() => {
  return Math.max(0, sortedPhotos.value.length - INITIAL_COUNT)
})

const hasMorePhotos = computed(() => {
  return remainingPhotosCount.value > 0
})

// --- Instagram Story State & Timing ---
const STORY_DURATION = 4500 // 4.5 seconds per photo
const progress = ref(0) // 0 to 1
const isPaused = ref(false)
const isHolding = ref(false)

let animId: number | null = null
let startTime = 0
let pausedProgress = 0
let holdTimer: any = null

// Gesture handling state
let startX = 0
let startY = 0
let touchStartTime = 0
let hasMoved = false

const stopProgressAnim = () => {
  if (animId !== null) {
    cancelAnimationFrame(animId)
    animId = null
  }
}

const runProgressAnim = () => {
  stopProgressAnim()
  if (isPaused.value || isHolding.value || selectedIndex.value === null) return

  startTime = performance.now() - (pausedProgress * STORY_DURATION)

  const tick = (now: number) => {
    const elapsed = now - startTime
    const currentProgress = Math.min(1, elapsed / STORY_DURATION)
    progress.value = currentProgress

    if (currentProgress >= 1) {
      // Auto-advance to next photo
      nextPhoto()
    } else {
      animId = requestAnimationFrame(tick)
    }
  }

  animId = requestAnimationFrame(tick)
}

const openLightbox = (index: number) => {
  selectedIndex.value = index
  isStoryOpen.value = true
  progress.value = 0
  pausedProgress = 0
  isPaused.value = false
  isHolding.value = false
  document.body.style.overflow = 'hidden'
  runProgressAnim()
}

const closeLightbox = () => {
  stopProgressAnim()
  clearTimeout(holdTimer)
  selectedIndex.value = null
  isStoryOpen.value = false
  isHolding.value = false
  document.body.style.overflow = ''
}

const prevPhoto = () => {
  if (selectedIndex.value === null) return
  stopProgressAnim()
  progress.value = 0
  pausedProgress = 0
  if (selectedIndex.value > 0) {
    selectedIndex.value = selectedIndex.value - 1
  } else {
    selectedIndex.value = 0
  }
  runProgressAnim()
}

const nextPhoto = () => {
  if (selectedIndex.value === null) return
  stopProgressAnim()
  progress.value = 0
  pausedProgress = 0
  if (selectedIndex.value >= sortedPhotos.value.length - 1) {
    // 맨 마지막 사진에 도달했을 때 첫 번째 사진으로 가지 않고 닫힘
    closeLightbox()
    return
  }
  selectedIndex.value = selectedIndex.value + 1
  runProgressAnim()
}

const togglePlayPause = () => {
  isPaused.value = !isPaused.value
  if (isPaused.value) {
    pausedProgress = progress.value
    stopProgressAnim()
  } else {
    runProgressAnim()
  }
}

// --- Pointer & Touch Gesture Handling ---
const handlePointerDown = (e: PointerEvent) => {
  // If clicking on close, play/pause or specific interactive buttons, ignore
  if ((e.target as HTMLElement)?.closest('button')) return

  startX = e.clientX
  startY = e.clientY
  touchStartTime = Date.now()
  hasMoved = false

  // Start hold detection after 180ms
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    if (!hasMoved) {
      isHolding.value = true
      pausedProgress = progress.value
      stopProgressAnim()
    }
  }, 180)
}

const handlePointerMove = (e: PointerEvent) => {
  const dist = Math.hypot(e.clientX - startX, e.clientY - startY)
  if (dist > 12) {
    hasMoved = true
    clearTimeout(holdTimer)
  }
}

const handlePointerUp = (e: PointerEvent) => {
  if ((e.target as HTMLElement)?.closest('button')) return
  clearTimeout(holdTimer)

  // If was holding to pause, resume and do not trigger tap
  if (isHolding.value) {
    isHolding.value = false
    if (!isPaused.value) {
      runProgressAnim()
    }
    return
  }

  const deltaX = e.clientX - startX
  const deltaY = e.clientY - startY
  const deltaTime = Date.now() - touchStartTime

  // 1. Swipe Down -> Close Story
  if (deltaY > 60 && Math.abs(deltaY) > Math.abs(deltaX) * 1.3) {
    closeLightbox()
    return
  }

  // 2. Swipe Left -> Next Photo
  if (deltaX < -45 && Math.abs(deltaX) > Math.abs(deltaY)) {
    nextPhoto()
    return
  }

  // 3. Swipe Right -> Prev Photo
  if (deltaX > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
    prevPhoto()
    return
  }

  // 4. Tap Navigation: Left 30% = Prev, Right 70% = Next
  if (deltaTime < 300 && Math.hypot(deltaX, deltaY) < 18) {
    const target = e.currentTarget as HTMLElement
    if (target) {
      const rect = target.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      if (clickX < rect.width * 0.3) {
        prevPhoto()
      } else {
        nextPhoto()
      }
    }
  }
}

// Keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (selectedIndex.value === null) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') prevPhoto()
  else if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault()
    nextPhoto()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  stopProgressAnim()
  clearTimeout(holdTimer)
  clearTimeout(peekTimer)
  isStoryOpen.value = false
  document.body.style.overflow = ''
})
</script>

<template>
  <section class="invitation-section gallery-section">
    <div class="section-divider">
      <span class="section-label">GALLERY</span>
    </div>

    <h2 class="section-title font-serif">우리의 아름다운 순간</h2>
    <p class="section-subtitle font-serif">사진을 터치하시면 스토리가 재생됩니다</p>

    <!-- 3-Column Thumbnail Grid with Skeleton Shimmer & Long-Press Peek -->
    <div class="gallery-grid">
      <div
        v-for="(photo, index) in displayedPhotos"
        :key="photo.id"
        class="thumbnail-card"
        @touchstart="handleThumbnailTouchStart(photo, $event)"
        @touchmove="handleThumbnailTouchMove"
        @touchend="handleThumbnailTouchEnd"
        @touchcancel="handleThumbnailTouchEnd"
        @click="handleThumbnailClick(index)"
      >
        <!-- Skeleton Placeholder while loading from Firebase or More Loading -->
        <div
          v-if="!loadedThumbnails[photo.id] || (isMoreLoading && index >= INITIAL_COUNT)"
          class="thumbnail-skeleton"
        >
          <div class="skeleton-shimmer"></div>
        </div>

        <img
          :src="getOptimizedImageUrl(photo.url, 400, 75)"
          :alt="photo.caption || '웨딩 사진'"
          class="thumbnail-img"
          :class="{ 'is-loaded': loadedThumbnails[photo.id] && (!isMoreLoading || index < INITIAL_COUNT) }"
          loading="lazy"
          decoding="async"
          @load="onThumbnailLoad(photo.id)"
        />
      </div>
    </div>

    <!-- Load More Button -->
    <div v-if="hasMorePhotos" class="gallery-more">
      <button
        class="btn-secondary font-sans more-btn"
        :disabled="isMoreLoading"
        @click="toggleExpand"
      >
        <template v-if="isMoreLoading">
          <span class="more-loading-text">사진 불러오는 중...</span>
        </template>
        <template v-else>
          <span>{{ isExpanded ? '사진 접기' : `사진 더보기 (${remainingPhotosCount}장)` }}</span>
          <ChevronDown :size="16" :class="{ 'rotate-180': isExpanded }" />
        </template>
      </button>
    </div>

    <!-- Mobile Touch & Hold Peek Preview Layer Popup -->
    <Transition name="peek-fade">
      <div
        v-if="isPeeking && peekPhoto"
        class="peek-modal-overlay"
        @contextmenu.prevent
      >
        <div class="peek-card">
          <div class="peek-badge-row">
            <span class="peek-badge font-sans">미리보기</span>
          </div>
          <div class="peek-image-container">
            <!-- Peek Skeleton Loader -->
            <div v-if="!isPeekImageLoaded" class="peek-skeleton">
              <div class="skeleton-shimmer"></div>
              <div class="peek-spinner"></div>
            </div>
            <img
              :src="getOptimizedImageUrl(peekPhoto.url, 800, 85)"
              :alt="peekPhoto.caption || '사진 미리보기'"
              class="peek-image"
              :class="{ 'is-loaded': isPeekImageLoaded }"
              @load="isPeekImageLoaded = true"
            />
          </div>
          <div v-if="peekPhoto.caption" class="peek-caption font-serif">
            {{ peekPhoto.caption }}
          </div>
          <p class="peek-hint font-sans">손을 떼면 미리보기가 닫힙니다</p>
        </div>
      </div>
    </Transition>

    <!-- Fullscreen Instagram Story Modal -->
    <Transition name="story-modal-fade">
      <div
        v-if="selectedIndex !== null"
        class="story-backdrop"
        @click.self="closeLightbox"
      >
        <!-- Desktop Ambient Blurred Background from active photo -->
        <div
          class="story-bg-blur"
          :style="{ backgroundImage: `url(${getOptimizedImageUrl(sortedPhotos[selectedIndex].url, 200, 40)})` }"
        ></div>

        <!-- Story Frame (Mobile Fullscreen, PC Phone Aspect-Ratio) -->
        <div
          class="story-frame"
          :class="{ 'is-holding': isHolding }"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerUp"
        >
          <!-- 1. Top Segmented Progress Bar -->
          <div class="story-progress-wrapper" :class="{ 'ui-hidden': isHolding }">
            <div
              v-for="(photo, idx) in sortedPhotos"
              :key="photo.id"
              class="story-progress-track"
            >
              <div
                class="story-progress-fill"
                :style="{
                  width: idx < selectedIndex ? '100%' : idx === selectedIndex ? (progress * 100) + '%' : '0%'
                }"
              ></div>
            </div>
          </div>

          <!-- 2. Story Header (Avatar + Names + Badge + Actions) -->
          <div class="story-header" :class="{ 'ui-hidden': isHolding }">
            <div class="story-profile">
              <div class="story-avatar-ring">
                <img
                  :src="getOptimizedImageUrl(sortedPhotos[0]?.url || sortedPhotos[selectedIndex].url, 120, 80)"
                  alt="Avatar"
                  class="story-avatar-img"
                />
              </div>
              <div class="story-meta">
                <span class="story-names font-sans">
                  {{ weddingInfo?.groom?.name || '경주원' }} & {{ weddingInfo?.bride?.name || '양예진' }}
                </span>
                <span class="story-time font-sans">
                  WEDDING STORY · {{ selectedIndex + 1 }}/{{ sortedPhotos.length }}
                </span>
              </div>
            </div>

            <div class="story-header-actions">
              <!-- Play / Pause Toggle Button -->
              <button
                class="story-action-btn"
                @click.stop="togglePlayPause"
                :title="isPaused ? '재생' : '일시정지'"
                aria-label="재생/일시정지"
              >
                <Play v-if="isPaused" :size="16" fill="currentColor" />
                <Pause v-else :size="16" fill="currentColor" />
              </button>

              <!-- Close Button -->
              <button
                class="story-action-btn close"
                @click.stop="closeLightbox"
                title="닫기"
                aria-label="닫기"
              >
                <X :size="20" />
              </button>
            </div>
          </div>

          <!-- 3. Main Story Photo -->
          <div class="story-media-container">
            <Transition name="photo-fade" mode="out-in">
              <img
                :key="sortedPhotos[selectedIndex].id"
                :src="getOptimizedImageUrl(sortedPhotos[selectedIndex].url, 1200, 85)"
                :alt="sortedPhotos[selectedIndex].caption || '웨딩 스토리 사진'"
                class="story-image"
                draggable="false"
              />
            </Transition>

            <!-- Subtle Tap Zone Guides on PC hover -->
            <div class="story-tap-indicator left font-sans">
              <ChevronLeft :size="24" />
            </div>
            <div class="story-tap-indicator right font-sans">
              <ChevronRight :size="24" />
            </div>
          </div>

          <!-- 4. Bottom Story Caption Sticker -->
          <div
            v-if="sortedPhotos[selectedIndex].caption"
            class="story-caption-wrapper"
            :class="{ 'ui-hidden': isHolding }"
          >
            <div class="story-caption-sticker font-serif">
              <span>{{ sortedPhotos[selectedIndex].caption }}</span>
            </div>
          </div>

          <!-- 5. Hold/Pause Indicator -->
          <Transition name="hold-fade">
            <div v-if="isHolding" class="story-hold-indicator font-sans">
              화면 정지됨
            </div>
          </Transition>
        </div>

        <!-- Desktop External Navigation Arrows -->
        <button class="desktop-side-nav prev font-sans" @click.stop="prevPhoto" aria-label="이전 사진">
          <ChevronLeft :size="30" />
        </button>
        <button class="desktop-side-nav next font-sans" @click.stop="nextPhoto" aria-label="다음 사진">
          <ChevronRight :size="30" />
        </button>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.gallery-section {
  background-color: #FFFFFF;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 28px;
  padding: 0 4px;
}

.thumbnail-card {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background-color: var(--bg-warm);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.thumbnail-skeleton {
  position: absolute;
  inset: 0;
  background: #EFE7DA;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  overflow: hidden;
}

.skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(239, 231, 218, 0) 0%,
    rgba(255, 255, 255, 0.75) 50%,
    rgba(239, 231, 218, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite ease-in-out;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.more-loading-text {
  color: var(--gold-dark);
  font-weight: 500;
  letter-spacing: -0.2px;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.thumbnail-img.is-loaded {
  opacity: 1;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.view-indicator {
  color: #FFFFFF;
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

.thumbnail-card:hover .thumbnail-img {
  transform: scale(1.06);
}

.thumbnail-card:hover .thumbnail-overlay {
  opacity: 1;
}

.gallery-more {
  margin-top: 24px;
}

.more-btn {
  font-size: 13px;
  padding: 10px 22px;
}

.rotate-180 {
  transform: rotate(180deg);
}

/* =========================================================
   Instagram Story Viewer Modal
   ========================================================= */

.story-backdrop {
  position: fixed;
  inset: 0;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  background: rgba(10, 10, 10, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Ambient Blurred Background for Desktop */
.story-bg-blur {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(40px) brightness(0.2);
  transform: scale(1.15);
  pointer-events: none;
  opacity: 0.75;
  transition: background-image 0.4s ease;
}

/* Story Frame: Phone Aspect Ratio on PC, Fullscreen on Mobile */
.story-frame {
  position: relative;
  width: 100%;
  max-width: 440px;
  height: 100vh;
  height: 100dvh;
  max-height: 90vh;
  aspect-ratio: 9 / 16;
  background: #000000;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
  user-select: none;
  touch-action: none;
  cursor: pointer;
  z-index: 10;
}

@media (max-width: 640px) {
  .story-backdrop {
    height: 100vh;
    height: 100dvh;
    max-height: 100dvh;
  }

  .story-frame {
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    aspect-ratio: auto;
    box-shadow: none;
  }

  .story-progress-wrapper {
    top: max(12px, env(safe-area-inset-top, 12px)) !important;
    left: max(12px, env(safe-area-inset-left, 12px)) !important;
    right: max(12px, env(safe-area-inset-right, 12px)) !important;
  }

  .story-header {
    top: calc(max(12px, env(safe-area-inset-top, 12px)) + 14px) !important;
    left: max(14px, env(safe-area-inset-left, 14px)) !important;
    right: max(14px, env(safe-area-inset-right, 14px)) !important;
  }

  .story-caption-wrapper {
    bottom: max(24px, calc(env(safe-area-inset-bottom, 24px) + 16px)) !important;
    left: max(16px, env(safe-area-inset-left, 16px)) !important;
    right: max(16px, env(safe-area-inset-right, 16px)) !important;
  }
}

/* 1. Top Segmented Progress Bar */
.story-progress-wrapper {
  position: absolute;
  top: 14px;
  left: 12px;
  right: 12px;
  z-index: 30;
  display: flex;
  gap: 4px;
  transition: opacity 0.25s ease;
}

.story-progress-track {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.32);
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
}

.story-progress-fill {
  height: 100%;
  background: #FFFFFF;
  border-radius: 9999px;
  will-change: width;
}

/* 2. Story Header */
.story-header {
  position: absolute;
  top: 26px;
  left: 14px;
  right: 14px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #FFFFFF;
  transition: opacity 0.25s ease;
}

.story-profile {
  display: flex;
  align-items: center;
  gap: 10px;
}

.story-avatar-ring {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(45deg, #D4AF37, #F5D77F, #C7756B, #E29578);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.story-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid #000000;
}

.story-meta {
  display: flex;
  flex-direction: column;
}

.story-names {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #FFFFFF;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

.story-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 0.5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.story-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.story-action-btn {
  background: rgba(0, 0, 0, 0.35);
  border: none;
  color: #FFFFFF;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
  backdrop-filter: blur(4px);
}

.story-action-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.story-action-btn:active {
  transform: scale(0.92);
}

/* 3. Main Media Container */
.story-media-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
}

.story-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}

/* Tap Indicators on Desktop */
.story-tap-indicator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.story-tap-indicator.left {
  left: 6px;
}

.story-tap-indicator.right {
  right: 6px;
}

.story-frame:hover .story-tap-indicator {
  opacity: 0.65;
}

@media (max-width: 640px) {
  .story-tap-indicator {
    display: none;
  }
}

/* 4. Bottom Caption Sticker */
.story-caption-wrapper {
  position: absolute;
  bottom: 28px;
  left: 16px;
  right: 16px;
  z-index: 30;
  display: flex;
  justify-content: center;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.story-caption-sticker {
  background: rgba(18, 16, 15, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #FAF7F2;
  border-radius: 9999px;
  padding: 10px 22px;
  font-size: 13.5px;
  line-height: 1.45;
  max-width: 90%;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

/* 5. Press & Hold State */
.ui-hidden {
  opacity: 0 !important;
  pointer-events: none;
}

.story-hold-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  color: rgba(255, 255, 255, 0.85);
  padding: 6px 16px;
  border-radius: 9999px;
  font-size: 12px;
  letter-spacing: 0.5px;
  pointer-events: none;
  z-index: 40;
}

/* Desktop External Navigation Arrows */
.desktop-side-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 30;
}

.desktop-side-nav.prev {
  left: calc(50% - 220px - 72px);
}

.desktop-side-nav.next {
  right: calc(50% - 220px - 72px);
}

.desktop-side-nav:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.08);
}

.desktop-side-nav:active {
  transform: translateY(-50%) scale(0.95);
}

@media (max-width: 640px) {
  .desktop-side-nav {
    display: none;
  }
}

/* Transitions */
.story-modal-fade-enter-active,
.story-modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.story-modal-fade-enter-from,
.story-modal-fade-leave-to {
  opacity: 0;
}

.photo-fade-enter-active,
.photo-fade-leave-active {
  transition: opacity 0.2s ease;
}

.photo-fade-enter-from,
.photo-fade-leave-to {
  opacity: 0;
}

.hold-fade-enter-active,
.hold-fade-leave-active {
  transition: opacity 0.15s ease;
}

.hold-fade-enter-from,
.hold-fade-leave-to {
  opacity: 0;
}

/* =========================================================
   Mobile Touch & Hold Peek Preview Layer Popup
   ========================================================= */

.peek-modal-overlay {
  position: fixed;
  inset: 0;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  z-index: 1000;
  background: rgba(15, 13, 11, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px max(24px, env(safe-area-inset-right, 24px)) max(24px, env(safe-area-inset-bottom, 24px)) max(24px, env(safe-area-inset-left, 24px));
  pointer-events: none;
}

.peek-card {
  width: 100%;
  max-width: 320px;
  background: #FFFFFF;
  border-radius: 20px;
  padding: 14px;
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transform-origin: center center;
  will-change: transform, opacity;
}

.peek-badge-row {
  width: 100%;
  display: flex;
  justify-content: center;
}

.peek-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--gold-dark);
  background: var(--gold-soft);
  border: 1px solid var(--border-color);
  padding: 3px 10px;
  border-radius: 9999px;
}

.peek-image-container {
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 12px;
  overflow: hidden;
  background: #1e1b18;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  position: relative;
}

.peek-skeleton {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  background: #2a2521;
}

.peek-spinner {
  width: 30px;
  height: 30px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--gold-primary);
  border-radius: 50%;
  animation: spin 0.85s linear infinite;
  z-index: 3;
}

.peek-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.peek-image.is-loaded {
  opacity: 1;
}

.peek-caption {
  font-size: 13.5px;
  color: var(--text-main);
  text-align: center;
  line-height: 1.45;
  padding: 2px 8px 0;
  word-break: keep-all;
}

.peek-hint {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.2px;
  margin-top: 2px;
}

/* Peek Transitions */
.peek-fade-enter-active {
  transition: opacity 0.2s ease-out;
}

.peek-fade-enter-active .peek-card {
  transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.peek-fade-leave-active {
  transition: opacity 0.18s ease-in;
}

.peek-fade-leave-active .peek-card {
  transition: transform 0.18s ease-in;
}

.peek-fade-enter-from {
  opacity: 0;
}

.peek-fade-enter-from .peek-card {
  transform: scale(0.88);
}

.peek-fade-leave-to {
  opacity: 0;
}

.peek-fade-leave-to .peek-card {
  transform: scale(0.92);
}
</style>
