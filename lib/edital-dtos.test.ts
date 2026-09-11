import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDocumentUploadFields,
  parseDraftRequest,
  toStableErrorDto,
} from './edital-dto-validation';
import { toDocumentDto, toSubmissionDto } from './edital-dtos';

const uploadedAt = new Date('2026-09-11T12:34:56.000Z');
const updatedAt = new Date('2026-09-11T13:00:00.000Z');

const internalDocument = {
  id: 77,
  requirement_code: '8.1.1',
  original_filename: 'documento.pdf',
  mime_type: 'application/pdf',
  size_bytes: 12345,
  uploaded_at: uploadedAt,
  registration_id: 123,
  s3_key: 'private/editais/documento.pdf',
  file_hash: 'hash-nao-publico',
  request_ip: '203.0.113.10',
  user_agent: 'Sensitive Browser',
};

const internalSubmission = {
  id: 55,
  registration_id: 123,
  status: 'DRAFT' as const,
  team_description: 'Equipe técnica',
  institution_name: 'Instituição de teste',
  institution_cnpj: '11222333000181',
  lab_name: 'Laboratório',
  lab_area: 'Biotecnologia',
  lab_served_public: 'Comunidade acadêmica',
  lab_academic_unit: 'Unidade acadêmica',
  lab_structure_description: 'Estrutura atual',
  main_improvement_objective: 'Modernizar laboratório',
  budget_items: [
    {
      descricao: 'Microscópio',
      valor_estimado: 1200,
      justificativa: 'Uso nas atividades',
    },
  ],
  technical_justification: 'Justificativa técnica',
  expected_results: 'Resultados esperados',
  created_at: new Date('2026-09-10T10:00:00.000Z'),
  updated_at: updatedAt,
  submitted_at: null,
  cpf: '12345678901',
  s3_key: 'private/editais/submission.json',
  file_hash: 'hash-da-submissao',
  request_ip: '203.0.113.11',
  user_agent: 'Sensitive Agent',
  documents: [internalDocument],
};

test('mapeia documento por allowlist sem campos sensíveis', () => {
  const dto = toDocumentDto(internalDocument);
  const serialized = JSON.stringify(dto);

  assert.deepEqual(dto, {
    id: 77,
    requirementCode: '8.1.1',
    originalFilename: 'documento.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 12345,
    uploadedAt: '2026-09-11T12:34:56.000Z',
  });
  assert.doesNotMatch(serialized, /registration_id|s3_key|file_hash|request_ip|user_agent/);
  assert.doesNotMatch(serialized, /private\/editais|hash-nao-publico|203\.0\.113|Sensitive/);
});

test('mapeia submissão por allowlist sem registrationId nem metadados internos', () => {
  const dto = toSubmissionDto(internalSubmission);
  const serialized = JSON.stringify(dto);

  assert.equal(dto.id, 55);
  assert.equal(dto.status, 'DRAFT');
  assert.equal('registrationId' in dto, false);
  assert.deepEqual(dto.documents, [toDocumentDto(internalDocument)]);
  assert.equal(dto.createdAt, '2026-09-10T10:00:00.000Z');
  assert.equal(dto.updatedAt, '2026-09-11T13:00:00.000Z');
  assert.equal(dto.submittedAt, null);
  assert.doesNotMatch(serialized, /registrationId|registration_id|cpf|s3_key|file_hash|request_ip|user_agent/);
  assert.doesNotMatch(serialized, /12345678901|private\/editais|hash-da-submissao|203\.0\.113|Sensitive/);
});

