import { ref } from "vue";
import { getAppState, type AppState } from "../api/state";

// Chargé une seule fois et partagé par tous les aperçus (éditeur widget
// standalone, items d'overlay sur le canevas, modale "voir le code") :
// /api/state renvoie les mêmes données de session/chaîne de démo
// (mocks/session.json côté serveur) pour toute l'app tant qu'aucun
// événement n'a été simulé — pas la peine de le refetcher à chaque montage
// d'iframe. Sans ce fetch, un widget qui affiche "dernier follower/sub/tip"
// (cf. onWidgetLoad) n'a jamais rien à montrer : c'était le cas juste avant
// ce correctif, session/recents étant envoyés vides en dur.
const state = ref<AppState | null>(null);
let pending: Promise<AppState> | null = null;

export function loadAppState(): Promise<AppState> {
  if (state.value) return Promise.resolve(state.value);
  if (!pending) {
    pending = getAppState()
      .then((data) => {
        state.value = data;
        return data;
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

export function useAppState() {
  return state;
}
