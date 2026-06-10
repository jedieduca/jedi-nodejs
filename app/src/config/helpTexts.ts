export interface HelpSection {
  title: string;
  paragraphs: string[];
}

export interface HelpContent {
  title: string;
  sections: HelpSection[];
}

export const HELP_GAME_OVERVIEW: HelpContent = {
  title: 'Como jogar o JEDi Educa',
  sections: [
    {
      title: 'O que é o JEDi Educa?',
      paragraphs: [
        'O JEDi Educa é um jogo de tabuleiro digital que ensina você a identificar notícias falsas (fake news). Seu objetivo é chegar ao final do tabuleiro acertando o maior número de avaliações possível.'
      ]
    },
    {
      title: 'Como começar',
      paragraphs: [
        'Escolha um personagem arrastando-o ou clicando nele. Preencha seu nome, idade e autoavaliação. Depois, clique em "Iniciar jogo".'
      ]
    },
    {
      title: 'Ciclo de cada rodada',
      paragraphs: [
        '1. Clique no botão verde "Próxima Notícia" para ver a próxima notícia.',
        '2. Uma notícia aparece na tela. Leia com atenção.',
        '3. Escolha "FAKE" ou "NÃO FAKE".',
        '4. Se acertar: a Tia Bel comemora e você lança o dado, representando quantas casas você vai andar no tabuleiro.',
        '5. Se errar: a Tia Bel explica por que a notícia era falsa (ou verdadeira) e você não lança o dado nessa rodada.'
      ]
    },
    {
      title: 'Encantos mágicos',
      paragraphs: [
        'No tabuleiro existem três tipos de encanto que podem ajudar ou atrapalhar você, dependendo do seu desempenho. Durante a partida, clique sobre o skate, o portal ou uma pílula para ver as regras de cada um.'
      ]
    }
  ]
};

export const HELP_SKATE: HelpContent = {
  title: 'Skate Magnético',
  sections: [
    {
      title: 'O que é?',
      paragraphs: [
        'O Skate Magnético é uma recompensa para quem está acertando bastante! Se você tiver mais de 60% de acertos ao pisar na casa do skate, ele se ativa e leva seu personagem voando até passar do lago.'
      ]
    },
    {
      title: 'Como funciona',
      paragraphs: [
        'Ao passar pela casa do Skate Park, o jogo verifica sua taxa de acertos.',
        'Se for maior que 60%, seu personagem salta para o skate, voa pelo tabuleiro e pousa entre o lago e o portal de desmaterialização, um atalho poderoso!',
        'Se for 60% ou menos, nada acontece e você continua normalmente.'
      ]
    },
    {
      title: 'Dica',
      paragraphs: [
        'Quando o skate está brilhando com uma aura, significa que sua taxa de acertos é alta o suficiente para ativá-lo. Fique de olho!'
      ]
    }
  ]
};

export const HELP_PORTAL: HelpContent = {
  title: 'Portal de Desmaterialização',
  sections: [
    {
      title: 'O que é?',
      paragraphs: [
        'O Portal de Desmaterialização é um castigo para quem não está mandando bem nas avaliações  de notícias. Se sua taxa de acertos estiver abaixo de 90% ao parar exatamente na casa do portal, você é teleportado para trás no tabuleiro (4 casas).'
      ]
    },
    {
      title: 'Como funciona',
      paragraphs: [
        'Quando seu personagem termina o movimento na casa do portal, o jogo verifica sua taxa de acertos.',
        'Se for menor que 90%, seu personagem é desmaterializado e rematerializado em uma casa mais distante da chegada.',
        'Se for 90% ou mais, nada acontece e você segue normalmente.'
      ]
    },
    {
      title: 'Dica',
      paragraphs: [
        'Quando o portal está com uma aura brilhante, significa que sua taxa de acertos ainda não é alta o suficiente para passar em segurança. Tente acertar mais notícias!'
      ]
    }
  ]
};

export const HELP_PILULA: HelpContent = {
  title: 'Pílula do Julgamento',
  sections: [
    {
      title: 'O que é?',
      paragraphs: [
        'As pílulas do julgamento são encantos espalhados pelo tabuleiro que mudam de cor conforme seu desempenho. Ao parar em cima de uma delas, o efeito pode ser positivo ou negativo.'
      ]
    },
    {
      title: 'Cores e efeitos',
      paragraphs: [
        'Vermelha (menos de 30% de acertos): você recua 4 casas no tabuleiro.',
        'Amarela (30% a 49% de acertos): você recua metade do valor do último dado.',
        'Azul (50% a 99% de acertos): se tiver mais de 70%, avança de 1 a 3 casas; senão, apenas passa a rodada.',
        'Verde (100% de acertos): você avança de 4 a 6 casas — o melhor resultado!'
      ]
    },
    {
      title: 'Posição variável',
      paragraphs: [
        'As três pílulas mudam de posição a cada partida, então fique atento! A cor delas muda em tempo real conforme seu aproveitamento.'
      ]
    }
  ]
};

export function getHelpContentByType(type: string): HelpContent {
  switch (type) {
    case 'skate': return HELP_SKATE;
    case 'portal': return HELP_PORTAL;
    case 'pilula': return HELP_PILULA;
    default: return HELP_GAME_OVERVIEW;
  }
}
