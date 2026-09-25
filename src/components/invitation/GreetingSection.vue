<script setup lang="ts">
import { ref } from 'vue'
import { weddingInfo } from '../../services/storage'
import { Phone, MessageSquare, X, Users } from 'lucide-vue-next'

const isContactModalOpen = ref(false)

const openModal = () => {
  isContactModalOpen.value = true
}

const closeModal = () => {
  isContactModalOpen.value = false
}
</script>

<template>
  <section class="invitation-section greeting-section">
    <div class="section-divider">
      <span class="section-label">INVITATION</span>
    </div>

    <h2 class="section-title font-serif">{{ weddingInfo.greeting.title }}</h2>

    <!-- Sub-quote if exists -->
    <p v-if="weddingInfo.greeting.subQuote" class="sub-quote font-serif">
      "{{ weddingInfo.greeting.subQuote }}"
    </p>

    <!-- Main Greeting Content -->
    <div class="greeting-content font-serif">
      <p class="greeting-text">{{ weddingInfo.greeting.content }}</p>
    </div>

    <!-- Family / Relation Lines -->
    <div class="family-lines font-serif">
      <div class="family-item">
        <span class="parents">
          <span v-if="weddingInfo.groom.isFatherDeceased" class="deceased">故</span>{{ weddingInfo.groom.fatherName }}
          ·
          <span v-if="weddingInfo.groom.isMotherDeceased" class="deceased">故</span>{{ weddingInfo.groom.motherName }}
        </span>
        <span class="relation">의 {{ weddingInfo.groom.relationRole || '장남' }}</span>
        <strong class="name">{{ weddingInfo.groom.name }}</strong>
      </div>

      <div class="family-item">
        <span class="parents">
          <span v-if="weddingInfo.bride.isFatherDeceased" class="deceased">故</span>{{ weddingInfo.bride.fatherName }}
          ·
          <span v-if="weddingInfo.bride.isMotherDeceased" class="deceased">故</span>{{ weddingInfo.bride.motherName }}
        </span>
        <span class="relation">의 {{ weddingInfo.bride.relationRole || '장녀' }}</span>
        <strong class="name">{{ weddingInfo.bride.name }}</strong>
      </div>
    </div>

    <!-- Call / SMS Contact Button -->
    <div class="contact-action">
      <button class="btn-secondary font-sans" @click="openModal">
        <Users :size="16" />
        <span>연락처 보기 & 축하 인사 전하기</span>
      </button>
    </div>

    <!-- Contact Modal -->
    <Transition name="modal-fade">
      <div v-if="isContactModalOpen" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title font-serif">축하 연락처</h3>
            <button class="close-btn" @click="closeModal">
              <X :size="20" />
            </button>
          </div>

          <div class="contact-list font-sans">
            <!-- Groom Side -->
            <div class="contact-group">
              <span class="group-badge groom-badge">신랑측</span>
              <div class="contact-row">
                <div class="contact-info">
                  <span class="role">신랑</span>
                  <strong class="name">{{ weddingInfo.groom.name }}</strong>
                </div>
                <div class="contact-actions">
                  <a :href="`tel:${weddingInfo.groom.phone}`" class="action-btn call" title="전화걸기">
                    <Phone :size="15" />
                  </a>
                  <a :href="`sms:${weddingInfo.groom.phone}`" class="action-btn sms" title="문자보내기">
                    <MessageSquare :size="15" />
                  </a>
                </div>
              </div>

              <div v-if="weddingInfo.groom.fatherName" class="contact-row">
                <div class="contact-info">
                  <span class="role">신랑 아버지</span>
                  <span class="name">{{ weddingInfo.groom.fatherName }}</span>
                </div>
                <div class="contact-actions">
                  <a :href="`tel:${weddingInfo.groom.phone}`" class="action-btn call" title="전화걸기">
                    <Phone :size="15" />
                  </a>
                  <a :href="`sms:${weddingInfo.groom.phone}`" class="action-btn sms" title="문자보내기">
                    <MessageSquare :size="15" />
                  </a>
                </div>
              </div>

              <div v-if="weddingInfo.groom.motherName" class="contact-row">
                <div class="contact-info">
                  <span class="role">신랑 어머니</span>
                  <span class="name">{{ weddingInfo.groom.motherName }}</span>
                </div>
                <div class="contact-actions">
                  <a :href="`tel:${weddingInfo.groom.phone}`" class="action-btn call" title="전화걸기">
                    <Phone :size="15" />
                  </a>
                  <a :href="`sms:${weddingInfo.groom.phone}`" class="action-btn sms" title="문자보내기">
                    <MessageSquare :size="15" />
                  </a>
                </div>
              </div>
            </div>

            <hr class="contact-divider" />

            <!-- Bride Side -->
            <div class="contact-group">
              <span class="group-badge bride-badge">신부측</span>
              <div class="contact-row">
                <div class="contact-info">
                  <span class="role">신부</span>
                  <strong class="name">{{ weddingInfo.bride.name }}</strong>
                </div>
                <div class="contact-actions">
                  <a :href="`tel:${weddingInfo.bride.phone}`" class="action-btn call" title="전화걸기">
                    <Phone :size="15" />
                  </a>
                  <a :href="`sms:${weddingInfo.bride.phone}`" class="action-btn sms" title="문자보내기">
                    <MessageSquare :size="15" />
                  </a>
                </div>
              </div>

              <div v-if="weddingInfo.bride.fatherName" class="contact-row">
                <div class="contact-info">
                  <span class="role">신부 아버지</span>
                  <span class="name">{{ weddingInfo.bride.fatherName }}</span>
                </div>
                <div class="contact-actions">
                  <a :href="`tel:${weddingInfo.bride.phone}`" class="action-btn call" title="전화걸기">
                    <Phone :size="15" />
                  </a>
                  <a :href="`sms:${weddingInfo.bride.phone}`" class="action-btn sms" title="문자보내기">
                    <MessageSquare :size="15" />
                  </a>
                </div>
              </div>

              <div v-if="weddingInfo.bride.motherName" class="contact-row">
                <div class="contact-info">
                  <span class="role">신부 어머니</span>
                  <span class="name">{{ weddingInfo.bride.motherName }}</span>
                </div>
                <div class="contact-actions">
                  <a :href="`tel:${weddingInfo.bride.phone}`" class="action-btn call" title="전화걸기">
                    <Phone :size="15" />
                  </a>
                  <a :href="`sms:${weddingInfo.bride.phone}`" class="action-btn sms" title="문자보내기">
                    <MessageSquare :size="15" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.greeting-section {
  background-color: var(--section-bg, #FFFFFF);
}

.sub-quote {
  font-size: 14px;
  color: var(--gold-primary);
  font-style: italic;
  margin-bottom: 28px;
}

.greeting-content {
  margin-bottom: 36px;
  padding: 0 10px;
}

.greeting-text {
  font-size: 15px;
  line-height: 2.2;
  color: var(--text-main);
  white-space: pre-line;
}

.family-lines {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 32px;
  padding: 20px 10px;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
}

.family-item {
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.parents {
  color: var(--text-sub);
}

.deceased {
  font-size: 12px;
  margin-right: 2px;
  color: var(--text-muted);
}

.relation {
  font-size: 13px;
  color: var(--gold-primary);
}

.name {
  color: var(--text-main);
  font-weight: 600;
}

.contact-action {
  margin-top: 10px;
}

/* Modal Overlay & Card */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 360px;
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--border-light);
}

.modal-title {
  font-size: 18px;
  color: var(--text-main);
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.contact-list {
  padding: 18px 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.contact-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
}

.groom-badge {
  background: #E8EFF8;
  color: #3A69A8;
}

.bride-badge {
  background: #F8ECE8;
  color: #B85848;
}

.contact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.contact-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.contact-info .role {
  font-size: 13px;
  color: var(--text-muted);
  width: 70px;
  text-align: left;
}

.contact-info .name {
  font-size: 15px;
  color: var(--text-main);
}

.contact-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: transform 0.2s;
}

.action-btn:active {
  transform: scale(0.9);
}

.action-btn.call {
  background: #E8F5E9;
  color: #2E7D32;
}

.action-btn.sms {
  background: #FFF3E0;
  color: #E65100;
}

.contact-divider {
  border: none;
  border-top: 1px dashed var(--border-color);
  margin: 4px 0;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

