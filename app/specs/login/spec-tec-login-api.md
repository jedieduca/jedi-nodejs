**versão prática em formato de especificação técnica**

* objetivo
* escopo
* contrato dos endpoints
* modelo da tabela MySQL
* pseudo-código PHP
* fluxo de autenticação
* regras de validação
* observações para o frontend

Você pode copiar e salvar como `especificacao-tecnica-login-api.md`.

---

````md
# Especificação Técnica — Evolução do login para autenticação real da API
## Projeto: jogo React.js + API PHP + MySQL

## 1. Objetivo

Evoluir o endpoint atual de autenticação para uma solução mínima de autenticação persistente, capaz de:

- emitir credencial de sessão após login bem-sucedido
- proteger endpoints privados da API
- identificar o usuário autenticado em requisições futuras
- expirar sessões
- revogar sessões no logout

A proposta é usar **token Bearer opaco**, gerado pelo backend, com persistência em banco MySQL.

---

## 2. Contexto atual

### Endpoint existente
`POST /api/JEDI-API/system_user/autenticar`

### Entrada atual
```json
{
  "login": "userName",
  "password": "userPass"
}
````

### Saída atual de sucesso

```json
{
  "id": "3",
  "name": "Fulano de Tal",
  "login": "Fulano",
  "email": "fulano@empresa.com",
  "frontpage_id": "41",
  "active": "Y"
}
```

### Problema atual

O endpoint valida as credenciais, mas não cria uma sessão autenticada reutilizável.
Assim, o frontend não recebe nenhum token para provar autenticação nas chamadas subsequentes.

---

## 3. Solução proposta

### Estratégia

Implementar autenticação baseada em:

* **login + senha**
* **token Bearer**
* **persistência do hash do token em MySQL**
* **middleware de validação para rotas protegidas**

### Decisão técnica

Usar **token opaco aleatório**.

Exemplo de token:

```text
8f2a0ef0d7f4d8d5d8f2f0a9dce2b1d5d54b2e1e9a8f4d1c2a7b6c5d4e3f2a1b
```

### Regra de armazenamento

* o **cliente recebe o token puro**
* o **banco armazena apenas o hash SHA-256 do token**
* a comparação no backend será sempre via hash

---

## 4. Escopo mínimo da entrega

Implementar:

1. tabela de sessões/tokens
2. alteração do endpoint de login para emitir token
3. middleware/função para validar Bearer token
4. proteção dos endpoints privados
5. endpoint de logout
6. expiração de token
7. padronização de status HTTP

---

## 5. Modelo de dados MySQL

## 5.1 Tabela de sessões

```sql
CREATE TABLE api_user_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    last_used_at DATETIME NULL,
    user_agent VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    INDEX idx_api_user_sessions_user_id (user_id),
    UNIQUE KEY uk_api_user_sessions_token_hash (token_hash)
);
```

## 5.2 Observações sobre a tabela

* `token_hash`: hash SHA-256 do token
* `expires_at`: data/hora de expiração da sessão
* `revoked_at`: preenchido no logout
* `last_used_at`: atualizado quando o token válido é utilizado
* `user_agent` e `ip_address`: opcionais, mas recomendados

---

## 6. Contrato do endpoint de autenticação

## 6.1 Endpoint

`POST /api/JEDI-API/system_user/autenticar`

## 6.2 Request

```http
POST /api/JEDI-API/system_user/autenticar
Content-Type: application/json
```

```json
{
  "login": "userName",
  "password": "userPass"
}
```

## 6.3 Regras de validação

* `login` obrigatório
* `password` obrigatório
* usuário deve existir
* senha deve ser válida
* usuário deve estar ativo (`active = 'Y'`)

## 6.4 Response de sucesso

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "token": "TOKEN_GERADO_PELO_BACKEND",
  "expires_at": "2026-03-08 18:00:00",
  "user": {
    "id": "3",
    "name": "Fulano de Tal",
    "login": "Fulano",
    "email": "fulano@empresa.com",
    "frontpage_id": "41",
    "active": "Y"
  }
}
```

## 6.5 Response de credenciais inválidas

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
```

```json
{
  "error": "Credenciais inválidas"
}
```

## 6.6 Response de usuário inativo

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json
```

```json
{
  "error": "Usuário inativo"
}
```

