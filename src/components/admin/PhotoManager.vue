<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import {
  photos,
  uploadImage,
  addPhotoItem,
  deletePhotoItem,
  setCoverPhotoItem,
  updatePhotoItem,
  reorderPhotos,
  togglePhotoVisibility,
  syncPhotosFromFirebaseStorage,
  adminSettings,
  getOptimizedImageUrl
} from '../../services/storage'
import {
  isFirebaseStorageReady,
  getStorageBucketName,
  initFirebase
} from '../../services/firebase'
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
  RefreshCw,
  Eye,
  EyeOff,
  Cloud,
  Settings,
  AlertCircle,
  Crop,
  Target
} from 'lucide-vue-next'

const fileInputRef = ref<HTMLInputElement | null>(null)
const replaceFileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const uploadProgressText = ref('')
const urlInput = ref('')
const urlCaption = ref('')
const showUrlModal = ref(false)

// Firebase State & Modal
const isFirebaseReady = ref(isFirebaseStorageReady())
const storageBucket = computed(() => getStorageBucketName() || adminSettings.value.firebaseConfig?.storageBucket || '')
const isSyncing = ref(false)
const showFirebaseModal = ref(false)
const loadedAdminThumbs = ref<Record<string, boolean>>({})

const firebaseForm = ref({
  apiKey: adminSettings.value.firebaseConfig?.apiKey || '',
  projectId: adminSettings.value.firebaseConfig?.projectId || '',
  storageBucket: adminSettings.value.firebaseConfig?.storageBucket || '',
  appId: adminSettings.value.firebaseConfig?.appId || ''
})

const checkFirebaseStatus = () => {
  isFirebaseReady.value = isFirebaseStorageReady()
}

const openFirebaseModal = () => {
  firebaseForm.value = {
    apiKey: adminSettings.value.firebaseConfig?.apiKey || '',
    projectId: adminSettings.value.firebaseConfig?.projectId || '',
    storageBucket: adminSettings.value.firebaseConfig?.storageBucket || '',
    appId: adminSettings.value.firebaseConfig?.appId || ''
  }
  showFirebaseModal.value = true
}

const saveFirebaseConfig = () => {
  if (!firebaseForm.value.apiKey.trim() || !firebaseForm.value.projectId.trim()) {
    alert('API Key와 Project ID를 모두 입력해주세요.')
    return
  }

  if (!adminSettings.value.firebaseConfig) {
    adminSettings.value.firebaseConfig = {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    }
  }

  const pId = firebaseForm.value.projectId.trim()
  adminSettings.value.firebaseConfig.apiKey = firebaseForm.value.apiKey.trim()
  adminSettings.value.firebaseConfig.projectId = pId
  adminSettings.value.firebaseConfig.storageBucket = firebaseForm.value.storageBucket.trim() || `${pId}.firebasestorage.app`
  adminSettings.value.firebaseConfig.authDomain = `${pId}.firebaseapp.com`
  adminSettings.value.firebaseConfig.appId = firebaseForm.value.appId.trim()
  adminSettings.value.useFirebase = true

  initFirebase(adminSettings.value.firebaseConfig)
  checkFirebaseStatus()

  showFirebaseModal.value = false
  alert('Firebase Storage 설정이 저장되고 연동되었습니다!')
}

const handleSyncFromFirebase = async () => {
  checkFirebaseStatus()
  if (!isFirebaseReady.value) {
    openFirebaseModal()
    return
  }

  isSyncing.value = true
  try {
    const count = await syncPhotosFromFirebaseStorage()
    if (count > 0) {
      alert(`Firebase Storage에서 ${count}장의 새로운 사진을 가져왔습니다.`)
    } else {
      alert('Firebase Storage에 저장된 모든 사진이 이미 불러와져 있습니다.')
    }
  } catch (err: any) {
    console.error('Firebase sync error:', err)
    alert(`사진을 불러오는 중 오류가 발생했습니다: ${err.message || err}`)
  } finally {
    isSyncing.value = false
  }
}

// Edit Modal State
const isEditModalOpen = ref(false)
const editingPhoto = ref<PhotoItem | null>(null)
const editForm = ref({
  id: '',
  url: '',
  caption: '',
  isCover: false,
  isHidden: false,
  objectPosition: '50% 50%'
})
const isReplacingImage = ref(false)

// 1:1 Thumbnail Focus Positioning State
const isFocusModalOpen = ref(false)
const focusPhoto = ref<PhotoItem | null>(null)
const focusX = ref(50)
const focusY = ref(50)
const focusContainerRef = ref<HTMLElement | null>(null)
const isFocusDragging = ref(false)

const openFocusModal = (photo: PhotoItem) => {
  focusPhoto.value = photo
  if (photo.objectPosition) {
    const parts = photo.objectPosition.split(' ')
    if (parts.length === 2) {
      focusX.value = parseFloat(parts[0]) || 50
      focusY.value = parseFloat(parts[1]) || 50
    } else {
      focusX.value = 50
      focusY.value = 50
    }
  } else {
    focusX.value = 50
    focusY.value = 50
  }
  isFocusModalOpen.value = true
}

const openFocusModalFromEdit = () => {
  if (!editingPhoto.value) return
  openFocusModal(editingPhoto.value)
}

const closeFocusModal = () => {
  isFocusModalOpen.value = false
  focusPhoto.value = null
  isFocusDragging.value = false
}

