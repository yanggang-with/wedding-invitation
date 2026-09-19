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
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.invitation-section-wrapper'))
  if (!sections.length) return
  currentSectionIndex.value = getCurrentSectionIndex(sections)
}

const isNavActive = (itemSectionIndex: number) => {
  if (currentSectionIndex.value === itemSectionIndex) return true
  if (itemSectionIndex === 1 && currentSectionIndex.value === 2) return true
  if (itemSectionIndex === 4 && (currentSectionIndex.value === 5 || currentSectionIndex.value === 6)) return true
  if (itemSectionIndex === 7 && currentSectionIndex.value === 8) return true
  return false
}

const navigateTo = (sectionIndex: number) => {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.invitation-section-wrapper'))
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

// Section visibility calculation for bottom navigation
const getCurrentSectionIndex = (sections: HTMLElement[]): number => {
  let currentIndex = 0
  const threshold = window.innerHeight * 0.35

  sections.forEach((sec, idx) => {
    const rect = sec.getBoundingClientRect()
    if (rect.top <= threshold) {
      currentIndex = idx
    }
  })

  return currentIndex
}

// Smoothly scroll to target section without snapping
const scrollToSection = (targetEl: HTMLElement) => {
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  updateCurrentSection()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (scrollThrottle) cancelAnimationFrame(scrollThrottle)
})
</script>

<template>
  <main class="mobile-frame invitation-main-container">
    <!-- Floating BGM Player -->
    <BgmPlayer />

    <!-- 1. Cover Section -->
    <div class="invitation-section-wrapper">
      <CoverSection />
    </div>

    <!-- 2. Greeting & Contact Section -->
    <div class="invitation-section-wrapper">
      <GreetingSection />
    </div>

    <!-- 3. Wedding Calendar & D-Day Section -->
    <div class="invitation-section-wrapper">
      <CalendarSection />
    </div>

    <!-- 4. Wedding Photos Gallery Section -->
    <div class="invitation-section-wrapper">
      <GallerySection />
    </div>

    <!-- 5. Location & Map & Navigation Section -->
    <div class="invitation-section-wrapper">
      <LocationSection />
    </div>

    <!-- 6. Bank Account & Congratulatory Gift Section -->
    <div class="invitation-section-wrapper">
      <AccountSection />
    </div>

    <!-- 7. RSVP Attendance Survey Section -->
    <div class="invitation-section-wrapper">
      <RsvpSection />
    </div>

    <!-- 8. Guestbook Section -->
    <div class="invitation-section-wrapper">
      <GuestbookSection />
    </div>

    <!-- 9. Live Snap Section (Visible on wedding day or if force-shown) -->
    <div v-if="isLiveSnapVisible" class="invitation-section-wrapper">
      <LiveSnapSection />
    </div>

    <!-- 10. Share & Footer Section -->
    <div class="invitation-section-wrapper">
      <ShareFooter />
    </div>

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
.invitation-main-container {
  width: 100%;
}

.invitation-section-wrapper {
  width: 100%;
  box-sizing: border-box;
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

</style>
