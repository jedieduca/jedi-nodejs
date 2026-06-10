
---

# Documento `.md` — Migração mínima do backend para proteger a API de login (PHP + MySQL)

````md
# Migração mínima do backend para proteger a API de login
## Contexto: backend em PHP + banco MySQL

## Objetivo

Atualmente a API possui um endpoint de autenticação que recebe:

```json
{
  "login": "userName",
  "password": "userPass"
}
````

e, em caso de sucesso, retorna apenas os dados do usuário:

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

Esse modelo permite validar usuário e senha, mas **não cria uma sessão autenticada segura** para proteger as demais rotas da API.

O objetivo desta migração é implementar o **mínimo necessário** para transformar esse login em uma autenticação real para aplicação web/jogo, permitindo:

* manter o usuário autenticado após o login
* proteger endpoints do jogo
* validar se a requisição está sendo feita por um usuário autenticado
* expirar sessões
* fazer logout
* reduzir risco de uso indevido da API

---

## Situação atual e problema

### O que a API atual já faz

* recebe login e senha
* valida o usuário
* retorna os dados do usuário em caso de sucesso

### O que está faltando

Após autenticar, o frontend não recebe nenhuma credencial de sessão (token) para enviar nas próximas requisições.

Isso significa que:

* o backend não tem como identificar com segurança quem está fazendo chamadas futuras
* endpoints como progresso, ranking, inventário, moedas, fases, pontuação etc. não ficam realmente protegidos
* o login funciona apenas como validação pontual, não como autenticação persistente

---

## Estratégia recomendada: token Bearer

A solução mínima recomendada é:

1. manter o endpoint de login
2. passar a gerar um **token de autenticação**
3. retornar esse token no login bem-sucedido
4. exigir esse token nos endpoints protegidos
5. validar esse token no backend a cada requisição protegida

O frontend passará a enviar o token assim:

```http
Authorization: Bearer SEU_TOKEN_AQUI
```

---

## Decisão técnica recomendada

Para a migração mínima, existem duas abordagens possíveis:

### Opção A — JWT

O backend gera um JWT assinado e o frontend envia esse token nas próximas chamadas.

**Vantagens**

* simples de consumir no frontend
* não exige tabela de sessão para funcionar no básico
* fácil de validar em middleware

**Desvantagens**

* logout e revogação exigem estratégia adicional
* requer cuidado com expiração e assinatura

### Opção B — Token de sessão opaco armazenado no banco

O backend gera um token aleatório forte, grava no banco e valida esse token em toda requisição.

**Vantagens**

* mais simples de revogar
* logout fica muito fácil
* mais intuitivo para equipes que já trabalham com sessão

**Desvantagens**

* exige tabela de sessões/tokens
* cada requisição protegida consulta o banco

### Recomendação para este caso

Para uma migração mínima, segura e simples em **PHP + MySQL**, a melhor opção prática costuma ser:

## usar token opaco persistido em MySQL

Essa abordagem é bastante direta, fácil de entender, fácil de debugar e suficiente para um jogo/app com autenticação básica.

---

## Mudança mínima no backend

## 1. Criar tabela de tokens/sessões

Criar uma tabela para armazenar os tokens emitidos no login.

Exemplo:

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
    INDEX idx_user_id (user_id),
    UNIQUE KEY uk_token_hash (token_hash)
);
```

### Observações

* **não armazenar o token puro**
* armazenar apenas o **hash SHA-256 do token**
* o token puro é enviado apenas ao cliente
* no backend, sempre comparar pelo hash

---

## 2. Ajustar o endpoint de autenticação

Endpoint atual:

```text
POST /api/JEDI-API/system_user/autenticar
```

### Novo comportamento esperado

Ao validar login e senha com sucesso, o backend deve:

1. verificar se o usuário existe
2. verificar se a senha está correta
3. verificar se o usuário está ativo
4. gerar um token aleatório forte
5. calcular o hash do token
6. gravar esse hash na tabela `api_user_sessions`
7. retornar o token ao frontend junto com os dados do usuário

### Exemplo de resposta de sucesso

