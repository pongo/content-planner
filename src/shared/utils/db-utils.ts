export async function requestPersistentStorage(): Promise<void> {
  if (!navigator.storage?.persist) return;

  const isPersisted = await navigator.storage.persisted();
  console.log(`Persisted storage granted: ${isPersisted}`);
  if (isPersisted) return;

  const granted = await navigator.storage.persist();
  console.log(`Persisted storage request result: ${granted}`);
}
