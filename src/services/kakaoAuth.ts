import { adminSettings, forceUploadToCloud } from './storage'

/**
 * 카카오 SDK 초기화
 * (반드시 JavaScript 키로 초기화되어야 하며, 키가 변경되었을 경우 재초기화 지원)
 */
export function initKakaoSdk(overrideKey?: string): boolean {
  if (typeof window === 'undefined') return false
  const kakao = (window as any).Kakao
  if (!kakao) {
    console.warn('카카오 JavaScript SDK가 로드되지 않았습니다.')
    return false
  }

  const jsKey = (overrideKey || adminSettings.value.kakaoJavascriptKey || '').trim()
  if (!jsKey) {
    console.warn('카카오 JavaScript 키가 비어 있습니다.')
    return false
  }

  try {
    // 이미 다른 키로 초기화되어 있거나 재초기화가 필요한 경우 cleanup 호출
    if (typeof kakao.cleanup === 'function') {
      try { kakao.cleanup() } catch (_) {}
    }

    if (!kakao.isInitialized()) {
      kakao.init(jsKey)
    }
  } catch (e) {
    console.error('카카오 SDK 초기화 실패:', e)
    return false
  }

  return kakao.isInitialized()
}

/**
 * 카카오 1회 로그인 연동을 통해 Access Token과 Refresh Token 발급받기
 */
export async function loginKakaoAccount(): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined') return { success: false, message: '브라우저 환경이 아닙니다.' }

  const jsKey = (adminSettings.value.kakaoJavascriptKey || '').trim()

  // 1. JavaScript 키 필수 검증
  if (!jsKey) {
    return {
      success: false,
      message: '카카오 "JavaScript 키"를 먼저 입력해주세요. (REST API 키와는 다른 키입니다. 카카오 개발자 콘솔 [앱 키] 메뉴에서 복사할 수 있습니다.)'
    }
  }

  // 2. SDK 초기화
  const initialized = initKakaoSdk(jsKey)
  if (!initialized) {
    return {
      success: false,
      message: '카카오 SDK 초기화에 실패했습니다. JavaScript 키가 32자리 올바른 형식인지 확인하세요.'
    }
  }

  const kakao = (window as any).Kakao
  const currentOrigin = window.location.origin

  if (!kakao?.Auth || typeof kakao.Auth.login !== 'function') {
    return {
      success: false,
      message: '카카오 로그인 SDK를 초기화하는 중입니다. 브라우저를 강력 새로고침(Ctrl + F5 또는 Shift + 새로고침)하신 후 다시 [카카오 계정 1회 연동하기]를 클릭해주세요.'
    }
  }

  return new Promise((resolve) => {
    kakao.Auth.login({
      scope: 'talk_message',
      success: async (authObj: any) => {
        try {
          const accessToken = authObj.access_token
          const refreshToken = authObj.refresh_token
          const expiresIn = authObj.expires_in || 21599 // 기본 약 6시간

          // 사용자 정보 조회 (닉네임 표기용)
          let nickname = '카카오 계정'
          try {
            const userRes = await new Promise<any>((resUser, rejUser) => {
              kakao.API.request({
                url: '/v2/user/me',
                success: resUser,
                fail: rejUser
              })
            })
            if (userRes?.properties?.nickname) {
              nickname = userRes.properties.nickname
            } else if (userRes?.kakao_account?.profile?.nickname) {
              nickname = userRes.kakao_account.profile.nickname
            }
          } catch (_) {
            // 사용자 정보 조회 실패해도 토큰 연동은 성공 처리
          }

          // 설정에 저장
          adminSettings.value.kakaoAccessToken = accessToken
          if (refreshToken) {
            adminSettings.value.kakaoRefreshToken = refreshToken
          }
          adminSettings.value.kakaoTokenExpiresAt = Date.now() + expiresIn * 1000
          adminSettings.value.kakaoConnectedAccount = nickname

          // 클라우드 동기화
          if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
            await forceUploadToCloud()
          }

          resolve({
            success: true,
            message: `카카오 계정(${nickname}) 연동이 성공했습니다! 이제 백그라운드에서 토큰이 자동으로 영구 갱신됩니다.`
          })
        } catch (err: any) {
          resolve({
            success: false,
            message: `토큰 저장 중 오류가 발생했습니다: ${err.message || err}`
          })
        }
      },
      fail: (err: any) => {
        console.error('카카오 로그인 실패:', err)
        const rawErr = err.error_description || err.error || JSON.stringify(err)

        if (rawErr.includes('client_id is not valid') || rawErr.includes('KOE001') || rawErr.includes('KOE009')) {
          resolve({
            success: false,
            message: `client_id is not valid 오류 해결 방법:\n1. [카카오 JavaScript 키] 입력란에 REST API 키가 아닌 32자리 'JavaScript 키'를 입력했는지 확인하세요.\n2. 카카오 개발자 콘솔 [앱 설정 ➔ 플랫폼 ➔ Web]에 현재 주소(${currentOrigin})가 등록되어 있어야 합니다.`
          })
          return
        }

        if (rawErr.includes('Javascript env validation failed') || rawErr.includes('env validation failed')) {
          resolve({
            success: false,
            message: `카카오 도메인 미등록 오류 (Javascript env validation failed):\n현재 접속하신 브라우저 주소 [ ${currentOrigin} ]가 카카오 개발자 콘솔 [앱 설정 ➔ 플랫폼 ➔ Web]에 등록되어 있지 않습니다.\n카카오 개발자 콘솔의 [플랫폼 ➔ Web] 사이트 도메인에 위 주소(${currentOrigin})를 추가하고 저장해주세요.`
          })
          return
        }

        resolve({
          success: false,
          message: `카카오 로그인 취소 또는 오류: ${rawErr}`
        })
      }
    })
  })
}

