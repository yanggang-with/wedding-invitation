<script setup lang="ts">
import { ref } from 'vue'
import { weddingInfo, photos } from '../../services/storage'
import { Share2, Link as LinkIcon, Check } from 'lucide-vue-next'

const linkCopied = ref(false)

const copyCurrentUrl = async () => {
  try {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy URL:', err)
  }
}

const shareKakao = () => {
  const kakao = (window as any).Kakao
  const currentUrl = window.location.href
  const coverImg = photos.value.find(p => p.isCover)?.url || photos.value[0]?.url || ''
  const title = `${weddingInfo.value.groom.name} ♥ ${weddingInfo.value.bride.name} 결혼합니다`
  const description = `${weddingInfo.value.venue.name} ${weddingInfo.value.venue.hall}`

  if (kakao && kakao.isInitialized && kakao.isInitialized()) {
    kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl: coverImg,
        link: {
          mobileWebUrl: currentUrl,
          webUrl: currentUrl
        }
      },
      buttons: [
        {
          title: '모바일 청첩장 보기',
          link: {
            mobileWebUrl: currentUrl,
            webUrl: currentUrl
          }
        }
      ]
    })
  } else if (navigator.share) {
    navigator.share({
      title,
      text: description,
      url: currentUrl
    }).catch(() => {})
  } else {
    copyCurrentUrl()
    alert('청첩장 링크가 복사되었습니다. 카카오톡이나 메시지로 공유해 보세요!')
  }
}
</script>

<template>
  <footer class="share-footer font-sans">
    <!-- Sharing Actions -->
    <div class="share-actions">
      <button class="share-btn kakao" @click="shareKakao">
        <Share2 :size="16" />
        <span>카카오톡 공유하기</span>
      </button>

      <button class="share-btn copy-link" @click="copyCurrentUrl">
        <Check v-if="linkCopied" :size="16" class="text-green" />
        <LinkIcon v-else :size="16" />
        <span>{{ linkCopied ? '링크가 복사되었습니다' : '청첩장 링크 복사' }}</span>
      </button>
    </div>

    <!-- Blessing & Copyright -->
    <div class="footer-meta">
      <p class="blessing-text font-serif">
        {{ weddingInfo.groom.name }} &amp; {{ weddingInfo.bride.name }}
      </p>
      <p class="copyright">Thank you for celebrating with us</p>
    </div>
  </footer>
</template>

<style scoped>
.share-footer {
  padding: 48px 24px 60px;
  background-color: var(--bg-ivory);
  border-top: 1px solid var(--border-light);
  text-align: center;
}

.share-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 36px;
}

.share-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 0;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.share-btn.kakao {
  background: #FEE500;
  color: #191919;
  border: 1px solid #E5CE00;
}

.share-btn.kakao:hover {
  background: #FADA0A;
}

.share-btn.copy-link {
  background: #FFFFFF;
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.share-btn.copy-link:hover {
  background: var(--bg-subtle);
}

.text-green {
  color: #2E7D32;
}

.footer-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.blessing-text {
  font-size: 17px;
  color: var(--gold-dark);
  letter-spacing: 2px;
}

.copyright {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 1px;
}
</style>

