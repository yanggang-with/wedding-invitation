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

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title as string
  } else {
    document.title = '소중한 분들을 초대합니다'
  }
})


export default router

