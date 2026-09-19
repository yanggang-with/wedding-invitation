<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
import { isStoryOpen, weddingInfo, photos, adminSettings, isWeddingDayOrLater } from '../services/storage'

// --- Bottom Mini Navigation Bar ---
const navItems = [
  { label: '홈', icon: Home, sectionIndex: 0 },
  { label: '모시는글', icon: Heart, sectionIndex: 1 },
  { label: '갤러리', icon: Image, sectionIndex: 3 },
  { label: '오시는길', icon: MapPin, sectionIndex: 4 },
  { label: '방명록', icon: MessageSquare, sectionIndex: 7 }
]

const currentSectionIndex = ref(0)
let scrollThrottle: any = null

const updateCurrentSection = () => {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.snap-section'))
  if (!sections.length) return
  currentSectionIndex.value = getCurrentSectionIndex(sections, window.innerHeight)
}

const isNavActive = (itemSectionIndex: number) => {
  if (currentSectionIndex.value === itemSectionIndex) return true
  if (itemSectionIndex === 1 && currentSectionIndex.value === 2) return true
  if (itemSectionIndex === 4 && (currentSectionIndex.value === 5 || currentSectionIndex.value === 6)) return true
  if (itemSectionIndex === 7 && currentSectionIndex.value === 8) return true
  return false
}

const navigateTo = (sectionIndex: number) => {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.snap-section'))
  if (sections[sectionIndex]) {
    scrollToSection(sections[sectionIndex])
    currentSectionIndex.value = sectionIndex
  }
}

const isLiveSnapVisible = computed(() => {
  return isWeddingDayOrLater(weddingInfo.value.date, adminSettings.value.forceShowLiveSnap)
})

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
    updateCurrentSection()
    scrollThrottle = null
  })
}

// Desktop Mouse Wheel state
let isWheelLocked = false
let wheelLockTimer: any = null

// Calculate the index of the currently most visible section
const getCurrentSectionIndex = (sections: HTMLElement[], windowHeight: number): number => {
  let currentIndex = 0
  let maxVisibleHeight = -1

  sections.forEach((sec, idx) => {
    const rect = sec.getBoundingClientRect()
    const visibleTop = Math.max(0, rect.top)
    const visibleBottom = Math.min(windowHeight, rect.bottom)
    const visibleHeight = Math.max(0, visibleBottom - visibleTop)
    if (visibleHeight > maxVisibleHeight) {
      maxVisibleHeight = visibleHeight
      currentIndex = idx
    }
  })

  return currentIndex
}

// Scroll to target section ensuring it is centered vertically on PC
const scrollToSection = (targetEl: HTMLElement) => {
  const windowHeight = window.innerHeight
  const targetHeight = targetEl.getBoundingClientRect().height
  // On desktop/PC, if the section fits within the viewport, center it; otherwise align to start
  const blockAlign = targetHeight <= windowHeight ? 'center' : 'start'
  targetEl.scrollIntoView({ behavior: 'smooth', block: blockAlign })
}

// 1. Desktop Mouse Wheel Handler (PC 마우스 휠 전용: 1틱당 1섹션 중앙 이동)
const handleWheel = (e: WheelEvent) => {
  // 터치 기기(모바일/태블릿)이거나 모달이 열려있으면 무시
  if (document.body.style.overflow === 'hidden') return
  if (window.matchMedia('(pointer: coarse)').matches) return

  // 미세 떨림 무시
  if (Math.abs(e.deltaY) < 25) return

  // 휠 잠금 디바운싱
  if (isWheelLocked) {
    e.preventDefault()
    return
  }

  const sections = Array.from(document.querySelectorAll<HTMLElement>('.snap-section'))
  if (!sections.length) return

  const windowHeight = window.innerHeight
  const currentIndex = getCurrentSectionIndex(sections, windowHeight)
  const currentRect = sections[currentIndex].getBoundingClientRect()

  // 긴 섹션(갤러리 등)에서 내부 내용이 아직 남아있으면 일반 스크롤 허용
  if (e.deltaY > 0 && currentRect.bottom > windowHeight + 40) {
    return
  }
  if (e.deltaY < 0 && currentRect.top < -40) {
    return
  }

  // 섹션 단위 이동
  let targetIndex = currentIndex
  if (e.deltaY > 0 && currentIndex < sections.length - 1) {
    targetIndex = currentIndex + 1
  } else if (e.deltaY < 0 && currentIndex > 0) {
    targetIndex = currentIndex - 1
  }

  if (targetIndex !== currentIndex) {
    e.preventDefault()
    isWheelLocked = true
    scrollToSection(sections[targetIndex])
    clearTimeout(wheelLockTimer)
    wheelLockTimer = setTimeout(() => {
      isWheelLocked = false
    }, 650)
  }
}

onMounted(() => {
  document.documentElement.classList.add('snap-mode')
  document.body.classList.add('snap-mode')
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('scroll', handleScroll, { passive: true })
  updateCurrentSection()
})

