import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import 'primeicons/primeicons.css';
import App from './App.vue';
import './style.css';

createApp(App)
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      // Pin to light mode. Aura's darkModeSelector defaults to 'system', so its
      // components and tokens would follow the OS and clash with the app's
      // light chrome; `false` disables dark entirely for one consistent theme.
      options: { darkModeSelector: false },
    },
  })
  .use(ConfirmationService)
  .directive('tooltip', Tooltip)
  .mount('#app');
