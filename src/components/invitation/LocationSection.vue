<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { weddingInfo } from '../../services/storage'
import { MapPin, Copy, Check, Car, Train, Bus, Map as MapIcon, ExternalLink, Smartphone } from 'lucide-vue-next'

const copied = ref(false)

// Mobile Environment Detection for TMAP App Integration
const isMobileDevice = ref(false)
const showTmapToast = ref(false)
let toastTimer: any = null

const checkIsMobile = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua)
  const isSmallScreen = window.innerWidth <= 768
  const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0
  return isMobileUA || (hasTouch && isSmallScreen)
}

const handleTmapClick = (e: MouseEvent) => {
  if (!isMobileDevice.value) {
    e.preventDefault()
    e.stopPropagation()
    showTmapToast.value = true
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      showTmapToast.value = false
    }, 3200)
  }
}

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
  return `https://map.naver.com/p/search/${venue.value.address} ${name}`
})

const tmapUrl = computed(() => {
  const name = encodeURIComponent(venue.value.name)
  return `tmap://route?goalname=${name}&goalx=${venue.value.mapLng}&goaly=${venue.value.mapLat}`
})

const windowOpen = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

// --- Naver Map OpenAPI Integration ---
const mapContainerRef = ref<HTMLDivElement | null>(null)
const isMapLoaded = ref(false)
const isMapKeyMissing = ref(false)
let currentMapInstance: any = null

// 관리자 페이지에서 설정한 키를 최우선 적용, 없으면 .env 키 적용
const activeNaverKey = computed(() => {
  const adminKey = weddingInfo.value.naverMapClientId?.trim()
  if (adminKey) return adminKey

  const envKey = import.meta.env.VITE_APP_NAVERMAP_KEY
  if (envKey && typeof envKey === 'string' && !envKey.includes('%VITE_APP_NAVERMAP_KEY%')) {
    return envKey.trim()
  }
  return ''
})

