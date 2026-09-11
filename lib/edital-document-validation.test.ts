import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getEditalDocumentKind,
  getEditalDocumentKindFromMime,
  validateEditalDocumentBuffer,
} from './edital-document-validation';

const PDF_BUFFER = Buffer.from('%PDF-1.7\nfixture');
const DOC_BUFFER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
const DOCX_BUFFER = Buffer.from('PK\x03\x04[Content_Types].xml word/document.xml');
const ZIP_BUFFER = Buffer.from('PK\x03\x04unrelated/file.txt');
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('aceita PDF quando extensao, MIME e assinatura conferem', () => {
  const result = validateEditalDocumentBuffer('proposta.pdf', 'application/pdf', PDF_BUFFER);

  assert.deepEqual(result, {
    valid: true,
    kind: 'pdf',
    mimeType: 'application/pdf',
  });
  assert.equal(getEditalDocumentKind('proposta.pdf', 'application/pdf'), 'pdf');
  assert.equal(getEditalDocumentKindFromMime('application/pdf'), 'pdf');
});

test('aceita DOC com assinatura OLE e normaliza MIME octet-stream', () => {
  const result = validateEditalDocumentBuffer('anexo.doc', 'application/octet-stream', DOC_BUFFER);

  assert.deepEqual(result, {
    valid: true,
    kind: 'doc',
    mimeType: 'application/msword',
  });
  assert.equal(getEditalDocumentKind('anexo.doc', 'application/octet-stream'), 'doc');
  assert.equal(getEditalDocumentKindFromMime('application/msword'), 'doc');
});

test('aceita DOCX OOXML e normaliza MIME zip', () => {
  const result = validateEditalDocumentBuffer('plano.docx', 'application/zip', DOCX_BUFFER);

  assert.deepEqual(result, {
    valid: true,
    kind: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  assert.equal(getEditalDocumentKind('plano.docx', 'application/zip'), 'docx');
  assert.equal(
    getEditalDocumentKindFromMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    'docx'
  );
});

test('rejeita ZIP comum renomeado para DOCX', () => {
  const result = validateEditalDocumentBuffer('arquivo.docx', 'application/zip', ZIP_BUFFER);

  assert.equal(result.valid, false);
  assert.match(result.error, /PDF, DOC e DOCX/);
});

test('rejeita extensao, MIME e assinatura incoerentes', () => {
  const result = validateEditalDocumentBuffer('arquivo.pdf', 'application/msword', DOC_BUFFER);

  assert.equal(result.valid, false);
  assert.match(result.error, /PDF, DOC e DOCX/);
  assert.equal(getEditalDocumentKind('arquivo.pdf', 'application/msword'), null);
});

test('nao trata imagem como documento geral', () => {
  const result = validateEditalDocumentBuffer('foto.png', 'image/png', PNG_BUFFER);

  assert.equal(result.valid, false);
  assert.match(result.error, /PDF, DOC e DOCX/);
  assert.equal(getEditalDocumentKind('foto.png', 'image/png'), null);
  assert.equal(getEditalDocumentKindFromMime('image/png'), null);
});