const setFocusPreset = (x: number, y: number) => {
  focusX.value = x
  focusY.value = y
}

const updateFocusFromEvent = (e: MouseEvent | Touch) => {
  if (!focusContainerRef.value) return
  const rect = focusContainerRef.value.getBoundingClientRect()
  const rawX = ((e.clientX - rect.left) / rect.width) * 100
  const rawY = ((e.clientY - rect.top) / rect.height) * 100
  focusX.value = Math.max(0, Math.min(100, Math.round(rawX)))
  focusY.value = Math.max(0, Math.min(100, Math.round(rawY)))
}

const handleFocusContainerClick = (e: MouseEvent) => {
  updateFocusFromEvent(e)
}

const startFocusDrag = (e: MouseEvent | TouchEvent) => {
  isFocusDragging.value = true
  const event = 'touches' in e ? e.touches[0] : e
  updateFocusFromEvent(event)

  const onMove = (moveEvt: MouseEvent | TouchEvent) => {
    if (!isFocusDragging.value) return
    const evt = 'touches' in moveEvt ? moveEvt.touches[0] : moveEvt
    updateFocusFromEvent(evt)
  }

  const onEnd = () => {
    isFocusDragging.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onEnd)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onEnd)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onEnd)
  window.addEventListener('touchmove', onMove)
  window.addEventListener('touchend', onEnd)
}

const saveFocusPosition = () => {
  if (!focusPhoto.value) return
  const pos = `${focusX.value}% ${focusY.value}%`
  updatePhotoItem(focusPhoto.value.id, {
    objectPosition: pos
  })
  if (editForm.value.id === focusPhoto.value.id) {
    editForm.value.objectPosition = pos
  }
  closeFocusModal()
}

// Unified Drag State (PC Mouse & Mobile Touch)
const isDragging = ref(false)
const dragSourceIndex = ref<number | null>(null)
const dragTargetIndex = ref<number | null>(null)
const dragPosition = ref({ x: 0, y: 0 })

const sortedPhotos = computed(() => {
  return [...photos.value].sort((a, b) => a.order - b.order)
})

const visibleCount = computed(() => photos.value.filter(p => !p.isHidden).length)
const hiddenCount = computed(() => photos.value.filter(p => p.isHidden).length)
const totalCount = computed(() => photos.value.length)

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  checkFirebaseStatus()
  if (!isFirebaseReady.value) {
    openFirebaseModal()
    alert('사진을 Firebase Storage에 저장하기 위해 먼저 Firebase 연동 설정을 완료해주세요.')
    if (fileInputRef.value) fileInputRef.value.value = ''
    return
  }

  const files = Array.from(target.files)
  isUploading.value = true

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      uploadProgressText.value = `Firebase Storage 업로드 중 (${i + 1}/${files.length}): ${file.name}`
      const url = await uploadImage(file, (percent) => {
        uploadProgressText.value = `Firebase Storage 업로드 중 (${i + 1}/${files.length}) - ${percent}%`
      })
      addPhotoItem({
        url,
        caption: '',
        isCover: photos.value.length === 0
      })
    }
  } catch (err: any) {
    console.error('File upload error:', err)
    alert(`사진 업로드 중 오류가 발생했습니다: ${err.message || err}`)
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
  if (confirm('이 사진을 정말 삭제하시겠습니까? (Firebase Storage 연동 사진인 경우 스토리지에서도 함께 삭제됩니다)')) {
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
    isCover: !!photo.isCover,
    isHidden: !!photo.isHidden,
    objectPosition: photo.objectPosition || '50% 50%'
  }
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  editingPhoto.value = null
  isReplacingImage.value = false
}

// 대표 사진으로 지정되면 숨김 설정을 자동으로 해제
watch(() => editForm.value.isCover, (newCover) => {
  if (newCover) {
    editForm.value.isHidden = false
  }
})

const handleReplaceFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  checkFirebaseStatus()
  if (!isFirebaseReady.value) {
    openFirebaseModal()
    alert('사진을 교체하려면 먼저 Firebase Storage 연동 설정을 완료해주세요.')
    if (replaceFileInputRef.value) replaceFileInputRef.value.value = ''
    return
  }

  const file = target.files[0]
  isReplacingImage.value = true
  try {
    const newUrl = await uploadImage(file)
    editForm.value.url = newUrl
  } catch (err: any) {
    console.error('Replace image error:', err)
    alert(`사진 교체 중 오류가 발생했습니다: ${err.message || err}`)
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
  const isCoverPhoto = editForm.value.isCover
  updatePhotoItem(editForm.value.id, {
    url: editForm.value.url.trim(),
    caption: editForm.value.caption.trim(),
    isCover: isCoverPhoto,
    isHidden: isCoverPhoto ? false : editForm.value.isHidden,
    objectPosition: editForm.value.objectPosition
  })
  if (isCoverPhoto) {
    setCoverPhotoItem(editForm.value.id)
  }
  closeEditModal()
}

// PC Mouse Drag Handlers
let cleanupMouseMove: (() => void) | null = null

