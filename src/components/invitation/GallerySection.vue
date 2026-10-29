<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { photos, weddingInfo, getOptimizedImageUrl, isStoryOpen, updatePhotoLikes } from '../../services/storage'
import type { PhotoItem } from '../../types/wedding'
import { X, ChevronLeft, ChevronRight, ChevronDown, Play, Pause, Heart } from 'lucide-vue-next'

const selectedIndex = ref<number | null>(null)
const isExpanded = ref(false)
const isMoreLoading = ref(false)
const INITIAL_COUNT = 9

// --- Photo Story Likes Management ---
const LIKES_STORAGE_KEY = 'wedding_photo_liked_ids'
const loadLikedPhotoIds = (): string[] => {
  try {
    const raw = sessionStorage.getItem(LIKES_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return []
}

const likedPhotoIds = ref<string[]>(loadLikedPhotoIds())

const isPhotoLiked = (photoId: string) => {
  return likedPhotoIds.value.includes(photoId)
}

const toggleLikeCurrentPhoto = (e: Event) => {
  e.stopPropagation()
  e.preventDefault()

  if (selectedIndex.value === null) return
  const currentPhoto = sortedPhotos.value[selectedIndex.value]
  if (!currentPhoto) return

  const photoId = currentPhoto.id
  const idx = likedPhotoIds.value.indexOf(photoId)

  if (idx > -1) {
    // 이미 좋아요 함 -> 해제
    likedPhotoIds.value.splice(idx, 1)
    updatePhotoLikes(photoId, -1)
  } else {
    // 좋아요 추가 (1인 1회)
    likedPhotoIds.value.push(photoId)
    updatePhotoLikes(photoId, 1)
  }

  try {
    sessionStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likedPhotoIds.value))
  } catch (_) {}
}

// --- Thumbnail Loading Delay Optimization ---
const loadedThumbnails = ref<Record<string, boolean>>({})
const onThumbnailLoad = (id: string) => {
  loadedThumbnails.value[id] = true
}

const FALLBACK_GALLERY_PHOTOS = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=600&q=80'
]

const onThumbnailError = (e: Event, id: string, index: number) => {
  const target = e.target as HTMLImageElement | null
  const currentPhoto = sortedPhotos.value[index]
  if (target && target.src.includes('wsrv.nl') && currentPhoto?.url) {
    // CDN 리사이징 실패 시 원본 URL로 안전하게 폴백
    target.src = currentPhoto.url
    return
  }
  loadedThumbnails.value[id] = true
  if (target && !target.src.includes('images.unsplash.com')) {
    target.src = FALLBACK_GALLERY_PHOTOS[index % FALLBACK_GALLERY_PHOTOS.length]
  }
}

const onStoryImageError = (e: Event, index: number) => {
  isStoryImageLoaded.value = true
  const target = e.target as HTMLImageElement | null
  if (target && !target.src.includes('images.unsplash.com')) {
    target.src = FALLBACK_GALLERY_PHOTOS[index % FALLBACK_GALLERY_PHOTOS.length].replace('w=600', 'w=1200')
  }
}

const onPeekImageError = (e: Event) => {
  isPeekImageLoaded.value = true
  const target = e.target as HTMLImageElement | null
  if (target && !target.src.includes('images.unsplash.com')) {
    target.src = FALLBACK_GALLERY_PHOTOS[0].replace('w=600', 'w=800')
  }
}
const handleImgRef = (el: HTMLImageElement | null, id: string) => {
  if (el && el.complete && el.naturalWidth > 0) {
    loadedThumbnails.value[id] = true
  }
}

