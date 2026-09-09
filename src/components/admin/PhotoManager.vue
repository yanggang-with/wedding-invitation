<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  photos,
  uploadImage,
  addPhotoItem,
  deletePhotoItem,
  setCoverPhotoItem,
  updatePhotoItem,
  reorderPhotos
} from '../../services/storage'
import type { PhotoItem } from '../../types/wedding'
import {
  UploadCloud,
  Trash2,
  Star,
  Plus,
  Image as ImageIcon,
  Check,
  X,
  Edit3,
  GripVertical,
  RefreshCw
} from 'lucide-vue-next'

const fileInputRef = ref<HTMLInputElement | null>(null)
const replaceFileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const uploadProgressText = ref('')
const urlInput = ref('')
const urlCaption = ref('')
const showUrlModal = ref(false)

// Edit Modal State
const isEditModalOpen = ref(false)
const editingPhoto = ref<PhotoItem | null>(null)
const editForm = ref({
  id: '',
  url: '',
  caption: '',
  isCover: false
})
const isReplacingImage = ref(false)

// Drag and Drop State
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const sortedPhotos = computed(() => {
  return [...photos.value].sort((a, b) => a.order - b.order)
})

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const files = Array.from(target.files)
  isUploading.value = true

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      uploadProgressText.value = `사진 업로드 중 (${i + 1}/${files.length}): ${file.name}`
      const url = await uploadImage(file)
      addPhotoItem({
        url,
        caption: '',
        isCover: photos.value.length === 0
      })
    }
  } catch (err) {
    console.error('File upload error:', err)
    alert('사진 업로드 중 오류가 발생했습니다.')
  } finally {
    isUploading.value = false
    uploadProgressText.value = ''
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const handleAddByUrl = () => {
  if (!urlInput.value.trim()) return
  addPhotoItem({
    url: urlInput.value.trim(),
    caption: urlCaption.value.trim(),
    isCover: photos.value.length === 0
  })
  urlInput.value = ''
  urlCaption.value = ''
  showUrlModal.value = false
}

const handleDelete = (id: string) => {
  if (confirm('이 사진을 정말 삭제하시겠습니까?')) {
    deletePhotoItem(id)
  }
}

const handleSetCover = (id: string) => {
  setCoverPhotoItem(id)
}

// Edit Modal Handlers
const openEditModal = (photo: PhotoItem) => {
  editingPhoto.value = photo
  editForm.value = {
    id: photo.id,
    url: photo.url,
    caption: photo.caption || '',
    isCover: !!photo.isCover
  }
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  editingPhoto.value = null
  isReplacingImage.value = false
}

const handleReplaceFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  isReplacingImage.value = true
  try {
    const newUrl = await uploadImage(file)
    editForm.value.url = newUrl
  } catch (err) {
    console.error('Replace image error:', err)
    alert('사진 교체 중 오류가 발생했습니다.')
  } finally {
    isReplacingImage.value = false
    if (replaceFileInputRef.value) replaceFileInputRef.value.value = ''
  }
}

const saveEditModal = () => {
  if (!editForm.value.url.trim()) {
    alert('이미지 주소 또는 사진을 등록해주세요.')
    return
  }
  updatePhotoItem(editForm.value.id, {
    url: editForm.value.url.trim(),
    caption: editForm.value.caption.trim(),
    isCover: editForm.value.isCover
  })
  if (editForm.value.isCover) {
    setCoverPhotoItem(editForm.value.id)
  }
  closeEditModal()
}

// Drag & Drop Reordering Handlers
const handleDragStart = (index: number, e: DragEvent) => {
  draggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

const handleDragLeave = (index: number) => {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null
  }
}

const handleDrop = (targetIndex: number) => {
  if (draggedIndex.value !== null && draggedIndex.value !== targetIndex) {
    reorderPhotos(draggedIndex.value, targetIndex)
  }
  draggedIndex.value = null
  dragOverIndex.value = null
}

