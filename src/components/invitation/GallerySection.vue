<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { photos, weddingInfo } from '../../services/storage'
import { X, ChevronLeft, ChevronRight, ChevronDown, Play, Pause } from 'lucide-vue-next'

const selectedIndex = ref<number | null>(null)
const isExpanded = ref(false)
const INITIAL_COUNT = 9

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
  isHolding.value = false
  document.body.style.overflow = ''
}

const prevPhoto = () => {
  if (selectedIndex.value === null) return
  stopProgressAnim()
  progress.value = 0
  pausedProgress = 0
  selectedIndex.value = (selectedIndex.value - 1 + sortedPhotos.value.length) % sortedPhotos.value.length
  runProgressAnim()
}

const nextPhoto = () => {
  if (selectedIndex.value === null) return
  stopProgressAnim()
  progress.value = 0
  pausedProgress = 0
  selectedIndex.value = (selectedIndex.value + 1) % sortedPhotos.value.length
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

    <!-- 3-Column Thumbnail Grid -->
    <div class="gallery-grid">
      <div
        v-for="(photo, index) in displayedPhotos"
        :key="photo.id"
        class="thumbnail-card"
        @click="openLightbox(index)"
      >
        <img
          :src="photo.url"
          :alt="photo.caption || '웨딩 사진'"
          class="thumbnail-img"
          loading="lazy"
        />
        <div class="thumbnail-overlay">
          <span class="view-indicator">✦</span>
        </div>
      </div>
    </div>

    <!-- Load More Button -->
    <div v-if="hasMorePhotos" class="gallery-more">
      <button class="btn-secondary font-sans more-btn" @click="isExpanded = !isExpanded">
        <span>{{ isExpanded ? '사진 접기' : `사진 더보기 (${remainingPhotosCount}장)` }}</span>
        <ChevronDown :size="16" :class="{ 'rotate-180': isExpanded }" />
      </button>
    </div>

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
          :style="{ backgroundImage: `url(${sortedPhotos[selectedIndex].url})` }"
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
                  :src="sortedPhotos[0]?.url || sortedPhotos[selectedIndex].url"
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
                :src="sortedPhotos[selectedIndex].url"
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
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
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
  .story-frame {
    max-width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    aspect-ratio: auto;
    box-shadow: none;
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
</style>
