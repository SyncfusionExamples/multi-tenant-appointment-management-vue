import { createApp } from 'vue'
import '@syncfusion/ej2-material3-theme/styles/material3.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { loadData } from './data/store'

// Load src/data/appData.json first: views build their dropdowns and grids from it
loadData()
  .then(() => createApp(App).use(router).mount('#app'))
  .catch((e) => {
    document.getElementById('app').textContent = 'Could not load application data: ' + e.message
  })