## 6.7 Response de erro interno

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
```

```json
{
  "error": "Erro interno ao autenticar usuário"
}
```

---

## 7. Contrato do endpoint de logout

## 7.1 Endpoint

`POST /api/JEDI-API/system_user/logout`

## 7.2 Request

```http
POST /api/JEDI-API/system_user/logout
Authorization: Bearer TOKEN_GERADO_PELO_BACKEND
```

## 7.3 Comportamento

* ler token do header Authorization
* localizar a sessão pelo hash do token
* preencher `revoked_at` com a data/hora atual

## 7.4 Response de sucesso

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "message": "Logout realizado com sucesso"
}
```

## 7.5 Response sem token

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
```

```json
{
  "error": "Token ausente"
}
```

---

## 8. Padrão para rotas protegidas

Todas as rotas privadas devem exigir:

```http
Authorization: Bearer TOKEN_GERADO_PELO_BACKEND
```

Exemplo:

```http
GET /api/JEDI-API/game/progresso
Authorization: Bearer TOKEN_GERADO_PELO_BACKEND
```

---

## 9. Regras de autenticação das rotas protegidas

Para cada requisição protegida, o backend deve:

1. ler o header `Authorization`
2. validar formato `Bearer <token>`
3. extrair o token puro
4. calcular `sha256(token)`
5. buscar a sessão por `token_hash`
6. validar se:

   * existe
   * não está revogada
   * não expirou
7. identificar o `user_id`
8. carregar o usuário autenticado
9. permitir a execução da rota

Se qualquer etapa falhar, retornar `401 Unauthorized`.

---

## 10. Endpoints que devem ser protegidos

Devem exigir autenticação todos os endpoints que envolvam dados privados ou persistidos do jogador, por exemplo:

* salvar progresso
* carregar progresso do jogador
* inventário
* moedas
* itens desbloqueados
* conquistas
* ranking individual
* perfil do jogador
* preferências do usuário
* qualquer operação de escrita vinculada ao jogador

Endpoints públicos podem permanecer sem autenticação, como:

* status do servidor
* catálogo público de fases
* assets públicos
* conteúdo institucional

---

## 11. Estrutura sugerida no backend PHP

Sugestão de componentes mínimos:

* `AuthController.php`
* `AuthService.php`
* `SessionRepository.php`
* `AuthMiddleware.php`
* `UserRepository.php`

### Responsabilidades

#### AuthController

* recebe request HTTP
* chama AuthService
* devolve resposta JSON com status adequado

#### AuthService

* valida credenciais
* gera token
* cria sessão
* valida token
* executa logout

#### SessionRepository

* persiste e busca sessões
* revoga sessão
* atualiza `last_used_at`

#### AuthMiddleware

* intercepta rotas protegidas
* valida Bearer token
* injeta usuário autenticado no contexto

#### UserRepository

* busca usuário por login/id
* auxilia na validação do usuário ativo

---

## 12. Pseudo-código PHP — geração de token

## 12.1 Gerar token seguro

```php
function generateToken(): string {
    return bin2hex(random_bytes(32));
}
```

## 12.2 Gerar hash do token

```php
function hashToken(string $token): string {
    return hash('sha256', $token);
}
```

---

## 13. Pseudo-código PHP — login

```php
public function autenticar(array $payload): array
{
    $login = trim($payload['login'] ?? '');
    $password = $payload['password'] ?? '';

    if ($login === '' || $password === '') {
        throw new HttpException(400, 'Login e senha são obrigatórios');
    }

    $user = $this->userRepository->findByLogin($login);

    if (!$user) {
        throw new HttpException(401, 'Credenciais inválidas');
    }

    if ($user['active'] !== 'Y') {
        throw new HttpException(403, 'Usuário inativo');
    }

    // Caso o sistema já use password_hash()
    if (!password_verify($password, $user['password_hash'])) {
        throw new HttpException(401, 'Credenciais inválidas');
    }

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $this->sessionRepository->create([
        'user_id' => $user['id'],
        'token_hash' => $tokenHash,
        'expires_at' => $expiresAt,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        'ip_address' => $this->getClientIp(),
    ]);

    return [
        'token' => $token,
        'expires_at' => $expiresAt,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'login' => $user['login'],
            'email' => $user['email'],
            'frontpage_id' => $user['frontpage_id'],
            'active' => $user['active'],
        ],
    ];
}
```

---

## 14. Pseudo-código PHP — persistência da sessão

```php
public function create(array $data): void
{
    $sql = "
        INSERT INTO api_user_sessions
            (user_id, token_hash, expires_at, user_agent, ip_address)
        VALUES
            (:user_id, :token_hash, :expires_at, :user_agent, :ip_address)
    ";

    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([
        ':user_id' => $data['user_id'],
        ':token_hash' => $data['token_hash'],
        ':expires_at' => $data['expires_at'],
        ':user_agent' => $data['user_agent'],
        ':ip_address' => $data['ip_address'],
    ]);
}
```

---

## 15. Pseudo-código PHP — leitura do Bearer token

```php
function extractBearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (!$header) {
        return null;
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return null;
    }

    return trim($matches[1]);
}
```

---

## 16. Pseudo-código PHP — validação da sessão

```php
public function validateToken(string $token): array
{
    $tokenHash = hash('sha256', $token);

    $session = $this->sessionRepository->findValidSessionByTokenHash($tokenHash);

    if (!$session) {
        throw new HttpException(401, 'Token inválido ou expirado');
    }

    $user = $this->userRepository->findById($session['user_id']);

    if (!$user) {
        throw new HttpException(401, 'Usuário da sessão não encontrado');
    }

    if ($user['active'] !== 'Y') {
        throw new HttpException(403, 'Usuário inativo');
    }

    $this->sessionRepository->touch($session['id']);

    return $user;
}
```

---

## 17. Pseudo-código PHP — busca de sessão válida

```php
public function findValidSessionByTokenHash(string $tokenHash): ?array
{
    $sql = "
        SELECT *
        FROM api_user_sessions
        WHERE token_hash = :token_hash
          AND revoked_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
    ";

    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([
        ':token_hash' => $tokenHash,
    ]);

    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    return $session ?: null;
}
```

---

## 18. Pseudo-código PHP — atualizar último uso

```php
public function touch(int $sessionId): void
{
    $sql = "
        UPDATE api_user_sessions
        SET last_used_at = NOW()
        WHERE id = :id
    ";

    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([
        ':id' => $sessionId,
    ]);
}
```

---

## 19. Pseudo-código PHP — middleware de autenticação

```php
public function handle(callable $next)
{
    $token = extractBearerToken();

    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Token ausente ou mal formatado']);
        exit;
    }

    try {
        $user = $this->authService->validateToken($token);

        // exemplo: disponibilizar usuário autenticado para a rota
        $GLOBALS['authenticated_user'] = $user;

        return $next();
    } catch (HttpException $e) {
        http_response_code($e->getStatusCode());
        echo json_encode(['error' => $e->getMessage()]);
        exit;
    } catch (\Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro interno de autenticação']);
        exit;
    }
}
```

---

## 20. Pseudo-código PHP — logout

```php
public function logout(string $token): void
{
    $tokenHash = hash('sha256', $token);
    $this->sessionRepository->revokeByTokenHash($tokenHash);
}
```

```php
public function revokeByTokenHash(string $tokenHash): void
{
    $sql = "
        UPDATE api_user_sessions
        SET revoked_at = NOW()
        WHERE token_hash = :token_hash
          AND revoked_at IS NULL
    ";

    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([
        ':token_hash' => $tokenHash,
    ]);
}
```

---

## 21. Exemplo de controller de login

```php
public function autenticarAction(): void
{
    try {
        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $result = $this->authService->autenticar($payload);

        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode($result);
    } catch (HttpException $e) {
        http_response_code($e->getStatusCode());
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
    } catch (\Throwable $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Erro interno ao autenticar usuário']);
    }
}
```

---

## 22. Exemplo de controller de logout

```php
public function logoutAction(): void
{
    try {
        $token = extractBearerToken();

        if (!$token) {
            throw new HttpException(401, 'Token ausente ou mal formatado');
        }

        $this->authService->logout($token);

        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode(['message' => 'Logout realizado com sucesso']);
    } catch (HttpException $e) {
        http_response_code($e->getStatusCode());
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
    } catch (\Throwable $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Erro interno ao realizar logout']);
    }
}
```

---

## 23. Segurança de senha

É obrigatório confirmar como a senha do usuário é armazenada hoje.

### Recomendado

Usar:

* `password_hash()`
* `password_verify()`

### Exemplo de criação do hash

```php
$hash = password_hash($senhaEmTextoPuro, PASSWORD_DEFAULT);
```

### Exemplo de validação

```php
if (!password_verify($senhaInformada, $hashArmazenado)) {
    throw new HttpException(401, 'Credenciais inválidas');
}
```

### Observação crítica

Se hoje o banco armazena senha em texto puro ou hash fraco, isso deve ser tratado como prioridade.

---

## 24. Rate limit mínimo no login

Recomendação mínima:

* limitar tentativas por IP
* limitar tentativas por login
* bloquear temporariamente após muitas falhas

Mesmo uma solução simples já ajuda a reduzir brute force.

Exemplo de regra:

* máximo de 5 tentativas falhas por 10 minutos por IP/login

---

## 25. Expiração da sessão

### Recomendação inicial

Usar validade fixa de:

* `24 horas`

ou, se a experiência do jogo pedir menos atrito:

* `7 dias`

### Regra de validação

Uma sessão expirada deve responder:

* `401 Unauthorized`

### Renovação

Não é necessário implementar refresh token na primeira versão.

---

## 26. Status HTTP padronizados

### Sucesso no login

* `200 OK`

### Requisição inválida

* `400 Bad Request`

### Credenciais inválidas

* `401 Unauthorized`

### Token ausente/inválido/expirado

* `401 Unauthorized`

### Usuário inativo

* `403 Forbidden`

### Erro interno

* `500 Internal Server Error`

---

## 27. Impacto esperado no frontend

Após essa mudança, o frontend deverá:

1. chamar `/system_user/autenticar`
2. guardar:

   * `token`
   * `user`
   * `expires_at`
3. enviar `Authorization: Bearer <token>` em endpoints protegidos
4. ao receber `401`, limpar sessão local e voltar para tela de login

---

## 28. Critérios de aceite

A implementação será considerada suficiente quando:

* o login retornar token + usuário
* o token puder ser usado em rotas protegidas
* o backend rejeitar token inválido, expirado ou revogado
* o logout invalidar o token atual
* endpoints privados não funcionarem sem Bearer token
* os status HTTP estiverem padronizados
* a validação de senha usar hash seguro

---

## 29. Ordem sugerida de implementação

1. criar tabela `api_user_sessions`
2. criar `SessionRepository`
3. alterar login para gerar token e persistir sessão
4. criar `AuthService::validateToken()`
5. criar `AuthMiddleware`
6. proteger 1 endpoint privado piloto
7. criar logout
8. proteger os demais endpoints sensíveis
9. revisar status HTTP
10. revisar segurança das senhas

---

## 30. Resumo técnico final

### Proposta

Autenticação com token Bearer opaco, persistido via hash em MySQL.

### Motivos

* simples para implementar em PHP
* fácil de revogar
* fácil de debugar
* suficiente para proteger API de jogo/app web

### Resultado esperado

A API deixará de ter apenas “validação de credenciais” e passará a ter “autenticação persistente com proteção real das rotas privadas”.

````

---

## Checklist prático complementar para o dev

```md
# Checklist técnico objetivo

