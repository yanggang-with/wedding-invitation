<script setup lang="ts">
import { weddingInfo } from '../../services/storage'
import { Share2 } from 'lucide-vue-next'

defineProps<{
  isAtFooter?: boolean
}>()

defineEmits<{
  (e: 'share'): void
}>()
</script>

<template>
  <footer class="share-footer font-sans">
    <!-- Top Decorative Accent -->
    <div class="footer-top-ornament">
      <span class="ornament-line"></span>
      <span class="ornament-text font-serif">THANK YOU</span>
      <span class="ornament-line"></span>
    </div>

    <!-- Docked Share Button Target Slot -->
    <div class="footer-share-destination">
      <button
        class="footer-docked-share-btn font-sans"
        :class="{ 'is-active': isAtFooter }"
        @click="$emit('share')"
        aria-label="청첩장 공유하기"
      >
        <div class="docked-circle-icon">
          <Share2 :size="20" class="docked-share-icon" />
        </div>
        <span class="docked-share-title font-sans">청첩장 공유하기</span>
        <span class="docked-share-sub font-sans">카카오톡 또는 링크로 소중한 분들께 전해보세요</span>
      </button>
    </div>

    <!-- Blessing & Copyright -->
    <div class="footer-meta">
      <p class="blessing-text font-serif">
        {{ weddingInfo.groom.name }} &amp; {{ weddingInfo.bride.name }}
      </p>
      <p class="copyright">Thank you for celebrating with us</p>
    </div>
  </footer>
</template>

<style scoped>
.share-footer {
  padding: 64px 24px 76px;
  background: linear-gradient(180deg, #F4ECE1 0%, #EDE4D6 45%, #E4DAC9 100%);
  border-top: 1px solid rgba(197, 160, 89, 0.32);
  box-shadow: inset 0 16px 32px -12px rgba(140, 115, 85, 0.12);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 32px;
  box-sizing: border-box;
  width: 100%;
}

.footer-top-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0.8;
  margin-bottom: -10px;
}

.ornament-line {
  width: 36px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-dark), transparent);
}

.ornament-text {
  font-size: 11px;
  letter-spacing: 3.5px;
  color: var(--gold-dark);
  font-weight: 600;
}

.footer-share-destination {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 96px;
}

.footer-docked-share-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 16px;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.4s ease;
  opacity: 0;
  transform: translateY(24px) scale(0.9);
  -webkit-tap-highlight-color: transparent;
}

.footer-docked-share-btn.is-active {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.docked-circle-icon {
  width: 52px;
  height: 52px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 10px 30px rgba(45, 41, 38, 0.12),
              inset 0 1.5px 2px rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gold-dark, #A88350);
  transition: all 0.25s ease;
}

.footer-docked-share-btn:hover .docked-circle-icon {
  transform: scale(1.08);
  box-shadow: 0 12px 34px rgba(168, 131, 80, 0.22);
}

.footer-docked-share-btn:active .docked-circle-icon {
  transform: scale(0.92);
}

.docked-share-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: -0.3px;
  margin-top: 2px;
}

.docked-share-sub {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: -0.2px;
}

.footer-meta {
  border-top: 1px solid rgba(224, 214, 201, 0.5);
  padding-top: 24px;
}

.blessing-text {
  font-size: 16px;
  letter-spacing: 2px;
  color: var(--gold-dark);
  margin-bottom: 6px;
}

.copyright {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}
</style>