const toggleExpand = () => {
  if (isExpanded.value) {
    isExpanded.value = false
    // '사진접기' 시 갤러리 섹션 영역 상단으로 부드럽게 스크롤 복원
    nextTick(() => {
      const el = document.querySelector('.gallery-section')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
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

const preventDefaultTouchMove = (e: TouchEvent) => {
  if (isPeeking.value && e.cancelable) {
    e.preventDefault()
  }
}

const closePeek = () => {
  clearTimeout(peekTimer)
  if (isPeeking.value) {
    isPeeking.value = false
    peekPhoto.value = null
    if (selectedIndex.value === null && !isStoryOpen.value) {
      document.body.style.overflow = ''
    }
    window.removeEventListener('touchmove', preventDefaultTouchMove)
  }
}

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

    // 롱프레스 픽(Peek) 모달 활성화 시 뒷 배경 div 및 바디 스크롤 차단
    document.body.style.overflow = 'hidden'
    window.addEventListener('touchmove', preventDefaultTouchMove, { passive: false })

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(35)
      } catch (_) {}
    }
  }, 320)
}

const handleThumbnailTouchMove = (e: TouchEvent) => {
  if (!e.touches.length) return
  // 이미 픽 모달이 뜬 상태에서 터치 이동 시 뒷배경 스크롤 방지
  if (isPeeking.value) {
    if (e.cancelable) {
      e.preventDefault()
    }
    return
  }
  const touch = e.touches[0]
  const dist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY)
  if (dist > 10) {
    clearTimeout(peekTimer)
  }
}

