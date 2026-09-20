<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { weddingInfo, isStoryOpen } from '../../services/storage'
import { Calendar as CalendarIcon, X, ChevronRight, Smartphone } from 'lucide-vue-next'

const now = ref(new Date())
let timer: any = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  isStoryOpen.value = false
})

const isCalendarModalOpen = ref(false)

watch(isCalendarModalOpen, (open) => {
  isStoryOpen.value = open
})

function closeCalendarModal() {
  isCalendarModalOpen.value = false
}

const weddingDate = computed(() => new Date(weddingInfo.value.date))

// ICS file generator for Apple Calendar, Samsung Calendar, etc.
function downloadIcs() {
  const d = weddingDate.value
  const pad = (n: number) => String(n).padStart(2, '0')
  const toIcsDate = (date: Date) => {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  }
  const endDate = new Date(d.getTime() + 2 * 60 * 60 * 1000)

  const title = `${weddingInfo.value.groom.name} ♥ ${weddingInfo.value.bride.name} 결혼식`
  const location = `${weddingInfo.value.venue.name} (${weddingInfo.value.venue.address})`
  const description = `소중한 분들을 초대합니다.\\n${weddingInfo.value.venue.hall}`

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invitation//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding-${d.getTime()}@wedding.invitation`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(d)}`,
    `DTEND:${toIcsDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ]

  const icsData = icsLines.join('\r\n')
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('download', `wedding_${weddingInfo.value.groom.name}_${weddingInfo.value.bride.name}.ics`)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  closeCalendarModal()
}

// Google Calendar link
const googleCalendarUrl = computed(() => {
  const d = weddingDate.value
  const startTime = d.toISOString().replace(/-|:|\.\d\d\d/g, '')
  const endDate = new Date(d.getTime() + 2 * 60 * 60 * 1000)
  const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '')

  const title = encodeURIComponent(`${weddingInfo.value.groom.name} ♥ ${weddingInfo.value.bride.name} 결혼식`)
  const location = encodeURIComponent(`${weddingInfo.value.venue.name} (${weddingInfo.value.venue.address})`)
  const details = encodeURIComponent(`소중한 분들을 초대합니다.\n${weddingInfo.value.venue.hall}`)

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`
})

// Naver Calendar link
const naverCalendarUrl = computed(() => {
  const d = weddingDate.value
  const pad = (n: number) => String(n).padStart(2, '0')
  const startStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  const endDate = new Date(d.getTime() + 2 * 60 * 60 * 1000)
  const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}:${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`

  const title = encodeURIComponent(`${weddingInfo.value.groom.name} ♥ ${weddingInfo.value.bride.name} 결혼식`)
  const location = encodeURIComponent(`${weddingInfo.value.venue.name} (${weddingInfo.value.venue.address})`)
  const details = encodeURIComponent(`소중한 분들을 초대합니다.\n${weddingInfo.value.venue.hall}`)

  return `https://calendar.naver.com/event/new?title=${title}&startDateTime=${startStr}&endDateTime=${endStr}&location=${location}&description=${details}`
})

function openGoogleCalendar() {
  window.open(googleCalendarUrl.value, '_blank')
  closeCalendarModal()
}

function openNaverCalendar() {
  window.open(naverCalendarUrl.value, '_blank')
  closeCalendarModal()
}

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
</script>

<template>
  <section class="invitation-section calendar-section">
    <div class="section-divider">
      <span class="section-label">THE WEDDING DAY</span>
    </div>

    <h2 class="section-title font-serif">{{ weddingMonthLabel }}</h2>

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
            <div
              v-if="cell.isWeddingDay"
              class="wedding-heart-container"
              :title="`${weddingMonthLabel} ${cell.date}일 ${weddingTimeLabel}`"
            >
              <svg class="pink-heart-svg" viewBox="0 0 24 24" width="34" height="34">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="#FCE7F3"
                  stroke="#F472B6"
                  stroke-width="1.2"
                />
              </svg>
              <span class="wedding-day-text">{{ cell.date }}</span>
              <span class="wedding-day-time-pill font-sans">{{ weddingTimeLabel }}</span>
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
        <button
          type="button"
          class="btn-secondary add-cal-btn font-sans"
          @click="isCalendarModalOpen = true"
        >
          <CalendarIcon :size="15" />
          <span>캘린더에 일정 등록하기</span>
        </button>
      </div>
    </div>

    <!-- Calendar Selection Modal / Bottom Sheet -->
    <Teleport to="body">
      <Transition name="cal-modal-anim">
        <div
          v-if="isCalendarModalOpen"
          class="cal-modal-backdrop"
          @click.self="closeCalendarModal"
        >
          <div class="cal-modal-container font-sans">
            <!-- Modal Header -->
            <div class="cal-modal-header">
              <div class="cal-modal-title-box">
                <h3 class="cal-modal-title font-serif">일정 등록할 캘린더 선택</h3>
                <p class="cal-modal-subtitle">사용하시는 캘린더 앱을 선택해 주세요</p>
              </div>
              <button
                type="button"
                class="cal-modal-close-btn"
                @click="closeCalendarModal"
                aria-label="닫기"
              >
                <X :size="18" />
              </button>
            </div>

            <!-- Calendar Options List -->
            <div class="cal-options-list">
              <!-- 1. Apple & Galaxy 기본 캘린더 (.ics) -->
              <button
                type="button"
                class="cal-option-btn default-opt"
                @click="downloadIcs"
              >
                <div class="cal-option-icon apple-icon">
                  <Smartphone :size="20" />
                </div>
                <div class="cal-option-text">
                  <div class="cal-option-headline">
                    <span class="cal-option-title">기본 캘린더</span>
                    <span class="cal-option-badge">Apple / 갤럭시</span>
                  </div>
                  <span class="cal-option-desc">iPhone, iPad, 갤럭시 기본 캘린더 앱 (.ics)</span>
                </div>
                <ChevronRight :size="16" class="cal-option-chevron" />
              </button>

              <!-- 2. Google 캘린더 -->
              <button
                type="button"
                class="cal-option-btn google-opt"
                @click="openGoogleCalendar"
              >
                <div class="cal-option-icon google-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div class="cal-option-text">
                  <div class="cal-option-headline">
                    <span class="cal-option-title">Google 캘린더</span>
                    <span class="cal-option-badge">Google</span>
                  </div>
                  <span class="cal-option-desc">구글 계정 및 구글 캘린더 웹/앱 등록</span>
                </div>
                <ChevronRight :size="16" class="cal-option-chevron" />
              </button>

              <!-- 3. 네이버 캘린더 -->
              <button
                type="button"
                class="cal-option-btn naver-opt"
                @click="openNaverCalendar"
              >
                <div class="cal-option-icon naver-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="#03C75A">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
                  </svg>
                </div>
                <div class="cal-option-text">
                  <div class="cal-option-headline">
                    <span class="cal-option-title">네이버 캘린더</span>
                    <span class="cal-option-badge naver-badge">Naver</span>
                  </div>
                  <span class="cal-option-desc">네이버 계정 및 네이버 캘린더 웹/앱 등록</span>
                </div>
                <ChevronRight :size="16" class="cal-option-chevron" />
              </button>
            </div>

            <!-- Cancel Button -->
            <button
              type="button"
              class="cal-modal-cancel-btn"
              @click="closeCalendarModal"
            >
              닫기
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
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
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pink-heart-svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 2px 5px rgba(244, 114, 182, 0.35));
  animation: pulseHeart 2s infinite ease-in-out;
}

