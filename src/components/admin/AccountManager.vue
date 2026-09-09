<script setup lang="ts">
import { ref } from 'vue'
import { accounts } from '../../services/storage'
import type { AccountItem } from '../../types/wedding'
import { Plus, Trash2, Edit3, Check, X } from 'lucide-vue-next'

const newAccount = ref<Omit<AccountItem, 'id'>>({
  side: 'groom',
  title: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  kakaoPayUrl: ''
})

// Edit state
const editingId = ref<string | null>(null)
const editForm = ref<AccountItem>({
  id: '',
  side: 'groom',
  title: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  kakaoPayUrl: ''
})

const handleAddAccount = () => {
  if (!newAccount.value.title.trim() || !newAccount.value.accountNumber.trim()) {
    alert('구분 명칭과 계좌번호를 입력해 주세요.')
    return
  }

  accounts.value.push({
    ...newAccount.value,
    id: 'acc_' + Date.now()
  })

  newAccount.value = {
    side: 'groom',
    title: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    kakaoPayUrl: ''
  }
}

const startEdit = (item: AccountItem) => {
  editingId.value = item.id
  editForm.value = { ...item }
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = () => {
  if (!editForm.value.title.trim() || !editForm.value.accountNumber.trim()) {
    alert('구분 명칭과 계좌번호를 입력해 주세요.')
    return
  }

  const idx = accounts.value.findIndex(a => a.id === editingId.value)
  if (idx !== -1) {
    accounts.value[idx] = { ...editForm.value }
  }
  editingId.value = null
}

const handleDeleteAccount = (id: string) => {
  if (confirm('이 계좌를 삭제하시겠습니까?')) {
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx !== -1) accounts.value.splice(idx, 1)
  }
}
</script>

<template>
  <div class="account-manager font-sans">
    <div class="manager-header">
      <div>
        <h3 class="manager-title font-serif">마음 전하실 곳 (계좌번호) 관리</h3>
        <p class="manager-desc">신랑/신부 및 혼주 계좌번호와 카카오페이 송금 링크를 등록하거나 수정할 수 있습니다.</p>
      </div>
    </div>

    <!-- Add New Account Form -->
    <div class="card-paper add-box">
      <h4 class="box-title font-serif">새 계좌번호 추가</h4>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">구분 측</label>
          <select v-model="newAccount.side" class="input-field">
            <option value="groom">신랑</option>
            <option value="groomParents">신랑 혼주</option>
            <option value="bride">신부</option>
            <option value="brideParents">신부 혼주</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">표시 타이틀</label>
          <input
            v-model="newAccount.title"
            type="text"
            placeholder="예: 신랑 경주원 / 신랑 혼주 (부)"
            class="input-field"
          />
        </div>

        <div class="form-group">
          <label class="form-label">은행명</label>
          <input
            v-model="newAccount.bankName"
            type="text"
            placeholder="예: 우리은행"
            class="input-field"
          />
        </div>

        <div class="form-group">
          <label class="form-label">계좌번호</label>
          <input
            v-model="newAccount.accountNumber"
            type="text"
            placeholder="예: 1002-000-000000"
            class="input-field"
          />
        </div>

        <div class="form-group">
          <label class="form-label">예금주 성함</label>
          <input
            v-model="newAccount.accountHolder"
            type="text"
            placeholder="예: 경주원"
            class="input-field"
          />
        </div>

        <div class="form-group">
          <label class="form-label">카카오페이 송금 링크 (선택)</label>
          <input
            v-model="newAccount.kakaoPayUrl"
            type="url"
            placeholder="https://qr.kakaopay.com/..."
            class="input-field"
          />
        </div>
      </div>

      <button class="btn-primary add-btn" @click="handleAddAccount">
        <Plus :size="15" />
        <span>계좌 추가하기</span>
      </button>
    </div>

    <!-- Existing Accounts List -->
    <div class="accounts-list">
      <div v-for="item in accounts" :key="item.id" class="account-item-card card-paper">
        <!-- View Mode -->
        <div v-if="editingId !== item.id" class="item-view-row">
          <div class="item-main">
            <div class="side-badge-row">
              <span
                class="side-tag"
                :class="item.side.startsWith('groom') ? 'groom' : 'bride'"
              >
                {{ item.side.startsWith('groom') ? '신랑측' : '신부측' }}
              </span>
              <strong class="item-title">{{ item.title }}</strong>
              <span class="item-holder">({{ item.accountHolder }})</span>
            </div>

            <div class="account-num-text">
              <strong>{{ item.bankName }}</strong> {{ item.accountNumber }}
            </div>

            <div v-if="item.kakaoPayUrl" class="kakaopay-link-text">
              카카오페이 링크 등록됨
            </div>
          </div>

          <div class="card-action-btns">
            <!-- Edit Button -->
            <button class="edit-btn" @click="startEdit(item)" title="계좌 정보 수정">
              <Edit3 :size="14" />
              <span>수정</span>
            </button>

            <!-- Delete Button -->
            <button class="delete-btn" @click="handleDeleteAccount(item.id)" title="계좌 삭제">
              <Trash2 :size="14" />
              <span>삭제</span>
            </button>
          </div>
        </div>

        <!-- Inline Edit Mode -->
        <div v-else class="item-edit-mode">
          <h5 class="edit-mode-title">계좌 정보 수정</h5>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">구분 측</label>
              <select v-model="editForm.side" class="input-field">
                <option value="groom">신랑</option>
                <option value="groomParents">신랑 혼주</option>
                <option value="bride">신부</option>
                <option value="brideParents">신부 혼주</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">표시 타이틀</label>
              <input v-model="editForm.title" type="text" class="input-field" />
            </div>

            <div class="form-group">
              <label class="form-label">은행명</label>
              <input v-model="editForm.bankName" type="text" class="input-field" />
            </div>

            <div class="form-group">
              <label class="form-label">계좌번호</label>
              <input v-model="editForm.accountNumber" type="text" class="input-field" />
            </div>

            <div class="form-group">
              <label class="form-label">예금주 성함</label>
              <input v-model="editForm.accountHolder" type="text" class="input-field" />
            </div>

            <div class="form-group">
              <label class="form-label">카카오페이 송금 링크</label>
              <input v-model="editForm.kakaoPayUrl" type="url" class="input-field" />
            </div>
          </div>

          <div class="edit-action-bar">
            <button class="btn-primary save-btn" @click="saveEdit">
              <Check :size="14" />
              <span>수정 완료</span>
            </button>
            <button class="btn-secondary cancel-btn" @click="cancelEdit">
              <X :size="14" />
              <span>취소</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-manager {
  padding: 24px 0;
}

