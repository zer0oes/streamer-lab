import { defineStore } from "pinia";
import { ref } from "vue";
import {
  connectManualToken,
  disconnectIntegration,
  getCurrentUser,
  getEnvDefaults,
  listIntegrations,
  logout as apiLogout,
  type CurrentUser,
  type EnvDefaults,
  type Integration,
  type ManualTokenInput,
  type Provider
} from "../api/account";

export const useAccountStore = defineStore("account", () => {
  const user = ref<CurrentUser | null>(null);
  const authenticated = ref(false);
  const integrations = ref<Integration[]>([]);
  const envDefaults = ref<EnvDefaults | null>(null);
  const loading = ref(false);

  async function fetchMe(): Promise<void> {
    const body = await getCurrentUser();
    authenticated.value = body.authenticated;
    user.value = body.user ?? null;
  }

  async function fetchIntegrations(): Promise<void> {
    if (!authenticated.value) return;
    loading.value = true;
    try {
      integrations.value = await listIntegrations();
    } finally {
      loading.value = false;
    }
  }

  async function fetchEnvDefaults(): Promise<void> {
    if (!authenticated.value) return;
    try {
      envDefaults.value = await getEnvDefaults();
    } catch {
      envDefaults.value = null;
    }
  }

  function integrationFor(provider: Provider): Integration | undefined {
    return integrations.value.find((entry) => entry.provider === provider);
  }

  async function connect(provider: Provider, input: ManualTokenInput): Promise<Integration> {
    const integration = await connectManualToken(provider, input);
    integrations.value = [...integrations.value.filter((entry) => entry.provider !== provider), integration];
    return integration;
  }

  async function disconnect(provider: Provider): Promise<void> {
    await disconnectIntegration(provider);
    integrations.value = integrations.value.filter((entry) => entry.provider !== provider);
  }

  async function logout(): Promise<void> {
    await apiLogout();
    authenticated.value = false;
    user.value = null;
    integrations.value = [];
  }

  return {
    user,
    authenticated,
    integrations,
    envDefaults,
    loading,
    fetchMe,
    fetchIntegrations,
    fetchEnvDefaults,
    integrationFor,
    connect,
    disconnect,
    logout
  };
});
