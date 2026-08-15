import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
// Design system réutilisé tel quel (cf. plan de réécriture) : mêmes
// partials base/layouts/components que l'app actuelle, juste importés
// depuis Vite plutôt que compilés séparément par `npm run build:css`.
import "../../styles/main.scss";

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
