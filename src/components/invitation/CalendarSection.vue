<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { weddingInfo } from '../../services/storage'
import { Calendar as CalendarIcon } from 'lucide-vue-next'

const now = ref(new Date())
let timer: any = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const weddingDate = computed(() => new Date(weddingInfo.value.date))

const diffTime = computed(() => {
  return weddingDate.value.getTime() - now.value.getTime()
})

const dDayText = computed(() => {
  const diffDays = Math.ceil(diffTime.value / (1000 * 60 * 60 * 24))
  if (diffDays > 0) return `D-${diffDays}`
  if (diffDays === 0) return 'D-DAY'
  return `D+${Math.abs(diffDays)}`
})

const countdown = computed(() => {
  const diff = diffTime.value
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, isPast: false }
})

// Calendar calculation for the specific wedding month
const calendarDays = computed(() => {
  const d = weddingDate.value
  const year = d.getFullYear()
  const month = d.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()

  const days: { date: number | null; isWeddingDay: boolean; isSunday: boolean; isSaturday: boolean }[] = []

  // Empty days before 1st
  for (let i = 0; i < firstDay; i++) {
    days.push({ date: null, isWeddingDay: false, isSunday: i === 0, isSaturday: i === 6 })
  }

  // Days of the month
  for (let date = 1; date <= lastDate; date++) {
    const dayOfWeek = (firstDay + date - 1) % 7
    days.push({
      date,
      isWeddingDay: date === d.getDate(),
      isSunday: dayOfWeek === 0,
      isSaturday: dayOfWeek === 6
    })
  }

  return days
})

const weddingMonthLabel = computed(() => {
  const d = weddingDate.value
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
})

const weddingTimeLabel = computed(() => {
  const d = weddingDate.value
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours < 12 ? '오전' : '오후'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  const minStr = minutes > 0 ? ` ${minutes}분` : ''
  return `${ampm} ${displayHours}시${minStr}`
})

// Google Calendar link
const googleCalendarUrl = computed(() => {
  const d = weddingDate.value
  const startTime = d.toISOString().replace(/-|:|\.\d\d\d/g, '')
  // End time 2 hours later
  const endDate = new Date(d.getTime() + 2 * 60 * 60 * 1000)
  const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '')

  const title = encodeURIComponent(`${weddingInfo.value.groom.name} ♥ ${weddingInfo.value.bride.name} 결혼식`)
  const location = encodeURIComponent(`${weddingInfo.value.venue.name} (${weddingInfo.value.venue.address})`)
  const details = encodeURIComponent(`소중한 분들을 초대합니다.\n${weddingInfo.value.venue.hall}`)

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`
})
</script>

<template>
  <section class="invitation-section calendar-section">
    <div class="section-divider">
      <span class="section-label">THE WEDDING DAY</span>
    </div>

    <h2 class="section-title font-serif">{{ weddingMonthLabel }}</h2>
    <p class="section-subtitle font-serif">{{ weddingTimeLabel }}</p>

    <!-- Calendar Table -->
    <div class="calendar-card card-paper">
      <div class="calendar-header font-sans">
        <span class="sun">일</span>
        <span>월</span>
        <span>화</span>
        <span>수</span>
        <span>목</span>
        <span>금</span>
        <span class="sat">토</span>
      </div>

      <div class="calendar-grid font-sans">
        <div
          v-for="(cell, index) in calendarDays"
          :key="index"
          class="calendar-cell"
          :class="{
            'is-wedding': cell.isWeddingDay,
            'is-sun': cell.isSunday,
            'is-sat': cell.isSaturday,
            'empty': !cell.date
          }"
        >
          <template v-if="cell.date">
            <div v-if="cell.isWeddingDay" class="wedding-heart-container">
              <svg class="pink-heart-svg" viewBox="0 0 24 24" width="34" height="34">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="#FCE7F3"
                  stroke="#F472B6"
                  stroke-width="1.2"
                />
              </svg>
              <span class="wedding-day-text">{{ cell.date }}</span>
            </div>
            <span v-else class="cell-number">
              {{ cell.date }}
            </span>
          </template>
        </div>
      </div>

      <!-- Countdown Bar -->
      <div class="countdown-wrapper font-sans">
        <div class="d-day-badge font-serif">{{ dDayText }}</div>
        
        <div v-if="!countdown.isPast" class="timer-boxes">
          <div class="time-unit">
            <span class="num">{{ countdown.days }}</span>
            <span class="label">일</span>
          </div>
          <span class="colon">:</span>
          <div class="time-unit">
            <span class="num">{{ String(countdown.hours).padStart(2, '0') }}</span>
            <span class="label">시</span>
          </div>
          <span class="colon">:</span>
          <div class="time-unit">
            <span class="num">{{ String(countdown.minutes).padStart(2, '0') }}</span>
            <span class="label">분</span>
          </div>
          <span class="colon">:</span>
          <div class="time-unit">
            <span class="num">{{ String(countdown.seconds).padStart(2, '0') }}</span>
            <span class="label">초</span>
          </div>
        </div>
        <p v-else class="past-message font-serif">
          소중한 발걸음으로 축복해 주셔서 감사합니다
        </p>

        <p v-if="!countdown.isPast" class="dday-description font-serif">
          {{ weddingInfo.groom.name }} ♥ {{ weddingInfo.bride.name }}의 결혼식이 <strong>{{ countdown.days }}일</strong> 남았습니다.
        </p>
      </div>

      <!-- Add to Calendar Button -->
      <div class="calendar-action">
        <a :href="googleCalendarUrl" target="_blank" rel="noopener noreferrer" class="btn-secondary add-cal-btn font-sans">
          <CalendarIcon :size="15" />
          <span>캘린더에 일정 등록하기</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.calendar-section {
  background-color: var(--bg-ivory);
}

.calendar-card {
  margin-top: 24px;
  padding: 24px 18px;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.calendar-header .sun {
  color: var(--rose-accent);
}

.calendar-header .sat {
  color: #5580A6;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  row-gap: 8px;
  padding-top: 14px;
}

.calendar-cell {
  height: 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-main);
  position: relative;
}

.calendar-cell.is-sun {
  color: var(--rose-accent);
}

.calendar-cell.is-sat {
  color: #5580A6;
}

.calendar-cell.is-wedding {
  background: none;
  border-radius: 0;
  box-shadow: none;
}

.wedding-heart-container {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pink-heart-svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 2px 4px rgba(244, 114, 182, 0.3));
  animation: pulseHeart 2s infinite ease-in-out;
}

.wedding-day-text {
  position: relative;
  z-index: 1;
  font-size: 13px;
  font-weight: 700;
  color: #DB2777;
  line-height: 1;
}

@keyframes pulseHeart {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.08);
  }
}

.countdown-wrapper {
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.d-day-badge {
  font-size: 18px;
  color: var(--gold-dark);
  font-weight: 700;
  letter-spacing: 2px;
}

.timer-boxes {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 44px;
  padding: 6px 4px;
  background: var(--bg-subtle);
  border-radius: 8px;
  border: 1px solid var(--border-light);
}

.time-unit .num {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-main);
}

.time-unit .label {
  font-size: 10px;
  color: var(--text-muted);
}

.colon {
  font-size: 15px;
  font-weight: 600;
  color: var(--gold-primary);
}

.dday-description {
  font-size: 13px;
  color: var(--text-sub);
}

.dday-description strong {
  color: var(--gold-dark);
}

.past-message {
  font-size: 14px;
  color: var(--gold-primary);
}

.calendar-action {
  margin-top: 18px;
}

.add-cal-btn {
  font-size: 12px;
  padding: 9px 16px;
}
</style>
