/**
 * Guestbook Password Encryption & Decryption Utility
 * 방명록 비밀번호 양방향 암호화 및 복호화 유틸리티
 */

const SECRET_SALT = 'WEDDING_GB_SALT_2026_YYJ_KJW'

/**
 * 비밀번호를 암호화하여 저장용 문자열로 반환
 */
export function encryptPassword(plain: string): string {
  if (!plain) return ''
  try {
    const utf8Str = encodeURIComponent(plain)
    const chars = Array.from(utf8Str)
    const saltChars = Array.from(SECRET_SALT)

    const cipherCodes = chars.map((ch, idx) => {
      const code = ch.charCodeAt(0)
      const saltCode = saltChars[idx % saltChars.length].charCodeAt(0)
      return String.fromCharCode(code ^ saltCode)
    })

    const rawEncrypted = cipherCodes.join('')
    // Base64 인코딩 후 암호화 식별 접두사(ENC:) 부여
    return 'ENC:' + btoa(rawEncrypted)
  } catch (err) {
    console.error('Password encryption failed:', err)
    return plain
  }
}

/**
 * 암호화된 비밀번호를 복호화하여 원본 문자열로 반환
 */
export function decryptPassword(cipher: string): string {
  if (!cipher) return ''
  // 암호화 접두사가 없으면 기존 레거시 평문 비밀번호로 취급
  if (!cipher.startsWith('ENC:')) {
    return cipher
  }

  try {
    const base64Body = cipher.slice(4)
    const rawEncrypted = atob(base64Body)
    const chars = Array.from(rawEncrypted)
    const saltChars = Array.from(SECRET_SALT)

    const plainCodes = chars.map((ch, idx) => {
      const code = ch.charCodeAt(0)
      const saltCode = saltChars[idx % saltChars.length].charCodeAt(0)
      return String.fromCharCode(code ^ saltCode)
    })

    const utf8Str = plainCodes.join('')
    return decodeURIComponent(utf8Str)
  } catch (err) {
    console.error('Password decryption failed:', err)
    return cipher
  }
}

/**
 * 사용자가 입력한 비밀번호와 저장된 암호화 비밀번호 일치 여부 검증
 */
export function verifyPassword(inputPass: string, storedPass: string): boolean {
  if (!inputPass || !storedPass) return false
  
  // 1. 저장된 비밀번호 복호화 후 비교
  const decrypted = decryptPassword(storedPass)
  if (decrypted === inputPass) return true

  // 2. 입력값을 암호화하여 직접 비교
  const encryptedInput = encryptPassword(inputPass)
  if (encryptedInput === storedPass) return true

  // 3. 레거시 평문 저장건과의 직접 비교 (하위 호환성)
  return storedPass === inputPass
}

