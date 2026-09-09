<script setup lang="ts">
import { ref, computed } from 'vue'
import { accounts } from '../../services/storage'
import type { AccountItem } from '../../types/wedding'
import { ChevronDown, Copy, Check, ExternalLink } from 'lucide-vue-next'

const isGroomOpen = ref(false)
const isBrideOpen = ref(false)
const copiedId = ref<string | null>(null)

const groomAccounts = computed(() => {
  return accounts.value.filter(a => a.side === 'groom' || a.side === 'groomParents')
})

const brideAccounts = computed(() => {
  return accounts.value.filter(a => a.side === 'bride' || a.side === 'brideParents')
})

const copyAccount = async (item: AccountItem) => {
  try {
    await navigator.clipboard.writeText(`${item.bankName} ${item.accountNumber}`)
    copiedId.value = item.id
    setTimeout(() => {
      copiedId.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy account number:', err)
  }
}
</script>

<template>
  <section class="invitation-section account-section">
    <div class="section-divider">
      <span class="section-label">ACCOUNT</span>
    </div>

    <h2 class="section-title font-serif">마음 전하실 곳</h2>
    <p class="section-subtitle font-serif">
      참석이 어려우신 분들을 위해 계좌번호를 안내해 드립니다.<br />
      축복해 주시는 따뜻한 마음 감사히 간직하겠습니다.
    </p>

    <div class="accordion-group font-sans">
      <!-- Groom Side Accordion -->
      <div class="accordion-item card-paper">
        <button class="accordion-header" @click="isGroomOpen = !isGroomOpen">
          <div class="header-left">
            <span class="side-badge groom">신랑측</span>
            <span class="header-title">신랑측 계좌번호</span>
          </div>
          <ChevronDown :size="18" class="chevron-icon" :class="{ 'is-open': isGroomOpen }" />
        </button>

        <div class="accordion-collapse" :class="{ 'is-open': isGroomOpen }">
          <div class="accordion-collapse-inner">
            <div class="accordion-body">
              <div v-for="item in groomAccounts" :key="item.id" class="account-card">
                <div class="account-details">
                  <div class="account-title-row">
                    <span class="acc-title">{{ item.title }}</span>
                    <span class="acc-holder">({{ item.accountHolder }})</span>
                  </div>
                  <div class="acc-number-row">
                    <span class="bank">{{ item.bankName }}</span>
                    <span class="number">{{ item.accountNumber }}</span>
                  </div>
                </div>

                <div class="account-actions">
                  <button class="action-btn copy" @click="copyAccount(item)">
                    <Check v-if="copiedId === item.id" :size="13" class="text-green" />
                    <Copy v-else :size="13" />
                    <span>{{ copiedId === item.id ? '복사됨' : '복사' }}</span>
                  </button>

                  <a
                    v-if="item.kakaoPayUrl"
                    :href="item.kakaoPayUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="action-btn kakaopay"
                  >
                    <span>페이송금</span>
                    <ExternalLink :size="11" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bride Side Accordion -->
      <div class="accordion-item card-paper">
        <button class="accordion-header" @click="isBrideOpen = !isBrideOpen">
          <div class="header-left">
            <span class="side-badge bride">신부측</span>
            <span class="header-title">신부측 계좌번호</span>
          </div>
          <ChevronDown :size="18" class="chevron-icon" :class="{ 'is-open': isBrideOpen }" />
        </button>

        <div class="accordion-collapse" :class="{ 'is-open': isBrideOpen }">
          <div class="accordion-collapse-inner">
            <div class="accordion-body">
              <div v-for="item in brideAccounts" :key="item.id" class="account-card">
                <div class="account-details">
                  <div class="account-title-row">
                    <span class="acc-title">{{ item.title }}</span>
                    <span class="acc-holder">({{ item.accountHolder }})</span>
                  </div>
                  <div class="acc-number-row">
                    <span class="bank">{{ item.bankName }}</span>
                    <span class="number">{{ item.accountNumber }}</span>
                  </div>
                </div>

                <div class="account-actions">
                  <button class="action-btn copy" @click="copyAccount(item)">
                    <Check v-if="copiedId === item.id" :size="13" class="text-green" />
                    <Copy v-else :size="13" />
                    <span>{{ copiedId === item.id ? '복사됨' : '복사' }}</span>
                  </button>

                  <a
                    v-if="item.kakaoPayUrl"
                    :href="item.kakaoPayUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="action-btn kakaopay"
                  >
                    <span>페이송금</span>
                    <ExternalLink :size="11" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.account-section {
  background-color: #FFFFFF;
}

.accordion-group {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.accordion-item {
  padding: 0;
  overflow: hidden;
  border-radius: 14px;
}

.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.side-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
}

.side-badge.groom {
  background: #E8EFF8;
  color: #3A69A8;
}

.side-badge.bride {
  background: #F8ECE8;
  color: #B85848;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
}

.chevron-icon {
  color: var(--text-muted);
  transition: transform 0.25s ease;
}

.chevron-icon.is-open {
  transform: rotate(180deg);
}

.accordion-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.accordion-collapse.is-open {
  grid-template-rows: 1fr;
}

.accordion-collapse-inner {
  overflow: hidden;
  min-height: 0;
}

.accordion-body {
  padding: 0 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.account-card {
  background: var(--bg-ivory);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.account-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.account-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.acc-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.acc-holder {
  font-size: 12px;
  color: var(--text-muted);
}

.acc-number-row {
  font-size: 13px;
  color: var(--text-sub);
  display: flex;
  gap: 6px;
}

.account-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border-color);
  background: #FFFFFF;
  color: var(--text-main);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}

.action-btn:hover {
  background: var(--bg-subtle);
}

.action-btn.kakaopay {
  background: #FEE500;
  border-color: #FEE500;
  color: #191919;
}

.text-green {
  color: #2E7D32;
}
</style>
