import { weddingInfo, adminSettings } from './storage'
import { getValidKakaoToken } from './kakaoAuth'

export type KakaoNotificationType = 'guestbook' | 'rsvp' | 'livesnap' | 'test'

export interface NotificationPayload {
  type: KakaoNotificationType
  authorOrSender: string
  summary: string
  details?: string
}

export interface NotificationResult {
  success: boolean
  message: string
  statusCode?: number
}

/**
 * 카카오톡 알림 전송 헬퍼
 * 
 * 1) 카카오톡 비즈니스 채널 웹훅 (가장 권장: Make, Zapier, Cloud Function 등)
 * 2) 솔라피(Solapi) / 알리고 등 비즈니스 알림톡 REST API
 * 3) 카카오 개발자 센터의 '나에게 보내기(Default Memo)' REST API
 */
export async function sendKakaoNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const settings = adminSettings.value
  const webhookUrl = settings.kakaoWebhookUrl?.trim()
  const alimtalkApiKey = settings.kakaoAlimtalkApiKey?.trim()
  const kakaoKey = (settings.kakaoRestApiKey || weddingInfo.value.kakaoApiKey || '').trim()
  const receiverPhone = settings.kakaoReceiverPhone?.trim() || ''
  const channelId = settings.kakaoChannelId?.trim() || ''

  const typeTitles: Record<KakaoNotificationType, string> = {
    guestbook: '💌 [새 방명록 등록 알림]',
    rsvp: '📋 [참석 여부(RSVP) 전달 알림]',
    livesnap: '📸 [본식 촬영(현장스냅) 업로드 알림]',
    test: '🧪 [카카오톡 알림 테스트 전송]'
  }

  const title = typeTitles[payload.type] || '🔔 [새 알림]'
  const messageText = `${title}\n• 발신채널: ${channelId || '모바일 청첩장'}\n• 작성자: ${payload.authorOrSender}\n• 내용: ${payload.summary}${payload.details ? `\n• 상세: ${payload.details}` : ''}\n\n👉 관리자 페이지에서 확인하세요!`

  // 1. 커스텀 웹훅(Webhook URL)이 등록되어 있는 경우 (CORS 제약 없이 가장 깔끔하고 안정적)
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          receiverPhone,
          title,
          author: payload.authorOrSender,
          summary: payload.summary,
          details: payload.details,
          message: messageText,
          timestamp: new Date().toISOString()
        })
      })

      if (res.ok) {
        return { success: true, message: '웹훅을 통한 카카오 알림이 성공적으로 전송되었습니다.' }
      }
      return { success: false, message: `웹훅 전송 응답 오류 (상태코드: ${res.status})`, statusCode: res.status }
    } catch (err: any) {
      console.warn('Webhook notification error:', err)
      return { success: false, message: `웹훅 전송 실패: ${err.message || err}` }
    }
  }

  // 2. 솔라피 / 알림톡 API Key가 등록되어 있는 경우
  if (alimtalkApiKey) {
    try {
      // 알림톡/문자 발송 파이프라인
      const res = await fetch('https://api.solapi.com/messages/v4/send-many', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${alimtalkApiKey}`
        },
        body: JSON.stringify({
          messages: [
            {
              to: receiverPhone.replace(/-/g, ''),
              from: settings.kakaoSenderKey || receiverPhone.replace(/-/g, ''),
              text: messageText,
              kakaoOptions: settings.kakaoSenderKey ? {
                pfId: settings.kakaoSenderKey,
                disableSms: false
              } : undefined
            }
          ]
        })
      })

      if (res.ok) {
        return { success: true, message: '알림톡 발송 요청이 성공적으로 접수되었습니다.' }
      }
      const errJson = await res.json().catch(() => ({}))
      return { 
        success: false, 
        message: `알림톡 전송 오류: ${errJson.message || res.statusText} (${res.status})`,
        statusCode: res.status 
      }
    } catch (err: any) {
      console.warn('Alimtalk API call error:', err)
      return { success: false, message: `알림톡 API 통신 오류: ${err.message || err}` }
    }
  }

  // 3. 카카오 REST API / Access Token 직접 호출 시도 (나에게 보내기)
  // (Refresh Token이 설정되어 있으면 만료 여부를 체크하여 자동으로 최신 토큰으로 갱신 후 발송)
  const tokenToUse = await getValidKakaoToken() || kakaoKey

  if (tokenToUse) {
    try {
      const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${tokenToUse}`
        },
        body: new URLSearchParams({
          template_object: JSON.stringify({
            object_type: 'text',
            text: messageText,
            link: {
              web_url: window.location.origin + window.location.pathname + '#/admin',
              mobile_web_url: window.location.origin + window.location.pathname + '#/admin'
            },
            button_title: '관리자 페이지 열기'
          })
        })
      })

      if (res.ok) {
        return { success: true, message: '카카오톡 나에게 보내기 메시지가 성공적으로 전송되었습니다!' }
      }

      if (res.status === 401) {
        return { 
          success: false, 
          message: '401 Unauthorized: 입력된 키가 만료되었거나 REST API 키입니다. 카카오 [REST API 테스트]에서 발급받은 유효한 Access Token이 필요합니다.',
          statusCode: 401 
        }
      }

      const errText = await res.text().catch(() => '')

      if (res.status === 403 || errText.includes('-402') || errText.includes('insufficient scopes')) {
        return {
          success: false,
          message: '403 권한 부족 (insufficient scopes): 카카오 디벨로퍼스 [카카오 로그인 ➔ 동의항목]에서 "카카오톡 메시지 전송 (talk_message)"을 활성화한 후, [REST API 테스트]에서 토큰 발급 시 "카카오톡 메시지 전송"에 체크하고 새 토큰을 발급받아야 합니다.',
          statusCode: 403
        }
      }

      return { 
        success: false, 
        message: `카카오 API 전송 실패 (${res.status}): ${errText || res.statusText}`,
        statusCode: res.status 
      }
    } catch (e: any) {
      return { success: false, message: `카카오 API 호출 오류 (CORS 또는 네트워크): ${e.message || e}` }
    }
  }

  return { success: false, message: '카카오 알림 설정에 등록된 키나 웹훅 URL이 없습니다.' }
}
