# Especificação: popup ao falhar carregamento de recursos de rede

## Objetivo

A internet é requisito funcional do jogo. Qualquer falha de carregamento de recurso necessário por rede não deve ser silenciosa: a aplicação deve exibir um popup bloqueante informando qual recurso falhou e oferecendo um botão `Sair`.

Mensagem padrão:

```text
Não foi possível carregar “{recurso}”.
Recomendações: Verifique o sinal de internet e as configurações do seu equipamento. Reinicie o jogo.
```

O botão `Sair` deve executar a mesma ação do botão `Sair` existente no contexto em que o usuário está:

- Durante uma partida: executar o mesmo efeito de `handleExitCurrentMatch`, ou seja, abandonar a partida e recarregar a página com `window.location.reload()`.
- Na seleção de personagens: executar `handleLogoutFromCharacterSelection`, que chama `logout()`, remove `user` e `userEmail` do `localStorage` e retorna para a tela de login.
- Nas telas de login/cadastro/troca de senha: não existe botão `Sair` visível hoje. A especificação é reutilizar a semântica de logout seguro (`logout()`/limpeza de sessão) e manter/retornar para a tela de login.
- Na tela de vitória: executar a mesma ação de reinício disponível no painel (`handleRestartGame`), que limpa estados da vitória e recarrega a página.

## Requisitos gerais

1. Criar um mecanismo central de erro de recurso, por exemplo `NetworkFailurePopup` + estado global/local em `AppContent` ou `GameContent`.
2. Padronizar uma função única, por exemplo `showNetworkFailure(recurso, contexto, error?)`, para montar a mensagem e evitar mensagens divergentes.
3. A variável `{recurso}` deve aparecer entre aspas curvas, conforme exemplos: `“NOTÍCIAS”`, `“DADO”`, `“BOTÃO Próxima Notícia”`.
4. O popup deve ser modal, bloquear interação com o jogo e ter pelo menos o botão `Sair`.
5. Depois que o popup aparece, não deve haver fallback silencioso que deixe o jogador continuar sem o recurso essencial.
6. Erros de negócio retornados pela API, como credenciais inválidas ou validação de cadastro, podem continuar como mensagens da tela. O popup é obrigatório para insucesso de rede/carregamento, HTTP não OK, CORS, timeout, resposta vazia ou formato inválido quando o recurso é indispensável.
7. A implementação deve preservar logs técnicos no console, mas a experiência do usuário deve ser o popup.
8. Onde hoje há `catch` que retorna `[]`, `null` ou apenas `console.error`, o erro precisa ser propagado ou convertido em chamada explícita ao popup.

## Função de saída por contexto

| Contexto | Função/efeito atual | Consequência ao clicar em `Sair` |
| --- | --- | --- |
| Login, cadastro e troca de senha | Sem botão `Sair` atual; `logout()` existe no `AuthContext` | Limpa qualquer sessão parcial (`user`, `userEmail`) e permanece/retorna para login. Nenhuma partida é perdida porque ela ainda não começou. |
| Seleção de personagens | `handleLogoutFromCharacterSelection` chama `logout()` | Sai da conta, remove dados de autenticação do `localStorage` e volta para login. Preferências locais do jogo permanecem. |
| Partida em andamento | `handleExitCurrentMatch` confirma e chama `window.location.reload()` | Abandona a partida em memória, perde progresso não enviado, reseta estado do React, recarrega notícias/mapa/assets e volta ao fluxo inicial autenticado. Para popup de falha crítica não deve pedir confirmação extra. |
| Vitória/ranking | `handleRestartGame` limpa estados de vitória e chama `window.location.reload()` | Fecha a tela de vitória, descarta estado da partida concluída e recarrega o jogo. Se o resumo/ranking não foi salvo por falha de rede, o registro pode não estar no backend. |

## Pontos que precisam de tratamento

### 1. Login

- Local: `src/contexts/AuthContext.tsx`, função `login`, via `authService.autenticar`.
- Serviço: `src/services/authService.ts`, função `autenticar`.
- Recurso remoto: `POST https://memore-net.com/api/JEDI-API/system_user/autenticar`.
- Variável da mensagem: `AUTENTICAÇÃO` ou `LOGIN`.
- Tratamento atual: o erro sobe para `LoginScreen` e é exibido inline.
- Tratamento especificado: se for falha de rede, CORS, timeout, HTTP sem resposta ou resposta inválida por indisponibilidade, abrir popup.
- Consequência de `Sair`: limpar sessão e permanecer na tela de login.

### 2. Troca de senha

