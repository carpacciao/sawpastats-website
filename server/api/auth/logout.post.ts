export default defineEventHandler(async (event) => {
  await deleteSession(event)
  return { ok: true }
})