const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div class="photo-manager font-sans">
    <div class="manager-header">
      <div>
        <h3 class="manager-title font-serif">웨딩 사진 관리</h3>
        <p class="manager-desc">
          청첩장에 노출될 사진을 관리합니다. 사진을 드래그하여 3x3 그리드 순서를 자유롭게 변경할 수 있습니다. (현재 {{ photos.length }}장)
        </p>
      </div>

      <div class="header-actions">
        <button class="btn-secondary add-url-btn" @click="showUrlModal = !showUrlModal">
          <Plus :size="15" />
          <span>이미지 URL 직접 추가</span>
        </button>

        <button class="btn-primary upload-btn" @click="fileInputRef?.click()" :disabled="isUploading">
          <UploadCloud :size="16" />
          <span>{{ isUploading ? '업로드 중...' : '컴퓨터에서 사진 선택' }}</span>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*"
          class="hidden-file-input"
          @change="handleFileChange"
        />
      </div>
    </div>

    <!-- Upload Status Progress Banner -->
    <div v-if="isUploading" class="upload-banner">
      <div class="spinner"></div>
      <span>{{ uploadProgressText }}</span>
    </div>

    <!-- URL Add Modal / Inset Box -->
    <div v-if="showUrlModal" class="card-paper url-add-box">
      <h4 class="url-box-title">이미지 웹 URL 직접 추가</h4>
      <div class="url-inputs">
        <input
          v-model="urlInput"
          type="url"
          placeholder="https://example.com/photo.jpg"
          class="input-field"
        />
        <input
          v-model="urlCaption"
          type="text"
          placeholder="사진 설명 / 문구 (선택)"
          class="input-field caption"
        />
        <button class="btn-primary" @click="handleAddByUrl">
          <Check :size="14" />
          <span>추가</span>
        </button>
      </div>
    </div>

    <!-- 3x3 Photo Grid with Drag and Drop -->
    <div class="photo-grid">
      <div
        v-for="(photo, index) in sortedPhotos"
        :key="photo.id"
        class="photo-card"
        :class="{
          'is-cover': photo.isCover,
          'is-dragging': draggedIndex === index,
          'is-drag-over': dragOverIndex === index && draggedIndex !== index
        }"
        draggable="true"
        @dragstart="handleDragStart(index, $event)"
        @dragover="handleDragOver($event, index)"
        @dragleave="handleDragLeave(index)"
        @drop="handleDrop(index)"
        @dragend="handleDragEnd"
      >
        <!-- Drag Handle & Badges -->
        <div class="photo-thumb-wrap">
          <img :src="photo.url" :alt="photo.caption || '웨딩 사진'" class="photo-thumb" />

          <div class="drag-handle-pill font-sans" title="마우스로 끌어서 순서 변경">
            <GripVertical :size="13" />
            <span>{{ index + 1 }}</span>
          </div>

          <!-- Cover Badge -->
          <div v-if="photo.isCover" class="cover-badge font-serif">
            <Star :size="11" fill="currentColor" />
            <span>대표</span>
          </div>

          <!-- Action Hover Overlay -->
          <div class="thumb-overlay">
            <button class="overlay-btn edit-btn" @click="openEditModal(photo)" title="사진 수정">
              <Edit3 :size="14" />
              <span>수정</span>
            </button>
            <button class="overlay-btn delete-btn" @click="handleDelete(photo.id)" title="사진 삭제">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <!-- Photo Info & Action Buttons -->
        <div class="photo-details">
          <div class="caption-display" :title="photo.caption || '설명 없음'">
            <span v-if="photo.caption" class="caption-text">{{ photo.caption }}</span>
            <span v-else class="caption-empty">설명 없음 (수정 버튼 클릭)</span>
          </div>

          <div class="card-bottom-actions">
            <button
              v-if="!photo.isCover"
              class="cover-action-btn"
              @click="handleSetCover(photo.id)"
            >
              <Star :size="12" />
              <span>대표 설정</span>
            </button>
            <span v-else class="current-cover-badge">
              <Star :size="12" fill="currentColor" />
              <span>대표 사진</span>
            </span>

            <button class="icon-edit-btn" @click="openEditModal(photo)" title="사진 수정">
              <Edit3 :size="13" />
              <span>수정</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="photos.length === 0" class="empty-state card-paper">
      <ImageIcon :size="40" class="empty-icon" />
      <p class="empty-text">등록된 사진이 없습니다.</p>
      <p class="empty-sub">위의 '컴퓨터에서 사진 선택' 버튼을 눌러 사진을 등록해 보세요.</p>
    </div>

    <!-- Edit Photo Modal -->
    <div v-if="isEditModalOpen" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal-card card-paper">
        <div class="modal-header">
          <h4 class="modal-title font-serif">사진 정보 수정</h4>
          <button class="close-btn" @click="closeEditModal">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <!-- Image Preview & Change -->
          <div class="preview-section">
            <div class="modal-image-preview">
              <img :src="editForm.url" alt="미리보기" class="preview-img" />
              <div v-if="isReplacingImage" class="preview-loading">
                <RefreshCw :size="24" class="spinning" />
                <span>사진 변경 중...</span>
              </div>
            </div>

            <div class="preview-actions">
              <button
                type="button"
                class="btn-secondary btn-sm"
                @click="replaceFileInputRef?.click()"
                :disabled="isReplacingImage"
              >
                <UploadCloud :size="14" />
                <span>새 파일로 사진 교체</span>
              </button>
              <input
                ref="replaceFileInputRef"
                type="file"
                accept="image/*"
                class="hidden-file-input"
                @change="handleReplaceFileChange"
              />
              <p class="helper-text">컴퓨터에 있는 새 사진으로 바로 교체할 수 있습니다.</p>
            </div>
          </div>

          <!-- Form Fields -->
          <div class="form-group">
            <label class="form-label">이미지 URL</label>
            <input
              v-model="editForm.url"
              type="text"
              class="input-field"
              placeholder="https://..."
            />
          </div>

          <div class="form-group">
            <label class="form-label">사진 설명 (캡션)</label>
            <input
              v-model="editForm.caption"
              type="text"
              class="input-field"
              placeholder="예: 웨딩 스냅사진 1"
            />
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                v-model="editForm.isCover"
                type="checkbox"
                class="checkbox-input"
              />
              <span>이 사진을 메인 대표 사진으로 지정</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeEditModal">취소</button>
          <button class="btn-primary" @click="saveEditModal">
            <Check :size="14" />
            <span>저장하기</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.photo-manager {
  padding: 24px 0;
}

