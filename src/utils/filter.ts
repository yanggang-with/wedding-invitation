/**
 * 방명록 및 텍스트 비속어 / 악담 필터링 유틸리티
 */

// 대표적인 욕설 및 비속어 키워드 목록
const PROFANITY_WORDS = [
  // 심한 욕설 및 비하
  '시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '씨바', '시바', '개새끼', '개색기', '개새', '개색',
  '병신', 'ㅂㅅ', 'ㅄ', '지랄', 'ㅈㄹ', '존나', '졸라', '썅', '씨앙',
  '미친놈', '미친년', '미친새끼', '닥쳐', '꺼져', '꺼저', '씹창', '엠창', '창녀', '걸레',
  '새끼', '놈', '년', // 주의: 단독 비속어는 아래 정규식에서 안전하게 처리
  '좆', '죶', '자지', '보지', '섹스', 'ㅅㅅ', 'fuck', 'shit', 'bitch', 'asshole',
  '한남', '한녀', '맘충', '틀딱', '느금마', '애미', '애비'
]

// 결혼식에 부적절한 악담 및 저주 단어
const WEDDING_CURSE_WORDS = [
  '이혼', '파혼', '망해라', '망해', '폭망', '망할', '뒤져', '죽어', '죽어라',
  '바람펴', '바람피', '불륜', '헤어져', '갈라서', '재혼', '부도'
]

// 조합형 정규식 생성
const SENSITIVE_WORDS = [...PROFANITY_WORDS, ...WEDDING_CURSE_WORDS]

/**
 * 텍스트에 비속어나 악담이 포함되어 있는지 검사합니다.
 * 공백이나 특수문자로 우회하는 경우도 감지합니다. (예: "시.발", "이 혼", "개-새-끼")
 */
export function checkProfanity(text: string): { containsProfanity: boolean; detectedWord?: string } {
  if (!text || typeof text !== 'string') {
    return { containsProfanity: false }
  }

  // 1. 공백 및 특수문자 제거 후 검사 (우회 방지)
  const normalizedText = text.replace(/[\s\.\,\-\_\~\!\@\#\$\%\^\&\*\(\)\=\+\/\\\<\>\?]/g, '').toLowerCase()

  for (const word of SENSITIVE_WORDS) {
    if (word.length <= 1) continue // 1글자는 문맥 오탐 방지

    // 정규식이나 포함 여부 검사
    if (normalizedText.includes(word.toLowerCase())) {
      return { containsProfanity: true, detectedWord: word }
    }
  }

  // 2. 단독형 1글자 심한 욕설 (예: '좆', '썅' 등)
  const standaloneRegex = /(^|\s)[좆썅](\s|$|[!?.])/g
  if (standaloneRegex.test(text)) {
    return { containsProfanity: true, detectedWord: '부적절한 단어' }
  }

  return { containsProfanity: false }
}