```json
{
  "token": "TOKEN_FORTE_GERADO_PELO_BACKEND",
  "expires_at": "2026-03-08 15:00:00",
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

### Exemplo de resposta de falha

```json
{
  "error": "Credenciais inválidas"
}
```

---

## 3. Gerar token seguro

O token deve ser imprevisível e forte.

Em PHP, uma opção segura é:

```php
$token = bin2hex(random_bytes(32));
```

Isso gera um token hexadecimal com boa entropia.

### Gerar hash para armazenar no banco

```php
$tokenHash = hash('sha256', $token);
```

### Regra

* cliente recebe `$token`
* banco armazena apenas `$tokenHash`

---

## 4. Definir expiração do token

Definir uma validade inicial simples, por exemplo:

* 24 horas
  ou
* 7 dias

Para jogo web simples, 24 horas ou 7 dias costuma ser suficiente dependendo da experiência desejada.

Exemplo:

```php
$expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
```

---

## 5. Criar middleware/função de autenticação para rotas protegidas

Toda rota protegida deve:

1. ler o header `Authorization`
2. verificar se ele está no formato `Bearer TOKEN`
3. calcular o hash do token recebido
4. buscar o token na tabela `api_user_sessions`
5. verificar se:

   * existe
   * não foi revogado
   * não expirou
6. identificar o usuário autenticado
7. prosseguir com a requisição

### Fluxo lógico

* sem header -> responder 401
* token inválido -> responder 401
* token expirado -> responder 401
* token revogado -> responder 401
* token válido -> seguir e anexar usuário autenticado ao contexto da requisição

---

## 6. Proteger os endpoints do jogo

Após criar a validação por token, aplicar proteção aos endpoints que manipulam dados do usuário, por exemplo:

* salvar progresso
* carregar progresso
* ranking do jogador
* inventário
* moedas
* itens desbloqueados
* conquistas
* fases concluídas
* perfil do jogador
* qualquer operação persistente

### Regra prática

Endpoints públicos podem continuar sem autenticação.

Exemplos:

* catálogo público de fases
* status do servidor
* assets públicos
* notícias públicas do jogo

Mas qualquer endpoint que envolva identidade, progresso ou dados persistidos do jogador deve exigir token.

---

## 7. Criar endpoint de logout

Criar um endpoint para encerrar a sessão/token atual.

Exemplo:

```text
POST /api/JEDI-API/system_user/logout
```

### Comportamento

1. ler o token enviado no header
2. localizar o registro correspondente
3. preencher `revoked_at` com data/hora atual

### Exemplo SQL lógico

```sql
UPDATE api_user_sessions
SET revoked_at = NOW()
WHERE token_hash = :token_hash
  AND revoked_at IS NULL;