.manager-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
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

.header-actions {
  display: flex;
  gap: 8px;
}

.hidden-file-input {
  display: none;
}

.upload-btn {
  font-size: 13px;
  padding: 10px 18px;
}

.add-url-btn {
  font-size: 13px;
  padding: 10px 16px;
}

.upload-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--gold-soft);
  border: 1px solid var(--gold-light);
  border-radius: 10px;
  color: var(--gold-dark);
  font-size: 13px;
  margin-bottom: 20px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--gold-light);
  border-top-color: var(--gold-dark);
  border-radius: 50%;
  animation: spinSlow 1s linear infinite;
}

.url-add-box {
  margin-bottom: 24px;
  padding: 18px 20px;
  background: var(--bg-ivory);
}

.url-box-title {
  font-size: 14px;
  color: var(--text-main);
  margin-bottom: 10px;
}

.url-inputs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.url-inputs .input-field {
  flex: 2;
  min-width: 200px;
  padding: 9px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  font-size: 13px;
}

.url-inputs .caption {
  flex: 1;
}

/* 3x3 Photo Grid */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

.photo-card {
  background: #FFFFFF;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  cursor: grab;
  user-select: none;
}

.photo-card:active {
  cursor: grabbing;
}

.photo-card.is-cover {
  border: 2px solid var(--gold-primary);
}

.photo-card.is-dragging {
  opacity: 0.4;
  transform: scale(0.96);
}

.photo-card.is-drag-over {
  border: 2px dashed var(--gold-primary);
  background: var(--gold-soft);
  transform: scale(1.02);
}

.photo-thumb-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--bg-warm);
  overflow: hidden;
}

.photo-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.photo-card:hover .photo-thumb {
  transform: scale(1.03);
}

.drag-handle-pill {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  color: #FFFFFF;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
  z-index: 2;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.cover-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--gold-primary);
  color: #FFFFFF;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s;
  z-index: 3;
}

.photo-card:hover .thumb-overlay {
  opacity: 1;
}

.overlay-btn {
  background: rgba(255, 255, 255, 0.95);
  color: var(--text-main);
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.overlay-btn:hover {
  background: #FFFFFF;
  transform: translateY(-1px);
}

.overlay-btn.delete-btn {
  color: var(--rose-accent);
  padding: 6px 8px;
}

.overlay-btn.delete-btn:hover {
  background: #FEECEB;
}

.photo-details {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #FFFFFF;
}

.caption-display {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 18px;
}

.caption-text {
  color: var(--text-main);
  font-weight: 500;
}

.caption-empty {
  color: var(--text-muted);
  font-style: italic;
  font-size: 11px;
}

.card-bottom-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-light);
  padding-top: 8px;
}

.cover-action-btn {
  background: none;
  border: none;
  font-size: 11px;
  color: var(--text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.cover-action-btn:hover {
  color: var(--gold-primary);
  background: var(--gold-soft);
}

.current-cover-badge {
  font-size: 11px;
  color: var(--gold-dark);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
}

.icon-edit-btn {
  background: var(--bg-warm);
  border: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-main);
  padding: 3px 8px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-edit-btn:hover {
  background: var(--gold-soft);
  border-color: var(--gold-primary);
  color: var(--gold-dark);
}

.empty-state {
  text-align: center;
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  color: var(--border-color);
}

.empty-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
}

.empty-sub {
  font-size: 13px;
  color: var(--text-muted);
}

/* Edit Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
  animation: fadeIn 0.15s ease-out;
}

.modal-card {
  background: #FFFFFF;
  border-radius: 14px;
  max-width: 460px;
  width: 100%;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-main);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-sub);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  color: var(--text-main);
  background: var(--bg-warm);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-section {
  display: flex;
  gap: 16px;
  align-items: center;
}

.modal-image-preview {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--bg-warm);
  flex-shrink: 0;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--gold-dark);
  gap: 4px;
}

.spinning {
  animation: spinSlow 1s linear infinite;
}

.preview-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-sm {
  font-size: 12px;
  padding: 7px 12px;
  width: fit-content;
}

.helper-text {
  font-size: 11px;
  color: var(--text-muted);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

.input-field {
  padding: 9px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  outline: none;
}

.input-field:focus {
  border-color: var(--gold-primary);
}

.checkbox-group {
  padding-top: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-main);
  cursor: pointer;
}

.checkbox-input {
  accent-color: var(--gold-primary);
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: var(--bg-ivory);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes spinSlow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
