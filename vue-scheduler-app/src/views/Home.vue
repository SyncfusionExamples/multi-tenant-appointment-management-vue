<script setup>
import { useRouter } from 'vue-router'
import { ButtonComponent as EjsButton } from '@syncfusion/ej2-vue-buttons'

const router = useRouter()
</script>

<template>
  <section class="home">
    <h1 class="page-title">Dashboard</h1>
    <p class="home-sub">Choose a module to get started.</p>
    <div class="home-actions">
      <ejs-button cssClass="e-primary e-large" :isPrimary="true" content="Clinic Appointment Management" @click="router.push('/clinic')" />
      <ejs-button cssClass="e-primary e-large" :isPrimary="true" content="Salon Appointment Management" @click="router.push('/salon')" />
    </div>
  </section>
</template>