test('rejeita propriedades desconhecidas no payload externo do rascunho', () => {
  const result = parseDraftRequest({
    step: 'equipe',
    data: { team_description: 'Equipe', cpf: '12345678901' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.error, 'validation_error');
  assert.doesNotMatch(JSON.stringify(result.error), /12345678901|cpf/);
});

test('rejeita propriedades desconhecidas por step antes da regra de negócio', () => {
  const cases = [
    { step: 'equipe', data: { institution_name: 'Fora do step' } },
    { step: 'instituicao', data: { team_description: 'Fora do step' } },
    { step: 'fotos', data: { lab_name: 'Fora do step' } },
    { step: 'proposta', data: { lab_structure_description: 'Fora do step' } },
  ];

  for (const payload of cases) {
    const result = parseDraftRequest(payload);
    assert.equal(result.ok, false, `step ${payload.step} deveria rejeitar campo inesperado`);
    assert.equal(result.error.error, 'validation_error');
  }
});

test('normaliza payload válido de rascunho para DTO allowlisted', () => {
  const result = parseDraftRequest({
    step: 'instituicao',
    data: {
      institution_name: ' Instituição ',
      institution_cnpj: '11.222.333/0001-81',
      lab_name: ' Laboratório ',
      lab_area: ' Saúde ',
      lab_served_public: '',
      lab_academic_unit: ' Unidade ',
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    step: 'instituicao',
    data: {
      institution_name: 'Instituição',
      institution_cnpj: '11222333000181',
      lab_name: 'Laboratório',
      lab_area: 'Saúde',
      lab_served_public: null,
      lab_academic_unit: 'Unidade',
    },
  });
});

test('rejeita tipos inválidos e limites nos itens de orçamento', () => {
  const invalidType = parseDraftRequest({
    step: 'proposta',
    data: {
      budget_items: [{ descricao: 'Item', valor_estimado: '100', justificativa: 'Uso' }],
    },
  });
  const tooManyItems = parseDraftRequest({
    step: 'proposta',
    data: Array.from({ length: 21 }).reduce<Record<string, unknown>>(
      (data, _, index) => ({
        ...data,
        budget_items: [
          ...((data.budget_items as unknown[]) ?? []),
          { descricao: `Item ${index}`, valor_estimado: 100, justificativa: 'Uso' },
        ],
      }),
      {}
    ),
  });

  assert.equal(invalidType.ok, false);
  assert.equal(tooManyItems.ok, false);
  assert.equal(invalidType.error.error, 'validation_error');
  assert.equal(tooManyItems.error.error, 'validation_error');
});

test('rejeita upload com propriedades desconhecidas ou file ausente', () => {
  const unknown = parseDocumentUploadFields({
    requirementCode: '8.1.1',
    file: new Blob(['pdf']),
    registrationId: 123,
  });
  const missingFile = parseDocumentUploadFields({ requirementCode: '8.1.1' });

  assert.equal(unknown.ok, false);
  assert.equal(missingFile.ok, false);
  assert.equal(unknown.error.error, 'validation_error');
  assert.doesNotMatch(JSON.stringify(unknown.error), /registrationId|123/);
});

test('aceita FormData real de upload com requirementCode e file', () => {
  const formData = new FormData();
  const file = new Blob(['%PDF-'], { type: 'application/pdf' });
  formData.append('requirementCode', '8.1.1');
  formData.append('file', file, 'documento.pdf');

  const result = parseDocumentUploadFields(formData);

  assert.equal(result.ok, true);
  assert.equal(result.value.requirementCode, '8.1.1');
  assert.ok(result.value.file instanceof Blob);
});

test('rejeita FormData de upload com chaves extras', () => {
  const formData = new FormData();
  formData.append('requirementCode', '8.1.1');
  formData.append('file', new Blob(['%PDF-'], { type: 'application/pdf' }), 'documento.pdf');
  formData.append('registrationId', '123');

  const result = parseDocumentUploadFields(formData);

  assert.equal(result.ok, false);
  assert.equal(result.error.error, 'validation_error');
  assert.doesNotMatch(JSON.stringify(result.error), /registrationId|123/);
});

test('rejeita upload de códigos gerados automaticamente', () => {
  const result = parseDocumentUploadFields({
    requirementCode: '8.1.10',
    file: new Blob(['pdf']),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.error, 'validation_error');
});

test('retorna erro estável sem stack trace nem valores sensíveis', () => {
  const error = toStableErrorDto(new Error('CPF 12345678901 falhou no S3 private/key'), {
    fallbackMessage: 'Payload inválido',
  });

  assert.deepEqual(error, { error: 'validation_error', message: 'Payload inválido' });
  assert.doesNotMatch(JSON.stringify(error), /12345678901|private\/key|stack|Error:/);
});

test('tipos client-safe não importam dependências de servidor', () => {
  const source = readFileSync(new URL('./edital-client-types.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /\bfrom ['"][^'"]*pg[^'"]*['"]/);
  assert.doesNotMatch(source, /\bBuffer\b/);
  assert.doesNotMatch(source, /next\/server/);
  assert.doesNotMatch(source, /s3/i);
});