.manager-header {
  margin-bottom: 24px;
}

.manager-title {
  font-size: 20px;
  color: var(--text-main);
  margin-bottom: 4px;
}

.manager-desc {
  font-size: 13px;
  color: var(--text-sub);
}

.add-box {
  padding: 20px;
  margin-bottom: 24px;
  background: var(--bg-ivory);
}

.box-title {
  font-size: 15px;
  color: var(--text-main);
  margin-bottom: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-sub);
}

.input-field {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  background: #FFFFFF;
  outline: none;
}

.input-field:focus {
  border-color: var(--gold-primary);
}

.add-btn {
  font-size: 13px;
  padding: 9px 18px;
}

.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.account-item-card {
  padding: 16px 20px;
  transition: all 0.2s ease;
}

.item-view-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.item-main {
  flex: 1;
}

.side-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.side-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.side-tag.groom {
  background: #E8EFF8;
  color: #3A69A8;
}

.side-tag.bride {
  background: #F8ECE8;
  color: #B85848;
}

.item-title {
  font-size: 14px;
  color: var(--text-main);
}

.item-holder {
  font-size: 12px;
  color: var(--text-muted);
}

.account-num-text {
  font-size: 13px;
  color: var(--text-sub);
}

.kakaopay-link-text {
  font-size: 11px;
  color: #C28E00;
  margin-top: 2px;
}

.card-action-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

.edit-btn {
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

.edit-btn:hover {
  background: var(--bg-subtle);
  color: var(--gold-primary);
  border-color: var(--gold-primary);
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

/* Edit Mode Styles */
.item-edit-mode {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-mode-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--gold-primary);
  margin-bottom: 4px;
}

.edit-action-bar {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}

.save-btn {
  font-size: 12px;
  padding: 8px 16px;
}

.cancel-btn {
  font-size: 12px;
  padding: 8px 14px;
}
</style>
