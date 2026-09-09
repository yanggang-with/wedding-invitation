<script setup lang="ts">
import { ref, computed } from 'vue'
import { weddingInfo, formatWeddingDate } from '../../services/storage'
import { Save, Check, Calendar, Eye } from 'lucide-vue-next'

const savedNotice = ref(false)

const DATE_FORMAT_PRESETS = [
  { label: '2026년 12월 12일 토요일 오후 6시', value: 'YYYY년 M월 D일 dddd A h시' },
  { label: '2026년 12월 12일 토요일 오후 6시 00분', value: 'YYYY년 M월 D일 dddd A h시 mm분' },
  { label: '2026년 12월 12일 (토) 오후 6시', value: 'YYYY년 M월 D일 (ddd) A h시' },
  { label: '2026. 12. 12. (토) 18:00', value: 'YYYY. MM. DD. (ddd) HH:mm' },
  { label: '2026 / 12 / 12 (토) PM 06:00', value: 'YYYY / MM / DD (ddd) a hh:mm' },
  { label: '직접 형식 지정 (사용자 정의)', value: 'CUSTOM' }
]

// Ensure default dateFormat is set
if (!weddingInfo.value.dateFormat) {
  weddingInfo.value.dateFormat = 'YYYY년 M월 D일 dddd A h시'
}

const formattedDatePreview = computed(() => {
  return formatWeddingDate(
    weddingInfo.value.date,
    weddingInfo.value.dateFormat,
    weddingInfo.value.customDateFormat
  )
})

const handleSave = () => {
  savedNotice.value = true
  setTimeout(() => {
    savedNotice.value = false
  }, 2500)
}
</script>

