import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import ClinicDashboard from '../views/ClinicDashboard.vue'
import ClinicScheduler from '../views/ClinicScheduler.vue'
import SalonDashboard from '../views/SalonDashboard.vue'
import SalonScheduler from '../views/SalonScheduler.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/clinic', component: ClinicDashboard, meta: { title: 'Patient Management Dashboard' } },
    { path: '/clinic/appointments', component: ClinicScheduler },
    { path: '/salon', component: SalonDashboard, meta: { title: 'Salon Business Dashboard' } },
    { path: '/salon/appointments', component: SalonScheduler },
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title || 'Appointment Management'
})

export default router
