// Killers, maps, mates and events with their usage counts, shared by every admin page.
export function useAdminReference() {
  return useFetch('/api/admin/reference', { key: 'admin-reference' })
}

export type AdminReference = NonNullable<ReturnType<typeof useAdminReference>['data']['value']>
export type ReferenceListName = keyof AdminReference
