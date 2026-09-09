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
      <!-- Naver Map Display -->
      <div class="map-visual" @click="windowOpen(naverMapUrl)">
        <!-- Static/Interactive Map Tile View centered at venue coordinates -->
        <iframe
          class="map-iframe"
          title="네이버 지도 위치"
          :src="`https://www.openstreetmap.org/export/embed.html?bbox=${venue.mapLng - 0.005}%2C${venue.mapLat - 0.003}%2C${venue.mapLng + 0.005}%2C${venue.mapLat + 0.003}&amp;layer=mapnik&amp;marker=${venue.mapLat}%2C${venue.mapLng}`"
          loading="lazy"
        ></iframe>

        <!-- Naver Map Marker & Brand Overlay -->
        <div class="naver-map-overlay">
          <div class="naver-brand-badge font-sans">
            <svg class="naver-badge-icon" viewBox="0 0 24 24" width="13" height="13" fill="none">
              <rect width="24" height="24" rx="4" fill="#03C75A"/>
              <path d="M7 6H10.16L13.84 11.75V6H17V18H13.84L10.16 12.25V18H7V6Z" fill="#FFFFFF"/>
            </svg>
            <span>NAVER 지도</span>
          </div>

          <div class="naver-pin-bubble font-sans">
            <span class="pin-venue-name">{{ venue.name }}</span>
            <span class="pin-click-hint">클릭시 네이버지도 앱으로 연결</span>
          </div>
        </div>
      </div>

      <!-- Navigation App 3 Buttons with Official App Icons -->
      <div class="navi-buttons-grid font-sans">
        <!-- KakaoMap Button -->
        <a :href="kakaoNaviUrl" target="_blank" rel="noopener noreferrer" class="navi-btn kakao">
          <svg class="app-svg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none">
            <rect width="24" height="24" rx="5" fill="#FEE500"/>
            <path d="M12 5C7.86 5 4.5 7.69 4.5 11C4.5 13.08 5.86 14.92 7.95 15.93L7.25 18.78C7.17 19.11 7.54 19.35 7.81 19.17L11.72 16.59C11.81 16.6 11.91 16.6 12 16.6C16.14 16.6 19.5 13.91 19.5 11C19.5 7.69 16.14 5 12 5Z" fill="#191919"/>
          </svg>
          <span>카카오맵</span>
        </a>

        <!-- Naver Map Button -->
        <a :href="naverMapUrl" target="_blank" rel="noopener noreferrer" class="navi-btn naver">
          <svg class="app-svg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none">
            <rect width="24" height="24" rx="5" fill="#03C75A"/>
            <path d="M7 6H10.16L13.84 11.75V6H17V18H13.84L10.16 12.25V18H7V6Z" fill="#FFFFFF"/>
          </svg>
          <span>네이버지도</span>
        </a>

        <!-- TMAP Button -->
        <a :href="tmapUrl" class="navi-btn tmap">
          <svg class="app-svg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none">
            <rect width="24" height="24" rx="5" fill="#0051FF"/>
            <path d="M6 7H18V10H13.5V17.5H10.5V10H6V7Z" fill="#FFFFFF"/>
            <circle cx="17.5" cy="7.5" r="2" fill="#FF2E4C"/>
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
  height: 230px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: #EAE6DF;
  cursor: pointer;
}

.map-iframe {
  width: 100%;
  height: 100%;
  border: none;
  pointer-events: none; /* Let user click visual to open Naver Map directly */
}

.naver-map-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
}

.naver-brand-badge {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(4px);
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #03C75A;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.naver-badge-icon {
  flex-shrink: 0;
}

.naver-pin-bubble {
  align-self: center;
  background: rgba(17, 24, 39, 0.88);
  backdrop-filter: blur(4px);
  color: #FFFFFF;
  padding: 7px 14px;
  border-radius: 9999px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s;
}

.map-visual:hover .naver-pin-bubble {
  transform: scale(1.04);
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

