<script setup lang="ts">
import { ref } from 'vue'
import { addRsvpResponse, weddingInfo } from '../../services/storage'
import confetti from 'canvas-confetti'
import { CheckCircle2, HeartHandshake } from 'lucide-vue-next'

const form = ref({
  side: 'groom' as 'groom' | 'bride',
  guestName: '',
  isAttending: true,
  mealNeeded: true,
  guestCount: 1,
  phone: '',
  message: ''
})

const isSubmitted = ref(false)
const isSubmitting = ref(false)

const triggerConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#A88350', '#C7756B', '#F4EFE6', '#EBD8B8']
  })
}

const handleSubmit = async () => {
  if (!form.value.guestName.trim()) {
    alert('참석자 성함을 입력해 주세요.')
    return
  }

  isSubmitting.value = true

  try {
    addRsvpResponse({
      side: form.value.side,
      guestName: form.value.guestName.trim(),
      isAttending: form.value.isAttending,
      mealNeeded: form.value.isAttending ? form.value.mealNeeded : false,
      guestCount: form.value.isAttending ? form.value.guestCount : 0,
      phone: form.value.phone.trim(),
      message: form.value.message.trim()
    })

    isSubmitted.value = true
    triggerConfetti()
  } catch (err) {
    console.error('RSVP submission error:', err)
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  form.value = {
    side: 'groom',
    guestName: '',
    isAttending: true,
    mealNeeded: true,
    guestCount: 1,
    phone: '',
    message: ''
  }
  isSubmitted.value = false
}
</script>

<template>
  <section class="invitation-section rsvp-section">
    <div class="section-divider">
      <span class="section-label">RSVP</span>
    </div>

    <h2 class="section-title font-serif">참석 의사 전달</h2>
    <p class="section-subtitle font-serif">
      원활한 예식 진행 및 좌석 배치를 위해<br />
      참석 여부를 미리 알려주시면 감사하겠습니다.
    </p>

    <!-- Success Message Box -->
    <div v-if="isSubmitted" class="card-paper rsvp-success-card font-sans">
      <CheckCircle2 :size="48" class="success-icon" />
      <h3 class="success-title font-serif">소중한 뜻이 전달되었습니다</h3>
      <p class="success-desc">
        따뜻한 마음에 깊이 감사드립니다.<br />
        기쁜 날 축복 가득한 모습으로 뵙겠습니다.
      </p>
      <button class="btn-secondary font-sans" @click="resetForm">
        내용 다시 수정하기
      </button>
    </div>

    <!-- RSVP Form Card -->
    <div v-else class="card-paper rsvp-form-card font-sans">
      <form @submit.prevent="handleSubmit">
        <!-- Side Selector -->
        <div class="form-group">
          <label class="form-label">구분</label>
          <div class="toggle-buttons">
            <button
              type="button"
              class="toggle-btn"
              :class="{ 'active groom': form.side === 'groom' }"
              @click="form.side = 'groom'"
            >
              신랑({{ weddingInfo.groom.name }})측 하객
            </button>
            <button
              type="button"
              class="toggle-btn"
              :class="{ 'active bride': form.side === 'bride' }"
              @click="form.side = 'bride'"
            >
              신부({{ weddingInfo.bride.name }})측 하객
            </button>
          </div>
        </div>

        <!-- Name Input -->
        <div class="form-group">
          <label class="form-label" for="guestName">성함 <span class="required">*</span></label>
          <input
            id="guestName"
            v-model="form.guestName"
            type="text"
            placeholder="성함을 입력해 주세요"
            class="input-field"
            required
          />
        </div>

        <!-- Attendance Toggle -->
        <div class="form-group">
          <label class="form-label">참석 여부</label>
          <div class="toggle-buttons">
            <button
              type="button"
              class="toggle-btn"
              :class="{ 'active': form.isAttending }"
              @click="form.isAttending = true"
            >
              참석 가능
            </button>
            <button
              type="button"
              class="toggle-btn"
              :class="{ 'active': !form.isAttending }"
              @click="form.isAttending = false"
            >
              마음으로 축하
            </button>
          </div>
        </div>

        <!-- Attendee Conditional Fields -->
        <div v-if="form.isAttending" class="attendee-subfields">
          <!-- Meal Needed -->
          <div class="form-group">
            <label class="form-label">식사 여부</label>
            <div class="toggle-buttons">
              <button
                type="button"
                class="toggle-btn"
                :class="{ 'active': form.mealNeeded }"
                @click="form.mealNeeded = true"
              >
                식사 예정
              </button>
              <button
                type="button"
                class="toggle-btn"
                :class="{ 'active': !form.mealNeeded }"
                @click="form.mealNeeded = false"
              >
                식사 안함
              </button>
            </div>
          </div>

          <!-- Guest Count -->
          <div class="form-group">
            <label class="form-label">참석 인원 (본인 포함)</label>
            <div class="count-selector">
              <button
                v-for="cnt in [1, 2, 3, 4]"
                :key="cnt"
                type="button"
                class="count-btn"
                :class="{ 'active': form.guestCount === cnt }"
                @click="form.guestCount = cnt"
              >
                {{ cnt === 4 ? '4명 이상' : `${cnt}명` }}
              </button>
            </div>
          </div>
        </div>

        <!-- Phone Input -->
        <div class="form-group">
          <label class="form-label" for="guestPhone">연락처 (선택)</label>
          <input
            id="guestPhone"
            v-model="form.phone"
            type="tel"
            placeholder="010-0000-0000 (선택 사항)"
            class="input-field"
          />
        </div>

        <!-- Congratulatory Message -->
        <div class="form-group">
          <label class="form-label" for="guestMsg">전하는 말씀 (선택)</label>
          <textarea
            id="guestMsg"
            v-model="form.message"
            rows="3"
            placeholder="신랑, 신부에게 전하고 싶은 말씀을 남겨주세요."
            class="input-field textarea"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <button type="submit" class="btn-primary submit-btn" :disabled="isSubmitting">
          <HeartHandshake :size="18" />
          <span>{{ isSubmitting ? '전달 중...' : '참석 의사 전달하기' }}</span>
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.rsvp-section {
  background-color: var(--bg-ivory);
}

.rsvp-form-card {
  margin-top: 24px;
  padding: 24px 20px;
  text-align: left;
}

.rsvp-success-card {
  margin-top: 24px;
  padding: 40px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.success-icon {
  color: var(--gold-primary);
  margin-bottom: 6px;
}

.success-title {
  font-size: 19px;
  color: var(--text-main);
  font-weight: 700;
}

.success-desc {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.6;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 8px;
}

.required {
  color: var(--rose-accent);
}

.toggle-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.toggle-btn {
  padding: 10px 0;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: #FFFFFF;
  color: var(--text-sub);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn.active {
  background: var(--gold-soft);
  border-color: var(--gold-primary);
  color: var(--gold-dark);
  font-weight: 600;
}

.toggle-btn.active.groom {
  background: #E8EFF8;
  border-color: #3A69A8;
  color: #274D82;
}

.toggle-btn.active.bride {
  background: #F8ECE8;
  border-color: #B85848;
  color: #8C392C;
}

.input-field {
  width: 100%;
  padding: 11px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  font-size: 14px;
  color: var(--text-main);
  background: #FFFFFF;
  outline: none;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: var(--gold-primary);
}

.textarea {
  resize: vertical;
  min-height: 72px;
}

.count-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.count-btn {
  padding: 9px 0;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: #FFFFFF;
  color: var(--text-sub);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.count-btn.active {
  background: var(--gold-primary);
  border-color: var(--gold-primary);
  color: #FFFFFF;
  font-weight: 600;
}

.submit-btn {
  width: 100%;
  padding: 14px 0;
  font-size: 15px;
  margin-top: 10px;
}
</style>

