# Guia de Correção CORS no Backend (API JEDI)

Este documento descreve o que precisa ser ajustado no backend para permitir acesso da aplicação web (`http://localhost:3000`) e do frontend em produção/preview na Vercel aos endpoints da API JEDI.

- `POST https://memore-net.com/api/JEDI-API/pergunta2/sortearPerguntas`
- `POST https://memore-net.com/api/JEDI-API/partidasperguntas/salvarPartida`

## 1) Diagnóstico objetivo

O frontend já está enviando:

- método `POST`
- header `Content-Type: application/json`
- body JSON com `{ "quantidade": N }`

Mas o navegador bloqueia a requisição no **preflight OPTIONS** por ausência de headers CORS na resposta do servidor.

## 2) O que o backend precisa devolver

Para requisições vindas de `http://localhost:3000`, do domínio de produção e das URLs de preview permitidas, o backend deve responder com:

- `Access-Control-Allow-Origin: <origem permitida>`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Accept, Authorization`
- `Access-Control-Max-Age: 86400` (opcional)
- `Vary: Origin` (recomendado)

Importante:

- Para `OPTIONS`, o backend deve responder **200/204** e encerrar sem processar regra de negócio.
- Para respostas de erro (`4xx/5xx`), os headers CORS também devem estar presentes, senão o browser mostra apenas erro genérico de CORS.
- O valor de `Access-Control-Allow-Origin` deve ser exatamente a origem recebida em `Origin` (quando permitida), não uma string com wildcard.

## 3) Implementação no endpoint PHP (exemplo base)

No início do arquivo PHP do endpoint (antes de qualquer output), adicionar:

```php
<?php
$allowedOrigins = [
  'http://localhost:3000',
  'https://jedieduca.vercel.app'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originAllowed = in_array($origin, $allowedOrigins, true);

if ($originAllowed) {
  header("Access-Control-Allow-Origin: $origin");
  header('Vary: Origin');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  if (!$originAllowed) {
    http_response_code(403);
    echo json_encode(['erro' => 'Origem não permitida para CORS.']);
    exit;
  }
  http_response_code(204);
  exit;
}

if (!$originAllowed) {
  http_response_code(403);
  echo json_encode(['erro' => 'Origem não permitida para CORS.']);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['erro' => 'Método não permitido. Use POST.']);
  exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!is_array($payload) || !isset($payload['quantidade'])) {
  http_response_code(400);
  echo json_encode(['erro' => 'Body inválido. Envie {"quantidade": N}.']);
  exit;
}

$quantidade = (int)$payload['quantidade'];
if ($quantidade <= 0) {
  http_response_code(400);
  echo json_encode(['erro' => 'quantidade deve ser maior que zero.']);
  exit;
}

// Executa SQL/negócio e retorna array JSON conforme contrato atual.
```

## 4) Liberação de família de origens (Vercel Preview)

### Cenário observado

Mesmo com `https://jedieduca.vercel.app` liberado, a execução pode vir de URL de preview da Vercel, por exemplo:

- `https://jedieduca-5aamwn5lg-sergiospacs-projects.vercel.app`

Nesse caso, se o backend validar apenas igualdade exata, a origem é rejeitada e o navegador acusa:

- `No 'Access-Control-Allow-Origin' header is present on the requested resource`
- `TypeError: Failed to fetch`

### Regra recomendada

Liberar explicitamente:

- origem fixa de produção: `https://jedieduca.vercel.app`
- família de preview: `https://jedieduca-*-sergiospacs-projects.vercel.app`

No backend PHP, isso deve ser feito com regex restritiva (anchor `^...$`), nunca com `*` no header de resposta.

Exemplo seguro:

```php
<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$exactAllowedOrigins = [
  'http://localhost:3000',
  'https://jedieduca.vercel.app'
];

$allowedPreviewPattern = '/^https:\/\/jedieduca-[a-z0-9-]+-sergiospacs-projects\.vercel\.app$/i';

$originAllowed =
  in_array($origin, $exactAllowedOrigins, true) ||
  preg_match($allowedPreviewPattern, $origin) === 1;

if ($originAllowed) {
  header("Access-Control-Allow-Origin: $origin");
  header('Vary: Origin');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  if (!$originAllowed) {
    http_response_code(403);
    echo json_encode(['erro' => 'Origem não permitida para CORS.']);
    exit;
  }
  http_response_code(204);
  exit;
}

if (!$originAllowed) {
  http_response_code(403);
  echo json_encode(['erro' => 'Origem não permitida para CORS.']);
  exit;
}
```

