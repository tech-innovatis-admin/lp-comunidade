-- Migration: Criar views de auditoria
-- Execute APÓS as colunas terem sido criadas

-- View para listar documentos com status
CREATE OR REPLACE VIEW vw_registrations_with_documents AS
SELECT 
  r.id,
  r.full_name,
  r.cpf,
  r.email,
  r.created_at,
  CASE 
    WHEN r.id_document_data IS NOT NULL THEN TRUE 
    ELSE FALSE 
  END AS has_document,
  r.id_document_hash,
  r.id_document_size_bytes,
  r.id_document_original_filename,
  r.id_document_mime_type,
  r.status
FROM registrations r
WHERE r.id_document_data IS NOT NULL;

COMMENT ON VIEW vw_registrations_with_documents IS 'View para listar inscrições com documentos armazenados';

-- View para auditoria jurídica
CREATE OR REPLACE VIEW vw_audit_registrations AS
SELECT 
  r.id,
  r.full_name,
  r.cpf,
  r.email,
  r.phone,
  r.terms_accepted,
  r.terms_accepted_at,
  r.terms_accepted_ip,
  r.terms_user_agent,
  r.terms_content_hash_at_acceptance,
  r.terms_version_at_acceptance,
  t.version AS current_terms_version,
  t.content_hash AS current_terms_hash,
  CASE 
    WHEN r.terms_content_hash_at_acceptance = t.content_hash THEN 'MATCH'
    ELSE 'DIFFERENT'
  END AS terms_hash_status,
  r.id_document_hash,
  CASE WHEN r.id_document_data IS NOT NULL THEN TRUE ELSE FALSE END AS has_document,
  r.status,
  r.created_at
FROM registrations r
JOIN terms_of_use t ON t.id = r.terms_id
ORDER BY r.created_at DESC;

COMMENT ON VIEW vw_audit_registrations IS 'View para auditoria jurídica completa das inscrições';

