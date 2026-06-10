# Diagramas de Sequência – JEDi Educa

Este documento apresenta duas sequências centrais do jogo JEDi Educa: avaliação de notícia com acerto e avaliação com erro. Os diagramas utilizam notação Mermaid para facilitar a visualização dentro do repositório.

## Seqüência 1 – Avaliação Correta e Lançamento de Dado

```mermaid
sequenceDiagram
    autonumber
    participant J as Jogador
    participant UI as Interface React
    participant PC as PlayersContext / PlayerManager
    participant News as Serviço de Notícias
    participant Dice as Componente Dado

    J->>UI: Seleciona personagens (UC02)
    UI->>PC: addPlayers()
    UI->>News: getNews()
    News-->>UI: Lista de notícias
    UI->>J: Exibe notícia e opções Fake/Não Fake
    J->>UI: Avalia notícia (Resposta correta)
    UI->>UI: dispatchGameEvent(AVALIACAO_CORRETA)
    UI->>J: Narração celebra acerto (Tia Bel)
    UI->>Dice: Habilita dado e chama setZoomToDice()
    J->>Dice: Clica no dado
    Dice->>UI: DADO_CLICADO
    UI->>UI: dispatchGameEvent(DADO_CLICADO)
    UI->>UI: startDiceAnimation() / AnimacaoDado
    UI->>PC: setActivePlayerMoves(valorDoDado)
    UI->>UI: AnimacaoZoomIn → AnimacaoCaminhada
    UI->>PC: moveActivePlayerSteps()
    PC-->>UI: Conclui movimento (CAMINHADA_ANIMACAO_FIM)
    UI->>UI: AnimacaoZoomOut → AguardandoNoticia1
```

## Seqüência 2 – Avaliação Incorreta e Explicação

```mermaid
sequenceDiagram
    autonumber
    participant J as Jogador
    participant UI as Interface React
    participant News as Serviço de Notícias
    participant Rules as Serviço de Regras
    participant LLM as Serviço de IA (LLM)
    participant Speech as Serviço de Narração

    J->>UI: Avalia notícia (Resposta incorreta)
    UI->>UI: dispatchGameEvent(AVALIACAO_INCORRETA)
    UI->>Rules: getRegra(idRegra)
    Rules-->>UI: Dados estruturados da regra
    UI->>LLM: generateResponse(systemMessage, userMessage)
    LLM-->>UI: Texto explicativo adaptado
    UI->>Speech: speak(explanationText)
    UI->>J: Exibe painel de explicação + selo Fake/Not Fake
    J->>UI: Fecha painel
    UI->>UI: dispatchGameEvent(FECHAR_EXPLICACAO)
    UI->>UI: shouldSelectNextNews = true
    UI->>UI: nextTurn() (PlayerManager)
    UI->>News: Seleciona próxima notícia
```

## Notas Complementares
- Os diagramas focam no fluxo lógico. Efeitos visuais (zoom, animações) foram simplificados para clareza.
- O `PlayerManager` mantém controle de turnos e posições; suas interações foram sintetizadas nos diagramas como chamadas diretas.
- Serviços externos (News, Rules, LLM, Speech) estão desacoplados via `apiService`, `llmService` e `speechService`. Cada chamada inclui tratamento de erros e fallback na implementação real.





