const handleMouseDown = (index: number, e: MouseEvent) => {
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  if (target?.closest('button, input, textarea, a, .overlay-btn')) return

  // 브라우저 기본 이미지 드래그 및 텍스트 선택 딜레이 즉각 방지
  e.preventDefault()

  const startX = e.clientX
  const startY = e.clientY
  let hasMoved = false
  dragPosition.value = { x: startX, y: startY }

  const onMouseMove = (moveEvent: MouseEvent) => {
    const dx = moveEvent.clientX - startX
    const dy = moveEvent.clientY - startY

    // 2px만 이동해도 지연 없이 즉각 드래그 발동
    if (!hasMoved && Math.hypot(dx, dy) < 2) {
      return
    }
    if (!hasMoved) {
      hasMoved = true
      isDragging.value = true
      dragSourceIndex.value = index
      dragTargetIndex.value = index
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
    }

    dragPosition.value = { x: moveEvent.clientX, y: moveEvent.clientY }

    const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
    const card = el?.closest('.photo-card') as HTMLElement | null
    if (card && card.dataset.index !== undefined) {
      const idx = parseInt(card.dataset.index, 10)
      if (!isNaN(idx) && idx >= 0 && idx < sortedPhotos.value.length) {
        dragTargetIndex.value = idx
      }
    }
  }

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    cleanupMouseMove = null
    document.body.style.userSelect = ''
    document.body.style.cursor = ''

    if (isDragging.value && dragSourceIndex.value !== null && dragTargetIndex.value !== null) {
      if (dragSourceIndex.value !== dragTargetIndex.value) {
        reorderPhotos(dragSourceIndex.value, dragTargetIndex.value)
      }
    }

    isDragging.value = false
    dragSourceIndex.value = null
    dragTargetIndex.value = null
  }

  cleanupMouseMove = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// Mobile Touch Drag Handlers
const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || dragSourceIndex.value === null) return
  if (e.cancelable) {
    e.preventDefault() // 터치 드래그 중 브라우저 페이지 스크롤 방지
  }
  const touch = e.touches[0]
  dragPosition.value = { x: touch.clientX, y: touch.clientY }

  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  const card = el?.closest('.photo-card') as HTMLElement | null
  if (card && card.dataset.index !== undefined) {
    const idx = parseInt(card.dataset.index, 10)
    if (!isNaN(idx) && idx >= 0 && idx < sortedPhotos.value.length) {
      dragTargetIndex.value = idx
    }
  }
}

const handleTouchEnd = () => {
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('touchcancel', handleTouchCancel)

  if (isDragging.value && dragSourceIndex.value !== null && dragTargetIndex.value !== null) {
    if (dragSourceIndex.value !== dragTargetIndex.value) {
      reorderPhotos(dragSourceIndex.value, dragTargetIndex.value)
    }
  }
  isDragging.value = false
  dragSourceIndex.value = null
  dragTargetIndex.value = null
}

const handleTouchCancel = () => {
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('touchcancel', handleTouchCancel)

  isDragging.value = false
  dragSourceIndex.value = null
  dragTargetIndex.value = null
}

const handleTouchStart = (index: number, e: TouchEvent) => {
  if (e.touches.length !== 1) return
  const target = e.target as HTMLElement
  if (target?.closest('button, input, textarea, a, .overlay-btn')) return
  const touch = e.touches[0]
  dragSourceIndex.value = index
  dragTargetIndex.value = index
  dragPosition.value = { x: touch.clientX, y: touch.clientY }
  isDragging.value = true

  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)
  window.addEventListener('touchcancel', handleTouchCancel)
}

onUnmounted(() => {
  if (cleanupMouseMove) cleanupMouseMove()
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('touchcancel', handleTouchCancel)
})
</script>