- Local: `src/components/LoginScreen.tsx`, `handleSubmit` quando `isTrocarSenha` está ativo.
- Recurso remoto: `POST https://memore-net.com/api/JEDI-API/system_user/trocarSenha`.
- Variável da mensagem: `TROCA DE SENHA`.
- Tratamento atual: erro inline em `login-screen-error`.
- Tratamento especificado: erro de validação continua inline; falha de rede/carregamento abre popup.
- Consequência de `Sair`: limpar sessão e voltar ao estado de login, sem trocar senha.

### 3. Cadastro

- Local: `src/components/RegisterScreen.tsx`, `handleSubmit`, via `authService.cadastrar`.
- Serviço: `src/services/authService.ts`, função `cadastrar`.
- Recurso remoto: `POST https://memore-net.com/api/JEDI-API/system_user/cadastrar`.
- Variável da mensagem: `CADASTRO`.
- Tratamento atual: erro inline em `register-screen-error`.
- Tratamento especificado: erro de validação continua inline; falha de rede/carregamento abre popup.
- Consequência de `Sair`: limpar sessão parcial e retornar para login/cadastro sem criar conta.

### 4. Login automático após cadastro

- Local: `src/components/RegisterScreen.tsx`, após `authService.cadastrar`, chamada `login(loginValue, password)`.
- Recurso remoto: o mesmo endpoint de autenticação.
- Variável da mensagem: `LOGIN APÓS CADASTRO` ou `AUTENTICAÇÃO`.
- Tratamento atual: cai no mesmo `catch` do cadastro.
- Tratamento especificado: diferenciar falha na criação de conta de falha no login posterior; se a conta foi criada mas a autenticação falhou por rede, popup deve informar o recurso de autenticação.
- Consequência de `Sair`: limpar sessão parcial e retornar para login. A conta pode já existir no backend.

### 5. Notícias do banco de dados

- Local: `src/hooks/useNews.ts`, `fetchNews`.
- Serviço: `src/services/newsService.ts`, `getNews`.
- Cliente HTTP: `src/services/api.ts`, endpoint lógico `news`.
- Recurso remoto: `POST https://memore-net.com/api/JEDI-API/pergunta2/sortearPerguntas`.
- Variável da mensagem: `NOTÍCIAS` ou `Notícias do Banco de Dados`.
- Tratamento atual: `newsService.getNews` captura erro e retorna `{ items: [] }`, tornando a falha silenciosa; `useNews` não recebe erro real.
- Tratamento especificado: remover o fallback silencioso para falhas de rede ou resposta inválida; propagar erro até `useNews`/`GameContent` e abrir popup antes de iniciar ou continuar a partida.
- Consequência de `Sair`: se estiver na seleção, logout; se a partida já começou, reload pelo fluxo de sair da partida. Sem notícias, o jogo não deve continuar.

### 6. Seleção de próxima notícia

- Local: `src/App.tsx`, `handleNextNewsClick`, `enterAguardandoNoticia1` e `selectNewsWithoutRepetition`.
- Recurso dependente: lista de notícias carregada em `newsRef.current`.
- Variável da mensagem: `BOTÃO Próxima Notícia` quando o clique não puder cumprir sua função; `NOTÍCIAS` quando a causa for lista vazia por falha de carregamento.
- Tratamento atual: se `newsRef.current` está vazio, apenas registra `console.error` e retorna.
- Tratamento especificado: ao clicar em `Próxima Notícia` sem notícias disponíveis por falha de carregamento, abrir popup. Não avançar a máquina de estados para avaliação sem notícia.
- Consequência de `Sair`: partida em andamento será abandonada e a página recarregada.

### 7. Imagem associada à notícia

- Local: `src/App.tsx`, `showNewsPanel`, chamada `preloadImages([news.caminhoimagem])`.
- Recurso: `news.caminhoimagem`, vindo do payload da notícia.
- Variável da mensagem: `IMAGEM DA NOTÍCIA` ou `NOTÍCIA`.
- Tratamento atual: `preloadImages` resolve mesmo em `img.onerror` e ignora falhas de `decode`.
- Tratamento especificado: para imagem indispensável ao painel, `img.onerror` deve rejeitar com erro de carregamento e acionar popup. Se a imagem for opcional, documentar explicitamente e não bloquear.
- Consequência de `Sair`: abandonar a partida por reload, pois o painel da notícia não está íntegro.

### 8. Resumo da partida

