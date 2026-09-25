<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Home, Heart, Image, MapPin, MessageSquare, Share2 } from 'lucide-vue-next'
import BgmPlayer from '../components/invitation/BgmPlayer.vue'
import CoverSection from '../components/invitation/CoverSection.vue'
import GreetingSection from '../components/invitation/GreetingSection.vue'
import CalendarSection from '../components/invitation/CalendarSection.vue'
import GallerySection from '../components/invitation/GallerySection.vue'
import LocationSection from '../components/invitation/LocationSection.vue'
import AccountSection from '../components/invitation/AccountSection.vue'
import RsvpSection from '../components/invitation/RsvpSection.vue'
import GuestbookSection from '../components/invitation/GuestbookSection.vue'
import LiveSnapSection from '../components/invitation/LiveSnapSection.vue'
import ShareFooter from '../components/invitation/ShareFooter.vue'
import { isStoryOpen, weddingInfo, photos, adminSettings } from '../services/storage'

// --- Section Visibility & Alternating Background Color System ---
const isRsvpVisible = computed(() => weddingInfo.value.showRsvp !== false && adminSettings.value.showRsvpSection !== false)
const isLiveSnapVisible = computed(() => adminSettings.value.showLiveSnapSection !== false)

// Cover 섹션 다음부터, 실제로 화면에 표시되는 섹션들의 배경색이 무조건 번갈아가며(White <-> Ivory) 적용되도록 계산
const middleSectionThemes = computed(() => {
  const candidateSections = [
    { id: 'greeting', visible: true },
    { id: 'calendar', visible: true },
    { id: 'gallery', visible: true },
    { id: 'location', visible: true },
    { id: 'account', visible: true },
    { id: 'rsvp', visible: isRsvpVisible.value },
    { id: 'guestbook', visible: true },
    { id: 'livesnap', visible: isLiveSnapVisible.value }
  ]

  let currentTheme: 'white' | 'ivory' = 'white'
  const themeMap: Record<string, 'white' | 'ivory'> = {}

  for (const item of candidateSections) {
    if (item.visible) {
      if (item.id === 'greeting') {
        currentTheme = 'white'
      } else {
        currentTheme = currentTheme === 'white' ? 'ivory' : 'white'
      }
      themeMap[item.id] = currentTheme
    }
  }

  return themeMap
})

// --- Bottom Mini Navigation Bar ---
const navItems = [
  { label: '홈', icon: Home, sectionId: 'cover' },
  { label: '모시는글', icon: Heart, sectionId: 'greeting' },
  { label: '갤러리', icon: Image, sectionId: 'gallery' },
  { label: '오시는길', icon: MapPin, sectionId: 'location' },
  { label: '방명록', icon: MessageSquare, sectionId: 'guestbook' }
]

const currentActiveSectionId = ref('cover')
const isNearBottom = ref(false)
let scrollThrottle: any = null

const isAtFooter = computed(() => {
  return currentActiveSectionId.value === 'footer' || isNearBottom.value
})

const updateCurrentSection = () => {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.invitation-section-wrapper'))
  if (!sections.length) return
  
  let currentId = 'cover'
  const threshold = window.innerHeight * 0.35

  for (const sec of sections) {
    if (sec.offsetParent === null) continue // v-show=false인 섹션 스킵
    const rect = sec.getBoundingClientRect()
    if (rect.top <= threshold) {
      currentId = sec.getAttribute('data-section') || currentId
    }
  }

  currentActiveSectionId.value = currentId
}

const checkFooterState = () => {
  const scrollY = window.scrollY || window.pageYOffset
  const windowHeight = window.innerHeight
  const docHeight = document.documentElement.scrollHeight
  isNearBottom.value = (scrollY + windowHeight >= docHeight - 140)
}

const isNavActive = (sectionId: string) => {
  const current = currentActiveSectionId.value
  if (sectionId === 'cover') return current === 'cover'
  if (sectionId === 'greeting') return current === 'greeting' || current === 'calendar'
  if (sectionId === 'gallery') return current === 'gallery'
  if (sectionId === 'location') return current === 'location' || current === 'account' || current === 'rsvp'
  if (sectionId === 'guestbook') return current === 'guestbook' || current === 'livesnap' || current === 'footer'
  return false
}

const activeNavIndex = computed(() => {
  const idx = navItems.findIndex(item => isNavActive(item.sectionId))
  return idx !== -1 ? idx : 0
})

