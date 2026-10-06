<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

interface Props {
  /** 글씨 및 잉크 색상 (CSS 컬러 문자열) */
  color?: string
  /** 전체 재생 속도 배율 (기본 1.0, 1.2면 20% 빠름) */
  speed?: number
  /** 마운트 시 자동 재생 여부 */
  autoplay?: boolean
  /** 클릭 시 다시 쓰기(리플레이) 허용 여부 */
  replayable?: boolean
  /** 우측 하단 작은 리플레이 안내 팁 노출 여부 */
  showReplayTip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: '#000000',
  speed: 1.0,
  autoplay: true,
  replayable: false,
  showReplayTip: false
})

const emit = defineEmits<{
  (e: 'complete'): void
  (e: 'start'): void
}>()

const svgContainerRef = ref<HTMLDivElement | null>(null)
const isAnimating = ref(false)
const isCompleted = ref(false)

// Our / Day 페이드인 제어
const isOurVisible = ref(false)
const isDayVisible = ref(false)
const isWeddingVisible = ref(false)
const isFullyRevealed = ref(false)

// Wedding 글자별 획 ref
const strokeRefs: Record<string, SVGPathElement> = {}

// 새 OurWeddingDay.svg (총 24개 패스)
const rawSvgPaths = [
  // 0~5: Our
  "M2785 4649 c-226 -26 -405 -210 -422 -434 -25 -328 290 -585 609 -496 183 50 318 201 349 389 36 215 -102 443 -314 518 -59 21 -151 31 -222 23z m106 -25 c192 -56 331 -272 332 -514 0 -191 -87 -327 -241 -375 -173 -55 -355 41 -451 237 -117 236 -82 489 84 603 51 35 134 63 191 64 17 1 55 -6 85 -15z",
  "M3495 4338 c-68 -16 -70 -17 -57 -30 8 -8 12 -66 12 -182 0 -216 10 -288 47 -340 67 -95 215 -114 304 -39 34 29 73 101 83 153 4 22 -3 12 -18 -29 -42 -111 -123 -167 -201 -141 -42 14 -81 58 -95 108 -5 21 -10 142 -10 275 0 183 -3 237 -12 236 -7 -1 -31 -5 -53 -11z",
  "M3975 4345 c-5 -2 -29 -9 -53 -15 -39 -10 -41 -12 -26 -27 14 -14 16 -38 14 -162 -2 -80 -3 -210 -2 -288 l2 -143 72 0 c68 0 70 1 55 18 -15 16 -17 54 -17 320 0 281 -1 302 -17 301 -10 0 -22 -2 -28 -4z",
  "M4225 4343 c-87 -20 -99 -25 -82 -34 15 -9 17 -36 17 -286 0 -243 -2 -279 -17 -295 -15 -17 -13 -18 71 -18 l86 0 -16 25 c-14 21 -16 49 -13 168 1 78 2 211 1 295 -2 159 -1 156 -47 145z",
  "M4393 4331 c-17 -11 -43 -39 -56 -63 -27 -46 -58 -150 -56 -189 1 -13 5 -4 10 20 25 130 63 202 116 222 51 19 102 -34 118 -123 4 -21 10 -38 14 -38 3 1 23 26 44 56 38 54 38 56 20 76 -48 54 -153 73 -210 39z",
  "M3892 3960 c0 -14 2 -19 5 -12 2 6 2 18 0 25 -3 6 -5 1 -5 -13z",
  // 6~20: Wedding
  "M4165 3623 c-98 -13 -223 -68 -340 -151 -228 -161 -472 -428 -1000 -1092 -271 -342 -414 -508 -542 -630 -110 -105 -202 -171 -119 -85 101 103 189 273 384 737 159 376 285 665 332 758 100 198 229 307 393 330 l62 9 -67 -4 c-138 -9 -286 -94 -467 -269 -133 -130 -256 -275 -514 -605 -528 -675 -674 -845 -827 -964 -19 -15 -30 -27 -24 -27 16 0 150 117 222 194 92 99 222 258 447 546 425 544 554 699 701 845 50 50 113 105 139 124 46 33 46 32 -20 -35 -74 -75 -168 -210 -221 -317 -52 -102 -115 -259 -229 -572 -125 -342 -159 -425 -241 -585 -69 -136 -105 -186 -168 -232 -31 -23 -35 -29 -16 -23 157 46 335 226 780 790 760 962 1043 1218 1345 1219 92 0 157 -24 200 -75 30 -36 48 -100 41 -142 -5 -25 -4 -27 3 -12 18 39 12 127 -12 170 -36 64 -149 110 -242 98z",
  "M1725 3463 c-249 -20 -489 -110 -662 -247 -396 -314 -452 -862 -105 -1024 49 -23 70 -27 147 -26 109 0 170 21 273 94 57 40 172 157 172 175 0 2 -39 -36 -87 -84 -148 -148 -290 -199 -438 -156 -79 23 -173 114 -201 195 -28 82 -26 250 5 350 85 276 255 474 518 605 242 120 470 137 849 64 l162 -31 -80 -76 c-157 -150 -258 -333 -458 -832 -229 -573 -357 -800 -489 -870 -33 -18 -34 -19 -11 -19 32 -1 113 36 106 47 -3 5 13 26 35 48 136 132 240 326 529 984 88 201 225 473 279 556 22 33 59 81 83 106 l43 46 90 0 c102 -1 167 14 197 44 18 18 18 22 5 35 -8 8 -37 17 -63 19 -52 3 -44 -1 19 -11 46 -7 48 -28 5 -52 -41 -21 -235 -33 -223 -13 10 15 104 60 130 61 11 0 14 3 8 6 -16 6 -106 -23 -154 -49 l-37 -20 -169 31 c-161 30 -343 52 -408 49 -16 -1 -48 -3 -70 -5z",
  "M4396 3313 c-6 -14 -5 -15 5 -6 7 7 10 15 7 18 -3 3 -9 -2 -12 -12z",
  "M4585 3155 c-16 -8 -43 -14 -58 -15 -25 0 -41 -20 -154 -192 -167 -256 -545 -828 -547 -828 0 0 1 22 2 49 3 42 0 51 -19 65 -31 21 -68 20 -131 -5 -78 -31 -172 -102 -226 -172 -120 -156 -274 -295 -383 -347 -109 -51 -145 -38 -137 53 6 72 64 189 98 198 18 5 20 7 6 8 -16 1 -13 8 19 49 137 171 255 255 295 207 32 -38 -27 -112 -147 -184 -37 -23 -64 -41 -59 -41 14 0 126 71 163 103 68 60 81 130 26 143 -117 30 -388 -186 -449 -357 -7 -23 -14 -68 -14 -101 0 -52 3 -63 29 -89 67 -66 185 -21 374 145 48 42 87 75 87 73 0 -3 -7 -24 -16 -48 -8 -24 -15 -71 -16 -103 -1 -50 3 -62 22 -78 12 -10 34 -18 49 -17 15 0 20 3 11 6 -49 17 -40 73 35 223 106 212 271 368 350 332 21 -10 25 -19 25 -52 0 -47 -14 -77 -84 -180 -28 -41 -52 -82 -52 -90 -1 -8 -11 -35 -22 -60 -34 -74 -38 -120 -12 -153 46 -58 115 -24 258 127 50 54 92 96 92 93 0 -2 -7 -24 -16 -48 -8 -24 -15 -71 -16 -103 -1 -50 3 -62 22 -78 12 -10 34 -18 49 -17 15 0 20 3 11 6 -49 17 -40 73 35 223 106 212 271 368 350 332 21 -10 25 -19 25 -52 0 -47 -14 -77 -84 -180 -28 -41 -52 -82 -52 -90 -1 -8 -11 -35 -22 -60 -34 -74 -38 -120 -12 -153 28 -35 63 -35 121 1 47 31 189 174 228 232 31 44 12 26 -79 -78 -112 -129 -209 -197 -230 -162 -12 19 5 65 51 144 33 56 802 1224 866 1313 l15 23 -35 -15 c-20 -8 -48 -15 -62 -15 -22 0 -42 -25 -152 -192 -167 -256 -545 -828 -547 -828 0 0 1 22 2 49 3 42 0 51 -19 65 -31 21 -68 20 -131 -5 -95 -37 -171 -102 -279 -235 -130 -161 -209 -246 -266 -284 -100 -66 -114 -22 -36 115 35 61 788 1207 870 1323 18 25 18 25 -22 7z",
  "M4996 2538 c-38 -44 -51 -108 -22 -108 38 0 96 75 96 125 0 39 -33 32 -74 -17z",
  "M4950 2250 c-8 -5 -32 -10 -52 -10 -35 0 -39 -4 -104 -97 -37 -54 -82 -113 -98 -131 -17 -18 -31 -38 -31 -45 -1 -7 -17 -46 -38 -87 -49 -99 -56 -146 -27 -183 15 -18 30 -27 48 -26 17 1 21 3 10 6 -29 7 -26 47 8 114 13 26 83 136 156 245 155 231 150 224 146 224 -2 0 -10 -5 -18 -10z",
  "M5245 2250 c-11 -5 -36 -9 -55 -9 -33 -1 -39 -7 -105 -108 -38 -59 -92 -134 -118 -166 -27 -32 -46 -61 -43 -64 2 -3 -27 -53 -67 -111 -98 -145 -92 -134 -62 -122 15 6 41 10 58 10 30 0 37 9 102 107 39 59 89 131 112 160 24 29 44 58 45 65 2 7 35 60 73 118 82 122 87 130 83 129 -2 0 -12 -4 -23 -9z",
  "M6180 2250 c-8 -5 -32 -10 -53 -10 -33 0 -41 -5 -70 -46 -17 -26 -36 -53 -42 -60 -7 -10 -9 0 -7 35 3 42 0 51 -19 65 -31 21 -68 20 -130 -4 -106 -42 -182 -108 -296 -260 -82 -110 -179 -213 -242 -258 -24 -18 -41 -32 -37 -32 20 0 102 69 171 142 42 46 74 74 71 63 -40 -136 -19 -216 54 -214 15 0 19 3 10 6 -49 17 -40 73 35 223 106 212 271 368 350 332 21 -10 25 -19 25 -55 0 -47 -29 -102 -118 -226 -26 -36 -47 -71 -47 -77 0 -7 -56 -100 -125 -208 l-124 -196 -86 -56 c-344 -229 -581 -491 -598 -662 -13 -137 119 -98 314 93 116 114 158 170 375 493 154 228 158 234 245 299 92 68 394 363 394 385 0 6 -16 -8 -37 -33 -104 -127 -461 -446 -412 -369 29 46 390 595 406 618 17 24 16 27 -7 12z m-761 -1046 c-180 -284 -237 -362 -324 -442 -144 -135 -233 -91 -155 75 58 126 188 282 328 397 75 60 295 216 300 212 1 -2 -66 -111 -149 -242z",
  "M5352 2226 c-34 -16 -85 -57 -145 -117 l-92 -92 92 86 c106 99 195 149 219 125 21 -21 10 -44 -99 -204 -52 -77 -104 -159 -117 -184 -44 -85 -24 -171 39 -169 26 0 26 0 4 9 -45 18 -33 45 107 245 55 79 107 159 115 179 46 110 -16 172 -123 122z",
  "M3100 1990 c-8 -5 -10 -10 -5 -10 6 0 17 5 25 10 8 5 11 10 5 10 -5 0 -17 -5 -25 -10z",
  "M3595 1823 c-44 -48 -100 -99 -124 -115 -52 -32 -43 -38 9 -7 52 31 225 214 198 208 -2 0 -39 -39 -83 -86z",
  "M4235 1823 c-44 -48 -100 -99 -124 -115 -52 -32 -43 -38 9 -7 52 31 225 214 198 208 -2 0 -39 -39 -83 -86z",
  "M4820 1800 c-53 -54 -84 -90 -70 -80 38 28 183 182 169 179 -2 0 -47 -45 -99 -99z",
  "M5760 1804 c-36 -37 -85 -79 -109 -95 -25 -16 -41 -29 -37 -29 28 0 137 88 186 150 17 22 30 40 28 40 -2 0 -33 -30 -68 -66z",
  "M4690 1690 c-9 -6 -10 -10 -3 -10 6 0 15 5 18 10 8 12 4 12 -15 0z",
  // 21~23: Day
  "M2380 1381 c0 -6 5 -13 10 -16 14 -8 14 -872 0 -880 -32 -20 7 -25 188 -25 289 0 396 30 520 145 146 135 183 347 91 528 -56 109 -203 212 -347 242 -78 17 -462 21 -462 6z m422 -12 c202 -43 328 -214 328 -444 0 -199 -85 -341 -249 -418 -63 -30 -72 -32 -218 -35 l-153 -4 0 456 0 456 120 0 c65 0 143 -5 172 -11z",
  "M3585 1081 c-74 -34 -105 -85 -105 -175 0 -50 -2 -54 -30 -66 -41 -17 -105 -89 -120 -135 -18 -55 -8 -127 23 -169 51 -66 180 -102 275 -77 50 14 115 69 142 120 l19 36 1 -77 0 -78 71 0 70 0 -15 22 c-13 19 -16 58 -16 228 0 114 -5 222 -11 243 -32 115 -189 181 -304 128z m145 -19 c34 -25 60 -79 60 -127 l0 -41 -67 4 c-38 2 -101 -3 -142 -12 -40 -8 -78 -13 -82 -10 -14 8 -11 71 5 107 38 90 155 130 226 79z m29 -178 l31 -6 0 -115 c0 -77 -5 -125 -14 -148 -41 -97 -120 -151 -207 -143 -88 9 -138 62 -146 156 -7 79 14 138 66 185 61 55 185 88 270 71z",
  "M4034 1060 c44 -49 87 -136 201 -403 l89 -208 -26 -52 c-48 -98 -114 -155 -164 -143 -32 8 -48 40 -54 113 l-5 61 -54 -47 -53 -47 28 -33 c71 -84 197 -79 266 11 38 50 57 92 158 343 119 295 127 311 223 433 7 9 -8 12 -72 12 l-81 0 20 -32 c26 -43 25 -79 -4 -164 -31 -90 -117 -307 -126 -317 -9 -10 -181 395 -187 443 -3 22 -1 40 6 44 30 19 2 26 -95 26 l-106 0 36 -40z"
]