Notas importantes para segurança:

- Não use regex ampla como `.*vercel.app` (abre brecha para outros projetos).
- Restrinja prefixo (`jedieduca-`) e sufixo fixo (`-sergiospacs-projects.vercel.app`).
- Mantenha `Vary: Origin` para evitar cache incorreto em CDN/proxy.

## 5) Se houver Apache/Nginx/proxy na frente

Mesmo com PHP correto, o servidor web/proxy pode remover headers. Validar camada de infraestrutura:

- Apache: garantir `mod_headers` habilitado.
- Nginx: conferir `add_header` em `location` da API e também para respostas `4xx/5xx` (`always`).
- Cloudflare/WAF/reverse proxy: não bloquear `OPTIONS`.

Exemplo Nginx (referência):

```nginx
location /api/JEDI-API/pergunta2/ {
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Methods "POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Accept, Authorization" always;
        add_header Access-Control-Max-Age 86400 always;
        add_header Vary Origin always;
        return 204;
    }

    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Methods "POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Accept, Authorization" always;
    add_header Vary Origin always;

    proxy_pass http://php_backend;
}
```

## 6) Testes mínimos que o backend deve executar

### Teste preflight (OPTIONS)

```bash
curl -i -X OPTIONS 'https://memore-net.com/api/JEDI-API/pergunta2/sortearPerguntas' \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Esperado:

- status `200` ou `204`
- headers `Access-Control-Allow-Origin`, `Allow-Methods`, `Allow-Headers`

### Teste preflight com origem preview (família)

```bash
curl -i -X OPTIONS 'https://memore-net.com/api/JEDI-API/partidasperguntas/salvarPartida' \
  -H 'Origin: https://jedieduca-abc123-sergiospacs-projects.vercel.app' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Esperado:

- status `200` ou `204`
- `Access-Control-Allow-Origin` igual à origem enviada no header `Origin`
- `Vary: Origin` presente

### Teste POST real

```bash
curl -i -X POST 'https://memore-net.com/api/JEDI-API/pergunta2/sortearPerguntas' \
  -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' \
  --data '{"quantidade":3}'
```

Esperado:

- status `200`
- headers CORS presentes
- body com array JSON de perguntas (ou `{ "erro": "..." }` com CORS também presente)

### Teste POST real para salvar partida com origem preview

```bash
curl -i -X POST 'https://memore-net.com/api/JEDI-API/partidasperguntas/salvarPartida' \
  -H 'Origin: https://jedieduca-abc123-sergiospacs-projects.vercel.app' \
  -H 'Content-Type: application/json' \
  --data '{"id":1,"nome":"Teste","idade":10,"acertos":3,"erros":1,"tempoGasto":120}'
```

Esperado:

- status `200` (ou erro de validação de negócio com CORS presente)
- headers CORS presentes também em erros de validação (`4xx`)

## 7) Contrato de resposta para o frontend

O frontend já trata respostas JSON de sucesso e de erro, mas para reduzir ambiguidades, recomenda-se padronizar:

- sucesso: objeto JSON com campos esperados pelo endpoint (ex.: `{ "id": "123" }` em salvar partida)
- erro de negócio/validação: `{ "erro": "mensagem" }`

Ou seja:

- **Não é obrigatório** reestruturar todo o backend agora.
- **É recomendado** documentar formalmente o contrato por endpoint para evitar parsing condicional no cliente.

## 8) Checklist rápido para o dev backend

- [ ] Endpoint aceita `POST` com `Content-Type: application/json`
- [ ] Faz parse de `php://input`
- [ ] `OPTIONS` responde `204` sem erro
- [ ] Respostas `2xx`, `4xx`, `5xx` incluem headers CORS
- [ ] Origem do frontend (`localhost` + produção) está liberada
- [ ] Família de origem preview `https://jedieduca-*-sergiospacs-projects.vercel.app` está validada por regex restritiva
- [ ] Proxy/WAF não bloqueia `OPTIONS`

