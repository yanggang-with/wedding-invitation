<script setup lang="ts">
import { computed } from 'vue'
import { photos, weddingInfo, formatWeddingDate } from '../../services/storage'
import { Heart } from 'lucide-vue-next'

const coverPhoto = computed(() => {
  const visiblePhotos = photos.value.filter(p => !p.isHidden)
  const found = visiblePhotos.find(p => p.isCover)
  return found ? found.url : (visiblePhotos[0]?.url || '')
})

const formattedDate = computed(() => {
  return formatWeddingDate(
    weddingInfo.value.date,
    weddingInfo.value.dateFormat,
    weddingInfo.value.customDateFormat
  )
})

const englishDate = computed(() => {
  const d = new Date(weddingInfo.value.date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const month = monthNames[d.getMonth()]
  const date = String(d.getDate()).padStart(2, '0')
  return `${month} ${date}, ${year}`
})
</script>

<template>
  <header class="cover-container">
    <!-- Top Tagline -->
    <div class="header-tagline">
      <span class="sub-label">WEDDING INVITATION</span>
      <p class="eng-date font-serif">{{ englishDate }}</p>
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
</template>

<style scoped>
.cover-container {
  padding: 44px 20px 36px;
  text-align: center;
  position: relative;
  background: linear-gradient(180deg, #F8F3EB 0%, #FAF7F2 100%);
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
