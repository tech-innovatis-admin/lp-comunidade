import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { FileText, Image as ImageIcon } from 'lucide-react'
import { query, queryOne } from '@/lib/db'
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth'
import { EDITAL_DOCUMENT_LABELS } from '@/lib/edital-completeness'
import { EDITAL_REQUIRED_DOCUMENT_CODES, EDITAL_PHOTO_DOCUMENT_CODE } from '@/lib/edital-requirements'

interface SubmissionDetailRow {
  id: number
  registration_id: number
  status: 'DRAFT' | 'SUBMITTED'
  full_name: string
  cpf: string
  team_description: string | null
  institution_name: string | null
  institution_cnpj: string | null
  lab_name: string | null
  lab_area: string | null
  lab_served_public: string | null
  budget_items: Array<{ descricao: string; justificativa: string; valor_estimado: number }> | null
  technical_justification: string | null
  expected_results: string | null
  submitted_at: string
}

interface DocumentRow {
  id: number
  requirement_code: string
  original_filename: string | null
}

async function loadSubmission(id: number): Promise<SubmissionDetailRow | null> {
  return queryOne<SubmissionDetailRow>(
    `SELECT s.id, s.registration_id, s.status, r.full_name, r.cpf,
            s.team_description, s.institution_name, s.institution_cnpj,
            s.lab_name, s.lab_area, s.lab_served_public, s.budget_items,
            s.technical_justification, s.expected_results, s.submitted_at
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.id = $1 AND s.status = 'SUBMITTED'
     LIMIT 1`,
    [id]
  )
}

async function loadDocuments(submissionId: number): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `SELECT id, requirement_code, original_filename
     FROM edital_submission_documents
     WHERE submission_id = $1
     ORDER BY id`,
    [submissionId]
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default async function AdminEditalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value

  if (!verifyAdminSessionToken(token)) {
    redirect('/admin/login')
  }

  const { id } = await params
  const submissionId = Number.parseInt(id, 10)

  if (!Number.isFinite(submissionId)) {
    notFound()
  }

  const submission = await loadSubmission(submissionId)
  if (!submission) {
    notFound()
  }

  const documents = await loadDocuments(submission.id)
  const documentsByCode = new Map<string, DocumentRow[]>()
  for (const doc of documents) {
    const list = documentsByCode.get(doc.requirement_code) || []
    list.push(doc)
    documentsByCode.set(doc.requirement_code, list)
  }

  const photos = documentsByCode.get(EDITAL_PHOTO_DOCUMENT_CODE) || []

  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{submission.full_name}</h1>
          <p className="text-slate-400">
            CPF {submission.cpf} · Enviada em {new Date(submission.submitted_at).toLocaleString('pt-BR')}
          </p>
        </div>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Respostas</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-slate-400">Descrição da equipe</dt>
              <dd className="text-slate-200">{submission.team_description || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Instituição</dt>
              <dd className="text-slate-200">
                {submission.institution_name || '—'} ({submission.institution_cnpj || 'CNPJ não informado'})
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Laboratório</dt>
              <dd className="text-slate-200">
                {submission.lab_name || '—'} — {submission.lab_area || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Público atendido pelo laboratório</dt>
              <dd className="text-slate-200">{submission.lab_served_public || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Justificativa técnica</dt>
              <dd className="text-slate-200 whitespace-pre-wrap">{submission.technical_justification || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Resultados esperados</dt>
              <dd className="text-slate-200 whitespace-pre-wrap">{submission.expected_results || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400 mb-2">Itens de orçamento</dt>
              <dd>
                {!submission.budget_items || submission.budget_items.length === 0 ? (
                  <span className="text-slate-200">—</span>
                ) : (
                  <ul className="space-y-2">
                    {submission.budget_items.map((item, index) => (
                      <li key={index} className="bg-slate-900/40 rounded-xl p-3">
                        <p className="text-slate-200 font-medium">
                          {item.descricao} — {formatCurrency(item.valor_estimado)}
                        </p>
                        <p className="text-sm text-slate-400">{item.justificativa}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Documentos</h2>
          <ul className="space-y-3">
            {EDITAL_REQUIRED_DOCUMENT_CODES.map((code) => {
              const docsForCode = documentsByCode.get(code) || []
              const doc = docsForCode[0]
              return (
                <li key={code} className="bg-slate-900/40 rounded-xl p-4">
                  <p className="text-sm text-slate-400 mb-2">{EDITAL_DOCUMENT_LABELS[code]}</p>
                  {doc ? (
                    <a
                      href={`/api/editais/documento/${doc.id}/link`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 text-[#22AE84] font-medium transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Abrir documento
                    </a>
                  ) : (
                    <span className="text-slate-500">Não enviado</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Fotos do laboratório</h2>
          {photos.length === 0 ? (
            <span className="text-slate-500">Não enviado</span>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={`/api/editais/documento/${photo.id}/link`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-2 aspect-square rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/40 hover:bg-slate-900/60 transition-colors text-slate-400 hover:text-[#22AE84]"
                >
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-xs font-medium">Ver foto</span>
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Certificado de inscrição na comunidade</h2>
          <a
            href={`/api/editais/certificado/${submission.registration_id}/link`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-2xl font-bold transition-all"
          >
            Ver certificado
          </a>
        </section>
      </div>
    </main>
  )
}
