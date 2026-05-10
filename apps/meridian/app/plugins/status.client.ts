export default defineNuxtPlugin(async () => {
  const status = useStatusSummary();
  try {
    const data = await fetch('https://status.bxteam.org/api/summary').then(r => r.json());
    if (data.status) status.value = data.status;
  } catch {}
});
