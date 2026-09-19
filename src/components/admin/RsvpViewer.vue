<script setup lang="ts">
import { ref, computed } from 'vue'
import { rsvpList, deleteRsvpItem } from '../../services/storage'
import { Download, Trash2, Users, Utensils, Heart } from 'lucide-vue-next'

const filterSide = ref<'all' | 'groom' | 'bride'>('all')

const filteredList = computed(() => {
  if (filterSide.value === 'all') return rsvpList.value
  return rsvpList.value.filter(r => r.side === filterSide.value)
})

const stats = computed(() => {
  let totalAttendingGuests = 0
  let totalMeals = 0
  let groomGuests = 0
  let brideGuests = 0
  let nonAttending = 0

  rsvpList.value.forEach(r => {
    if (r.isAttending) {
      totalAttendingGuests += (r.guestCount || 1)
      if (r.side === 'groom') groomGuests += (r.guestCount || 1)
      else brideGuests += (r.guestCount || 1)

      if (r.mealNeeded) {
        totalMeals += (r.guestCount || 1)
      }
    } else {
      nonAttending += 1
    }
  })

  return {
    totalResponses: rsvpList.value.length,
    totalAttendingGuests,
    totalMeals,
    groomGuests,
    brideGuests,
    nonAttending
  }
})