<template>
  <div class="info-editor font-sans">
    <div class="editor-header">
      <div>
        <h3 class="editor-title font-serif">예식 정보 &amp; 문구 편집</h3>
        <p class="editor-desc">청첩장에 표기될 기본 정보와 모시는 글을 수정합니다.</p>
      </div>

      <button class="btn-primary save-btn" @click="handleSave">
        <Check v-if="savedNotice" :size="16" />
        <Save v-else :size="16" />
        <span>{{ savedNotice ? '저장 완료!' : '변경사항 저장' }}</span>
      </button>
    </div>

    <div class="editor-sections">
      <!-- 1. Date and Venue Section -->
      <div class="card-paper form-block">
        <h4 class="block-title font-serif">1. 예식 일시 및 장소</h4>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">
              <Calendar :size="13" class="inline-icon" />
              <span>예식 일시</span>
            </label>
            <input
              v-model="weddingInfo.date"
              type="datetime-local"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">날짜 표기 형식 선택</label>
            <select
              v-model="weddingInfo.dateFormat"
              class="input-field select-field"
            >
              <option
                v-for="preset in DATE_FORMAT_PRESETS"
                :key="preset.value"
                :value="preset.value"
              >
                {{ preset.label }}
              </option>
            </select>
          </div>

          <!-- Custom Format Input if CUSTOM selected -->
          <div v-if="weddingInfo.dateFormat === 'CUSTOM'" class="form-group full custom-format-box">
            <label class="form-label">사용자 정의 날짜 포맷</label>
            <input
              v-model="weddingInfo.customDateFormat"
              type="text"
              placeholder="예: YYYY년 M월 D일 dddd A h시 (사용 가능 토큰: YYYY, MM, M, DD, D, dddd, ddd, A, a, HH, H, hh, h, mm)"
              class="input-field"
            />
            <p class="format-help">
              * 사용 가능 토큰: <code>YYYY</code>(년), <code>MM</code>/<code>M</code>(월), <code>DD</code>/<code>D</code>(일), <code>dddd</code>/<code>ddd</code>(요일), <code>A</code>/<code>a</code>(오전/오후), <code>hh</code>/<code>h</code>(12시간제), <code>HH</code>/<code>H</code>(24시간제), <code>mm</code>(분)
            </p>
          </div>

          <!-- Date Preview Box -->
          <div class="form-group full date-preview-box">
            <div class="preview-inner">
              <Eye :size="14" class="preview-icon" />
              <span class="preview-label">청첩장 노출 날짜 미리보기:</span>
              <strong class="preview-text">{{ formattedDatePreview }}</strong>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">예식장 이름</label>
            <input
              v-model="weddingInfo.venue.name"
              type="text"
              placeholder="예: 그랜드 힐 컨벤션"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">홀 이름 / 층수</label>
            <input
              v-model="weddingInfo.venue.hall"
              type="text"
              placeholder="예: 3층 그랜드볼룸홀"
              class="input-field"
            />
          </div>

          <div class="form-group full">
            <label class="form-label">예식장 도로명 주소</label>
            <input
              v-model="weddingInfo.venue.address"
              type="text"
              placeholder="예: 서울특별시 강남구 역삼로 607"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">상세 위치 안내</label>
            <input
              v-model="weddingInfo.venue.addressDetail"
              type="text"
              placeholder="예: 삼성역 1번 출구 도보 5분"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">예식장 대표 번호</label>
            <input
              v-model="weddingInfo.venue.tel"
              type="text"
              placeholder="예: 02-555-1234"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">위도 (Latitude)</label>
            <input
              v-model.number="weddingInfo.venue.mapLat"
              type="number"
              step="0.0001"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">경도 (Longitude)</label>
            <input
              v-model.number="weddingInfo.venue.mapLng"
              type="number"
              step="0.0001"
              class="input-field"
            />
          </div>

          <div class="form-group full">
            <label class="form-label">지하철 이용 안내</label>
            <input
              v-model="weddingInfo.venue.subwayInfo"
              type="text"
              class="input-field"
            />
          </div>

          <div class="form-group full">
            <label class="form-label">버스 이용 안내</label>
            <input
              v-model="weddingInfo.venue.busInfo"
              type="text"
              class="input-field"
            />
          </div>

          <div class="form-group full">
            <label class="form-label">주차 안내</label>
            <input
              v-model="weddingInfo.venue.parkingInfo"
              type="text"
              class="input-field"
            />
          </div>
        </div>
      </div>

      <!-- 2. Couple & Parents Information -->
      <div class="card-paper form-block">
        <h4 class="block-title font-serif">2. 신랑 / 신부 및 혼주 정보</h4>

        <!-- Groom Side -->
        <div class="sub-block">
          <h5 class="sub-block-title groom">신랑측 정보</h5>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">신랑 성함</label>
              <input v-model="weddingInfo.groom.name" type="text" class="input-field" />
            </div>
            <div class="form-group">
              <label class="form-label">신랑 연락처</label>
              <input v-model="weddingInfo.groom.phone" type="text" class="input-field" />
            </div>
            <div class="form-group">
              <label class="form-label">서열 (호칭)</label>
              <input v-model="weddingInfo.groom.relationRole" type="text" placeholder="장남, 차남 등" class="input-field" />
            </div>
            <div class="form-group">
              <label class="form-label">신랑 아버지 성함</label>
              <input v-model="weddingInfo.groom.fatherName" type="text" class="input-field" />
            </div>
            <div class="form-group">
              <label class="form-label">신랑 어머니 성함</label>
              <input v-model="weddingInfo.groom.motherName" type="text" class="input-field" />
            </div>
            <div class="form-group deceased-checks">
              <label class="checkbox-label">
                <input v-model="weddingInfo.groom.isFatherDeceased" type="checkbox" />
                <span>아버지 故 표기</span>
              </label>
              <label class="checkbox-label">
                <input v-model="weddingInfo.groom.isMotherDeceased" type="checkbox" />
                <span>어머니 故 표기</span>
              </label>
            </div>
          </div>
        </div>

        <hr class="block-divider" />

        <!-- Bride Side -->
        <div class="sub-block">
          <h5 class="sub-block-title bride">신부측 정보</h5>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">신부 성함</label>
              <input v-model="weddingInfo.bride.name" type="text" class="input-field" />
            </div>
            <div class="form-group">
              <label class="form-label">신부 연락처</label>
              <input v-model="weddingInfo.bride.phone" type="text" class="input-field" />
            </div>
            <div class="form-group">
              <label class="form-label">서열 (호칭)</label>
              <input v-model="weddingInfo.bride.relationRole" type="text" placeholder="장녀, 차녀 등" class="input-field" />
            </div>
            <div class="form-group">
              <label class="form-label">신부 아버지 성함</label>
              <input v-model="weddingInfo.bride.fatherName" type="text" class="input-field" />
            </div>
            <div class="form-group">
              <label class="form-label">신부 어머니 성함</label>
              <input v-model="weddingInfo.bride.motherName" type="text" class="input-field" />
            </div>
            <div class="form-group deceased-checks">
              <label class="checkbox-label">
                <input v-model="weddingInfo.bride.isFatherDeceased" type="checkbox" />
                <span>아버지 故 표기</span>
              </label>
              <label class="checkbox-label">
                <input v-model="weddingInfo.bride.isMotherDeceased" type="checkbox" />
                <span>어머니 故 표기</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Greeting Section -->
      <div class="card-paper form-block">
        <h4 class="block-title font-serif">3. 모시는 글 &amp; 초대 문구</h4>

        <div class="form-grid">
          <div class="form-group full">
            <label class="form-label">초대 제목</label>
            <input v-model="weddingInfo.greeting.title" type="text" class="input-field" />
          </div>

          <div class="form-group full">
            <label class="form-label">서브 인용구 / 시 구절 (선택)</label>
            <input v-model="weddingInfo.greeting.subQuote" type="text" class="input-field" />
          </div>

          <div class="form-group full">
            <label class="form-label">초대 본문 문구</label>
            <textarea
              v-model="weddingInfo.greeting.content"
              rows="6"
              class="input-field textarea"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- 4. BGM Settings -->
      <div class="card-paper form-block">
        <h4 class="block-title font-serif">4. 배경음악 (BGM)</h4>

        <div class="form-grid">
          <div class="form-group full">
            <label class="form-label">음원 파일 웹 URL (.mp3)</label>
            <input
              v-model="weddingInfo.bgmUrl"
              type="url"
              placeholder="https://.../music.mp3"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">음악 곡명</label>
            <input
              v-model="weddingInfo.bgmTitle"
              type="text"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label" style="margin-top: 26px;">
              <input v-model="weddingInfo.bgmAutoPlay" type="checkbox" />
              <span>접속 시 자동 재생 시도</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-editor {
  padding: 24px 0;
}

