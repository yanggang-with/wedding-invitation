<script setup lang="ts">
import { ref, computed } from 'vue'
import { weddingInfo } from '../../services/storage'
import { MapPin, Copy, Check, Car, Train, Bus } from 'lucide-vue-next'

const copied = ref(false)

const venue = computed(() => weddingInfo.value.venue)

const copyAddress = async () => {
  try {
    await navigator.clipboard.writeText(`${venue.value.address} ${venue.value.addressDetail}`)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Clipboard copy failed:', err)
  }
}

// Navigation links
const kakaoNaviUrl = computed(() => {
  const name = encodeURIComponent(venue.value.name)
  return `https://map.kakao.com/link/to/${name},${venue.value.mapLat},${venue.value.mapLng}`
})

const naverMapUrl = computed(() => {
  const name = encodeURIComponent(venue.value.name)
  return `https://map.naver.com/v5/directions/-/-/${venue.value.mapLng},${venue.value.mapLat},${name}/-/transit?c=15,0,0,0,dh`
})

const tmapUrl = computed(() => {
  const name = encodeURIComponent(venue.value.name)
  return `tmap://route?goalname=${name}&goalx=${venue.value.mapLng}&goaly=${venue.value.mapLat}`
})

const windowOpen = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <section class="invitation-section location-section">
    <div class="section-divider">
      <span class="section-label">LOCATION</span>
    </div>

    <h2 class="section-title font-serif">오시는 길</h2>

    <!-- Venue Title & Address -->
    <div class="venue-header">
      <h3 class="venue-name font-serif">{{ venue.name }}</h3>
      <p class="venue-hall font-serif">{{ venue.hall }}</p>
      
      <div class="address-box font-sans">
        <MapPin :size="15" class="pin-icon" />
        <span class="addr-text">{{ venue.address }} {{ venue.addressDetail }}</span>
        <button class="copy-btn" @click="copyAddress" title="주소 복사">
          <Check v-if="copied" :size="13" class="text-green" />
          <Copy v-else :size="13" />
          <span>{{ copied ? '복사완료' : '주소복사' }}</span>
        </button>
      </div>

      <p v-if="venue.tel" class="venue-tel font-sans">
        안내전화: <a :href="`tel:${venue.tel}`">{{ venue.tel }}</a>
      </p>
    </div>

    <!-- Map Preview Frame -->
    <div class="map-card card-paper">
      <!-- Interactive Naver Map Container -->
      <div class="map-visual interactive-map">
        <!-- Interactive Map Tile (Interactive Pan & Zoom Enabled) -->
        <iframe
          class="map-iframe"
          title="네이버 지도 예식장 위치"
          :src="`https://www.openstreetmap.org/export/embed.html?bbox=${venue.mapLng - 0.006}%2C${venue.mapLat - 0.004}%2C${venue.mapLng + 0.006}%2C${venue.mapLat + 0.004}&amp;layer=mapnik&amp;marker=${venue.mapLat}%2C${venue.mapLng}`"
          loading="lazy"
        ></iframe>

        <!-- Naver Map Brand Tag -->
        <div class="naver-brand-badge font-sans" @click.stop="windowOpen(naverMapUrl)" title="네이버 지도로 열기">
          <svg class="naver-badge-icon" viewBox="0 0 32 32" width="16" height="16" fill="none">
            <rect width="32" height="32" rx="7" fill="#03C75A"/>
            <path d="M16 5C11.58 5 8 8.58 8 13C8 18.25 14.8 25.5 15.35 26.08C15.7 26.45 16.3 26.45 16.65 26.08C17.2 25.5 24 18.25 24 13C24 8.58 20.42 5 16 5Z" fill="#FFFFFF"/>
            <path d="M13 10H14.5L17.5 14.3V10H19V16H17.5L14.5 11.7V16H13V10Z" fill="#03C75A"/>
          </svg>
          <span>NAVER 지도</span>
        </div>

        <!-- Venue Name Pill & Action Link -->
        <div class="map-venue-tag font-sans" @click.stop="windowOpen(naverMapUrl)">
          <span class="venue-tag-title">{{ venue.name }}</span>
          <span class="venue-tag-btn">길찾기 ➔</span>
        </div>
      </div>

      <!-- Navigation App 3 Buttons with Latest Official Icons -->
      <div class="navi-buttons-grid font-sans">
        <!-- KakaoMap Button -->
        <a :href="kakaoNaviUrl" target="_blank" rel="noopener noreferrer" class="navi-btn kakao">
          <svg class="app-svg-icon" viewBox="0 0 32 32" width="18" height="18" fill="none">
            <rect width="32" height="32" rx="7" fill="#FEE500"/>
            <path d="M16 7C10.48 7 6 10.58 6 15C6 17.78 7.82 20.23 10.6 21.57L9.67 25.37C9.56 25.82 10.05 26.13 10.41 25.89L15.63 22.45C15.75 22.46 15.88 22.47 16 22.47C21.52 22.47 26 18.89 26 14.47C26 10.05 21.52 7 16 7Z" fill="#191919"/>
          </svg>
          <span>카카오맵</span>
        </a>

        <!-- Naver Map Button (Latest Official Pin+N App Icon) -->
        <a :href="naverMapUrl" target="_blank" rel="noopener noreferrer" class="navi-btn naver">
          <svg class="app-svg-icon" viewBox="0 0 32 32" width="18" height="18" fill="none">
            <rect width="32" height="32" rx="7" fill="#03C75A"/>
            <path d="M16 5C11.58 5 8 8.58 8 13C8 18.25 14.8 25.5 15.35 26.08C15.7 26.45 16.3 26.45 16.65 26.08C17.2 25.5 24 18.25 24 13C24 8.58 20.42 5 16 5Z" fill="#FFFFFF"/>
            <path d="M13 10H14.5L17.5 14.3V10H19V16H17.5L14.5 11.7V16H13V10Z" fill="#03C75A"/>
          </svg>
          <span>네이버지도</span>
        </a>

        <!-- TMAP Button (Latest Official Dark Navy + 3D Gradient Mobility Loop Icon) -->
        <a :href="tmapUrl" class="navi-btn tmap">
          <svg class="app-svg-icon" viewBox="0 0 32 32" width="18" height="18" fill="none">
            <defs>
              <linearGradient id="tmapGradient" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#00D2FF"/>
                <stop offset="45%" stop-color="#0066FF"/>
                <stop offset="100%" stop-color="#FF2A6D"/>
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="7" fill="#0F172A"/>
            <path d="M8 10C8 8.9 8.9 8 10 8H22C23.1 8 24 8.9 24 10C24 11.1 23.1 12 22 12H18V22C18 23.1 17.1 24 16 24C14.9 24 14 23.1 14 22V12H10C8.9 12 8 11.1 8 10Z" fill="url(#tmapGradient)"/>
            <circle cx="21.5" cy="9.5" r="2" fill="#FF2A6D"/>
          </svg>
          <span>티맵</span>
        </a>
      </div>
    </div>

    <!-- Transport Details Card -->
    <div class="transit-card card-paper font-sans">
      <!-- Subway -->
      <div v-if="venue.subwayInfo" class="transit-item">
        <div class="transit-icon subway">
          <Train :size="18" />
        </div>
        <div class="transit-body">
          <strong class="transit-title">지하철 안내</strong>
          <p class="transit-desc">{{ venue.subwayInfo }}</p>
        </div>
      </div>

      <!-- Bus -->
      <div v-if="venue.busInfo" class="transit-item">
        <div class="transit-icon bus">
          <Bus :size="18" />
        </div>
        <div class="transit-body">
          <strong class="transit-title">버스 안내</strong>
          <p class="transit-desc">{{ venue.busInfo }}</p>
        </div>
      </div>

      <!-- Parking -->
      <div v-if="venue.parkingInfo" class="transit-item">
        <div class="transit-icon parking">
          <Car :size="18" />
        </div>
        <div class="transit-body">
          <strong class="transit-title">자가용 & 주차 안내</strong>
          <p class="transit-desc">{{ venue.parkingInfo }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.location-section {
  background-color: var(--bg-ivory);
}

.venue-header {
  margin-bottom: 24px;
}

.venue-name {
  font-size: 20px;
  color: var(--text-main);
  font-weight: 700;
  margin-bottom: 4px;
}

.venue-hall {
  font-size: 15px;
  color: var(--gold-dark);
  margin-bottom: 14px;
}

.address-box {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #FFFFFF;
  padding: 8px 14px;
  border-radius: 9999px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 8px;
}

.pin-icon {
  color: var(--gold-primary);
  flex-shrink: 0;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: 9999px;
  padding: 3px 8px;
  font-size: 11px;
  color: var(--text-main);
  cursor: pointer;
  margin-left: 4px;
}

.copy-btn:hover {
  background: var(--gold-soft);
}

.text-green {
  color: #2E7D32;
}

.venue-tel {
  font-size: 12px;
  color: var(--text-muted);
}

.venue-tel a {
  color: var(--text-sub);
  text-decoration: none;
}

/* Map Card */
.map-card {
  padding: 12px;
  margin-bottom: 18px;
}

.map-visual {
  width: 100%;
  height: 250px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: #EAE6DF;
}

.map-iframe {
  width: 100%;
  height: 100%;
  border: none;
  pointer-events: auto; /* Enable user pan and zoom interactions */
}

.naver-brand-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(4px);
  padding: 5px 9px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #03C75A;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
  cursor: pointer;
  z-index: 5;
  transition: transform 0.15s, box-shadow 0.15s;
}

