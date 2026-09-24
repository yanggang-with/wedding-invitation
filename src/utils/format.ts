/**
 * 전화번호에 자동으로 하이픈(-)을 삽입하는 유틸리티 함수
 * 
 * 지원 형식:
 * - 02 서울 지역번호: 02-XXX-XXXX (9자리) 또는 02-XXXX-XXXX (10자리)
 * - 010, 011, 016, 017, 018, 019 휴대전화: 010-XXXX-XXXX (11자리), 011-XXX-XXXX (10자리)
 * - 031, 032, 051 등 기타 지역번호: 031-XXX-XXXX (10자리), 031-XXXX-XXXX (11자리)
 * - 1588, 1544, 1688 등 전국대표번호: 1588-XXXX (8자리)
 */
export function formatPhoneNumber(val: string): string {
  if (!val) return ''
  const clean = val.replace(/\D/g, '')

  // 1) 서울 지역번호 (02)
  if (clean.startsWith('02')) {
    const s = clean.slice(0, 10)
    if (s.length <= 2) return s
    if (s.length <= 5) return `${s.slice(0, 2)}-${s.slice(2)}`
    if (s.length <= 9) return `${s.slice(0, 2)}-${s.slice(2, 5)}-${s.slice(5)}`
    return `${s.slice(0, 2)}-${s.slice(2, 6)}-${s.slice(6)}`
  }

  // 2) 15XX, 16XX, 18XX 전국대표번호
  if (/^(15|16|18)\d/.test(clean) && !clean.startsWith('0')) {
    const s = clean.slice(0, 8)
    if (s.length <= 4) return s
    return `${s.slice(0, 4)}-${s.slice(4)}`
  }

  // 3) 010, 031, 051 등 3자리 국번 (최대 11자리)
  const s = clean.slice(0, 11)
  if (s.length <= 3) return s
  if (s.length <= 6) return `${s.slice(0, 3)}-${s.slice(3)}`
  if (s.length <= 10) return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`
  return `${s.slice(0, 3)}-${s.slice(3, 7)}-${s.slice(7)}`
}
