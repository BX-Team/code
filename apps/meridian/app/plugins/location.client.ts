import { API_BASE } from '~/lib/api';

export default defineNuxtPlugin(async () => {
  const colo = useColocation();
  try {
    const data = await fetch(`${API_BASE}/location`).then(r => r.json());
    if (!data.colo) return;
    const region = [data.city, data.country].filter(Boolean).join(', ');
    colo.value = region ? `${region} (${data.colo})` : data.colo;
  } catch {}
});
