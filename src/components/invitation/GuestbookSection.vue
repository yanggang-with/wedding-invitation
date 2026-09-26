<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { guestbook, addGuestbookEntry, deleteGuestbookEntry } from '../../services/storage'
import { checkProfanity } from '../../utils/filter'
import { Send, Trash2, Heart, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const author = ref('')
const password = ref('')
const message = ref('')
const isSubmitting = ref(false)

const ITEMS_PER_PAGE = 3
const currentPage = ref(1)

const visibleGuestbook = computed(() => {
  return guestbook.value.filter(entry => !entry.isHidden)
})

const totalPages = computed(() => {
  return Math.ceil(visibleGuestbook.value.length / ITEMS_PER_PAGE) || 1
})

const paginatedGuestbook = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return visibleGuestbook.value.slice(start, start + ITEMS_PER_PAGE)
})

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) {
    currentPage.value = Math.max(1, newTotal)
  }
})

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

const handleAddComment = () => {
  if (!author.value.trim() || !message.value.trim()) {
    alert('작성자 성함과 축하 메시지를 모두 입력해 주세요.')
    return
  }

  // 비속어 및 악담 필터링 검사
  const combinedText = `${author.value} ${message.value}`
  const profanityResult = checkProfanity(combinedText)
  if (profanityResult.containsProfanity) {
    alert('따뜻한 축하의 마음을 담아 바르고 고운 말을 사용해 주세요. (부적절하거나 비방하는 단어가 감지되었습니다.)')
    return
  }

  isSubmitting.value = true
  try {
    addGuestbookEntry({
      author: author.value.trim(),
      password: password.value.trim() || '1234',
      message: message.value.trim()
    })
    author.value = ''
    password.value = ''
    message.value = ''
    currentPage.value = 1
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = (id: string) => {
  const inputPass = prompt('작성 시 입력했던 비밀번호를 입력해 주세요:')
  if (inputPass === null) return

  const success = deleteGuestbookEntry(id, inputPass)
  if (success) {
    alert('메시지가 삭제되었습니다.')
  } else {
    alert('비밀번호가 일치하지 않습니다.')
  }
}

const formatDate = (isoString: string) => {
  try {
    const d = new Date(isoString)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const date = String(d.getDate()).padStart(2, '0')
    return `${month}.${date}`
  } catch {
    return ''
  }
}
</script>

<template>
  <section class="invitation-section guestbook-section">
    <div class="section-divider">
      <span class="section-label">GUESTBOOK</span>
    </div>

    <h2 class="section-title font-serif">축하의 한마디</h2>
    <p class="section-subtitle font-serif">두 사람의 앞날을 축복하는 따뜻한 마음을 남겨주세요</p>

    <!-- Write Guestbook Form Card -->
    <div class="card-paper write-card font-sans">
      <form @submit.prevent="handleAddComment">
        <div class="form-row">
          <input
            v-model="author"
            type="text"
            placeholder="작성자 성함"
            class="input-field half"
            maxlength="20"
            required
          />
          <input
            v-model="password"
            type="password"
            placeholder="비밀번호 4자리"
            class="input-field half"
            maxlength="10"
          />
        </div>

        <textarea
          v-model="message"
          rows="3"
          placeholder="따뜻한 축하의 메시지를 남겨주세요."
          class="input-field textarea"
          maxlength="300"
          required
        ></textarea>

        <button type="submit" class="btn-primary submit-btn" :disabled="isSubmitting">
          <Send :size="14" />
          <span>축하 메시지 남기기</span>
        </button>
      </form>
    </div>

    <!-- Messages List Feed -->
    <div class="guestbook-feed font-sans">
      <div v-for="entry in paginatedGuestbook" :key="entry.id" class="comment-card">
        <div class="comment-header">
          <div class="author-wrap">
            <Heart :size="13" class="heart-icon" />
            <strong class="author-name">{{ entry.author }}</strong>
            <span class="comment-date">{{ formatDate(entry.createdAt) }}</span>
          </div>

          <button
            class="delete-btn"
            @click="handleDelete(entry.id)"
            title="메시지 삭제"
            aria-label="메시지 삭제"
          >
            <Trash2 :size="13" />
          </button>
        </div>

        <p class="comment-body">{{ entry.message }}</p>
      </div>

      <div v-if="visibleGuestbook.length === 0" class="empty-guestbook">
        <p>첫 번째 축하 메시지를 남겨주세요!</p>
      </div>

      <!-- Pagination Controls -->
      <div v-if="totalPages > 1" class="pagination-wrap font-sans">
        <button
          type="button"
          class="page-nav-btn"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
          aria-label="이전 페이지"
        >
          <ChevronLeft :size="16" />
        </button>

        <div class="page-numbers">
          <button
            v-for="p in totalPages"
            :key="p"
            type="button"
            class="page-num-btn"
            :class="{ active: p === currentPage }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
        </div>

        <button
          type="button"
          class="page-nav-btn"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
          aria-label="다음 페이지"
        >
          <ChevronRight :size="16" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.guestbook-section {
  background-color: var(--section-bg, #FFFFFF);
  transition: background-color 0.3s ease;
}

.write-card {
  margin-top: 24px;
  padding: 20px 18px;
  text-align: left;
  background: var(--card-bg, #FFFFFF);
  border: 1px solid var(--border-light);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  background: var(--input-bg, var(--bg-ivory));
  color: var(--text-main);
  outline: none;
  transition: background-color 0.3s ease, border-color 0.2s ease;
}

.input-field.half {
  flex: 1;
}

.input-field:focus {
  border-color: var(--gold-primary);
  background: #FFFFFF;
}

.textarea {
  resize: vertical;
  min-height: 68px;
  margin-bottom: 12px;
}

.submit-btn {
  width: 100%;
  padding: 11px 0;
  font-size: 13px;
}

/* Feed */
.guestbook-feed {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.comment-card {
  background: var(--card-bg, var(--bg-ivory));
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.author-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.heart-icon {
  color: var(--rose-accent);
}

.author-name {
  font-size: 14px;
  color: var(--text-main);
}

.comment-date {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 4px;
}

.delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  transition: color 0.15s;
}

.delete-btn:hover {
  color: var(--rose-accent);
}

.comment-body {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.6;
  white-space: pre-line;
}

.empty-guestbook {
  text-align: center;
  padding: 30px 0;
  color: var(--text-muted);
  font-size: 13px;
}

/* Pagination */
.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
  padding-top: 6px;
}

.page-nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--bg-ivory);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-nav-btn:hover:not(:disabled) {
  border-color: var(--gold-primary);
  color: var(--gold-dark);
  background: #FFFFFF;
}

.page-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-num-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-sub);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-num-btn:hover {
  background: var(--bg-ivory);
  color: var(--gold-dark);
}

.page-num-btn.active {
  background: var(--gold-dark, #A88350);
  color: #FFFFFF;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(168, 131, 80, 0.25);
}
</style>
