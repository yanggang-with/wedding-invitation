<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import BgmPlayer from '../components/invitation/BgmPlayer.vue'
import CoverSection from '../components/invitation/CoverSection.vue'
import GreetingSection from '../components/invitation/GreetingSection.vue'
import CalendarSection from '../components/invitation/CalendarSection.vue'
import GallerySection from '../components/invitation/GallerySection.vue'
import LocationSection from '../components/invitation/LocationSection.vue'
import AccountSection from '../components/invitation/AccountSection.vue'
import RsvpSection from '../components/invitation/RsvpSection.vue'
import GuestbookSection from '../components/invitation/GuestbookSection.vue'
import ShareFooter from '../components/invitation/ShareFooter.vue'

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

// Desktop Mouse Wheel Handler (1 section per wheel scroll on PC)
const handleWheel = (e: WheelEvent) => {
  // 모달(라이트박스 등)이 열려있거나 스크롤이 잠긴 경우 무시
  if (document.body.style.overflow === 'hidden') return

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
  window.addEventListener('wheel', handleWheel, { passive: false })
})

onUnmounted(() => {
  document.documentElement.classList.remove('snap-mode')
  window.removeEventListener('wheel', handleWheel)
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

    <!-- 9. Share & Footer Section -->
    <section class="snap-section">
      <ShareFooter />
    </section>
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
