<script setup lang="ts">
import { ref, computed } from 'vue'
import { photos } from '../../services/storage'
import { X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-vue-next'

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

const openLightbox = (index: number) => {
  selectedIndex.value = index
  document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  selectedIndex.value = null
  document.body.style.overflow = ''
}

const prevPhoto = () => {
  if (selectedIndex.value === null) return
  selectedIndex.value = (selectedIndex.value - 1 + sortedPhotos.value.length) % sortedPhotos.value.length
}

const nextPhoto = () => {
  if (selectedIndex.value === null) return
  selectedIndex.value = (selectedIndex.value + 1) % sortedPhotos.value.length
}

// Touch swipe handling for mobile
let touchStartX = 0
let touchEndX = 0

const handleTouchStart = (e: TouchEvent) => {
  touchStartX = e.changedTouches[0].screenX
}

const handleTouchEnd = (e: TouchEvent) => {
  touchEndX = e.changedTouches[0].screenX
  handleSwipe()
}

const handleSwipe = () => {
  const threshold = 40
  if (touchStartX - touchEndX > threshold) {
    nextPhoto() // Swiped left -> next
  } else if (touchEndX - touchStartX > threshold) {
    prevPhoto() // Swiped right -> prev
  }
}
</script>

<template>
  <section class="invitation-section gallery-section">
    <div class="section-divider">
      <span class="section-label">GALLERY</span>
    </div>

    <h2 class="section-title font-serif">우리의 아름다운 순간</h2>
    <p class="section-subtitle font-serif">사진을 터치하시면 크게 보실 수 있습니다</p>

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
          <span class="view-indicator">+</span>
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

    <!-- Fullscreen Touch-Swipe Lightbox -->
    <Transition name="lightbox-fade">
      <div
        v-if="selectedIndex !== null"
        class="lightbox-modal"
        @click.self="closeLightbox"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <!-- Top Bar with Counter & Close -->
        <div class="lightbox-header">
          <span class="counter-badge font-sans">
            {{ selectedIndex + 1 }} / {{ sortedPhotos.length }}
          </span>
          <button class="lightbox-close" @click="closeLightbox" aria-label="닫기">
            <X :size="24" />
          </button>
        </div>

        <!-- Main Photo Viewport -->
        <div class="lightbox-body">
          <button class="nav-btn prev-btn" @click="prevPhoto" aria-label="이전 사진">
            <ChevronLeft :size="30" />
          </button>

          <div class="image-wrapper">
            <img
              :src="sortedPhotos[selectedIndex].url"
              :alt="sortedPhotos[selectedIndex].caption || '웨딩 사진 확대'"
              class="lightbox-img"
            />
            <p v-if="sortedPhotos[selectedIndex].caption" class="lightbox-caption font-serif">
              {{ sortedPhotos[selectedIndex].caption }}
            </p>
          </div>

          <button class="nav-btn next-btn" @click="nextPhoto" aria-label="다음 사진">
            <ChevronRight :size="30" />
          </button>
        </div>
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
  background: rgba(0, 0, 0, 0.15);
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.view-indicator {
  color: #FFFFFF;
  font-size: 20px;
  font-weight: 300;
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

/* Lightbox Modal */
.lightbox-modal {
  position: fixed;
  inset: 0;
  background: rgba(14, 13, 12, 0.94);
  backdrop-filter: blur(8px);
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.lightbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  color: #FFFFFF;
}

.counter-badge {
  font-size: 14px;
  letter-spacing: 1px;
  opacity: 0.8;
}

.lightbox-close {
  background: none;
  border: none;
  color: #FFFFFF;
  cursor: pointer;
  padding: 6px;
  opacity: 0.85;
  transition: opacity 0.2s;
}

.lightbox-close:hover {
  opacity: 1;
}

.lightbox-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  padding: 0 12px;
}

.image-wrapper {
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.lightbox-img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  user-select: none;
}

.lightbox-caption {
  color: #EDE8DE;
  font-size: 14px;
  margin-top: 14px;
  text-align: center;
  padding: 0 16px;
  line-height: 1.5;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: #FFFFFF;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  z-index: 10;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.nav-btn:active {
  transform: scale(0.92);
}

@media (max-width: 640px) {
  .nav-btn {
    display: none; /* On mobile, swipe gesture is primary */
  }
}

.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 0.3s ease;
}

.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}
</style>