let isNavigatingViaClick = false
let navClickTimer: any = null

const navigateTo = (sectionId: string) => {
  const targetEl = document.querySelector<HTMLElement>(`.invitation-section-wrapper[data-section="${sectionId}"]`)
  if (targetEl) {
    isNavigatingViaClick = true
    currentActiveSectionId.value = sectionId
    scrollToSection(targetEl)
    clearTimeout(navClickTimer)
    navClickTimer = setTimeout(() => {
      isNavigatingViaClick = false
    }, 850)
  }
}

const handleShare = () => {
  const kakao = (window as any).Kakao
  const currentUrl = window.location.href
  const coverImg = photos.value.find(p => p.isCover)?.url || photos.value[0]?.url || ''
  const title = `${weddingInfo.value.groom.name} ♥ ${weddingInfo.value.bride.name} 결혼합니다`
  const description = `${weddingInfo.value.venue.name} ${weddingInfo.value.venue.hall}`

  if (kakao && kakao.isInitialized && kakao.isInitialized()) {
    kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl: coverImg,
        link: {
          mobileWebUrl: currentUrl,
          webUrl: currentUrl
        }
      },
      buttons: [
        {
          title: '모바일 청첩장 보기',
          link: {
            mobileWebUrl: currentUrl,
            webUrl: currentUrl
          }
        }
      ]
    })
  } else if (navigator.share) {
    navigator.share({
      title,
      text: description,
      url: currentUrl
    }).catch(() => {})
  } else {
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert('청첩장 링크가 복사되었습니다.')
    }).catch(() => {})
  }
}

const handleScroll = () => {
  if (scrollThrottle) return
  scrollThrottle = requestAnimationFrame(() => {
    if (!isNavigatingViaClick) {
      updateCurrentSection()
    }
    checkFooterState()
    scrollThrottle = null
  })
}



// Smoothly scroll to target section without snapping
const scrollToSection = (targetEl: HTMLElement) => {
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let sectionObserver: IntersectionObserver | null = null

const initSectionReveal = () => {
  if (sectionObserver) {
    sectionObserver.disconnect()
    sectionObserver = null
  }
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.invitation-section-wrapper'))
  if (!sections.length) return

  // 첫 번째 섹션(Cover)은 즉시 표시
  if (sections[0]) {
    sections[0].classList.add('is-visible')
  }

  sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
      }
    })
  }, {
    threshold: 0.33,
    rootMargin: '0px'
  })

  sections.forEach((sec, idx) => {
    if (idx > 0) {
      // 이미 뷰포트에 들어와 있는 경우 즉시 is-visible 부여
      const rect = sec.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.8 && rect.bottom > 0) {
        sec.classList.add('is-visible')
      }
      sectionObserver?.observe(sec)
    }
  })
}

// 참석의사(RSVP) 및 현장스냅(LiveSnap) 보이기/숨기기 실시간 변경 시 Observer 재등록 및 네비게이션 갱신
watch(
  [() => isRsvpVisible.value, () => isLiveSnapVisible.value],
  async () => {
    await nextTick()
    initSectionReveal()
    updateCurrentSection()
    checkFooterState()
  }
)

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  updateCurrentSection()
  checkFooterState()
  initSectionReveal()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (scrollThrottle) cancelAnimationFrame(scrollThrottle)
  if (sectionObserver) {
    sectionObserver.disconnect()
    sectionObserver = null
  }
})
</script>

