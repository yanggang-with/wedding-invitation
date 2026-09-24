// Naver Maps OpenAPI Global Window Type Definition
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    naver: any
    initMap?: () => void
  }

}

export {}