// Wedding 세부 그룹별 원본 패스 인덱스 분리
// W(6,7,8), eddin(9,10,11,12,14,15,16,17,18,20), g(13,19)
const wPathIndices = [6, 7, 8]
const eddinPathIndices = [9, 10, 11, 12, 14, 15, 16, 17, 18, 20]
const gPathIndices = [13, 19]

// Wedding 필기체 획 순서 정의 (W1 -> W2 -> e -> d1 -> d2 -> n -> g)
// [1단계: Our 페이드인(0~0.60s)] -> [2단계: Wedding 드로잉 및 완성(0.65~2.75s)] -> [3단계: Day 페이드인(2.85s~)]
const letterStrokes = [
  // 1. W1: [좌상단 -> 좌측 외곽 스월 -> 좌하단 바닥 -> 중앙 꼭대기]
  {
    id: 'W1',
    name: 'W (좌상단→좌하단→중앙)',
    maskGroup: 'w',
    strokeD: 'M 172 153 C 100 165, 72 215, 78 260 C 85 310, 105 342, 135 342 C 142 310, 150 265, 175 220 C 195 180, 220 160, 240 160',
    strokeWidth: 74,
    delay: 0.65,
    duration: 0.35
  },
  // 2. W2: [중앙 꼭대기 -> 바닥 기둥 루프 -> 우측 중심선 관통 -> 우상단 스월 끝까지]
  {
    id: 'W2',
    name: 'W (중앙→우하단→우상단 스월)',
    maskGroup: 'w',
    strokeD: 'M 240 160 C 235 230, 215 300, 160 340 C 145 342, 175 330, 220 300 C 265 260, 282 220, 310 180 C 350 145, 416 137, 442 160',
    strokeWidth: 74,
    delay: 1.00,
    duration: 0.40
  },
  // 3. e: W가 100% 완성된 직후 시작! 중앙 가로 -> 위 루프 -> 아래 곡선
  {
    id: 'e',
    name: 'e',
    maskGroup: 'eddin',
    strokeD: 'M 290 295 C 315 295, 335 285, 325 250 C 305 240, 285 260, 290 295 C 295 325, 325 330, 345 315',
    strokeWidth: 58,
    delay: 1.42,
    duration: 0.22
  },
  // 4. d1 (첫 번째 d): 둥근 몸체 원 -> 꼭대기(X:458, Y:175)에서 바닥(X:398, Y:335)으로 내리긋는 이탤릭 기둥
  {
    id: 'd1',
    name: 'd1',
    maskGroup: 'eddin',
    strokeD: 'M 390 285 C 350 275, 345 315, 385 328 M 458 175 L 398 335 C 398 340, 410 332, 420 315',
    strokeWidth: 68,
    delay: 1.65,
    duration: 0.25
  },
  // 5. d2 (두 번째 d): 둥근 몸체 원 -> 꼭대기(X:523, Y:175)에서 바닥(X:463, Y:335)으로 내리긋는 이탤릭 기둥
  {
    id: 'd2',
    name: 'd2',
    maskGroup: 'eddin',
    strokeD: 'M 455 285 C 415 275, 410 315, 450 328 M 523 175 L 463 335 C 463 340, 475 332, 485 315',
    strokeWidth: 68,
    delay: 1.92,
    duration: 0.25
  },
  // 6. n: 왼쪽 기둥 내림 -> 위로 솟아올라 아치 그리며 우하단
  {
    id: 'n',
    name: 'n',
    maskGroup: 'eddin',
    strokeD: 'M 475 270 L 475 330 M 475 285 C 495 260, 520 265, 525 330',
    strokeWidth: 58,
    delay: 2.18,
    duration: 0.20
  },
  // 7. g: 둥근 머리 -> 우측 기둥 -> 바닥(Y:435) 및 우측 끝(X:633)까지 뻗는 웅장한 스월 루프
  {
    id: 'g',
    name: 'g',
    maskGroup: 'g',
    strokeD: 'M 555 280 C 515 270, 510 315, 550 318 L 558 270 L 560 345 C 565 410, 550 440, 510 435 C 470 420, 480 370, 540 350 C 585 345, 630 360, 620 275 L 633 275',
    strokeWidth: 70,
    delay: 2.40,
    duration: 0.35
  }
]

