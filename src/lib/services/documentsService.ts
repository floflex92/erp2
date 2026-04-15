import { looseSupabase } from '@/lib/supabaseLoose'

export interface DocumentListItem {
  id: string
  company_id: number
  type_document: string
  nom_fichier: string
  created_at: string
  link_count: number
  version_count: number
}

export async function listRecentDocuments(companyId?: number, limit = 50): Promise<DocumentListItem[]> {
  let query = looseSupabase
    .from('documents')
    .select('id, company_id, type_document, nom_fichier, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (typeof companyId === 'number') {
    query = query.eq('company_id', companyId)
  }

  const documentsRes = await query

  if (!documentsRes.error && Array.isArray(documentsRes.data)) {
    const documentIds = (documentsRes.data as Array<{ id: string }>).map(d => d.id)

    const [linksRes, versionsRes] = await Promise.all([
      looseSupabase.from('document_links').select('document_id').in('document_id', documentIds),
      looseSupabase.from('document_versions').select('document_id').in('document_id', documentIds),
    ])

    const linksByDoc = new Map<string, number>()
    if (Array.isArray(linksRes.data)) {
      for (const row of linksRes.data as Array<Record<string, unknown>>) {
        const docId = String(row.document_id ?? '')
        linksByDoc.set(docId, (linksByDoc.get(docId) ?? 0) + 1)
      }
    }

    const versionsByDoc = new Map<string, number>()
    if (Array.isArray(versionsRes.data)) {
      for (const row of versionsRes.data as Array<Record<string, unknown>>) {
        const docId = String(row.document_id ?? '')
        versionsByDoc.set(docId, (versionsByDoc.get(docId) ?? 0) + 1)
      }
    }

    return (documentsRes.data as Array<Record<string, unknown>>).map(row => {
      const id = String(row.id)
      return {
        id,
        company_id: Number(row.company_id ?? 1),
        type_document: String(row.type_document ?? 'autre'),
        nom_fichier: String(row.nom_fichier ?? 'document_sans_nom'),
        created_at: String(row.created_at ?? new Date().toISOString()),
        link_count: linksByDoc.get(id) ?? 0,
        version_count: versionsByDoc.get(id) ?? 0,
      }
    })
  }

  return []
}
