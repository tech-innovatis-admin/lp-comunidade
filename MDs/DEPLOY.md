# Guia de Deploy - Landing Page Comunidade InnovaNation

Status: em producao
URL: https://comunidade.innovatismc.com

## Arquitetura de operacao

- Next.js 15 rodando em Docker ARM64
- EC2 com Nginx como reverse proxy
- PostgreSQL RDS para dados transacionais
- Google Sheets para acompanhamento operacional
- webhook N8N para automacoes

## Build local no Windows

```powershell
cd "C:\caminho\do\repositorio\lp-comunidade"
npm install
npm run build
```

Se o fluxo de deploy local for via ECR, use o script existente em `ps1/`.

## Variaveis de ambiente

No ambiente de producao, confirme pelo menos:

- banco principal: `DB_*`
- S3: `AWS_*`
- Google Sheets: `GOOGLE_*`
- URL publica: `PUBLIC_BASE_URL`
- webhook: `WEBHOOK_N8N_URL`
- healthcheck: `HEALTHCHECK_TOKEN`
- admin: `ADMIN_TOKEN_SECRET`
- edital: `EDITAL_TOKEN_SECRET`
- base compartilhada de usuarios: `PLATFORMS_DB_*`

## Deploy no EC2

1. Enviar a imagem para o registry configurado
2. Fazer pull da nova imagem no EC2
3. Substituir o container em execucao
4. Validar health check
5. Conferir logs de app e Nginx

Exemplo de execucao:

```bash
docker pull <registry>/landing-comunidade-innovatis:latest
docker stop landing-comunidade
docker rm landing-comunidade
docker run -d \
  --name landing-comunidade \
  --restart unless-stopped \
  --env-file /home/ec2-user/landing-comunidade.env \
  -p 3002:3002 \
  <registry>/landing-comunidade-innovatis:latest
curl http://localhost:3002/api/health
```

## Nginx

O reverse proxy precisa preservar downloads binarios e documentos PDF.

Configuracao recomendada no `location /`:

- `proxy_buffering off`
- `proxy_request_buffering off`
- `proxy_max_temp_file_size 0`
- `proxy_read_timeout` e `proxy_send_timeout` altos

Exemplo:

```nginx
location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_max_temp_file_size 0;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```

Depois de ajustar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Health check

Rota: `GET /api/health`

Observacao:

- a rota responde apenas para request interna ou quando recebe `x-health-token`
- o retorno valida banco, S3 e termo ativo

## Troubleshooting

### PDF truncado ou corrompido

- conferir buffering do Nginx
- testar o endpoint direto na app, sem proxy
- validar o tamanho do arquivo com `curl`

### Container nao sobe

- verificar logs do container
- confirmar variaveis obrigatorias
- confirmar porta 3002 livre

### Health check falha

- validar conexao com banco
- validar acesso ao bucket S3
- validar termo ativo no banco

## Observacoes operacionais

- Nao coloque segredos ou valores reais no documento
- Sempre valide `npm run build` antes do deploy
- Quando mudar env ou porta, atualize este guia e o `env.example`