.wedding-day-text {
  position: relative;
  z-index: 1;
  font-size: 13.5px;
  font-weight: 700;
  color: #DB2777;
  line-height: 1;
  margin-top: -3px;
}

.wedding-day-time-pill {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 700;
  color: #9D174D;
  background: #FFE4E6;
  border: 1px solid #FDA4AF;
  border-radius: 9999px;
  padding: 1px 6px;
  line-height: 1.25;
  white-space: nowrap;
  z-index: 2;
  pointer-events: none;
  box-shadow: 0 1.5px 4px rgba(244, 114, 182, 0.3);
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
  cursor: pointer;
}

/* =========================================================
   Calendar Selection Modal / Bottom Sheet
   ========================================================= */

.cal-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 12, 10, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.cal-modal-container {
  width: 100%;
  max-width: 440px;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px max(24px, env(safe-area-inset-bottom, 24px));
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: none;
}

.cal-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cal-modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #2D2926;
  margin: 0;
}

.cal-modal-subtitle {
  font-size: 12px;
  color: #8C827A;
  margin-top: 4px;
}

.cal-modal-close-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #665E55;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.cal-modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.cal-options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cal-option-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #FAF7F2;
  border: 1px solid #EDE7DE;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
  outline: none !important;
}

.cal-option-btn:hover {
  background: #F3ECE1;
  border-color: #E2D7C8;
  transform: translateY(-1px);
}

.cal-option-btn:active {
  transform: scale(0.98);
}

.cal-option-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.apple-icon {
  color: #1C1C1E;
}

.cal-option-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cal-option-headline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cal-option-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #2D2926;
}

.cal-option-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  background: #EFE7DA;
  color: #876535;
}

.cal-option-badge.naver-badge {
  background: #E5F9ED;
  color: #03C75A;
}

.cal-option-desc {
  font-size: 11.5px;
  color: #8C827A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cal-option-chevron {
  color: #BDB2A7;
  flex-shrink: 0;
}

.cal-modal-cancel-btn {
  width: 100%;
  padding: 13px;
  border-radius: 12px;
  border: 1px solid #EAE3D6;
  background: #FFFFFF;
  font-size: 13.5px;
  font-weight: 600;
  color: #665E55;
  cursor: pointer;
  transition: background 0.15s ease;
  outline: none !important;
}

.cal-modal-cancel-btn:hover {
  background: #F7F3EC;
}

/* Modal Animations */
.cal-modal-anim-enter-active,
.cal-modal-anim-leave-active {
  transition: opacity 0.24s ease;
}

.cal-modal-anim-enter-active .cal-modal-container,
.cal-modal-anim-leave-active .cal-modal-container {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.cal-modal-anim-enter-from,
.cal-modal-anim-leave-to {
  opacity: 0;
}

.cal-modal-anim-enter-from .cal-modal-container,
.cal-modal-anim-leave-to .cal-modal-container {
  transform: translateY(100%);
}

@media (min-width: 641px) {
  .cal-modal-backdrop {
    align-items: center;
    padding: 24px;
  }

  .cal-modal-container {
    border-radius: 24px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
    padding: 24px;
  }

  .cal-modal-anim-enter-from .cal-modal-container,
  .cal-modal-anim-leave-to .cal-modal-container {
    transform: scale(0.94) translateY(12px);
  }
}
</style>
