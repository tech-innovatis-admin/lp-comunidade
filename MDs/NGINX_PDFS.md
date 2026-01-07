# 🛠️ Nginx – PDFs truncados/corrompidos (resolução completa)

## Contexto do problema
- Endpoint: `https://comunidade.innovatismc.com/api/documents/{id}` (serve PDFs direto do PostgreSQL).
- Sintoma: download parava sempre em ~32 KB; Chrome/Edge e Acrobat exibiam “Falha ao carregar o documento PDF” / “Arquivo danificado”.
- Observação: a API retornava `200 OK` com `Content-Length: 282152` e headers de integridade (`x-document-integrity: verified`), o PDF estava íntegro no banco (BYTEA, hash válido).

## Evidências coletadas
- `curl.exe -i` no Windows: 200 OK, mas transferência cortada em ~32 KB com `schannel: server closed abruptly (missing close_notify)`.
- `curl` na própria EC2 (via HTTPS): mesmo corte em ~32 KB com `OpenSSL SSL_read: SSL_ERROR_SYSCALL`.
- `curl http://localhost:3002/api/documents/11` (bypass Nginx/SSL, direto na app): download completo 282152 bytes — confirmou que o problema estava na camada Nginx/SSL, não na app nem no Postgres.

## Diagnóstico
- Encerramento/renegociação na cadeia SSL ao passar pelo Nginx enquanto o proxy buffering estava ativo, causando truncamento do corpo binário.
- Não havia expiração de link nem deleção de arquivo; banco confirmado com `octet_length(id_document_data)`.

## Correção aplicada (Nginx)
Editar `/etc/nginx/conf.d/landing-comunidade.conf` (bloco `server` SSL) e, dentro do `location /`, usar:

```nginx
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;

        # Headers básicos
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # CRÍTICO: evitar truncamento/renegociação em downloads binários
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_max_temp_file_size 0;

        # Timeouts ampliados para downloads maiores
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # HTTP/1.1 estável
        proxy_set_header Connection "";
    }
```

Depois:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Como validar (passo a passo)
1) `curl -v -o /tmp/teste.pdf https://comunidade.innovatismc.com/api/documents/11`
2) Conferir tamanho com `ls -l /tmp/teste.pdf` (esperado ~282152 bytes para o exemplo do ID 11).
3) Abrir o PDF baixado (Chrome/Edge/Acrobat) e confirmar que renderiza sem erro.
4) Se quiser conferir integridade: `Format-Hex` ou `file /tmp/teste.pdf` deve indicar `%PDF` e versão 1.4.

## Checklist de sanidade
- API responde 200 OK com `Content-Length` esperado.
- Download chega com o tamanho integral (sem truncar).
- PDF abre no navegador e no Acrobat.
- `nginx -t` ok e serviço recarregado.

## Referências internas
- `MDs/DEPLOY.md` — bloco completo do Nginx/SSL com a configuração final.
- `MDs/VISUALIZACAO_DOCUMENTOS.md` — fluxo dos documentos (PostgreSQL + endpoint `/api/documents/{id}`) e nota de infra.