- Local: `src/App.tsx`, `enviarResumoPartida`.
- Serviço: `src/services/partidaService.ts`, `salvarPartida`.
- Recurso remoto: `POST https://memore-net.com/api/JEDI-API/partidasperguntas/salvarPartida`.
- Variável da mensagem: `DADOS DA PARTIDA` ou `RESUMO DA PARTIDA`.
- Tratamento atual: erro é capturado e apenas registrado no console; o jogo continua.
- Tratamento especificado: falha de rede ao salvar o resumo deve abrir popup. Se houver tentativa de retry automático, ela deve ter limite e, ao esgotar, exibir popup.
- Consequência de `Sair`: na partida, reload abandona o estado local; pode haver perda do resumo ainda não persistido. Na vitória, reinicia o jogo; ranking pode ficar indisponível porque depende do id de partida salvo.

### 9. Ranking da vitória

- Local: `src/App.tsx`, `carregarRankingDaVitoria`.
- Serviço: `src/services/rankingService.ts`, `buscarRanking`.
- Recurso remoto: `POST https://memore-net.com/api/JEDI-API/partidasperguntas/ranking`.
- Variável da mensagem: `RANKING`.
- Tratamento atual: o painel mostra erro local `Ranking indisponível no momento`; se a resposta tem menos de dois itens, usa dados fake.
- Tratamento especificado: falha de rede/carregamento do ranking deve abrir popup com botão `Sair`. Remover fallback de dados fake para produção ou limitar a modo debug/mock explícito.
- Consequência de `Sair`: executar reinício da tela de vitória (`handleRestartGame`), recarregando a aplicação.

### 10. Mapa do jogo

- Local: `src/components/IsometricBoard.tsx`, `loadMapData`.
- Recurso: `GET /mapa.map`.
- Variável da mensagem: `MAPA`.
- Tratamento atual: erro é registrado e `loading` fica falso; o jogo pode ficar sem mapa.
- Tratamento especificado: falha no `fetch`, HTTP não OK ou parse inválido do mapa deve abrir popup.
- Consequência de `Sair`: durante partida/entrada no tabuleiro, reload. Se ocorrer antes de iniciar a partida, retornar ao fluxo inicial autenticado após recarregar.

### 11. Fundo do tabuleiro

- Local: `src/App.tsx`, prop `backgroundImageUrl={'cenario_jogo_fundo_1.9.png'}` para `IsometricBoard`.
- Local de carregamento: `src/components/IsometricBoard.tsx`, `new Image()` e `backgroundImage`.
- Variável da mensagem: `CENÁRIO DO JOGO`.
- Tratamento atual: em `onerror`, usa dimensões padrão e continua.
- Tratamento especificado: se o cenário for obrigatório, `onerror` deve abrir popup. Se for decorativo, deve ficar fora do tratamento obrigatório com justificativa no código.
- Consequência de `Sair`: reload da partida.

### 12. Sprites de personagens

- Local: `src/hooks/useSpriteLoading.ts`.
- Geração de URLs: `src/utils/spriteSystemFixed.ts`, `getSpriteUrlsForCharacterFixed`.
- Recurso: `/assets/sprites/{personagem}/.../frame_XXXX.png`.
- Variável da mensagem: `PERSONAGEM {nome}` ou `SPRITES DO PERSONAGEM`.
- Tratamento atual: cada `img.onerror` incrementa contador, mas resolve; ao final registra sprites mesmo com falhas.
- Tratamento especificado: se qualquer sprite essencial do personagem selecionado falhar, setar erro real e abrir popup. Não iniciar a partida com sprites incompletos.
- Consequência de `Sair`: na seleção de personagens, logout pelo botão `Sair` existente ou retorno seguro para login. Se o popup for mostrado depois do início, reload.

### 13. Imagens dos cards de personagens e logo

- Locais:
  - `src/components/CharacterSelection.tsx`, `character.imagePath` e logo.
  - `src/config/characters.ts`, paths de personagens.
  - `src/components/LoginScreen.tsx` e `src/components/RegisterScreen.tsx`, logo.
- Variável da mensagem: `PERSONAGENS` para cards; `LOGO JEDi Educa` para logo, se considerada obrigatória.
- Tratamento atual: `<img>` sem `onError`.
- Tratamento especificado: adicionar `onError` nos assets essenciais da tela. Cards de personagens são essenciais porque afetam a seleção; logo pode ser opcional se houver fallback visual.
- Consequência de `Sair`: na seleção, logout; no login/cadastro, limpar sessão e permanecer na tela de login.

### 14. Dado

- Locais:
  - `src/components/Dice.css`, imagens `dice1.png` a `dice6.png`, `rolling-dice-01.png` a `rolling-dice-32.png`, `apoio-dado.png`.
  - `src/App.tsx`, fluxo `startDiceFlow` e componente `Dice`.
