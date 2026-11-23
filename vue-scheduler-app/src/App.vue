<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ButtonComponent as EjsButton } from '@syncfusion/ej2-vue-buttons'

const route = useRoute()
const router = useRouter()
const isHome = computed(() => route.path === '/')
const tenant = computed(() => (route.path.startsWith('/salon') ? 'salon' : 'clinic'))
const links = computed(() =>
  tenant.value === 'clinic'
    ? [
        { to: '/clinic', label: 'Patient Management Dashboard' },
        { to: '/clinic/appointments', label: 'Appointments' },
      ]
    : [
        { to: '/salon', label: 'Dashboard & Customers' },
        { to: '/salon/appointments', label: 'Scheduler' },
      ],
)
</script>

<template>
  <header v-if="!isHome" class="topbar">
    <div class="brand">BookWise <span>Multi-tenant scheduling</span></div>
    <nav>
      <router-link v-for="l in links" :key="l.to" :to="l.to" exact-active-class="active">
        {{ l.label }}
      </router-link>
    </nav>
    <ejs-button content="Return to Dashboard" iconCss="e-icons e-chevron-left" @click="router.push('/')" />
  </header>
  <main class="page"><router-view :key="route.path" /></main>
</template>
