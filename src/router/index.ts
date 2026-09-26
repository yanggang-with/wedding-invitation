import { createRouter, createWebHashHistory } from 'vue-router'
import InvitationView from '../views/InvitationView.vue'
import AdminView from '../views/AdminView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'invitation',
      component: InvitationView,
      meta: { title: '소중한 분들을 초대합니다' }
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      meta: { title: '청첩장 관리자 페이지' }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.path === from.path) {
      return false
    }
    return { top: 0 }
  }
})

function updateFavicon(iconName: string) {
  const baseUrl = import.meta.env.BASE_URL || './'
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const iconUrl = `${cleanBase}${iconName}`

  const links = document.querySelectorAll("link[rel*='icon']")
  if (links.length > 0) {
    links.forEach((el) => {
      const link = el as HTMLLinkElement
      link.href = iconUrl
    })
  } else {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    link.href = iconUrl
    document.head.appendChild(link)
  }
}

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title as string
  } else {
    document.title = '소중한 분들을 초대합니다'
  }

  // Dynamic favicon switching for Wedding Invitation vs Admin Page
  if (to.path.startsWith('/admin')) {
    updateFavicon('favicon-admin.svg')
  } else {
    updateFavicon('favicon.svg')
  }
})


export default router

