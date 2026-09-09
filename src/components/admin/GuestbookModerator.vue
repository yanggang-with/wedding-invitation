<script setup lang="ts">
import { guestbook, deleteGuestbookEntry } from '../../services/storage'
import type { GuestbookItem } from '../../types/wedding'
import { Trash2, MessageSquare, Heart, Eye, EyeOff } from 'lucide-vue-next'

const handleDelete = (id: string) => {
  if (confirm('이 축하 메시지를 완전히 삭제하시겠습니까?')) {
    deleteGuestbookEntry(id, undefined, true)
  }
}

const toggleVisibility = (entry: GuestbookItem) => {
  entry.isHidden = !entry.isHidden
}
</script>

<template>
  <div class="guestbook-moderator font-sans">
    <div class="moderator-header">
      <div>
        <h3 class="moderator-title font-serif">방명록 관리</h3>
        <p class="moderator-desc">
          하객들이 남긴 축하 메시지를 확인하고, 보이기/숨기기 토글 또는 삭제할 수 있습니다. (총 {{ guestbook.length }}건)
        </p>
      </div>
    </div>

    <div class="messages-list">
      <div
        v-for="entry in guestbook"
        :key="entry.id"
        class="card-paper message-card"
        :class="{ 'is-hidden': entry.isHidden }"
      >
        <div class="card-header">
          <div class="author-info">
            <Heart :size="14" class="heart-icon" />
            <strong class="author-name">{{ entry.author }}</strong>
            <span class="created-at">{{ new Date(entry.createdAt).toLocaleString('ko-KR') }}</span>
            <span v-if="entry.isHidden" class="hidden-badge">숨김 처리됨 (청첩장 미노출)</span>
            <span v-else class="visible-badge">공개 중</span>
          </div>

          <div class="action-buttons">
            <!-- Toggle Visibility Button -->
            <button
              class="toggle-visibility-btn"
              :class="{ 'show-action': entry.isHidden }"
              @click="toggleVisibility(entry)"
              :title="entry.isHidden ? '청첩장에 다시 보이기' : '청첩장에서 숨기기'"
            >
              <Eye v-if="entry.isHidden" :size="14" />
              <EyeOff v-else :size="14" />
              <span>{{ entry.isHidden ? '보이기' : '숨기기' }}</span>
            </button>

            <!-- Delete Button -->
            <button class="delete-btn" @click="handleDelete(entry.id)" title="메시지 삭제">
              <Trash2 :size="14" />
              <span>삭제</span>
            </button>
          </div>
        </div>

        <p class="message-text">{{ entry.message }}</p>
      </div>

      <div v-if="guestbook.length === 0" class="empty-state card-paper">
        <MessageSquare :size="36" class="empty-icon" />
        <p>작성된 방명록 글이 없습니다.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guestbook-moderator {
  padding: 24px 0;
}

.moderator-header {
  margin-bottom: 24px;
}

.moderator-title {
  font-size: 20px;
  color: var(--text-main);
  margin-bottom: 4px;
}

.moderator-desc {
  font-size: 13px;
  color: var(--text-sub);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-card {
  padding: 18px 20px;
  transition: all 0.2s ease;
}

.message-card.is-hidden {
  background-color: #F8F7F5;
  border-color: #E2DDD5;
  opacity: 0.85;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.heart-icon {
  color: var(--rose-accent);
}

.author-name {
  font-size: 15px;
  color: var(--text-main);
}

.created-at {
  font-size: 12px;
  color: var(--text-muted);
}

.visible-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #E6F4EA;
  color: #137333;
  font-weight: 600;
}

.hidden-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #FCE8E6;
  color: #C5221F;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle-visibility-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #FFFFFF;
  border: 1px solid var(--border-color);
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-visibility-btn:hover {
  background: var(--bg-subtle);
  color: var(--text-main);
}

.toggle-visibility-btn.show-action {
  background: #E6F4EA;
  border-color: #A8DAB5;
  color: #137333;
  font-weight: 600;
}

.toggle-visibility-btn.show-action:hover {
  background: #CEEAD6;
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--border-color);
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--rose-accent);
  cursor: pointer;
  transition: all 0.15s;
}

.delete-btn:hover {
  background: #FEECEB;
  border-color: #F8B4B0;
}

.message-text {
  font-size: 14px;
  color: var(--text-sub);
  line-height: 1.6;
  white-space: pre-line;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  color: var(--border-color);
}
</style>
