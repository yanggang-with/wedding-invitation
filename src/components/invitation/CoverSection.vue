<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { photos, weddingInfo, formatWeddingDate } from '../../services/storage'
import { Heart } from 'lucide-vue-next'
import WeddingDayCalligraphy from './WeddingDayCalligraphy.vue'

const isImageLoaded = ref(false)
const isIntroRevealed = ref(false)

const currentCoverPhoto = computed(() => {
  const visiblePhotos = photos.value.filter(p => !p.isHidden)
  const found = visiblePhotos.find(p => p.isCover)
  return found || visiblePhotos[0] || null
})

const coverPhotoUrl = computed(() => {
  return currentCoverPhoto.value?.url || ''
})

const coverObjectPosition = computed(() => {
  return currentCoverPhoto.value?.objectPosition || 'center center'
})

const triggerReveal = () => {
  if (isIntroRevealed.value) return
  // 캘리그라피가 우아하게 쓰여지는 최소 감상 시간(1.15초)을 확보한 뒤 자연스럽게 위로 상승
  setTimeout(() => {
    isIntroRevealed.value = true
  }, 1150)
}

const preloadCover = () => {
  if (!coverPhotoUrl.value) {
    isImageLoaded.value = true
    triggerReveal()
    return
  }
  const img = new Image()
  img.src = coverPhotoUrl.value
  if (img.complete) {
    isImageLoaded.value = true
    triggerReveal()
  } else {
    img.onload = () => {
      isImageLoaded.value = true
      triggerReveal()
    }
    img.onerror = () => {
      isImageLoaded.value = true
      triggerReveal()
    }
  }
}

onMounted(() => {
  preloadCover()
  // 네트워크 지연 시 최대 2.5초 후에는 안전하게 커버 섹션 전체 노출
  setTimeout(() => {
    if (!isIntroRevealed.value) {
      isIntroRevealed.value = true
    }
  }, 2500)
})

watch(coverPhotoUrl, () => {
  isImageLoaded.value = false
  preloadCover()
})

const formattedDate = computed(() => {
  return formatWeddingDate(
    weddingInfo.value.date,
    weddingInfo.value.dateFormat,
    weddingInfo.value.customDateFormat
  )
})
</script>

<template>
  <header class="cover-container" :class="{ 'is-revealed': isIntroRevealed }">
    <!-- Top Tagline & Calligraphy (처음 로딩 시 화면 중앙에 위치하다가 로딩 완료 시 살짝 위로 스르륵 상승) -->
    <div class="header-tagline">
      <div class="calligraphy-container">
        <WeddingDayCalligraphy
          color="#000000"
          :speed="1.15"
          :autoplay="true"
          :replayable="false"
        />
      </div>
    </div>

    <!-- Main Photo Frame with elegant shadow & border -->
    <div class="photo-frame-wrapper cover-reveal-element">
      <div class="photo-frame">
        <img
          v-if="coverPhotoUrl"
          :src="coverPhotoUrl"
          alt="웨딩 대표 사진"
          class="cover-image"
          :style="{ objectPosition: coverObjectPosition }"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
        <div v-else class="empty-cover">
          <Heart :size="32" class="empty-icon" />
          <p>관리자 페이지에서 대표 사진을 등록해 주세요</p>
        </div>
      </div>
    </div>

    <!-- Couple Names & Wedding Details -->
    <div class="couple-details cover-reveal-element">
      <h1 class="couple-names font-serif">
        <span>{{ weddingInfo.groom.name }}</span>
        <span class="divider-dot font-sans">♥</span>
        <span>{{ weddingInfo.bride.name }}</span>
      </h1>

      <div class="wedding-time-location font-serif">
        <p class="date-text">{{ formattedDate }}</p>
        <p class="venue-text">
          {{ weddingInfo.venue.name }} {{ weddingInfo.venue.hall }}
        </p>
      </div>
    </div>
  </header>
</template>

<style scoped>
.cover-container {
  min-height: 100vh;
  min-height: 100dvh;
  justify-content: center;
  padding: 40px 20px 32px;
  text-align: center;
  position: relative;
  background-color: var(--bg-ivory);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
}

/* 1. Calligraphy Tagline: 처음엔 화면 중앙 쪽에 안착, is-revealed 시 원래 상단으로 부드럽게 상승 */
.header-tagline {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 0px;
  z-index: 5;
  /* 화면 정중앙 오프셋에서 상단 위치로 부드럽게 이동 */
  transform: translateY(calc(24vh));
  transition: transform 1.1s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

.cover-container.is-revealed .header-tagline {
  transform: translateY(0);
}

.calligraphy-container {
  width: 100%;
  max-width: 285px;
  margin: 0 auto;
}

/* 2. Photo Frame and Couple Details: 처음엔 숨겨져 있다가 로딩 완료 시 페이드인 + 슬라이드업 등장 */
.cover-reveal-element {
  opacity: 0;
  transform: translateY(35px);
  pointer-events: none;
  transition: opacity 0.95s cubic-bezier(0.16, 1, 0.3, 1), transform 0.95s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.cover-container.is-revealed .cover-reveal-element {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* 사진 프레임과 커플 텍스트 등장 시차 */
.cover-container.is-revealed .photo-frame-wrapper {
  transition-delay: 0.22s;
}

.cover-container.is-revealed .couple-details {
  transition-delay: 0.35s;
}

.photo-frame-wrapper {
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.photo-frame {
  position: relative;
  width: 220px;
  height: 220px;
  aspect-ratio: 1 / 1;
  max-width: calc(100vw - 48px);
  max-height: calc(100vw - 48px);
  border-radius: 0;
  overflow: hidden;
  background: var(--bg-warm);
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.8s ease;
}

.empty-cover {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 13px;
  gap: 12px;
}

.empty-icon {
  color: var(--gold-primary);
  opacity: 0.6;
}

.couple-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.couple-names {
  font-family: 'Nanum Myeongjo', serif;
  font-size: 24px;
  color: var(--text-main);
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
}

.divider-dot {
  font-size: 14px;
  color: var(--rose-accent);
  opacity: 0.8;
}

.wedding-time-location {
  font-family: 'Nanum Myeongjo', serif;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-text {
  font-size: 15px;
  color: var(--gold-dark);
  font-weight: 700;
}

.venue-text {
  font-size: 14px;
  color: var(--text-sub);
}
</style>