onUnmounted(() => {
  document.documentElement.classList.remove('snap-mode')
  document.body.classList.remove('snap-mode')
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('scroll', handleScroll)
  if (scrollThrottle) cancelAnimationFrame(scrollThrottle)
  if (wheelLockTimer) clearTimeout(wheelLockTimer)
})
</script>

<template>
  <main class="mobile-frame snap-container">
    <!-- Floating BGM Player -->
    <BgmPlayer />

    <!-- 1. Cover Section -->
    <section class="snap-section">
      <CoverSection />
    </section>

    <!-- 2. Greeting & Contact Section -->
    <section class="snap-section">
      <GreetingSection />
    </section>

    <!-- 3. Wedding Calendar & D-Day Section -->
    <section class="snap-section">
      <CalendarSection />
    </section>

    <!-- 4. Wedding Photos Gallery Section -->
    <section class="snap-section">
      <GallerySection />
    </section>

    <!-- 5. Location & Map & Navigation Section -->
    <section class="snap-section">
      <LocationSection />
    </section>

    <!-- 6. Bank Account & Congratulatory Gift Section -->
    <section class="snap-section">
      <AccountSection />
    </section>

    <!-- 7. RSVP Attendance Survey Section -->
    <section class="snap-section">
      <RsvpSection />
    </section>

    <!-- 8. Guestbook Section -->
    <section class="snap-section">
      <GuestbookSection />
    </section>

    <!-- 9. Live Snap Section (Visible on wedding day or if force-shown) -->
    <section v-if="isLiveSnapVisible" class="snap-section">
      <LiveSnapSection />
    </section>

    <!-- 10. Share & Footer Section -->
    <section class="snap-section">
      <ShareFooter />
    </section>

    <!-- Floating Bottom Navigation & Share Bar (Hidden on Section 0 / Home and when Story Modal is open) -->
    <Transition name="nav-fade">
      <div v-if="currentSectionIndex > 0 && !isStoryOpen" class="bottom-floating-bar-wrapper">
        <nav class="bottom-mini-nav font-sans" aria-label="하단 네비게이션 메뉴">
          <button
            v-for="item in navItems"
            :key="item.label"
            class="nav-item-btn"
            :class="{ 'is-active': isNavActive(item.sectionIndex) }"
            @click="navigateTo(item.sectionIndex)"
            :aria-label="item.label"
          >
            <component :is="item.icon" :size="15" class="nav-icon" />
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </nav>

        <!-- Circular Floating Share Button -->
        <button
          @click="handleShare"
          class="floating-share-circle-btn font-sans"
          aria-label="공유"
        >
          <Share2 :size="15" class="share-icon" />
          <span class="share-text">공유</span>
        </button>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.snap-container {
  width: 100%;
}

.snap-section {
  scroll-snap-align: center;
  scroll-snap-stop: always;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center; /* PC에서 화면 세로 중앙 배치 */
  align-items: center;
  box-sizing: border-box;
  will-change: transform;
  transform: translateZ(0);
}

/* Ensure inner section content centers vertically on taller PC screens */
.snap-section > :deep(*) {
  width: 100%;
  margin-top: auto;
  margin-bottom: auto;
}

/* Floating Bottom Navigation & Share Bar Wrapper */
.bottom-floating-bar-wrapper {
  position: fixed;
  bottom: 16px;
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
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.bottom-mini-nav {
  pointer-events: auto;
  flex: 1;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 9999px;
  border: 1px solid rgba(224, 214, 201, 0.75);
  box-shadow: 0 4px 20px rgba(45, 41, 38, 0.12), 0 1px 4px rgba(45, 41, 38, 0.06);
  padding: 4px 6px;
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.floating-share-circle-btn {
  pointer-events: auto;
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(224, 214, 201, 0.75);
  box-shadow: 0 4px 20px rgba(45, 41, 38, 0.12), 0 1px 4px rgba(45, 41, 38, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5px;
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.2s ease;
}

.floating-share-circle-btn:hover {
  background: #ffffff;
  color: var(--gold-dark);
  transform: scale(1.05);
}

.floating-share-circle-btn:active {
  transform: scale(0.95);
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

.nav-item-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: transparent;
  border: none;
  padding: 5px 2px;
  border-radius: 9999px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s ease;
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

.nav-item-btn:hover {
  color: var(--text-main);
}

.nav-item-btn.is-active {
  color: var(--gold-dark);
  background: rgba(168, 131, 80, 0.1);
}

.nav-item-btn.is-active .nav-icon {
  transform: scale(1.1);
}

.nav-item-btn.is-active .nav-label {
  font-weight: 700;
}

/* Navigation Fade Transitions */
.nav-fade-enter-active,
.nav-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.nav-fade-enter-from,
.nav-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .snap-section {
    min-height: 100vh;
    min-height: 100svh;
    scroll-snap-align: start; /* 단일 스냅 포인트로 역스크롤 시 버벅임 방지 */
    scroll-snap-stop: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}
</style>