- Variável da mensagem: `DADO`.
- Tratamento atual: imagens por CSS não possuem detecção de erro; o clique no dado continua mesmo se alguma imagem não carregar.
- Tratamento especificado: preload obrigatório das imagens do dado antes de habilitar `isDiceEnabled`. Falha em qualquer face/frame essencial deve abrir popup.
- Consequência de `Sair`: partida em andamento será abandonada e a aplicação será recarregada.

### 15. Botões de avaliação Fake/Não Fake

- Local: `src/App.css`, classes `.button-fake` e `.button-not-fake`.
- Recursos: `./assets/ui/botao-fake.png` e `./assets/ui/botao-nao-fake.png`.
- Variável da mensagem: `BOTÃO Fake` ou `BOTÃO Não Fake`.
- Tratamento atual: background CSS sem detecção de erro.
- Tratamento especificado: preload obrigatório antes de exibir painel de avaliação. Falha deve abrir popup.
- Consequência de `Sair`: abandonar partida por reload.

### 16. Botão Próxima Notícia

- Local: `src/App.tsx`, renderização `.next-news-button`.
- Recurso: o botão em si é CSS/texto, mas a ação depende da lista de notícias e da máquina de estados.
- Variável da mensagem: `BOTÃO Próxima Notícia`.
- Tratamento atual: se não houver notícias, o clique não resulta em notícia e a falha fica no console.
- Tratamento especificado: validar dependências antes de permitir a ação. Se a lista de notícias não estiver disponível, abrir popup usando essa variável ou `NOTÍCIAS`.
- Consequência de `Sair`: reload da partida.

### 17. Elementos visuais críticos do tabuleiro

- Locais:
  - `src/components/IsometricBoard.css`, tiles `fundo.png`, `caminho.png`, `inicio.png`, `final.png`.
  - `src/components/IsometricBoard.tsx`, `TILE_SPRITES`.
  - `src/App.tsx`, imagens de portal, fonte, ranking, skate, pílulas, lago, geradores e macacos.
- Variáveis sugeridas: `TABULEIRO`, `PORTAL`, `RANKING`, `SKATE`, `PÍLULA`, `LAGO`, `GERADOR EÓLICO`, `MACACOS`.
- Tratamento atual: CSS backgrounds e `<img>` sem `onError`.
- Tratamento especificado: classificar cada asset como essencial ou decorativo. Essenciais devem ter preload/onError com popup. Decorativos podem ter fallback visual sem popup, desde que documentado.
- Consequência de `Sair`: durante partida, reload. Se o erro impedir navegação no tabuleiro, não permitir continuar.

### 18. Áudios locais

- Local: `src/App.tsx`, `new Audio('/assets/sons/magic4c.mp3')`, `fantasy.mp3`, `skate7a.mp3`.
- Variáveis sugeridas: `ÁUDIO DA PÍLULA`, `ÁUDIO DO PORTAL`, `ÁUDIO DO SKATE`.
- Tratamento atual: chamadas `.play()` não aguardam nem capturam rejeição; carregamento do arquivo não é validado.
- Tratamento especificado: se áudio for considerado essencial à experiência educativa, preload com tratamento de erro. Se for decorativo, capturar rejeição de `.play()` apenas para log e não abrir popup.
- Consequência de `Sair`: somente se o áudio for classificado como essencial; caso contrário, não acionar `Sair`.

### 19. Ajuda de voz

- Local: `src/components/CharacterSelection.tsx`, iframe `tts_help.html`.
- Variável da mensagem: `AJUDA DA VOZ`.
- Tratamento atual: iframe sem tratamento de erro.
- Tratamento especificado: por ser ajuda auxiliar, pode mostrar erro local e botão de fechar em vez de popup global. Se o requisito for literalmente qualquer recurso, adicionar `onError` no iframe e popup.
- Consequência de `Sair`: se usar popup global na seleção, logout; recomendação é tratar como recurso não crítico.

### 20. Serviços LLM atualmente inativos

- Local: `src/services/llmService.ts`.
- Recursos: OpenAI, Gemini, DeepSeek, Anthropic, Ollama local e OpenRouter.
- Uso atual: importação e chamada em `App.tsx` estão comentadas; a explicação usa `currentNews.fala_proposta`.
- Variável da mensagem se reativado: `EXPLICAÇÃO DA NOTÍCIA`.
- Tratamento especificado: não precisa alterar enquanto estiver inativo. Se voltar a ser usado, qualquer falha de rede deve abrir popup ou usar texto de explicação já vindo da notícia somente se isso for definido como fallback oficial.
- Consequência de `Sair`: durante partida, reload.