const exportCsv = () => {
  if (rsvpList.value.length === 0) {
    alert('다운로드할 참석자 응답 데이터가 없습니다.')
    return
  }

  const header = ['구분', '성함', '참석여부', '동행인원', '식사여부', '연락처', '전하는말씀', '응답일시']
  const rows = rsvpList.value.map(r => [
    r.side === 'groom' ? '신랑측' : '신부측',
    r.guestName,
    r.isAttending ? '참석' : '불참',
    r.isAttending ? `${r.guestCount}명` : '-',
    r.mealNeeded ? '식사함' : '식사안함',
    r.phone || '-',
    `"${(r.message || '').replace(/"/g, '""')}"`,
    new Date(r.createdAt).toLocaleString('ko-KR')
  ])

  const csvContent = '\uFEFF' + [header, ...rows].map(e => e.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `결혼식_참석명단_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleDelete = (id: string) => {
  if (confirm('이 응답을 삭제하시겠습니까?')) {
    deleteRsvpItem(id)
  }
}
</script>

<template>
  <div class="rsvp-viewer font-sans">
    <div class="viewer-header">
      <div>
        <h3 class="viewer-title font-serif">참석 여부 (RSVP) 명단 조회</h3>
        <p class="viewer-desc">하객들의 참석 여부와 식사 인원 현황을 실시간으로 확인합니다.</p>
      </div>

      <button class="btn-secondary export-btn" @click="exportCsv">
        <Download :size="15" />
        <span>엑셀(CSV) 다운로드</span>
      </button>
    </div>

    <!-- Stats Dashboard Cards -->
    <div class="stats-grid">
      <div class="stat-card card-paper">
        <div class="stat-icon-wrap blue">
          <Users :size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-label">총 참석 예정 인원</span>
          <strong class="stat-val">{{ stats.totalAttendingGuests }}명</strong>
          <span class="stat-sub">신랑측 {{ stats.groomGuests }}명 / 신부측 {{ stats.brideGuests }}명</span>
        </div>
      </div>

      <div class="stat-card card-paper">
        <div class="stat-icon-wrap green">
          <Utensils :size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-label">예상 식사 인원</span>
          <strong class="stat-val">{{ stats.totalMeals }}명</strong>
          <span class="stat-sub">식사 보증인원 파악용</span>
        </div>
      </div>

      <div class="stat-card card-paper">
        <div class="stat-icon-wrap rose">
          <Heart :size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-label">마음으로 축하 (불참)</span>
          <strong class="stat-val">{{ stats.nonAttending }}건</strong>
          <span class="stat-sub">총 응답 {{ stats.totalResponses }}건</span>
        </div>
      </div>
    </div>

    <!-- Filter Buttons -->
    <div class="filter-row">
      <div class="filter-buttons">
        <button
          class="filter-btn"
          :class="{ 'active': filterSide === 'all' }"
          @click="filterSide = 'all'"
        >
          전체 ({{ rsvpList.length }})
        </button>
        <button
          class="filter-btn"
          :class="{ 'active': filterSide === 'groom' }"
          @click="filterSide = 'groom'"
        >
          신랑측
        </button>
        <button
          class="filter-btn"
          :class="{ 'active': filterSide === 'bride' }"
          @click="filterSide = 'bride'"
        >
          신부측
        </button>
      </div>
    </div>

    <!-- Responses Table -->
    <div class="table-container card-paper">
      <table class="rsvp-table">
        <thead>
          <tr>
            <th>구분</th>
            <th>성함</th>
            <th>참석</th>
            <th>인원</th>
            <th>식사</th>
            <th>연락처</th>
            <th>축하 메시지</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredList" :key="item.id">
            <td>
              <span class="side-pill" :class="item.side">
                {{ item.side === 'groom' ? '신랑측' : '신부측' }}
              </span>
            </td>
            <td><strong>{{ item.guestName }}</strong></td>
            <td>
              <span class="status-badge" :class="item.isAttending ? 'attending' : 'absent'">
                {{ item.isAttending ? '참석' : '불참' }}
              </span>
            </td>
            <td>{{ item.isAttending ? `${item.guestCount}명` : '-' }}</td>
            <td>
              <span v-if="item.isAttending" class="meal-badge" :class="item.mealNeeded ? 'yes' : 'no'">
                {{ item.mealNeeded ? '식사함' : '식사안함' }}
              </span>
              <span v-else>-</span>
            </td>
            <td>{{ item.phone || '-' }}</td>
            <td class="msg-col" :title="item.message">{{ item.message || '-' }}</td>
            <td>
              <button class="row-delete-btn" @click="handleDelete(item.id)">
                <Trash2 :size="14" />
              </button>
            </td>
          </tr>
          <tr v-if="filteredList.length === 0">
            <td colspan="8" class="empty-cell">제출된 참석 의사가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.rsvp-viewer {
  padding: 24px 0;
}

.viewer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.viewer-title {
  font-size: 20px;
  color: var(--text-main);
  margin-bottom: 4px;
}

.viewer-desc {
  font-size: 13px;
  color: var(--text-sub);
}

.export-btn {
  font-size: 13px;
  padding: 9px 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap.blue {
  background: #E8EFF8;
  color: #3A69A8;
}

.stat-icon-wrap.green {
  background: #E6F4EA;
  color: #137333;
}

.stat-icon-wrap.rose {
  background: #FCE8E6;
  color: #C5221F;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-val {
  font-size: 22px;
  color: var(--text-main);
  font-weight: 700;
  line-height: 1.2;
}

.stat-sub {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 2px;
}

.filter-row {
  margin-bottom: 12px;
}

.filter-buttons {
  display: flex;
  gap: 6px;
}

.filter-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: #FFFFFF;
  color: var(--text-sub);
  font-size: 12px;
  cursor: pointer;
}

.filter-btn.active {
  background: var(--gold-primary);
  border-color: var(--gold-primary);
  color: #FFFFFF;
  font-weight: 600;
}

.table-container {
  padding: 0;
  overflow-x: auto;
}

.rsvp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.rsvp-table th {
  background: var(--bg-ivory);
  padding: 12px 14px;
  color: var(--text-sub);
  font-weight: 600;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}

.rsvp-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-main);
  white-space: nowrap;
}

.msg-col {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-sub);
}

.side-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.side-pill.groom {
  background: #E8EFF8;
  color: #3A69A8;
}

.side-pill.bride {
  background: #F8ECE8;
  color: #B85848;
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-badge.attending {
  background: #E6F4EA;
  color: #137333;
}

.status-badge.absent {
  background: #F1F3F4;
  color: #5F6368;
}

.meal-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.meal-badge.yes {
  background: #FEF7E0;
  color: #B06000;
}

.meal-badge.no {
  background: #F1F3F4;
  color: #70757A;
}

.row-delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.row-delete-btn:hover {
  color: var(--rose-accent);
}

.empty-cell {
  text-align: center;
  padding: 36px 0;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .viewer-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .export-btn {
    width: 100%;
    justify-content: center;
  }
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .filter-buttons {
    flex-wrap: wrap;
  }
}
</style>
