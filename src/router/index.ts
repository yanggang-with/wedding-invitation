import { createRouter, createWebHashHistory } from 'vue-router'
import InvitationView from '../views/InvitationView.vue'
import AdminView from '../views/AdminView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'invitation',
      component: InvitationView
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView
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

export default router

