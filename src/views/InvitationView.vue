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

let isWheelLocked = false
let lockTimer: any = null

const handleWheel = (e: WheelEvent) => {
  // 모달(라이트박스 등)이 열려있거나 스크롤이 잠긴 경우 무시
  if (document.body.style.overflow === 'hidden') return

  // 미세 떨림 무시
  if (Math.abs(e.deltaY) < 25) return

  // 휠 디바운싱 잠금
  if (isWheelLocked) {
    e.preventDefault()
    return
  }

  const sections = Array.from(document.querySelectorAll<HTMLElement>('.snap-section'))
  if (!sections.length) return

  const windowHeight = window.innerHeight

  // 현재 가장 많이 화면에 보이는 섹션 인덱스 계산
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

  const currentRect = sections[currentIndex].getBoundingClientRect()

  // 긴 섹션(갤러리 등)에서 내부 내용이 아직 남아있으면 기본 스크롤 허용
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
    sections[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' })
    clearTimeout(lockTimer)
    lockTimer = setTimeout(() => {
      isWheelLocked = false
    }, 650)
  }
}

onMounted(() => {
  window.addEventListener('wheel', handleWheel, { passive: false })
})

onUnmounted(() => {
  window.removeEventListener('wheel', handleWheel)
  if (lockTimer) clearTimeout(lockTimer)
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
  scroll-behavior: smooth;
}

.snap-section {
  scroll-snap-align: start;
  scroll-snap-stop: normal;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}

/* On mobile, allow sections to be naturally height-flexible while maintaining snap */
@media (max-width: 768px) {
  .snap-section {
    min-height: 100vh;
  }
}
</style>