<template>
  <div class="photo-manager font-sans">
    <div class="manager-header">
      <div>
        <div class="title-with-stats">
          <h3 class="manager-title font-serif">웨딩 사진 관리</h3>
          <div class="stats-pills">
            <span class="stat-badge visible" title="청첩장에 보여지는 사진 수">
              <Eye :size="13" />
              <span>노출 중 <strong>{{ visibleCount }}</strong>장</span>
            </span>
            <span v-if="hiddenCount > 0" class="stat-badge hidden" title="청첩장에서 숨김 처리된 사진 수">
              <EyeOff :size="13" />
              <span>숨김 <strong>{{ hiddenCount }}</strong>장</span>
            </span>
            <span class="stat-badge total">
              전체 <strong>{{ totalCount }}</strong>장
            </span>
          </div>
        </div>
        <p class="manager-desc">
          청첩장에 노출될 사진을 관리합니다. 사진을 드래그하여 3x3 그리드 순서를 변경하거나 보이기/숨기기를 설정할 수 있습니다.
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

    <!-- Firebase Storage Status & Sync Banner -->
    <div
      class="firebase-status-banner"
      :class="{ 'is-connected': isFirebaseReady, 'is-disconnected': !isFirebaseReady }"
    >
      <div class="firebase-status-info">
        <span class="status-indicator-dot" :class="{ 'online': isFirebaseReady, 'offline': !isFirebaseReady }"></span>
        <span v-if="isFirebaseReady" class="firebase-status-text">
          <Cloud :size="15" class="status-icon" />
          <span><strong>Firebase Storage 연동됨</strong> <small v-if="storageBucket">({{ storageBucket }})</small></span>
        </span>
        <span v-else class="firebase-status-text">
          <AlertCircle :size="15" class="status-icon warning" />
          <span><strong>Firebase Storage 미연동</strong> <small>- 사진을 Cloud Storage에 저장하려면 연동 설정이 필요합니다.</small></span>
        </span>
      </div>

      <div class="firebase-banner-actions">
        <button
          v-if="isFirebaseReady"
          class="btn-banner-action sync-btn"
          @click="handleSyncFromFirebase"
          :disabled="isSyncing"
          title="Firebase Storage에 저장된 모든 사진을 불러와 동기화합니다"
        >
          <RefreshCw :size="13" :class="{ 'spinning': isSyncing }" />
          <span>{{ isSyncing ? '사진 동기화 중...' : 'Storage 사진 불러오기' }}</span>
        </button>

        <button
          class="btn-banner-action config-btn"
          @click="openFirebaseModal"
          :title="isFirebaseReady ? 'Firebase 설정 변경' : 'Firebase Storage 설정 입력'"
        >
          <Settings :size="13" />
          <span>{{ isFirebaseReady ? '연동 설정' : 'Firebase 설정하기' }}</span>
        </button>
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
    <div
      class="photo-grid"
      :class="{ 'is-dragging-active': isDragging }"
    >
      <div
        v-for="(photo, index) in sortedPhotos"
        :key="photo.id"
        :data-index="index"
        class="photo-card"
        :class="{
          'is-cover': photo.isCover,
          'is-hidden': photo.isHidden,
          'is-dragging': isDragging && dragSourceIndex === index,
          'is-drag-over': isDragging && dragTargetIndex === index && dragSourceIndex !== index
        }"
        @mousedown="handleMouseDown(index, $event)"
      >
        <!-- Drop Target Visual Indicator -->
        <div
          v-if="isDragging && dragTargetIndex === index && dragSourceIndex !== index"
          class="drop-target-indicator"
          :class="{ 'is-target-cover': index === 0 }"
        >
          <span>{{ index === 0 ? '★ 대표 사진으로 지정' : '여기로 이동' }}</span>
        </div>

        <!-- Drag Handle & Badges -->
        <div
          class="photo-thumb-wrap"
          @mousedown="handleMouseDown(index, $event)"
          @touchstart="handleTouchStart(index, $event)"
        >
          <!-- Skeleton Shimmer Loader while photo loads from Firebase -->
          <div v-if="!loadedAdminThumbs[photo.id]" class="admin-thumb-skeleton">
            <div class="admin-skeleton-shimmer"></div>
            <div class="admin-mini-spin"></div>
          </div>

          <img
            :src="photo.url"
            :alt="photo.caption || '웨딩 사진'"
            class="photo-thumb"
            :class="{ 'is-loaded': loadedAdminThumbs[photo.id] }"
            :style="{ objectPosition: photo.objectPosition || 'center center' }"
            draggable="false"
            loading="lazy"
            decoding="async"
            @load="loadedAdminThumbs[photo.id] = true"
          />

          <!-- Drag Handle Pill (Supports Touch on mobile & Mouse drag on PC) -->
          <div
            class="drag-handle-pill font-sans"
            title="마우스 또는 터치로 끌어서 순서 변경"
            @mousedown.stop="handleMouseDown(index, $event)"
            @touchstart.stop="handleTouchStart(index, $event)"
          >
            <GripVertical :size="13" />
            <span>{{ index + 1 }}</span>
          </div>

          <!-- Cover Badge -->
          <div v-if="photo.isCover" class="cover-badge font-serif">
            <Star :size="11" fill="currentColor" />
            <span>대표</span>
          </div>

          <!-- Hidden Badge -->
          <div v-if="photo.isHidden" class="hidden-badge font-sans">
            <EyeOff :size="11" />
            <span>숨김</span>
          </div>

          <!-- Action Hover Overlay -->
          <div class="thumb-overlay">
            <button class="overlay-btn edit-btn" @click="openEditModal(photo)" title="사진 수정">
              <Edit3 :size="14" />
              <span>수정</span>
            </button>
            <button class="overlay-btn crop-btn" @click.stop="openFocusModal(photo)" title="1:1 썸네일 위치 맞춤 (얼굴 잘림 방지)">
              <Crop :size="14" />
              <span>1:1 맞춤</span>
            </button>
            <!-- 대표 사진은 숨김 불가 -->
            <button
              v-if="!photo.isCover"
              class="overlay-btn toggle-btn"
              @click="togglePhotoVisibility(photo.id)"
              :title="photo.isHidden ? '청첩장에 노출하기' : '청첩장에서 숨기기'"
            >
              <Eye v-if="photo.isHidden" :size="14" />
              <EyeOff v-else :size="14" />
              <span>{{ photo.isHidden ? '보이기' : '숨기기' }}</span>
            </button>
            <div
              v-else
              class="overlay-btn disabled-btn"
              title="대표 사진은 메인 표지에 항상 노출됩니다"
            >
              <Eye :size="14" />
              <span>대표</span>
            </div>
            <button class="overlay-btn delete-btn" @click="handleDelete(photo.id)" title="사진 삭제">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <!-- Photo Info & Action Buttons -->
        <div class="photo-details">
          <div class="caption-display" :title="photo.caption || '설명 없음'">
            <span v-if="photo.caption" class="caption-text">{{ photo.caption }}</span>
            <span v-else class="caption-empty">설명 없음 (수정 클릭)</span>
          </div>

          <div class="card-bottom-actions">
            <!-- 대표 사진은 항상 노출 고정 -->
            <button
              v-if="!photo.isCover"
              class="visibility-pill-btn"
              :class="{ 'is-hidden-state': photo.isHidden }"
              @click="togglePhotoVisibility(photo.id)"
              :title="photo.isHidden ? '청첩장에 노출하기' : '청첩장에서 숨기기'"
            >
              <EyeOff v-if="photo.isHidden" :size="12" />
              <Eye v-else :size="12" />
              <span>{{ photo.isHidden ? '숨김됨' : '보이기' }}</span>
            </button>
            <span
              v-else
              class="visibility-pill-btn is-cover-fixed"
              title="대표 사진은 메인 표지에 사용되므로 항상 노출됩니다"
            >
              <Eye :size="12" />
              <span>항상 노출</span>
            </span>

            <div class="card-action-group">
              <button
                v-if="!photo.isCover"
                class="cover-action-btn"
                @click="handleSetCover(photo.id)"
                title="대표 사진으로 지정"
              >
                <Star :size="12" />
                <span>대표</span>
              </button>
              <span v-else class="current-cover-badge">
                <Star :size="12" fill="currentColor" />
                <span>대표</span>
              </span>

              <button class="icon-crop-btn" @click.stop="openFocusModal(photo)" title="1:1 썸네일 노출 위치 맞춤">
                <Crop :size="12" />
              </button>

              <button class="icon-edit-btn" @click="openEditModal(photo)" title="사진 수정">
                <Edit3 :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Drag Card Ghost (PC Mouse & Mobile Touch) -->
    <div
      v-if="isDragging && dragSourceIndex !== null && sortedPhotos[dragSourceIndex]"
      class="drag-card-ghost"
      :style="{
        transform: `translate3d(${dragPosition.x - 45}px, ${dragPosition.y - 45}px, 0)`
      }"
    >
      <div class="ghost-thumb-wrap">
        <img
          :src="sortedPhotos[dragSourceIndex].thumbnailUrl || getOptimizedImageUrl(sortedPhotos[dragSourceIndex].url, 150, 60)"
          class="ghost-thumb-img"
          alt=""
        />
        <div class="ghost-badge">
          <GripVertical :size="11" />
          <span>{{ dragSourceIndex + 1 }}번 이동</span>
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

          <div class="form-group">
            <label class="form-label">1:1 썸네일 노출 위치 (얼굴 잘림 방지)</label>
            <div class="thumb-pos-card">
              <div class="mini-1-1-preview-wrap">
                <img
                  :src="editForm.url"
                  alt="1:1 미리보기"
                  class="mini-1-1-img"
                  :style="{ objectPosition: editForm.objectPosition || 'center center' }"
                />
                <span class="preview-tag">1:1 미리보기</span>
              </div>
              <div class="thumb-pos-info">
                <p class="pos-text">현재 설정: <strong>{{ editForm.objectPosition || '50% 50%' }}</strong></p>
                <p class="pos-help">청첩장 3x3 썸네일에서 얼굴이 잘리지 않도록 초점 위치를 조정합니다.</p>
                <button type="button" class="btn-secondary btn-sm" @click="openFocusModalFromEdit">
                  <Crop :size="13" />
                  <span>1:1 위치 맞춤 조정하기</span>
                </button>
              </div>
            </div>
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

          <div class="form-group checkbox-group">
            <label class="checkbox-label" :class="{ 'disabled-checkbox': editForm.isCover }">
              <input
                v-model="editForm.isHidden"
                type="checkbox"
                class="checkbox-input"
                :disabled="editForm.isCover"
              />
              <span :class="{ 'text-danger': editForm.isHidden }">
                이 사진을 청첩장에서 숨기기 (비노출)
              </span>
            </label>
            <p v-if="editForm.isCover" class="helper-text cover-hint">
              * 대표 사진은 메인 표지에 표시되므로 숨길 수 없습니다.
            </p>
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

    <!-- 1:1 Thumbnail Focus Positioning Modal -->
    <div v-if="isFocusModalOpen && focusPhoto" class="modal-backdrop focus-modal-backdrop" @click.self="closeFocusModal">
      <div class="modal-card focus-modal-card card-paper">
        <div class="modal-header">
          <div>
            <h4 class="modal-title font-serif">1:1 썸네일 노출 위치 맞춤</h4>
            <p class="modal-subtitle">얼굴이 잘리지 않도록 1:1 정사각형 썸네일의 중심 초점을 맞춰주세요.</p>
          </div>
          <button class="close-btn" @click="closeFocusModal">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-body focus-modal-body">
          <div class="focus-layout">
            <!-- Left: Original Image with Interactive Focus Target -->
            <div class="focus-editor-col">
              <div class="col-header">
                <Target :size="15" class="col-icon" />
                <span class="col-title">사진을 클릭하거나 터치하여 얼굴 위치를 지정하세요</span>
              </div>

              <div
                ref="focusContainerRef"
                class="focus-image-container"
                @click="handleFocusContainerClick"
                @mousedown="startFocusDrag"
                @touchstart="startFocusDrag"
              >
                <img
                  :src="focusPhoto.url"
                  alt="초점 조정 원본 사진"
                  class="focus-target-img"
                  draggable="false"
                />

                <!-- Focus Reticle Target -->
                <div
                  class="focus-reticle"
                  :style="{ left: `${focusX}%`, top: `${focusY}%` }"
                >
                  <div class="reticle-outer-ring"></div>
                  <div class="reticle-cross-h"></div>
                  <div class="reticle-cross-v"></div>
                  <div class="reticle-center-dot"></div>
                  <span class="reticle-badge">초점 ({{ focusX }}%, {{ focusY }}%)</span>
                </div>
              </div>

              <!-- Quick Presets -->
              <div class="presets-row">
                <span class="preset-label">빠른 프리셋:</span>
                <button
                  type="button"
                  class="preset-chip"
                  :class="{ active: focusX === 50 && focusY === 20 }"
                  @click="setFocusPreset(50, 20)"
                >
                  얼굴/상단 (20%)
                </button>
                <button
                  type="button"
                  class="preset-chip"
                  :class="{ active: focusX === 50 && focusY === 35 }"
                  @click="setFocusPreset(50, 35)"
                >
                  상단-중간 (35%)
                </button>
                <button
                  type="button"
                  class="preset-chip"
                  :class="{ active: focusX === 50 && focusY === 50 }"
                  @click="setFocusPreset(50, 50)"
                >
                  정중앙 (50%)
                </button>
                <button
                  type="button"
                  class="preset-chip"
                  :class="{ active: focusX === 50 && focusY === 75 }"
                  @click="setFocusPreset(50, 75)"
                >
                  하단 (75%)
                </button>
              </div>

              <!-- Sliders -->
              <div class="sliders-wrap">
                <div class="slider-row">
                  <span class="slider-title">수직 위치 (상/하):</span>
                  <input
                    v-model.number="focusY"
                    type="range"
                    min="0"
                    max="100"
                    class="range-slider"
                  />
                  <span class="slider-num">{{ focusY }}%</span>
                </div>
                <div class="slider-row">
                  <span class="slider-title">수평 위치 (좌/우):</span>
                  <input
                    v-model.number="focusX"
                    type="range"
                    min="0"
                    max="100"
                    class="range-slider"
                  />
                  <span class="slider-num">{{ focusX }}%</span>
                </div>
              </div>
            </div>

            <!-- Right: Real 1:1 Live Preview (Identical to Invitation Gallery) -->
            <div class="focus-preview-col">
              <div class="col-header">
                <span class="col-title">실제 청첩장 1:1 미리보기</span>
              </div>

              <div class="preview-1-1-box">
                <img
                  :src="focusPhoto.url"
                  alt="1:1 크롭 결과"
                  class="live-1-1-img"
                  :style="{ objectPosition: `${focusX}% ${focusY}%` }"
                />
              </div>

              <p class="preview-desc">
                청첩장의 3x3 썸네일 그리드에서 방문자들에게 실제로 보여지는 모습입니다.
              </p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="closeFocusModal">취소</button>
          <button type="button" class="btn-primary" @click="saveFocusPosition">
            <Check :size="14" />
            <span>썸네일 위치 저장</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Firebase Config Modal -->
    <div v-if="showFirebaseModal" class="modal-backdrop" @click.self="showFirebaseModal = false">
      <div class="modal-card card-paper">
        <div class="modal-header">
          <div class="modal-header-with-icon">
            <Cloud :size="18" class="header-icon-cloud" />
            <h4 class="modal-title font-serif">Firebase Storage 연동 설정</h4>
          </div>
          <button class="close-btn" @click="showFirebaseModal = false">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <p class="modal-desc-text">
            Firebase 콘솔(Project Settings)의 웹 앱 구성 정보를 입력하시면, 관리자 페이지에서 올리는 사진이 <strong>Firebase Cloud Storage</strong>에 자동으로 업로드되고 저장된 고화질 이미지를 청첩장에 노출합니다.
          </p>

          <div class="form-group">
            <label class="form-label">API Key <span class="required-star">*</span></label>
            <input
              v-model="firebaseForm.apiKey"
              type="text"
              placeholder="AIzaSy..."
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Project ID <span class="required-star">*</span></label>
            <input
              v-model="firebaseForm.projectId"
              type="text"
              placeholder="my-wedding-project"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Storage Bucket (선택 - 기본값: {projectId}.firebasestorage.app)</label>
            <input
              v-model="firebaseForm.storageBucket"
              type="text"
              placeholder="my-wedding-project.firebasestorage.app"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">App ID (선택)</label>
            <input
              v-model="firebaseForm.appId"
              type="text"
              placeholder="1:123456789:web:abcdef..."
              class="input-field"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showFirebaseModal = false">취소</button>
          <button class="btn-primary" @click="saveFirebaseConfig">
            <Check :size="14" />
            <span>연동 저장 및 활성화</span>
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