<template>
  <main class="mobile-frame invitation-main-container">
    <!-- Floating BGM Player -->
    <BgmPlayer />

    <!-- 1. Cover Section -->
    <div class="invitation-section-wrapper" data-section="cover">
      <CoverSection />
    </div>

    <!-- 2. Greeting & Contact Section -->
    <div
      class="invitation-section-wrapper"
      data-section="greeting"
      :style="{ '--section-bg': middleSectionThemes['greeting'] === 'ivory' ? 'var(--bg-ivory)' : '#FFFFFF' }"
    >
      <GreetingSection />
    </div>

    <!-- 3. Wedding Calendar & D-Day Section -->
    <div
      class="invitation-section-wrapper"
      data-section="calendar"
      :style="{ '--section-bg': middleSectionThemes['calendar'] === 'ivory' ? 'var(--bg-ivory)' : '#FFFFFF' }"
    >
      <CalendarSection />
    </div>

    <!-- 4. Wedding Photos Gallery Section -->
    <div
      class="invitation-section-wrapper"
      data-section="gallery"
      :style="{ '--section-bg': middleSectionThemes['gallery'] === 'ivory' ? 'var(--bg-ivory)' : '#FFFFFF' }"
    >
      <GallerySection />
    </div>

    <!-- 5. Location & Map & Navigation Section -->
    <div
      class="invitation-section-wrapper"
      data-section="location"
      :style="{ '--section-bg': middleSectionThemes['location'] === 'ivory' ? 'var(--bg-ivory)' : '#FFFFFF' }"
    >
      <LocationSection />
    </div>

    <!-- 6. Bank Account & Congratulatory Gift Section -->
    <div
      class="invitation-section-wrapper"
      data-section="account"
      :style="{ '--section-bg': middleSectionThemes['account'] === 'ivory' ? 'var(--bg-ivory)' : '#FFFFFF' }"
    >
      <AccountSection />
    </div>

    <!-- 7. RSVP Attendance Survey Section (Hidden when admin disables it) -->
    <div
      v-show="isRsvpVisible"
      class="invitation-section-wrapper"
      data-section="rsvp"
      :class="{ 'is-visible': isRsvpVisible }"
      :style="{ '--section-bg': middleSectionThemes['rsvp'] === 'ivory' ? 'var(--bg-ivory)' : '#FFFFFF' }"
    >
      <RsvpSection />
    </div>

    <!-- 8. Guestbook Section -->
    <div
      class="invitation-section-wrapper"
      data-section="guestbook"
      :style="{ '--section-bg': middleSectionThemes['guestbook'] === 'ivory' ? 'var(--bg-ivory)' : '#FFFFFF' }"
    >
      <GuestbookSection />
    </div>

    <!-- 9. Live Snap Section (Hidden when admin disables it) -->
    <div
      v-show="isLiveSnapVisible"
      class="invitation-section-wrapper"
      data-section="livesnap"
      :class="{ 'is-visible': isLiveSnapVisible }"
      :style="{ '--section-bg': middleSectionThemes['livesnap'] === 'ivory' ? 'var(--bg-ivory)' : '#FFFFFF' }"
    >
      <LiveSnapSection />
    </div>

    <!-- 10. Share & Footer Section -->
    <div class="invitation-section-wrapper" data-section="footer">
      <ShareFooter :isAtFooter="isAtFooter" @share="handleShare" />
    </div>

    <!-- Floating Bottom Navigation & Share Bar (Hidden on Section 0 / Home and when Story Modal is open) -->
    <Transition name="nav-fade">
      <div v-if="currentActiveSectionId !== 'cover' && !isStoryOpen" class="bottom-floating-bar-wrapper">
        <nav
          class="bottom-mini-nav font-sans"
          :class="{ 'is-expanded': isAtFooter }"
          aria-label="하단 네비게이션 메뉴"
        >
          <!-- Apple Liquid Glass Sliding Pill Indicator (Droplet Movement) -->
          <div
            class="nav-liquid-pill"
            :style="{
              transform: `translateX(${activeNavIndex * 100}%)`
            }"
          ></div>

          <button
            v-for="(item, idx) in navItems"
            :key="item.label"
            type="button"
            class="nav-item-btn"
            :class="{ 'is-active': activeNavIndex === idx }"
            @click="navigateTo(item.sectionId)"
            :aria-label="item.label"
          >
            <component :is="item.icon" :size="15" class="nav-icon" />
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </nav>

        <!-- Circular Floating Share Button Wrapper (Collapses and glides up into footer when at bottom) -->
        <div class="floating-share-wrapper" :class="{ 'is-docked': isAtFooter }">
          <button
            @click="handleShare"
            class="floating-share-circle-btn font-sans"
            aria-label="공유"
          >
            <Share2 :size="15" class="share-icon" />
            <span class="share-text">공유</span>
          </button>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.invitation-main-container {
  width: 100%;
}

.invitation-section-wrapper {
  width: 100%;
  box-sizing: border-box;
  opacity: 0;
  background-color: var(--section-bg, transparent);
  transition: opacity 0.65s ease, background-color 0.35s ease;
  will-change: opacity;
}