.naver-brand-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(3, 199, 90, 0.25);
}

.naver-badge-icon {
  flex-shrink: 0;
}

.map-venue-tag {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(6px);
  color: #FFFFFF;
  padding: 6px 12px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  z-index: 5;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
  transition: all 0.15s;
}

.map-venue-tag:hover {
  background: #03C75A;
  transform: translateY(-1px);
}

.venue-tag-title {
  color: #FFFFFF;
}

.venue-tag-btn {
  font-size: 11px;
  color: #86EFAC;
}

.map-venue-tag:hover .venue-tag-btn {
  color: #FFFFFF;
}

.pin-venue-name {
  font-size: 12px;
  font-weight: 700;
}

.pin-click-hint {
  font-size: 10px;
  color: #86EFAC;
}

.navi-buttons-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.navi-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 4px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
}

.navi-btn:active {
  transform: scale(0.96);
}

.app-svg-icon {
  flex-shrink: 0;
}

.navi-btn.kakao {
  background: #FEE500;
  color: #191919;
}

.navi-btn.naver {
  background: #03C75A;
  color: #FFFFFF;
}

.navi-btn.tmap {
  background: #E52528;
  color: #FFFFFF;
}

/* Transit Card */
.transit-card {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
}

.transit-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.transit-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.transit-icon.subway {
  background: #E8F0FE;
  color: #1A73E8;
}

.transit-icon.bus {
  background: #E6F4EA;
  color: #137333;
}

.transit-icon.parking {
  background: #FEF7E0;
  color: #B06000;
}

.transit-body {
  flex: 1;
}

.transit-title {
  display: block;
  font-size: 14px;
  color: var(--text-main);
  margin-bottom: 4px;
}

.transit-desc {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.55;
}
</style>

