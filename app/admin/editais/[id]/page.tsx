import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Users, Building2, FileText, Camera, FileCheck, Award, ArrowLeft } from 'lucide-react'
import { query, queryOne } from '@/lib/db'
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth'
import { EDITAL_DOCUMENT_LABELS, EDITAL_STEP_BY_DOCUMENT_CODE } from '@/lib/edital-completeness'
import {
  EDITAL_REQUIRED_DOCUMENT_CODES,
  EDITAL_PHOTO_DOCUMENT_CODE,
  EDITAL_PHOTOS_PDF_DOCUMENT_CODE,
} from '@/lib/edital-requirements'
import { EDITAL_APPROVAL_MIN_SCORE } from '@/lib/edital-evaluation'
import ThumbnailCard from '@/app/components/admin/ThumbnailCard'
import SubmissionActions from '@/app/components/admin/SubmissionActions'

interface SubmissionDetailRow {
  id: number
  protocol_number: string | null
  registration_id: number
  status: 'DRAFT' | 'SUBMITTED'
  full_name: string
  cpf: string
  team_description: string | null
  institution_name: string | null
  institution_cnpj: string | null
  lab_name: string | null
  lab_area: string | null
  lab_academic_unit: string | null
  lab_structure_description: string | null
  lab_served_public: string | null
  main_improvement_objective: string | null
  budget_items: Array<{ descricao: string; justificativa: string; valor_estimado: number }> | null
  technical_justification: string | null
  expected_results: string | null
  submitted_at: string
  evaluation_scores: Record<string, number> | null
  evaluation_total_score: number | null
  evaluated_by: string | null
  evaluated_at: string | null
  disqualified_at: string | null
  disqualified_reason: string | null
  disqualified_by: string | null
}

interface DocumentRow {
  id: number
  requirement_code: string
  original_filename: string | null
}