.invitation-section-wrapper.is-visible,
.invitation-section-wrapper:first-child {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .invitation-section-wrapper {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}

/* Floating Bottom Navigation & Share Bar Wrapper */
.bottom-floating-bar-wrapper {
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 24px);
  max-width: 390px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 85;
  pointer-events: none;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

/* Apple iOS Liquid Glass Navigation Bar */
.bottom-mini-nav {
  pointer-events: auto;
  flex: 1;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(28px) saturate(210%) contrast(105%);
  -webkit-backdrop-filter: blur(28px) saturate(210%) contrast(105%);
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow:
    0 12px 36px -4px rgba(45, 41, 38, 0.14),
    0 4px 12px -2px rgba(45, 41, 38, 0.08),
    inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 1.5px 0 rgba(0, 0, 0, 0.04);
  padding: 4px;
  display: flex;
  align-items: center;
  position: relative;
  transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.bottom-mini-nav.is-expanded {
  width: 100%;
}

/* Apple Liquid Glass Sliding Water Droplet Pill */
.nav-liquid-pill {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 8px) / 5);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow:
    0 4px 14px rgba(45, 41, 38, 0.09),
    0 1px 3px rgba(45, 41, 38, 0.04),
    inset 0 1.5px 2px rgba(255, 255, 255, 1);
  border: 0.5px solid rgba(255, 255, 255, 0.95);
  pointer-events: none;
  z-index: 1;
  transition: transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;
}

/* Circular Floating Share Button Wrapper */
.floating-share-wrapper {
  pointer-events: auto;
  width: 48px;
  min-width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.45s cubic-bezier(0.16, 1, 0.3, 1),
              min-width 0.45s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.35s ease,
              transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
              margin 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.floating-share-wrapper.is-docked {
  width: 0;
  min-width: 0;
  opacity: 0;
  transform: translate(-140px, -65px) scale(1.15);
  pointer-events: none;
}

/* Apple iOS Liquid Glass Circular Share Button */
.floating-share-circle-btn {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(28px) saturate(210%) contrast(105%);
  -webkit-backdrop-filter: blur(28px) saturate(210%) contrast(105%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow:
    0 12px 36px -4px rgba(45, 41, 38, 0.14),
    0 4px 12px -2px rgba(45, 41, 38, 0.08),
    inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 1.5px 0 rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5px;
  color: rgba(60, 60, 67, 0.8);
  cursor: pointer;
  outline: none !important;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: all 0.28s cubic-bezier(0.25, 1, 0.5, 1);
  -webkit-tap-highlight-color: transparent !important;
}

.floating-share-circle-btn:focus,
.floating-share-circle-btn:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.85) !important;
}

.floating-share-circle-btn:hover {
  color: #936B34;
  background: rgba(255, 255, 255, 0.88);
  transform: scale(1.05);
}

.floating-share-circle-btn:active {
  transform: scale(0.92);
}

.share-icon {
  transition: transform 0.2s ease;
}

.share-text {
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.2px;
}

/* Apple iOS Liquid Glass Navigation Buttons */
button.nav-item-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.5px;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  padding: 6px 2px;
  border-radius: 9999px;
  cursor: pointer;
  color: rgba(60, 60, 67, 0.65);
  position: relative;
  z-index: 2;
  transition: color 0.25s ease, transform 0.2s ease;
  -webkit-tap-highlight-color: transparent !important;
}

button.nav-item-btn:focus,
button.nav-item-btn:focus-visible,
button.nav-item-btn:active {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  -webkit-tap-highlight-color: transparent !important;
}

button.nav-item-btn:hover {
  color: rgba(28, 28, 30, 0.95);
}

button.nav-item-btn:active {
  transform: scale(0.92);
}

/* Active State (Liquid pill behind handles background) */
.nav-item-btn.is-active {
  color: #1C1C1E;
}

.nav-item-btn.is-active .nav-icon {
  color: #936B34;
  transform: scale(1.1);
}

.nav-item-btn.is-active .nav-label {
  color: #3C3026;
  font-weight: 700;
}

.nav-icon {
  transition: transform 0.2s ease, color 0.2s ease;
}

.nav-label {
  font-size: 10px;
  letter-spacing: -0.2px;
  font-weight: 500;
  line-height: 1;
}

/* Navigation Fade Transitions */
.nav-fade-enter-active,
.nav-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-fade-enter-from,
.nav-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

</style>