const handleThumbnailTouchEnd = (e: TouchEvent) => {
  clearTimeout(peekTimer)
  if (isPeeking.value) {
    closePeek()
    if (e.cancelable) {
      e.preventDefault()
    }
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

let savedScrollY = 0
let isNavigatingBack = false
const isStoryImageLoaded = ref(false)

const restoreScrollPosition = () => {
  if (typeof savedScrollY !== 'number' || savedScrollY <= 0) return

  const targetY = savedScrollY
  window.scrollTo({ top: targetY, behavior: 'instant' })
  requestAnimationFrame(() => {
    window.scrollTo({ top: targetY, behavior: 'instant' })
    setTimeout(() => {
      window.scrollTo({ top: targetY, behavior: 'instant' })
    }, 40)
    setTimeout(() => {
      window.scrollTo({ top: targetY, behavior: 'instant' })
    }, 120)
    setTimeout(() => {
      window.scrollTo({ top: targetY, behavior: 'instant' })
    }, 250)
  })
}

const openLightbox = (index: number) => {
  const currentY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
  const galleryEl = document.querySelector('.gallery-section') as HTMLElement | null
  const fallbackY = galleryEl ? galleryEl.offsetTop : 0
  savedScrollY = currentY > 0 ? currentY : fallbackY

  isNavigatingBack = false
  history.pushState({ ...history.state, modal: 'gallery-story' }, '', window.location.href)

  selectedIndex.value = index
  isStoryOpen.value = true
  progress.value = 0
  pausedProgress = 0
  isPaused.value = false
  isHolding.value = false
  isStoryImageLoaded.value = false
  document.body.style.overflow = 'hidden'

  runProgressAnim()
}

const closeLightbox = (isFromPopState: boolean | Event = false) => {
  // 이미 닫혀있는 상태라면 중복 실행 방지
  if (selectedIndex.value === null && !isStoryOpen.value) return

  stopProgressAnim()
  clearTimeout(holdTimer)
  selectedIndex.value = null
  isStoryOpen.value = false
  isHolding.value = false
  document.body.style.overflow = ''

  const isPop = isFromPopState === true

  if (!isPop && history.state?.modal === 'gallery-story' && !isNavigatingBack) {
    isNavigatingBack = true
    history.back()
    setTimeout(() => { isNavigatingBack = false }, 300)
  }

  // 모달을 열기 전의 스크롤 위치 보존 및 복원 (오직 갤러리 스토리 종료 시에만 실행)
  restoreScrollPosition()
}


const prevPhoto = () => {
  if (selectedIndex.value === null) return
  stopProgressAnim()
  progress.value = 0
  pausedProgress = 0
  isPaused.value = false // 이전/다음 사진으로 이동 시 일시정지 해제 후 다시 재생
  isStoryImageLoaded.value = false
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
  isPaused.value = false // 이전/다음 사진으로 이동 시 일시정지 해제 후 다시 재생
  isStoryImageLoaded.value = false
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

const handlePopState = () => {
  // 오직 갤러리 스토리가 열려 있는 상태에서 발생한 뒤로가기인 경우에만 닫기 실행
  if (selectedIndex.value !== null || isStoryOpen.value) {
    closeLightbox(true)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('popstate', handlePopState)
})


onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('popstate', handlePopState)
  window.removeEventListener('touchmove', preventDefaultTouchMove)
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
        @contextmenu.prevent
      >
        <!-- Skeleton Placeholder while loading from Firebase or More Loading -->
        <div
          v-if="!loadedThumbnails[photo.id] || (isMoreLoading && index >= INITIAL_COUNT)"
          class="thumbnail-skeleton"
        >
          <div class="skeleton-shimmer"></div>
        </div>

        <img
          :ref="(el) => handleImgRef(el as HTMLImageElement, photo.id)"
          :src="photo.thumbnailUrl || getOptimizedImageUrl(photo.url, 240, 60)"
          :alt="photo.caption || '웨딩 사진'"
          class="thumbnail-img"
          :style="{ objectPosition: photo.objectPosition || 'center center' }"
          :class="{ 'is-loaded': loadedThumbnails[photo.id] && (!isMoreLoading || index < INITIAL_COUNT) }"
          :loading="index < INITIAL_COUNT ? 'eager' : 'lazy'"
          :fetchpriority="index < INITIAL_COUNT ? 'high' : 'auto'"
          decoding="async"
          draggable="false"
          @contextmenu.prevent
          @load="onThumbnailLoad(photo.id)"
          @error="onThumbnailError($event, photo.id, index)"
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

    <!-- Mobile Touch & Hold Peek Preview (브라우저 전체화면 텔레포트) -->
    <Teleport to="body">
      <Transition name="peek-fade">
        <div
          v-if="isPeeking && peekPhoto"
          class="peek-modal-overlay"
          @contextmenu.prevent
          @touchmove.prevent
        >
          <div class="peek-card">
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
                draggable="false"
                @contextmenu.prevent
                @load="isPeekImageLoaded = true"
                @error="onPeekImageError"
              />
            </div>
            <div v-if="peekPhoto.caption" class="peek-caption font-serif">
              {{ peekPhoto.caption }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Fullscreen Instagram Story Modal (브라우저 전체화면 텔레포트) -->
    <Teleport to="body">
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
            <!-- Story Photo Skeleton Shimmer & Spinner Loader -->
            <div v-if="!isStoryImageLoaded" class="story-skeleton">
              <div class="skeleton-shimmer"></div>
              <div class="story-spinner"></div>
            </div>

            <Transition name="photo-fade" mode="out-in">
              <img
                :key="sortedPhotos[selectedIndex].id"
                :src="sortedPhotos[selectedIndex].url"
                :alt="sortedPhotos[selectedIndex].caption || '웨딩 스토리 사진'"
                class="story-image"
                :class="{ 'is-loaded': isStoryImageLoaded }"
                draggable="false"
                @load="isStoryImageLoaded = true"
                @error="onStoryImageError($event, selectedIndex ?? 0)"
              />
            </Transition>
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

          <!-- 5. Story Floating Like Button with Count (오른쪽 하단에서 조금 위쪽에 배치) -->
          <div
            class="story-like-wrapper"
            :class="{ 'ui-hidden': isHolding }"
          >
            <button
              class="story-like-btn"
              :class="{ 'is-liked': isPhotoLiked(sortedPhotos[selectedIndex].id) }"
              @pointerdown.stop
              @pointerup.stop
              @touchstart.stop
              @touchend.stop
              @click.stop="toggleLikeCurrentPhoto"
              :title="isPhotoLiked(sortedPhotos[selectedIndex].id) ? '좋아요 취소' : '좋아요'"
              aria-label="좋아요"
            >
              <Heart
                :size="24"
                :class="{ 'heart-pop': isPhotoLiked(sortedPhotos[selectedIndex].id) }"
                :fill="isPhotoLiked(sortedPhotos[selectedIndex].id) ? '#FF3B30' : 'none'"
                :stroke="isPhotoLiked(sortedPhotos[selectedIndex].id) ? '#FF3B30' : '#FFFFFF'"
                :stroke-width="isPhotoLiked(sortedPhotos[selectedIndex].id) ? 2 : 2.2"
              />
            </button>
            <span class="story-like-count font-sans">{{ sortedPhotos[selectedIndex].likes || 0 }}</span>
          </div>
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
    </Teleport>
  </section>
</template>

<style scoped>
.gallery-section {
  background-color: var(--section-bg, #FFFFFF);
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
  user-select: none !important;
  -webkit-user-select: none !important;
  -webkit-touch-callout: none !important;
}

.thumbnail-skeleton {
  position: absolute;
  inset: 0;
  background: var(--bg-warm, #E2E4E8);
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
    rgba(226, 228, 232, 0) 0%,
    rgba(255, 255, 255, 0.75) 50%,
    rgba(226, 228, 232, 0) 100%
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
  pointer-events: none;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
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

/* Story Frame: Fullscreen Overlay on all devices */
.story-frame {
  position: relative;
  width: 100vw;
  max-width: 100vw;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  background: #000000;
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: none;
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
    right: max(68px, calc(env(safe-area-inset-right, 16px) + 52px)) !important;
  }

  .story-like-wrapper {
    bottom: max(32px, calc(env(safe-area-inset-bottom, 24px) + 24px)) !important;
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

.story-skeleton {
  position: absolute;
  inset: 0;
  background: #181614;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  overflow: hidden;
}

.story-skeleton .skeleton-shimmer {
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

.story-spinner {
  width: 32px;
  height: 32px;
  border: 2.5px solid rgba(255, 255, 255, 0.15);
  border-top-color: var(--gold-primary, #C8A97E);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  z-index: 3;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.story-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.story-image.is-loaded {
  opacity: 1;
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
  color: var(--bg-ivory, #F4F5F7);
  border-radius: 9999px;
  padding: 10px 22px;
  font-size: 13.5px;
  line-height: 1.45;
  max-width: 90%;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

/* 5. Floating Like Button & Count in Story */
.story-like-wrapper {
  position: absolute;
  bottom: 40px;
  right: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 45;
  user-select: none;
  touch-action: manipulation;
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.story-like-wrapper.ui-hidden {
  opacity: 0;
  pointer-events: none;
}

.story-like-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #FFFFFF;
  transition: all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  touch-action: manipulation;
  user-select: none;
}

.story-like-btn:hover {
  background: rgba(0, 0, 0, 0.65);
  transform: scale(1.08);
}

.story-like-btn:active {
  transform: scale(0.9);
}

.story-like-btn.is-liked {
  background: rgba(255, 255, 255, 0.95);
  border-color: #FF3B30;
  box-shadow: 0 4px 18px rgba(255, 59, 48, 0.45);
}

.story-like-count {
  font-size: 12px;
  font-weight: 700;
  color: #FFFFFF;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.6);
  letter-spacing: 0.3px;
  line-height: 1;
}

.heart-pop {
  animation: heartPulse 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes heartPulse {
  0% {
    transform: scale(0.6);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
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
  left: 24px;
}

.desktop-side-nav.next {
  right: 24px;
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
   Mobile Touch & Hold Peek Preview (뒷 배경 블러 효과)
   ========================================================= */

.peek-modal-overlay {
  position: fixed;
  inset: 0;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  z-index: 1000;
  background: rgba(10, 10, 10, 0.65);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px max(24px, env(safe-area-inset-right, 24px)) max(24px, env(safe-area-inset-bottom, 24px)) max(24px, env(safe-area-inset-left, 24px));
  pointer-events: none;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
}

.peek-card {
  width: 86vw;
  max-width: 320px;
  background: transparent;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  transform-origin: center center;
  will-change: transform, opacity;
  -webkit-touch-callout: none !important;
}

.peek-image-container {
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 18px;
  overflow: hidden;
  background: #1e1b18;
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1);
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
  pointer-events: none;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
}

.peek-image.is-loaded {
  opacity: 1;
}

.peek-caption {
  font-size: 14px;
  color: #FFFFFF;
  text-align: center;
  line-height: 1.5;
  padding: 0 10px;
  word-break: keep-all;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  font-weight: 400;
  letter-spacing: -0.2px;
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
