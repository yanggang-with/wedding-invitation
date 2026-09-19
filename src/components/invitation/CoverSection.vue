<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { photos, weddingInfo, formatWeddingDate } from '../../services/storage'
import { Heart } from 'lucide-vue-next'

const isCoverReady = ref(false)

const coverPhoto = computed(() => {
  const visiblePhotos = photos.value.filter(p => !p.isHidden)
  const found = visiblePhotos.find(p => p.isCover)
  return found ? found.url : (visiblePhotos[0]?.url || '')
})

const preloadCover = () => {
  if (!coverPhoto.value) {
    isCoverReady.value = true
    return
  }
  const img = new Image()
  img.src = coverPhoto.value
  if (img.complete) {
    isCoverReady.value = true
  } else {
    img.onload = () => {
      isCoverReady.value = true
    }
    img.onerror = () => {
      isCoverReady.value = true
    }
  }
}

onMounted(() => {
  preloadCover()
})

watch(coverPhoto, () => {
  isCoverReady.value = false
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
  <Transition name="cover-fade" mode="out-in">
    <!-- 1. Full-screen Intro Loading Screen: renders until cover image is 100% loaded -->
    <div v-if="!isCoverReady" class="cover-loading-screen" key="loading">
      <div class="cover-loading-card">
        <div class="intro-monogram font-serif">
          <span>{{ weddingInfo.groom.name }}</span>
          <span class="mono-heart">♥</span>
          <span>{{ weddingInfo.bride.name }}</span>
        </div>
        <div class="loading-ring-spinner"></div>
        <p class="intro-text font-sans">청첩장을 불러오는 중입니다...</p>
      </div>
    </div>

    <!-- 2. Main Cover Section: Rendered only after image is 100% loaded -->
    <header v-else class="cover-container" key="content">
      <!-- Top Tagline -->
      <div class="header-tagline">
        <span class="sub-label">WEDDING INVITATION</span>
      </div>

      <!-- Main Photo Frame with elegant shadow & border -->
      <div class="photo-frame-wrapper">
        <div class="photo-frame">
          <img
            v-if="coverPhoto"
            :src="coverPhoto"
            alt="웨딩 대표 사진"
            class="cover-image"
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
    <div class="couple-details">
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
  </Transition>
</template>

<style scoped>
.cover-container {
  padding: 44px 20px 36px;
  text-align: center;
  position: relative;
  background-color: var(--bg-ivory);
}

.header-tagline {
  margin-bottom: 24px;
}

.sub-label {
  display: block;
  font-size: 11px;
  letter-spacing: 4px;
  color: var(--gold-primary);
  font-weight: 600;
  margin-bottom: 4px;
}

.eng-date {
  font-size: 14px;
  color: var(--text-sub);
  letter-spacing: 1px;
}

.photo-frame-wrapper {
  padding: 0 10px;
  margin-bottom: 30px;
}

.photo-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 180px 180px 16px 16px;
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(110, 93, 76, 0.14);
  border: 4px solid #FFFFFF;
  background: #EFE7DA;
}

.cover-loading-screen {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background-color: var(--bg-ivory);
  width: 100%;
}

.cover-loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.intro-monogram {
  font-size: 22px;
  color: var(--gold-dark);
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.mono-heart {
  color: var(--rose-accent);
  font-size: 18px;
}

.loading-ring-spinner {
  width: 36px;
  height: 36px;
  border: 2.5px solid rgba(168, 131, 80, 0.2);
  border-top-color: var(--gold-primary);
  border-radius: 50%;
  animation: spin 0.85s linear infinite;
  margin: 6px 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.intro-names {
  font-size: 16px;
  color: var(--text-main);
  letter-spacing: 2px;
}

.intro-text {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.cover-fade-enter-active {
  transition: opacity 0.5s ease-out;
}

.cover-fade-leave-active {
  transition: opacity 0.3s ease-in;
}

.cover-fade-enter-from,
.cover-fade-leave-to {
  opacity: 0;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
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
  font-size: 26px;
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
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-text {
  font-size: 15px;
  color: var(--gold-dark);
  font-weight: 500;
}

.venue-text {
  font-size: 14px;
  color: var(--text-sub);
}
</style>