/**
 * Refresh Token을 사용하여 새 Access Token으로 자동 갱신 (Auto Refresh)
 */
export async function refreshKakaoAccessToken(): Promise<string | null> {
  const refreshToken = adminSettings.value.kakaoRefreshToken
  const restKey = (adminSettings.value.kakaoRestApiKey || '').trim()

  if (!refreshToken || !restKey) {
    return null
  }

  try {
    const params = new URLSearchParams()
    params.append('grant_type', 'refresh_token')
    params.append('client_id', restKey)
    params.append('refresh_token', refreshToken)

    const res = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      body: params.toString()
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.warn('카카오 토큰 갱신 실패:', errData)
      return null
    }

    const data = await res.json()
    const newAccessToken = data.access_token
    const expiresIn = data.expires_in || 21599

    adminSettings.value.kakaoAccessToken = newAccessToken
    adminSettings.value.kakaoTokenExpiresAt = Date.now() + expiresIn * 1000

    // 만약 새 refresh_token이 함께 발급되었다면 교체
    if (data.refresh_token) {
      adminSettings.value.kakaoRefreshToken = data.refresh_token
    }

    // 클라우드 저장
    if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
      forceUploadToCloud().catch(() => {})
    }

    console.info('카카오 Access Token이 성공적으로 자동 갱신되었습니다.')
    return newAccessToken
  } catch (err) {
    console.error('카카오 토큰 자동 갱신 통신 오류:', err)
    return null
  }
}

/**
 * 현재 사용 가능한 유효한 Access Token 가져오기
 * (만료되었거나 만료 5분 전이라면 자동으로 리프레시하여 항상 유효한 토큰 반환)
 */
export async function getValidKakaoToken(): Promise<string | null> {
  const currentToken = adminSettings.value.kakaoAccessToken || adminSettings.value.kakaoRestApiKey
  const expiresAt = adminSettings.value.kakaoTokenExpiresAt || 0
  const hasRefreshToken = Boolean(adminSettings.value.kakaoRefreshToken)

  // 만약 토큰이 있고, 만료까지 5분 이상 남았다면 현재 토큰 사용
  const isExpiringSoon = Date.now() > expiresAt - 5 * 60 * 1000
  if (currentToken && !isExpiringSoon) {
    return currentToken
  }

  // 만료되었거나 곧 만료되는데 Refresh Token이 있다면 자동 갱신 시도
  if (hasRefreshToken) {
    const refreshed = await refreshKakaoAccessToken()
    if (refreshed) {
      return refreshed
    }
  }

  // 자동 갱신할 수 없으면 기존 토큰(또는 수동 입력 키)이라도 반환
  return currentToken || null
}

/**
 * 카카오 계정 연동 해제
 */
export async function disconnectKakaoAccount(): Promise<void> {
  adminSettings.value.kakaoAccessToken = ''
  adminSettings.value.kakaoRefreshToken = ''
  adminSettings.value.kakaoTokenExpiresAt = 0
  adminSettings.value.kakaoConnectedAccount = ''

  if (adminSettings.value.useFirebase && adminSettings.value.firebaseConfig?.apiKey) {
    await forceUploadToCloud()
  }
}