async function loadSubmission(id: number): Promise<SubmissionDetailRow | null> {
  return queryOne<SubmissionDetailRow>(
    `SELECT s.id, s.protocol_number, s.registration_id, s.status, r.full_name, r.cpf,
            s.team_description, s.institution_name, s.institution_cnpj,
            s.lab_name, s.lab_area, s.lab_academic_unit, s.lab_structure_description,
            s.lab_served_public, s.main_improvement_objective, s.budget_items,
            s.technical_justification, s.expected_results, s.submitted_at,
            s.evaluation_scores, s.evaluation_total_score, s.evaluated_by, s.evaluated_at,
            s.disqualified_at, s.disqualified_reason, s.disqualified_by
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

function getDocumentCodesForStep(step: string): string[] {
  return EDITAL_REQUIRED_DOCUMENT_CODES.filter((code) => EDITAL_STEP_BY_DOCUMENT_CODE[code] === step)
}

function Block({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 sm:p-8">
      <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-[#22AE84]">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-slate-200 whitespace-pre-wrap">{value}</dd>
    </div>
  )
}

function DocumentGrid({
  codes,
  documentsByCode,
}: {
  codes: string[]
  documentsByCode: Map<string, DocumentRow[]>
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
      {codes.map((code) => {
        const doc = (documentsByCode.get(code) || [])[0]
        const label = EDITAL_DOCUMENT_LABELS[code]

        if (!doc) {
          return (
            <div
              key={code}
              className="aspect-[3/4] rounded-xl border border-dashed border-slate-700/50 flex items-center justify-center p-3"
            >
              <span className="text-xs text-slate-500 text-center">Não enviado</span>
            </div>
          )
        }

        return (
          <ThumbnailCard
            key={code}
            thumbnailUrl={`/api/editais/documento/${doc.id}/thumbnail`}
            openUrl={`/api/editais/documento/${doc.id}/link`}
            label={label}
          />
        )
      })}
    </div>
  )
}

export default async function AdminEditalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const submissionId = Number.parseInt(id, 10)

  if (!Number.isFinite(submissionId)) {
    notFound()
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value

  if (!verifyAdminSessionToken(token)) {
    redirect('/admin/login?next=' + encodeURIComponent(`/admin/editais/${id}`))
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

  const photosPdf = documentsByCode.get(EDITAL_PHOTOS_PDF_DOCUMENT_CODE)?.[0] ?? null
  const photos = documentsByCode.get(EDITAL_PHOTO_DOCUMENT_CODE) || []

  const evaluation =
    submission.evaluation_total_score !== null &&
    submission.evaluation_scores &&
    submission.evaluated_by &&
    submission.evaluated_at
      ? {
          scores: submission.evaluation_scores,
          total: submission.evaluation_total_score,
          evaluatedBy: submission.evaluated_by,
          evaluatedAt: submission.evaluated_at,
        }
      : null

  const disqualification =
    submission.disqualified_at && submission.disqualified_reason && submission.disqualified_by
      ? {
          reason: submission.disqualified_reason,
          disqualifiedBy: submission.disqualified_by,
          disqualifiedAt: submission.disqualified_at,
        }
      : null

  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/admin/editais"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a lista
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">{submission.full_name}</h1>
          <p className="text-slate-400">
            {submission.protocol_number && (
              <span className="text-slate-300">Protocolo {submission.protocol_number} · </span>
            )}
            CPF {submission.cpf} · Enviada em {new Date(submission.submitted_at).toLocaleString('pt-BR')}
          </p>

          {evaluation && (
            <p className="mt-3 text-sm">
              <span
                className={`inline-block px-3 py-1 rounded-full font-bold ${
                  evaluation.total >= EDITAL_APPROVAL_MIN_SCORE
                    ? 'bg-[#22AE84]/20 text-[#22AE84]'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                Nota: {evaluation.total} / 100
              </span>
              <span className="text-slate-500 ml-2">
                avaliado por {evaluation.evaluatedBy} em {new Date(evaluation.evaluatedAt).toLocaleString('pt-BR')}
              </span>
            </p>
          )}

          {disqualification && (
            <div className="mt-3 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
              <p className="text-red-300 font-bold text-sm">Proposta desqualificada</p>
              <p className="text-red-300/80 text-sm mt-1">{disqualification.reason}</p>
              <p className="text-red-300/60 text-xs mt-1">
                por {disqualification.disqualifiedBy} em {new Date(disqualification.disqualifiedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          )}

          <div className="mt-4">
            <SubmissionActions submissionId={submission.id} evaluation={evaluation} disqualification={disqualification} />
          </div>
        </div>

        <Block title="Equipe" icon={<Users className="w-5 h-5" />}>
          <dl className="space-y-4">
            <Field label="Descrição da equipe" value={submission.team_description || '—'} />
          </dl>
          <DocumentGrid codes={getDocumentCodesForStep('equipe')} documentsByCode={documentsByCode} />
        </Block>

        <Block title="Instituição" icon={<Building2 className="w-5 h-5" />}>
          <dl className="space-y-4">
            <Field
              label="Instituição"
              value={`${submission.institution_name || '—'} (${submission.institution_cnpj || 'CNPJ não informado'})`}
            />
            <Field label="Laboratório" value={`${submission.lab_name || '—'} — ${submission.lab_area || '—'}`} />
            <Field label="Unidade acadêmica" value={submission.lab_academic_unit || '—'} />
            <Field
              label="Descrição da estrutura do laboratório"
              value={submission.lab_structure_description || '—'}
            />
            <Field label="Público atendido pelo laboratório" value={submission.lab_served_public || '—'} />
          </dl>
          <DocumentGrid codes={getDocumentCodesForStep('instituicao')} documentsByCode={documentsByCode} />
        </Block>

        <Block title="Proposta" icon={<FileText className="w-5 h-5" />}>
          <dl className="space-y-4">
            <Field
              label="Objetivo principal da melhoria"
              value={submission.main_improvement_objective || '—'}
            />
            <Field label="Justificativa técnica" value={submission.technical_justification || '—'} />
            <Field label="Resultados esperados" value={submission.expected_results || '—'} />
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
        </Block>

        <Block title="Fotos do laboratório" icon={<Camera className="w-5 h-5" />}>
          {photosPdf ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ThumbnailCard
                thumbnailUrl={`/api/editais/documento/${photosPdf.id}/thumbnail`}
                openUrl={`/api/editais/documento/${photosPdf.id}/link`}
                label={photosPdf.original_filename || 'Registro fotográfico (PDF)'}
              />
            </div>
          ) : photos.length === 0 ? (
            <p className="text-slate-500">Nenhuma foto enviada</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <ThumbnailCard
                  key={photo.id}
                  thumbnailUrl={`/api/editais/documento/${photo.id}/thumbnail`}
                  openUrl={`/api/editais/documento/${photo.id}/link`}
                  label={photo.original_filename || 'Foto do laboratório'}
                  aspectClassName="aspect-square"
                />
              ))}
            </div>
          )}
        </Block>

        <Block title="Declarações" icon={<FileCheck className="w-5 h-5" />}>
          <DocumentGrid codes={getDocumentCodesForStep('declaracoes')} documentsByCode={documentsByCode} />
        </Block>

        <Block title="Certificado de inscrição na comunidade" icon={<Award className="w-5 h-5" />}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ThumbnailCard
              thumbnailUrl={`/api/editais/certificado/${submission.registration_id}/thumbnail`}
              openUrl={`/api/editais/certificado/${submission.registration_id}/link`}
              label="Certificado de inscrição"
            />
          </div>
        </Block>
      </div>
    </main>
  )
}