## Banco
- [ ] Criar tabela `api_user_sessions`
- [ ] Adicionar índice em `user_id`
- [ ] Adicionar unique em `token_hash`

## Login
- [ ] Validar login e senha
- [ ] Validar usuário ativo
- [ ] Gerar token com `bin2hex(random_bytes(32))`
- [ ] Gerar hash com `hash('sha256', $token)`
- [ ] Salvar hash no banco
- [ ] Definir `expires_at`
- [ ] Retornar `token`, `expires_at` e `user`

## Middleware
- [ ] Ler `Authorization`
- [ ] Validar `Bearer <token>`
- [ ] Hash do token
- [ ] Buscar sessão válida
- [ ] Validar expiração/revogação
- [ ] Carregar usuário autenticado
- [ ] Atualizar `last_used_at`

## Rotas
- [ ] Proteger endpoints privados do jogo
- [ ] Testar acesso sem token
- [ ] Testar acesso com token inválido
- [ ] Testar acesso com token expirado
- [ ] Testar acesso com token revogado

## Logout
- [ ] Criar `/system_user/logout`
- [ ] Revogar token atual

## Segurança
- [ ] Confirmar `password_hash()` / `password_verify()`
- [ ] Confirmar HTTPS
- [ ] Adicionar rate limit no login

## HTTP
- [ ] Padronizar `200`, `400`, `401`, `403`, `500`
````