let animationTimers: number[] = []

/** 필기체 캘리그라피 및 페이드인 애니메이션 실행 */
const startAnimation = () => {
  if (isAnimating.value) return // 중복 실행 방지
  clearTimers()

  isAnimating.value = true
  isCompleted.value = false
  isFullyRevealed.value = false
  emit('start')

  const effectiveSpeed = Math.max(0.2, props.speed)

  // 1. 초기화: 모든 마스크 스트로크를 0으로 숨김
  letterStrokes.forEach(letter => {
    const el = strokeRefs[letter.id]
    if (!el) return
    const len = el.getTotalLength() || 1500
    el.style.transition = 'none'
    el.style.strokeDasharray = `${len} ${len}`
    el.style.strokeDashoffset = `${len}`
  })

  // 브라우저 렌더 트리 리플로우 강제
  void svgContainerRef.value?.getBoundingClientRect()

  // 2. [1단계] Our 페이드인 (0.05s 시작, 약 0.6초 동안 단독 페이드인)
  isOurVisible.value = false
  isDayVisible.value = false
  isWeddingVisible.value = true

  const ourTimer = window.setTimeout(() => {
    isOurVisible.value = true
  }, (0.05 / effectiveSpeed) * 1000)
  animationTimers.push(ourTimer)

  // 3. [2단계] Wedding 필기체 획 작성 (Our가 완성된 0.65s에 시작!)
  letterStrokes.forEach(letter => {
    const el = strokeRefs[letter.id]
    if (!el) return

    const delay = (letter.delay / effectiveSpeed) * 1000
    const duration = (letter.duration / effectiveSpeed) * 1000

    const t = window.setTimeout(() => {
      el.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`
      el.style.strokeDashoffset = '0'
    }, delay)
    animationTimers.push(t)
  })

  // 4. [Wedding 완성 및 마스크 완전 개방] (2.75s: Day가 시작되기 전에 Wedding을 100% 완성 상태로 확정!)
  const revealTimer = window.setTimeout(() => {
    isFullyRevealed.value = true
  }, (2.75 / effectiveSpeed) * 1000)
  animationTimers.push(revealTimer)

  // 5. [3단계] Day 페이드인 (2.85s: Wedding이 100% 완전해진 후, D가 아무런 깨짐 없이 온전하게 시작!)
  const dayTimer = window.setTimeout(() => {
    isDayVisible.value = true
  }, (2.85 / effectiveSpeed) * 1000)
  animationTimers.push(dayTimer)

  // 6. 최종 완료 이벤트 (Day 페이드인이 또렷해지는 시점에 바로 완료 이벤트 발생)
  const totalDuration = ((2.85 + 0.35) / effectiveSpeed) * 1000
  const completeTimer = window.setTimeout(() => {
    isAnimating.value = false
    isCompleted.value = true
    emit('complete')
  }, totalDuration)
  animationTimers.push(completeTimer)
}

const clearTimers = () => {
  animationTimers.forEach(t => clearTimeout(t))
  animationTimers = []
}

const replay = () => {
  if (isAnimating.value) return
  startAnimation()
}

onMounted(() => {
  nextTick(() => {
    // 렌더링이 완전히 안정화된 후 애니메이션 시작
    window.setTimeout(() => {
      if (props.autoplay) {
        startAnimation()
      }
    }, 200)
  })
})

onBeforeUnmount(() => {
  clearTimers()
})

defineExpose({
  replay,
  start: startAnimation
})
</script>

<template>
  <div
    ref="svgContainerRef"
    class="calligraphy-wrapper"
    :class="{ 'is-clickable': replayable, 'is-animating': isAnimating, 'is-completed': isCompleted }"
    @click="replayable && replay()"
    role="img"
    aria-label="Our Wedding Day 캘리그라피 타이틀"
  >
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 700 500"
      preserveAspectRatio="xMidYMid meet"
      class="calligraphy-svg"
      :style="{ '--ink-color': color }"
    >
      <defs>
        <!-- 1. W 전용 마스크 (e 등 다른 글자를 전혀 침범하지 않음!) -->
        <mask
          id="wMask"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="700"
          height="500"
        >
          <rect width="700" height="500" fill="black" />
          <rect
            width="700"
            height="500"
            fill="white"
            class="full-reveal-rect"
            :class="{ 'is-active': isFullyRevealed }"
          />
          <path
            v-for="letter in letterStrokes.filter(l => l.maskGroup === 'w')"
            :key="letter.id"
            :ref="el => { if (el) strokeRefs[letter.id] = el as SVGPathElement }"
            :d="letter.strokeD"
            fill="none"
            stroke="white"
            :stroke-width="letter.strokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </mask>

        <!-- 2. eddin 전용 마스크 (e, d1, d2, n - W가 100% 끝난 후에만 순차 오픈!) -->
        <mask
          id="eddinMask"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="700"
          height="500"
        >
          <rect width="700" height="500" fill="black" />
          <rect
            width="700"
            height="500"
            fill="white"
            class="full-reveal-rect"
            :class="{ 'is-active': isFullyRevealed }"
          />
          <path
            v-for="letter in letterStrokes.filter(l => l.maskGroup === 'eddin')"
            :key="letter.id"
            :ref="el => { if (el) strokeRefs[letter.id] = el as SVGPathElement }"
            :d="letter.strokeD"
            fill="none"
            stroke="white"
            :stroke-width="letter.strokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </mask>

        <!-- 3. g 전용 마스크 (g 머리, 기둥, 하단 롱 스월 루프) -->
        <mask
          id="gMask"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="700"
          height="500"
        >
          <rect width="700" height="500" fill="black" />
          <rect
            width="700"
            height="500"
            fill="white"
            class="full-reveal-rect"
            :class="{ 'is-active': isFullyRevealed }"
          />
          <path
            v-for="letter in letterStrokes.filter(l => l.maskGroup === 'g')"
            :key="letter.id"
            :ref="el => { if (el) strokeRefs[letter.id] = el as SVGPathElement }"
            :d="letter.strokeD"
            fill="none"
            stroke="white"
            :stroke-width="letter.strokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </mask>
      </defs>

      <!-- 1. "Our" 그룹: 캘리그라피 없이 부드러운 페이드인 -->
      <g
        class="fade-group our-group"
        :class="{ 'is-visible': isOurVisible }"
        transform="translate(0.000000,500.000000) scale(0.100000,-0.100000)"
        fill="var(--ink-color, #000000)"
      >
        <path v-for="idx in [0, 1, 2, 3, 4, 5]" :key="idx" :d="rawSvgPaths[idx]" />
      </g>

      <!-- 2. "Wedding" 그룹: 분리 마스크로 상호 간섭 없이 순수 필기체 순서 보장 -->
      <g
        class="wedding-group"
        :class="{ 'is-visible': isWeddingVisible }"
        fill="var(--ink-color, #000000)"
      >
        <!-- (1) W 글자 그룹: 마스크는 루트 700x500 좌표계에서 동작 -->
        <g mask="url(#wMask)">
          <g transform="translate(0.000000,500.000000) scale(0.100000,-0.100000)">
            <path v-for="idx in wPathIndices" :key="idx" :d="rawSvgPaths[idx]" />
          </g>
        </g>
        <!-- (2) eddin 글자 그룹: 마스크는 루트 700x500 좌표계에서 동작 -->
        <g mask="url(#eddinMask)">
          <g transform="translate(0.000000,500.000000) scale(0.100000,-0.100000)">
            <path v-for="idx in eddinPathIndices" :key="idx" :d="rawSvgPaths[idx]" />
          </g>
        </g>
        <!-- (3) g 글자 그룹: 마스크는 루트 700x500 좌표계에서 동작 -->
        <g mask="url(#gMask)">
          <g transform="translate(0.000000,500.000000) scale(0.100000,-0.100000)">
            <path v-for="idx in gPathIndices" :key="idx" :d="rawSvgPaths[idx]" />
          </g>
        </g>
      </g>

      <!-- 3. "Day" 그룹: 캘리그라피 없이 부드러운 페이드인 -->
      <g
        class="fade-group day-group"
        :class="{ 'is-visible': isDayVisible }"
        transform="translate(0.000000,500.000000) scale(0.100000,-0.100000)"
        fill="var(--ink-color, #000000)"
      >
        <path v-for="idx in [21, 22, 23]" :key="idx" :d="rawSvgPaths[idx]" />
      </g>
    </svg>

    <!-- 인터랙티브 안내 팁 -->
    <div v-if="showReplayTip && isCompleted" class="replay-hint font-sans">
      <span class="replay-icon">↺</span>
      <span>터치하여 다시 쓰기</span>
    </div>
  </div>
</template>

<style scoped>
.calligraphy-wrapper {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.calligraphy-wrapper.is-clickable {
  cursor: pointer;
}

.calligraphy-wrapper.is-clickable:active {
  transform: scale(0.97);
}

.calligraphy-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
  filter: drop-shadow(0 2px 8px rgba(40, 48, 56, 0.06));
}

/* Our / Day 부드러운 페이드인 */
.fade-group {
  opacity: 0;
  transition: opacity 0.65s cubic-bezier(0.25, 1, 0.5, 1);
}

.fade-group.is-visible {
  opacity: 1;
}

/* Wedding 그룹 */
.wedding-group {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.wedding-group.is-visible {
  opacity: 1;
}

/* 완성 시 전체 개방 오버레이 */
.full-reveal-rect {
  opacity: 0;
  transition: opacity 0.4s ease-out;
}

.full-reveal-rect.is-active {
  opacity: 1;
}

.replay-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--gold-primary, #555D66);
  opacity: 0.65;
  margin-top: 2px;
  animation: fadeInHint 0.6s ease-out;
}

.replay-icon {
  font-size: 13px;
  line-height: 1;
}

@keyframes fadeInHint {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 0.65;
    transform: translateY(0);
  }
}
</style>