.editor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.editor-title {
  font-size: 20px;
  color: var(--text-main);
  margin-bottom: 4px;
}

.editor-desc {
  font-size: 13px;
  color: var(--text-sub);
}

.save-btn {
  font-size: 13px;
  padding: 10px 20px;
}

.editor-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-block {
  padding: 24px;
}

.block-title {
  font-size: 16px;
  color: var(--text-main);
  font-weight: 700;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

.input-field {
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  color: var(--text-main);
  outline: none;
}

.input-field:focus {
  border-color: var(--gold-primary);
}

.textarea {
  line-height: 1.6;
}

.sub-block-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.sub-block-title.groom {
  color: #3A69A8;
}

.sub-block-title.bride {
  color: #B85848;
}

.block-divider {
  border: none;
  border-top: 1px dashed var(--border-light);
  margin: 20px 0;
}

.deceased-checks {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-sub);
  cursor: pointer;
}

.inline-icon {
  display: inline;
  vertical-align: -2px;
  margin-right: 4px;
}

.select-field {
  cursor: pointer;
  background-color: #FFFFFF;
}

.custom-format-box {
  background: var(--bg-warm);
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}

.format-help {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-top: 4px;
}

.format-help code {
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: monospace;
  color: var(--gold-dark);
}

.date-preview-box {
  background: var(--gold-soft);
  border: 1px solid var(--gold-light);
  border-radius: 8px;
  padding: 10px 14px;
}

.preview-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--gold-dark);
}

.preview-icon {
  flex-shrink: 0;
  color: var(--gold-primary);
}

.preview-label {
  font-weight: 500;
  color: var(--text-sub);
  font-size: 12px;
}

.preview-text {
  color: var(--gold-dark);
  font-weight: 600;
}
</style>