```

Assim, o token deixa de ser aceito imediatamente.

---

## 8. Opcional, mas recomendado: logout global

Pode ser útil também um endpoint para revogar todas as sessões do usuário.

Exemplo:

```text
POST /api/JEDI-API/system_user/logout_all
```

Comportamento:

* revogar todos os tokens ativos do `user_id`

Isso é útil quando:

* o usuário troca a senha
* há suspeita de uso indevido
* o jogador quer encerrar sessões em outros dispositivos

---

## 9. Padronizar respostas HTTP

Hoje a API parece retornar erro em JSON sem necessariamente usar os status adequados.

O ideal é padronizar:

### Login com sucesso

* HTTP 200

### Credenciais inválidas

* HTTP 401 Unauthorized

### Usuário inativo

* HTTP 403 Forbidden

### Token ausente/inválido/expirado

* HTTP 401 Unauthorized

### Erro interno

* HTTP 500 Internal Server Error

### Exemplo de erro padronizado

```json
{
  "error": "Token inválido ou expirado"
}
```

Isso simplifica bastante o frontend.

---

## 10. Verificar armazenamento de senha

É essencial confirmar que a senha do usuário **não está armazenada em texto puro**.

O backend deve armazenar senha com hash forte, por exemplo:

* `password_hash()` no PHP
* validação com `password_verify()`

### Exemplo

```php
$hash = password_hash($password, PASSWORD_DEFAULT);
```

Na autenticação:

```php
if (!password_verify($passwordInformada, $hashSalvoNoBanco)) {
    // credenciais inválidas
}
```

### Se hoje o sistema usa senha em texto puro

essa é uma correção prioritária de segurança.

---

## 11. Rate limit no endpoint de login

Para reduzir risco de tentativa de força bruta, implementar limitação simples no endpoint de autenticação.

Exemplos:

* limitar tentativas por IP
* limitar tentativas por login
* bloquear temporariamente após muitas falhas

Mesmo uma versão simples já ajuda.

---

## 12. Registrar metadados úteis da sessão

Ao criar a sessão/token, é útil salvar:

* IP
* User-Agent
* data de criação
* último uso

Isso ajuda em:

* auditoria
* depuração
* análise de uso indevido

Campos já previstos na tabela:

* `ip_address`
* `user_agent`
* `created_at`
* `last_used_at`

---

## 13. Atualizar `last_used_at`

Sempre que um token válido for usado, é recomendável atualizar `last_used_at`.

Isso ajuda a saber se a sessão continua ativa.

Exemplo:

```sql
UPDATE api_user_sessions
SET last_used_at = NOW()
WHERE id = :session_id;
```

---

## 14. Estrutura sugerida de implementação em PHP

A organização mínima pode ser:

* controller de autenticação
* serviço de autenticação
* repositório/model para sessões
* middleware/filtro para autenticação Bearer

### Componentes sugeridos

* `AuthController.php`
* `AuthService.php`
* `SessionRepository.php`
* `AuthMiddleware.php`

### Responsabilidade de cada um

#### AuthController

* recebe request
* chama serviço
* devolve JSON/HTTP status

#### AuthService

* valida login/senha
* gera token
* calcula hash
* cria sessão
* valida token

#### SessionRepository

* persiste e busca tokens na tabela

#### AuthMiddleware

* intercepta endpoints protegidos
* valida Bearer token
* injeta usuário autenticado na requisição

---

## 15. Exemplo de fluxo completo de login

### Requisição

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

### Resposta

```json
{
  "token": "abc123...",
  "expires_at": "2026-03-08 15:00:00",
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

### Uso em endpoint protegido

```http
GET /api/JEDI-API/game/progresso
Authorization: Bearer abc123...
```

### Validação no backend

* extrai token
* calcula hash
* busca na tabela
* valida expiração/revogação
* identifica `user_id`
* carrega dados do usuário
* processa a requisição

---

## 16. Exemplo de fluxo de logout

### Requisição

```http
POST /api/JEDI-API/system_user/logout
Authorization: Bearer abc123...
```

### Ação do backend

* calcula hash do token
* marca sessão como revogada

### Resposta

```json
{
  "message": "Logout realizado com sucesso"
}
```

---

## 17. O que o frontend passará a fazer após essa mudança

Após o login:

* guardar `token`
* guardar `user`
* enviar `Authorization: Bearer TOKEN` nas chamadas protegidas
* ao receber 401:

  * limpar sessão local
  * redirecionar para login

---

## 18. Escopo mínimo para esta primeira versão

Para não expandir demais a entrega, o mínimo recomendado para a primeira versão é:

1. criar tabela `api_user_sessions`
2. alterar login para retornar token
3. criar função/middleware para validar Bearer token
4. proteger endpoints sensíveis
5. criar logout
6. padronizar HTTP status
7. verificar hash de senha
8. implementar expiração de token

Com isso, já se obtém uma base suficiente para um login real de jogo web.

---

## 19. Itens que podem ficar para fase 2

Esses itens são úteis, mas não são obrigatórios para a migração mínima:

* refresh token
* renovação automática de sessão
* múltiplos perfis/permissões
* MFA
* trilha de auditoria mais detalhada
* painel de sessões ativas
* revogação seletiva por dispositivo
* JWT com claims mais completas

---

## 20. Resumo executivo para decisão

### Hoje

A API autentica, mas não mantém sessão segura.

### Após a mudança

A API passará a:

* autenticar
* emitir token
* validar token
* proteger rotas
* expirar sessão
* fazer logout

### Recomendação final

Implementar **token opaco armazenado com hash no MySQL**, usando header Bearer nas rotas protegidas.

Essa é a solução mínima, prática e suficiente para proteger a API de um jogo React.js com backend PHP + MySQL.

---

````

---

# Checklist para encaminhar ao dev do backend

Você pode mandar isso separado, mais objetivo:

```md
# Checklist técnico — migração mínima do login para proteger a API

## Banco de dados
- [ ] Criar tabela `api_user_sessions`
- [ ] Campos mínimos:
  - [ ] `id`
  - [ ] `user_id`
  - [ ] `token_hash`
  - [ ] `created_at`
  - [ ] `expires_at`
  - [ ] `revoked_at`
  - [ ] `last_used_at`
  - [ ] `user_agent`
  - [ ] `ip_address`
- [ ] Criar índice por `user_id`
- [ ] Criar unicidade em `token_hash`

## Login
- [ ] Manter endpoint `POST /system_user/autenticar`
- [ ] Validar login e senha
- [ ] Validar se usuário está ativo
- [ ] Gerar token forte com `random_bytes()`
- [ ] Gerar `token_hash` com `sha256`
- [ ] Salvar apenas o hash no banco
- [ ] Definir `expires_at`
- [ ] Retornar no sucesso:
  - [ ] `token`
  - [ ] `expires_at`
  - [ ] `user`

## Segurança de senha
- [ ] Confirmar que senha não está em texto puro
- [ ] Usar `password_hash()` para armazenar
- [ ] Usar `password_verify()` para validar

## Proteção de rotas
- [ ] Criar middleware/filtro para Bearer token
- [ ] Ler header `Authorization`
- [ ] Validar formato `Bearer <token>`
- [ ] Calcular hash do token recebido
- [ ] Consultar sessão no banco
- [ ] Validar:
  - [ ] token existe
  - [ ] token não revogado
  - [ ] token não expirado
- [ ] Identificar usuário autenticado
- [ ] Atualizar `last_used_at`

## Endpoints protegidos
- [ ] Proteger endpoints de progresso
- [ ] Proteger endpoints de inventário
- [ ] Proteger endpoints de moedas/itens
- [ ] Proteger endpoints de ranking do jogador
- [ ] Proteger qualquer endpoint que grave ou leia dados privados do jogador

## Logout
- [ ] Criar endpoint `POST /system_user/logout`
- [ ] Revogar o token atual preenchendo `revoked_at`
- [ ] Retornar confirmação de logout

## HTTP status
- [ ] Login OK -> `200`
- [ ] Credenciais inválidas -> `401`
- [ ] Usuário inativo -> `403`
- [ ] Token ausente/inválido/expirado -> `401`
- [ ] Erro interno -> `500`

## Hardening mínimo
- [ ] Garantir HTTPS
- [ ] Implementar rate limit no login
- [ ] Registrar `ip_address`
- [ ] Registrar `user_agent`

## Entrega mínima esperada
- [ ] Login retorna token
- [ ] Token é validado nas rotas protegidas
- [ ] Logout revoga token
- [ ] Sessão expira
- [ ] API responde com status HTTP corretos
````

---

# Versão curta para mensagem ao dev

Se quiser, você também pode encaminhar assim:

```md
Precisamos evoluir o login atual para autenticação real da API.

Escopo mínimo:
1. Criar tabela de sessões/tokens no MySQL.
2. Alterar o endpoint `/system_user/autenticar` para retornar um token Bearer além dos dados do usuário.
3. Salvar no banco apenas o hash do token, nunca o token puro.
4. Criar middleware/filtro para validar `Authorization: Bearer <token>` nas rotas protegidas.
5. Proteger endpoints de progresso, inventário, ranking, moedas e demais dados persistidos do jogador.
6. Criar endpoint de logout que revogue o token atual.
7. Padronizar HTTP status (`200`, `401`, `403`, `500`).
8. Confirmar uso de hash de senha com `password_hash()` / `password_verify()`.

Sugestão técnica: usar token opaco aleatório persistido no MySQL, com `expires_at` e `revoked_at`.
```