.title-with-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.stats-pills {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
}

.stat-badge.visible {
  background: #EBF7EE;
  color: #1E7E34;
  border: 1px solid #C3E6CB;
}

.stat-badge.hidden {
  background: #FEECEB;
  color: #C0392B;
  border: 1px solid #F5C6CB;
}

.stat-badge.total {
  background: var(--bg-warm);
  color: var(--text-sub);
  border: 1px solid var(--border-color);
}

.manager-desc {
  font-size: 13px;
  color: var(--text-sub);
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
  position: relative;
}

/* 드래그 중 자식 요소들이 이벤트를 가로채거나 깜빡임을 유발하지 않도록 격리 */
.photo-grid.is-dragging-active .photo-card * {
  pointer-events: none !important;
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
  position: relative;
  background: #FFFFFF;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.18s ease, border-color 0.18s ease;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.photo-card:active {
  cursor: grabbing;
}

.photo-card.is-cover {
  border: 2px solid var(--gold-primary);
}

.photo-card.is-hidden {
  opacity: 0.65;
  filter: grayscale(20%);
  border-color: #E2E8F0;
  background: #F8FAFC;
}

.photo-card.is-dragging {
  opacity: 0.35;
}

.photo-card.is-drag-over {
  border: 2px dashed var(--gold-primary);
  background: #FDF9F3;
}