const loadNaverMapScript = (clientId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)

    // 이미 naver.maps SDK가 로드되어 있는 경우
    if (window.naver && window.naver.maps) {
      return resolve(true)
    }

    const scriptId = 'naver-map-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    if (script) {
      if (window.naver && window.naver.maps) {
        return resolve(true)
      }
      // 이미 같은 clientId가 들어있는 스크립트라면 load 대기
      if (script.src.includes(encodeURIComponent(clientId))) {
        script.addEventListener('load', () => resolve(Boolean(window.naver && window.naver.maps)), { once: true })
        script.addEventListener('error', () => resolve(false), { once: true })
        return
      }
      script.remove()
    }

    // 네이버 클라우드 플랫폼(NCP) 공식 OpenAPI 스크립트 동적 주입 (ncpKeyId & ncpClientId 듀얼 규격 적용)
    script = document.createElement('script')
    script.id = scriptId
    script.type = 'text/javascript'
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&ncpClientId=${encodeURIComponent(clientId)}`
    script.async = true

    script.onload = () => {
      resolve(Boolean(window.naver && window.naver.maps))
    }
    script.onerror = (err) => {
      console.warn('Failed to load Naver Maps SDK script:', err)
      resolve(false)
    }

    document.head.appendChild(script)
  })
}

const initNaverMap = async () => {
  const mapEl = mapContainerRef.value || document.getElementById('map')
  if (!mapEl) return

  const key = activeNaverKey.value
  if (!key) {
    isMapLoaded.value = false
    isMapKeyMissing.value = true
    return
  }

  isMapKeyMissing.value = false

  if (window.naver && window.naver.maps) {
    renderMapInstance()
    return
  }

  const loaded = await loadNaverMapScript(key)
  if (loaded && window.naver && window.naver.maps) {
    renderMapInstance()
  } else {
    isMapLoaded.value = false
    isMapKeyMissing.value = true
  }
}

const renderMapInstance = () => {
  const mapEl = mapContainerRef.value || document.getElementById('map')
  if (!mapEl || !window.naver || !window.naver.maps) return

  try {
    const position = new window.naver.maps.LatLng(venue.value.mapLat, venue.value.mapLng)

    const mapOptions = {
      center: position,
      zoom: 14,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: true,
      zoomControlOptions: {
          style: window.naver.maps.ZoomControlStyle.SMALL,
          position: window.naver.maps.Position.TOP_RIGHT
      },
      logoControl: true,
      mapDataControl: false,
      scaleControl: false,
      draggable: true,
      pinchZoom: true,
      scrollWheel: true,
    }

    if (currentMapInstance && typeof currentMapInstance.destroy === 'function') {
      currentMapInstance.destroy()
      currentMapInstance = null
    }

    const map = new window.naver.maps.Map(mapEl, mapOptions)
    currentMapInstance = map

    // 결혼식장 위치에 정확히 핀 마커 표시
    new window.naver.maps.Marker({
      position,
      map,
      title: venue.value.name,
      animation: window.naver.maps.Animation.DROP,
      icon: {
        content: '<img alt="' + venue.value.name + '" src="https://map.pstatic.net/resource/api/v2/image/maps/selected-marker/229169@1x.png?version=21&amp;mapping=marker-224"><div style="font-size:11pt;font-weight:700;position:relative;margin-top:-10px">' + venue.value.name + '</div>',
        size: new window.naver.maps.Size(38, 58),
        anchor: new window.naver.maps.Point(19, 58),
      },
    })

    // 캔버스 크기 안정화를 위한 리사이즈 트리거
    setTimeout(() => {
      if (window.naver?.maps?.Event && currentMapInstance) {
        window.naver.maps.Event.trigger(currentMapInstance, 'resize')
        currentMapInstance.setCenter(position)
      }
    }, 150)

    isMapLoaded.value = true
    isMapKeyMissing.value = false
  } catch (e) {
    console.warn('Naver map init error:', e)
    isMapLoaded.value = false
    isMapKeyMissing.value = true
  }
}


// 관리자 페이지에서 키가 입력/수정되면 즉시 지도 로드
watch(activeNaverKey, (newKey) => {
  if (newKey) {
    initNaverMap()
  } else {
    isMapLoaded.value = false
    isMapKeyMissing.value = true
  }
})

// 위도/경도 변경 시 지도 위치 갱신
watch(() => [venue.value.mapLat, venue.value.mapLng], () => {
  if (isMapLoaded.value) {
    initNaverMap()
  }
})

onMounted(() => {
  isMobileDevice.value = checkIsMobile()
  window.addEventListener('resize', () => {
    isMobileDevice.value = checkIsMobile()
  })
  initNaverMap()
})
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
        <MapPin :size="16" class="pin-icon" />
        <div class="addr-text-group">
          <span class="addr-main">{{ venue.address }}</span>
          <span v-if="venue.addressDetail" class="addr-detail">{{ venue.addressDetail }}</span>
        </div>
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
      <!-- Interactive Naver Map Container (Clean canvas without overlaid badges) -->
      <div class="map-visual interactive-map">
        <!-- Naver Map Canvas Container -->
        <div id="map" ref="mapContainerRef" class="naver-map-canvas"></div>

        <!-- Fallback Placeholder when Key is missing or loading -->
        <div v-if="!isMapLoaded" class="map-fallback-overlay" @click="windowOpen(naverMapUrl)">
          <div class="fallback-content">
            <div class="fallback-icon-wrap">
              <MapIcon :size="28" class="fallback-icon" />
            </div>
            <p class="fallback-title">{{ venue.name }}</p>
            <p class="fallback-sub">{{ venue.address }}</p>
            <span v-if="isMapKeyMissing" class="fallback-guide-badge">
              네이버 지도 API 키 등록 필요 (클릭 시 길찾기)
            </span>
            <button class="fallback-btn font-sans">
              <span>네이버 지도로 확인하기</span>
              <ExternalLink :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation App 3 Buttons: 1. Naver Map -> 2. KakaoMap -> 3. TMAP -->
      <div class="navi-buttons-grid font-sans">
        <!-- 1. Naver Map Button (App Store Naver Green Background + White Pin & Green N) -->
        <a :href="naverMapUrl" target="_blank" rel="noopener noreferrer" class="navi-btn naver">
          <svg class="app-svg-icon" viewBox="0 0 32 32" width="22" height="22" fill="none">
            <!-- White Map Pin -->
            <path d="M16 3.5C10.7 3.5 6.5 7.7 6.5 13C6.5 19.8 15.1 27.2 15.5 27.5C15.8 27.8 16.2 27.8 16.5 27.5C16.9 27.2 25.5 19.8 25.5 13C25.5 7.7 21.3 3.5 16 3.5Z" fill="#FFFFFF"/>
            <!-- Green N Symbol -->
            <path d="M13.2 9.8H14.8L17.8 14.2V9.8H19.3V16.2H17.8L14.7 11.8V16.2H13.2V9.8Z" fill="#03C75A"/>
          </svg>
          <span>네이버지도</span>
        </a>

        <!-- 2. KakaoMap Button (App Store Kakao Yellow Background + Official Blue Map Pin) -->
        <a :href="kakaoNaviUrl" target="_blank" rel="noopener noreferrer" class="navi-btn kakao">
          <svg class="app-svg-icon" viewBox="0 0 32 32" width="22" height="22" fill="none">
            <!-- Official KakaoMap Blue Pin with Center Cutout -->
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M16 4C11.03 4 7 8.03 7 13C7 19.85 15.18 27.28 15.53 27.59C15.8 27.83 16.2 27.83 16.47 27.59C16.82 27.28 25 19.85 25 13C25 8.03 20.97 4 16 4ZM16 16.8C13.9 16.8 12.2 15.1 12.2 13C12.2 10.9 13.9 9.2 16 9.2C18.1 9.2 19.8 10.9 19.8 13C19.8 15.1 18.1 16.8 16 16.8Z"
              fill="#0066FF"
            />
          </svg>
          <span>카카오맵</span>
        </a>

        <!-- 3. TMAP Button (App Store Pure White Background + 3D Gradient Road Loop 'T') -->
        <a
          :href="isMobileDevice ? tmapUrl : undefined"
          class="navi-btn tmap"
          :class="{ 'is-disabled': !isMobileDevice }"
          :aria-disabled="!isMobileDevice"
          :title="isMobileDevice ? '티맵 앱으로 길찾기' : '티맵은 모바일(스마트폰) 환경에서만 지원됩니다'"
          @click="handleTmapClick"
        >
          <svg class="app-svg-icon" viewBox="0 0 32 32" width="22" height="22" fill="none">
            <defs>
              <linearGradient id="tmapStoreGrad" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#00D2FF"/>
                <stop offset="35%" stop-color="#0064FF"/>
                <stop offset="70%" stop-color="#8B5CF6"/>
                <stop offset="100%" stop-color="#FF2A6D"/>
              </linearGradient>
            </defs>
            <!-- TMAP Official 3D Loop 'T' Symbol -->
            <path d="M7 8C7 6.9 7.9 6 9 6H23C24.1 6 25 6.9 25 8C25 9.1 24.1 10 23 10H18.5V23C18.5 24.1 17.6 25 16.5 25C15.4 25 14.5 24.1 14.5 23V10H9C7.9 10 7 9.1 7 8Z" fill="url(#tmapStoreGrad)"/>
            <circle cx="22.5" cy="7.5" r="2.2" fill="#FF2A6D"/>
          </svg>
          <span class="btn-label-group">
            <span>티맵</span>
            <span v-if="!isMobileDevice" class="mobile-only-tag">모바일 전용</span>
          </span>
        </a>
      </div>

      <!-- Non-Mobile Notice Banner for TMAP -->
      <div v-if="!isMobileDevice" class="tmap-pc-notice font-sans">
        <Smartphone :size="13" class="notice-icon" />
        <span class="notice-text">
          <strong>티맵(TMAP)</strong>은 스마트폰 앱 전용입니다. PC에서는 <strong>네이버지도</strong> 또는 <strong>카카오맵</strong>을 이용해 주세요.
        </span>
      </div>

      <!-- TMAP Click Toast Notification on PC -->
      <Transition name="toast-pop">
        <div v-if="showTmapToast" class="tmap-toast-box font-sans">
          <Smartphone :size="15" class="toast-phone-icon" />
          <div class="toast-content">
            <strong class="toast-main">티맵(TMAP)은 모바일 전용 기능입니다</strong>
            <span class="toast-sub">스마트폰에서 접속하시거나 PC에서는 네이버지도/카카오맵을 이용해 주세요.</span>
          </div>
        </div>
      </Transition>
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
  background-color: var(--section-bg, var(--bg-ivory));
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
  gap: 10px;
  background: #FFFFFF;
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  margin-bottom: 8px;
  text-align: left;
  max-width: 95%;
}

.pin-icon {
  color: var(--gold-primary);
  flex-shrink: 0;
  align-self: center;
}

.addr-text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.addr-main {
  font-size: 13.5px;
  color: var(--text-main);
  font-weight: 500;
  line-height: 1.4;
}

.addr-detail {
  font-size: 12px;
  color: var(--gold-dark);
  line-height: 1.35;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: 9999px;
  padding: 5px 10px;
  font-size: 11px;
  color: var(--text-main);
  cursor: pointer;
  margin-left: 6px;
  flex-shrink: 0;
  white-space: nowrap;
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
  position: relative;
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

.naver-map-canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.map-fallback-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #FBFDFC 0%, #EAE6DF 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 2;
  cursor: pointer;
  text-align: center;
}

.fallback-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.fallback-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(3, 199, 90, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.fallback-icon {
  color: #03C75A;
}

.fallback-title {
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.fallback-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.fallback-guide-badge {
  font-size: 11px;
  color: #03C75A;
  background: rgba(3, 199, 90, 0.08);
  border: 1px solid rgba(3, 199, 90, 0.2);
  padding: 3px 8px;
  border-radius: 6px;
  margin-top: 2px;
}

.fallback-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #03C75A;
  color: #FFFFFF;
  border: none;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 6px;
  box-shadow: 0 2px 6px rgba(3, 199, 90, 0.3);
  transition: all 0.15s;
}

.fallback-btn:hover {
  background: #02b350;
  transform: translateY(-1px);
}


.navi-buttons-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
}

.navi-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 4px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.15s ease;
}

.navi-btn:hover {
  transform: translateY(-1px);
}

.navi-btn:active {
  transform: scale(0.97);
}

/* 1. Naver Map: Official Green Background */
.navi-btn.naver {
  background-color: #03C75A;
  color: #FFFFFF;
  border: 1px solid #02b350;
  box-shadow: 0 3px 10px rgba(3, 199, 90, 0.3);
}
.navi-btn.naver:hover {
  background-color: #02b350;
  box-shadow: 0 4px 12px rgba(3, 199, 90, 0.4);
}

/* 2. KakaoMap: Official Yellow Background */
.navi-btn.kakao {
  background-color: #FEE500;
  color: #191919;
  border: 1px solid #F0D700;
  box-shadow: 0 3px 10px rgba(254, 229, 0, 0.35);
}
.navi-btn.kakao:hover {
  background-color: #fada00;
  box-shadow: 0 4px 12px rgba(254, 229, 0, 0.45);
}

/* 3. TMAP: Official Pure White Background with Subtle Border */
.navi-btn.tmap {
  background-color: #FFFFFF;
  color: #191919;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
}
.navi-btn.tmap:hover:not(.is-disabled) {
  background-color: #FBFBFB;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.09);
  border-color: rgba(0, 0, 0, 0.18);
}

/* TMAP Disabled on Non-Mobile Environments */
.navi-btn.tmap.is-disabled {
  opacity: 0.58;
  cursor: not-allowed;
  background-color: #F8F8F8;
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: none;
  filter: grayscale(25%);
}

.navi-btn.tmap.is-disabled:hover {
  transform: none;
  background-color: #F8F8F8;
  box-shadow: none;
}

.navi-btn.tmap.is-disabled:active {
  transform: none;
}

.btn-label-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.mobile-only-tag {
  font-size: 8.5px;
  font-weight: 600;
  color: #8C6D41;
  background: rgba(168, 131, 80, 0.12);
  padding: 1px 4px;
  border-radius: 4px;
  white-space: nowrap;
}

/* TMAP Desktop Notice Banner */
.tmap-pc-notice {
  margin-top: 10px;
  padding: 9px 12px;
  background: rgba(239, 231, 218, 0.65);
  border: 1px solid rgba(168, 131, 80, 0.28);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.notice-icon {
  color: var(--gold-dark, #8C6D41);
  flex-shrink: 0;
}

.notice-text {
  font-size: 11.5px;
  color: var(--text-sub);
  line-height: 1.45;
}

.notice-text strong {
  color: var(--text-main);
  font-weight: 600;
}

/* TMAP Toast Notification */
.tmap-toast-box {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(30, 30, 30, 0.95);
  color: #FFFFFF;
  padding: 12px 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  z-index: 20;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  text-align: left;
}

.toast-phone-icon {
  color: #FF5A5F;
  flex-shrink: 0;
}

.toast-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toast-main {
  font-size: 12.5px;
  font-weight: 700;
  color: #FFFFFF;
}

.toast-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.4;
}

/* Toast Transitions */
.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-pop-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.toast-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.app-svg-icon {
  flex-shrink: 0;
  display: block;
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

