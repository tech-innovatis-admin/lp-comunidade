import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDocumentAccessDisposition,
  getDocumentFallbackExtension,
  isThumbnailMimeTypeSupported,
} from './edital-document-access';

test('usa attachment com nome sanitizado para documentos Word', () => {
  assert.deepEqual(
    getDocumentAccessDisposition(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Anexo Técnico/Final?.docx'
    ),
    {
      documentKind: 'docx',
      downloadFileName: 'Anexo T_cnico_Final_.docx',
    }
  );

  assert.deepEqual(getDocumentAccessDisposition('application/msword', null), {
    documentKind: 'doc',
    downloadFileName: 'documento.doc',
  });
});

test('mantem PDF e imagem inline e permite thumbnail', () => {
  assert.deepEqual(getDocumentAccessDisposition('application/pdf', 'plano.pdf'), {
    documentKind: 'pdf',
  });
  assert.deepEqual(getDocumentAccessDisposition('image/webp', 'foto.webp'), {
    documentKind: 'webp',
  });

  assert.equal(isThumbnailMimeTypeSupported('application/pdf'), true);
  assert.equal(isThumbnailMimeTypeSupported('image/jpeg'), true);
  assert.equal(isThumbnailMimeTypeSupported('image/webp'), true);
});

test('bloqueia thumbnail de Word e MIME desconhecido', () => {
  assert.equal(isThumbnailMimeTypeSupported('application/msword'), false);
  assert.equal(
    isThumbnailMimeTypeSupported('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    false
  );
  assert.equal(isThumbnailMimeTypeSupported('application/octet-stream'), false);
});

test('deriva extensao exibida no fallback a partir do MIME ou nome', () => {
  assert.equal(
    getDocumentFallbackExtension(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'sem-extensao'
    ),
    'DOCX'
  );
  assert.equal(getDocumentFallbackExtension('application/octet-stream', 'contrato.DOC'), 'DOC');
  assert.equal(getDocumentFallbackExtension('application/pdf', 'proposta.pdf'), 'PDF');
  assert.equal(getDocumentFallbackExtension('image/png', 'foto.png'), 'PNG');
});