/* 드롭 대상 위치 안내 오버레이 */
.drop-target-indicator {
  position: absolute;
  inset: 0;
  background: rgba(184, 153, 107, 0.2);
  border: 2px dashed var(--gold-primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
  animation: fadeIn 0.15s ease-out;
}

.drop-target-indicator span {
  background: var(--gold-primary);
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 9999px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  letter-spacing: -0.2px;
}

.drop-target-indicator.is-target-cover {
  background: rgba(184, 153, 107, 0.32);
  border: 2.5px solid var(--gold-primary);
}

.drop-target-indicator.is-target-cover span {
  background: var(--gold-dark);
  border: 1px solid var(--gold-light);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  color: #FFFFFF;
}

.photo-thumb-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--bg-warm);
  overflow: hidden;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.photo-thumb-wrap:active {
  cursor: grabbing;
}

.admin-thumb-skeleton {
  position: absolute;
  inset: 0;
  background: #EFE7DA;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  overflow: hidden;
}

.admin-skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(239, 231, 218, 0) 0%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(239, 231, 218, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.admin-mini-spin {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(168, 131, 80, 0.25);
  border-top-color: var(--gold-primary);
  border-radius: 50%;
  animation: spin 0.85s linear infinite;
  z-index: 2;
  opacity: 0.85;
}

.photo-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.35s ease, transform 0.3s ease;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

.photo-thumb.is-loaded {
  opacity: 1;
}

.photo-card:hover .photo-thumb {
  transform: scale(1.03);
}

.drag-handle-pill {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(4px);
  color: #FFFFFF;
  padding: 4px 9px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
  z-index: 5;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.drag-handle-pill:active {
  cursor: grabbing;
  background: var(--gold-primary);
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

.hidden-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(192, 57, 43, 0.88);
  backdrop-filter: blur(4px);
  color: #FFFFFF;
  padding: 3px 7px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.cover-badge + .hidden-badge {
  right: 58px;
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
  cursor: grab;
}

.thumb-overlay:active {
  cursor: grabbing;
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

.overlay-btn.disabled-btn {
  background: rgba(245, 240, 230, 0.95);
  color: var(--gold-dark);
  cursor: default;
  box-shadow: none;
}

.overlay-btn.disabled-btn:hover {
  background: rgba(245, 240, 230, 0.95);
  transform: none;
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
  gap: 6px;
}

.visibility-pill-btn {
  background: #EBF7EE;
  color: #1E7E34;
  border: 1px solid #C3E6CB;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 7px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  transition: all 0.15s;
}

.visibility-pill-btn:hover {
  filter: brightness(0.95);
}

.visibility-pill-btn.is-hidden-state {
  background: #FEECEB;
  color: #C0392B;
  border-color: #F5C6CB;
}

.visibility-pill-btn.is-cover-fixed {
  background: #F4EFE6;
  color: var(--gold-dark);
  border-color: var(--gold-light);
  cursor: default;
  opacity: 0.95;
}

.visibility-pill-btn.is-cover-fixed:hover {
  filter: none;
}

.card-action-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cover-action-btn {
  background: none;
  border: none;
  font-size: 11px;
  color: var(--text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 5px;
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
  gap: 2px;
  padding: 3px 5px;
}

.icon-edit-btn {
  background: var(--bg-warm);
  border: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-main);
  padding: 3px 6px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-edit-btn:hover {
  background: var(--gold-soft);
  border-color: var(--gold-primary);
  color: var(--gold-dark);
}

/* Drag Ghost Preview with image card (PC Mouse & Mobile Touch) */
.drag-card-ghost {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none !important;
  user-select: none;
  -webkit-user-select: none;
  z-index: 99999;
  will-change: transform;
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.35));
}

.ghost-thumb-wrap {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: 12px;
  overflow: hidden;
  border: 2.5px solid var(--gold-primary);
  background: #FFFFFF;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  transform: rotate(3deg) scale(1.05);
}

.ghost-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ghost-badge {
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(4px);
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.text-danger {
  color: #C0392B;
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

.disabled-checkbox {
  opacity: 0.5;
  cursor: not-allowed !important;
}

.disabled-checkbox .checkbox-input {
  cursor: not-allowed !important;
}

.cover-hint {
  color: var(--gold-dark);
  font-size: 11px;
  margin-top: 4px;
  margin-left: 24px;
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

/* Firebase Storage Status Banner */
.firebase-status-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.firebase-status-banner.is-connected {
  background: #EBF7EE;
  border: 1px solid #C3E6CB;
  color: #1E7E34;
}

.firebase-status-banner.is-disconnected {
  background: #FFF9E6;
  border: 1px solid #FFE082;
  color: #996500;
}

.firebase-status-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-indicator-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.status-indicator-dot.online {
  background: #28A745;
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
}

.status-indicator-dot.offline {
  background: #E67E22;
  box-shadow: 0 0 0 2px rgba(230, 126, 34, 0.25);
}

.firebase-status-text {
  display: flex;
  align-items: center;
  gap: 6px;
}

.firebase-status-text .status-icon {
  flex-shrink: 0;
}

.firebase-status-text .status-icon.warning {
  color: #E67E22;
}

.firebase-status-text small {
  font-size: 12px;
  opacity: 0.85;
}

.firebase-banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-banner-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid currentColor;
  background: #FFFFFF;
}

.btn-banner-action.sync-btn {
  color: #1E7E34;
  border-color: #A3D9B1;
}

.btn-banner-action.sync-btn:hover:not(:disabled) {
  background: #E1F5E6;
}

.btn-banner-action.config-btn {
  color: var(--text-main);
  border-color: var(--border-color);
}

.btn-banner-action.config-btn:hover {
  background: var(--bg-warm);
}

.btn-banner-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal Enhancements */
.modal-header-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon-cloud {
  color: var(--gold-primary);
}

.modal-desc-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-sub);
  margin-bottom: 6px;
}

.required-star {
  color: #E74C3C;
  font-weight: bold;
}

/* 1:1 Thumbnail Position in Edit Modal */
.thumb-pos-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-warm, #FAF7F2);
  border: 1px solid var(--border-color, #E8DEC8);
  border-radius: 10px;
  padding: 12px;
}

.mini-1-1-preview-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(168, 131, 80, 0.3);
  background: #EFE7DA;
  flex-shrink: 0;
}

.mini-1-1-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-tag {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.65);
  color: #FFFFFF;
  font-size: 8.5px;
  text-align: center;
  padding: 1px 0;
}

.thumb-pos-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pos-text {
  font-size: 12px;
  color: var(--text-main);
  margin: 0;
}

.pos-help {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0 0 6px 0;
}

.overlay-btn.crop-btn {
  background: rgba(255, 255, 255, 0.95);
  color: var(--gold-dark, #8C6D41);
}

.overlay-btn.crop-btn:hover {
  background: #FFFFFF;
  color: #03C75A;
}

.icon-crop-btn {
  background: var(--bg-warm);
  border: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-main);
  padding: 3px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-crop-btn:hover {
  background: var(--gold-soft);
  border-color: var(--gold-primary);
  color: var(--gold-dark);
}

/* 1:1 Thumbnail Focus Positioning Dedicated Modal */
.focus-modal-card {
  max-width: 680px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-subtitle {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 3px;
}

.focus-modal-body {
  overflow-y: auto;
  padding: 16px 20px;
}

.focus-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 20px;
}

.focus-editor-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.col-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
}

.col-icon {
  color: var(--gold-dark, #8C6D41);
}

.focus-image-container {
  position: relative;
  width: 100%;
  max-height: 340px;
  background: #222222;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border-color);
}

.focus-target-img {
  max-width: 100%;
  max-height: 340px;
  object-fit: contain;
  display: block;
  pointer-events: none;
}

.focus-reticle {
  position: absolute;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.reticle-outer-ring {
  position: absolute;
  inset: 0;
  border: 2px solid #03C75A;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(3, 199, 90, 0.8), inset 0 0 6px rgba(3, 199, 90, 0.4);
  animation: pulse-ring 1.8s infinite;
}

.reticle-cross-h {
  position: absolute;
  top: 50%;
  left: -8px;
  right: -8px;
  height: 2px;
  background: #03C75A;
  transform: translateY(-50%);
}

.reticle-cross-v {
  position: absolute;
  left: 50%;
  top: -8px;
  bottom: -8px;
  width: 2px;
  background: #03C75A;
  transform: translateX(-50%);
}

.reticle-center-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6px;
  height: 6px;
  background: #FFFFFF;
  border: 1px solid #03C75A;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.reticle-badge {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.presets-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.preset-chip {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-warm, #FAF7F2);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s;
}

.preset-chip:hover {
  border-color: var(--gold-primary);
  background: #FFFFFF;
}

.preset-chip.active {
  background: var(--gold-dark, #8C6D41);
  color: #FFFFFF;
  border-color: var(--gold-dark);
  font-weight: 600;
}

.sliders-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-warm, #FAF7F2);
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-title {
  font-size: 11.5px;
  width: 95px;
  color: var(--text-sub);
}

.range-slider {
  flex: 1;
  accent-color: var(--gold-dark, #8C6D41);
  cursor: pointer;
}

.slider-num {
  font-size: 11.5px;
  font-family: monospace;
  font-weight: 600;
  width: 36px;
  text-align: right;
  color: var(--text-main);
}

/* Right: Preview Column */
.focus-preview-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: var(--bg-warm, #FAF7F2);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 12px;
  text-align: center;
}

.preview-1-1-box {
  width: 150px;
  height: 150px;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid var(--gold-primary, #CBB495);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #000;
}

.live-1-1-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}

@media (max-width: 640px) {
  .focus-layout {
    grid-template-columns: 1fr;
  }
  .focus-preview-col {
    order: -1;
    flex-direction: row;
    justify-content: center;
    gap: 14px;
    text-align: left;
  }
  .preview-1-1-box {
    width: 90px;
    height: 90px;
    flex-shrink: 0;
  }
}
</style>