## Pontos verificados sem ação imediata

- Não foram encontrados `axios`, Supabase, Firebase, Firestore ou import dinâmico remoto em `src/`.
- `src/reportWebVitals.ts` pode fazer `import('web-vitals')`, mas `src/index.tsx` chama `reportWebVitals()` sem callback; portanto esse import não roda no fluxo atual e não precisa do popup.
- `analyze_logs.js` usa `fetch`, mas é script auxiliar fora do app React; não entra no tratamento de popup do jogo.
- O endpoint `regra/` em `src/services/api.ts` e a busca de regra em `src/App.tsx` estão comentados. Devem receber o mesmo tratamento apenas se forem reativados.

## Proposta de arquitetura

### Tipo de erro

Criar um erro tipado para diferenciar rede de regra de negócio:

```ts
type NetworkFailureResource =
  | 'AUTENTICAÇÃO'
  | 'CADASTRO'
  | 'TROCA DE SENHA'
  | 'NOTÍCIAS'
  | 'BOTÃO Próxima Notícia'
  | 'IMAGEM DA NOTÍCIA'
  | 'DADOS DA PARTIDA'
  | 'RANKING'
  | 'MAPA'
  | 'CENÁRIO DO JOGO'
  | 'DADO'
  | 'BOTÃO Fake'
  | 'BOTÃO Não Fake'
  | string;
```

Campos mínimos:

- `resourceLabel`: texto usado na mensagem.
- `source`: arquivo/função ou endpoint, para log.
- `cause`: erro original.
- `context`: `auth`, `character-selection`, `match`, `victory`.
- `isBlocking`: sempre `true` para recursos essenciais.

### Cliente HTTP

Centralizar a classificação de falhas:

- `TypeError` do `fetch`, CORS e falhas de DNS: popup.
- `AbortError` por timeout: popup.
- `response.ok === false`: popup quando o recurso é essencial, exceto erros esperados de validação/login.
- JSON/texto inválido quando o recurso era esperado: popup.
- Resposta com erro de negócio (`erro`) deve ser avaliada por caso.

### Preload de assets

Substituir `preloadImages` permissivo por duas funções:

- `preloadRequiredImage(url, resourceLabel)`: rejeita no `onerror`.
- `preloadOptionalImage(url, resourceLabel)`: registra log e permite fallback.

Para CSS backgrounds essenciais, manter uma lista declarativa de assets críticos e preload antes de habilitar a tela que depende deles.

### Popup

Comportamento mínimo:

- Renderizar acima de qualquer painel (`z-index` maior que overlays existentes).
- Exibir a mensagem padrão com quebra de linha.
- Botão principal: `Sair`.
- Não fechar clicando fora, para evitar que a falha passe despercebida.
- Não exibir múltiplos popups empilhados; se outra falha ocorrer, manter a primeira ou atualizar para uma lista.

## Ordem sugerida de implementação

1. Criar o componente de popup e o helper de mensagem.
2. Criar função central de saída por contexto.
3. Ajustar `authService`, `partidaService`, `rankingService` e `apiService` para não engolir falhas de rede.
4. Ajustar `newsService`/`useNews` para propagar falha de notícias.
5. Conectar `GameContent` aos erros de notícias, mapa, partida e ranking.
6. Tornar obrigatório o preload de mapa, sprites, dado e botões de avaliação.
7. Adicionar `onError`/preload para imagens críticas restantes.
8. Revisar quais assets são decorativos e documentar os que não acionam popup.
9. Testar com rede desligada, endpoint indisponível, HTTP 500, JSON inválido e asset inexistente.

## Critérios de aceite

- Ao falhar a API de notícias, o usuário vê `Não foi possível carregar “NOTÍCIAS”.` e não consegue continuar a partida.
- Ao clicar em `Próxima Notícia` sem notícia carregada por falha de rede, o popup informa `BOTÃO Próxima Notícia` ou `NOTÍCIAS`.
- Ao falhar o dado ou suas imagens essenciais, o popup informa `DADO` antes de permitir a jogada.
- Ao falhar salvar resumo da partida, a falha não fica apenas no console.
- Ao falhar ranking, não há uso silencioso de dados fake em produção.
- O botão `Sair` do popup executa a mesma consequência do `Sair`/reinício do contexto atual.
- Falhas de credencial inválida, senha errada e validação de formulário continuam como mensagens normais de formulário, sem popup de internet.
