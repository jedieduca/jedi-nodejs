# Especificação da adição do Ranking na div.victory-panel

## Contexto

Vamos adicionar o ranking atualizado ao final da partida mostrado na div.victory-panel. Buscar o ranking na API somente após o retorno do sucesso da gravação do resumo final.

## Busca do Ranking na API

### Habilitação

O ranking deve ser buscado na API somente após a resposta de sucesso da gravação do resumo final, pois o ranking deve estar atualizado também com os dados da partida que acabou de ser enviada (essa tarefa é do backend).

### End-point: [https://memore-net.com/api/JEDI-API/partidasperguntas/ranking](https://memore-net.com/api/JEDI-API/partidasperguntas/ranking)

Interface de Entrada da API:
{
	"idPartida": 
}

Interface de Saída da API:
[
	{
		"jogador": ,
		"pontuacao": ,
		"percentualAcertos": <float (%)>,
		"tempoGasto": <integer (segundos)>,
		"totalPartidas": ,
		"posicao": <posição no ranking>
	},
    ...
]

Exemplo de Entrada da API:
{
	"idPartida": 1
} 

Exemplo 1 de Saída Positiva da API (1 a 11 objetos no array):
[
	{
		"jogador": "Marcos",
		"pontuacao": "127000",
		"percentualAcertos": "100.0000",
		"tempoGasto": "57.3413",
		"totalPartidas": "1",
		"posicao": 1
	},
	{
		"jogador": "Rafael",
		"pontuacao": "119000",
		"percentualAcertos": "100.0000",
		"tempoGasto": "177.404",
		"totalPartidas": "1",
		"posicao": 2
	},
	{
		"jogador": "Liz",
		"pontuacao": "109000",
		"percentualAcertos": "100.0000",
		"tempoGasto": "78.3418",
		"totalPartidas": "1",
		"posicao": 3
	},
	{
		"jogador": "Renato",
		"pontuacao": "108000",
		"percentualAcertos": "100.0000",
		"tempoGasto": "46.8211",
		"totalPartidas": "1",
		"posicao": 4
	},
	{
		"jogador": "i",
		"pontuacao": "102000",
		"percentualAcertos": "100.0000",
		"tempoGasto": "2.80006",
		"totalPartidas": "1",
		"posicao": 5
	},
	{
		"jogador": "e",
		"pontuacao": "102000",
		"percentualAcertos": "100.0000",
		"tempoGasto": "11.4203",
		"totalPartidas": "1",
		"posicao": 6
	},
	{
		"jogador": "xx",
		"pontuacao": "102000",
		"percentualAcertos": "100.0000",
		"tempoGasto": "21.4405",
		"totalPartidas": "3",
		"posicao": 7
	},
	{
		"jogador": "t",
		"pontuacao": "102000",
		"percentualAcertos": "83.3333",
		"tempoGasto": "24.2606",
		"totalPartidas": "2",
		"posicao": 8
	},
	{
		"jogador": "x",
		"pontuacao": "102000",
		"percentualAcertos": "47.6190",
		"tempoGasto": "5.42012",
		"totalPartidas": "25",
		"posicao": 9
	},
	{
		"jogador": "Treice",
		"pontuacao": "101000",
		"percentualAcertos": "100.0000",
		"tempoGasto": "7.12016",
		"totalPartidas": "5",
		"posicao": 10
	},
	{
		"jogador": "hh",
		"pontuacao": "3000",
		"percentualAcertos": "66.6667",
		"tempoGasto": "6.30014",
		"totalPartidas": "1",
		"posicao": 48
	}
]

Exemplo de Saída Negativa da API:
{
	"erro": "Tema sem registo!"
}

## GUI

Criar a nova versão da div.victory-panel de forma que a imagem e o texto "Parabéns!!!", que atualmente estão centralizados, fique à esquerda enquanto a direita seja ocupada por uma nova div (div.ranking) com a seguinte especificação:

O ranking deverá ter um título com fonte destacada acima de uma tabela com uma linha de cabeçalho com fundo destacado e com o título da coluna (com fonte divertido), seguido de 10 linhas de registros com 4 colunas:

1. "Posição" com valores inteiros ordinais (Nº)
2. "Avatar" com pequena imagem redonda do avatar do jogador
3. "Nome" com o nome do jogador
4. "Pontuação" com a pontuação (inteiro) do jogador

A última linha da tabela deve ser o mesmo fundo do cabeçalho das colunas e destacar o jogador atual, que poderá estar além da 10ª posição.

### Referência

Use a página do arquivo ranking-tela.html apenas como referência de layout, mas não como estilo. Elabore seu próprio estilo baseado na identidade visual do jogo JEDi Educa e ajuste para que os limites totais da div.victory-panel continuem como os atuais,

Atenção:

1. A página html ranking-tela.html serve só como suporte para demostrar as alterações que devem ser feitas na div.victory-panel.
2. As 4 colunas devem ter larguras diferentes adequadas aos conteúdos, sendo |6|6|30|9|, respectivamente.
3. Não use tailwind! Leia o estilo CSS/tailwind da página de referência (ranmking-tela.html) para estilizar classes , ids, etc, seguindo o padrão da aplicação JEDi Educa.

## Funcionalidade

Ao finalizar a partida, enviar o último resumo, aguardar o resultado de sucesso (com o id da partida) e chamar a API do ranking para obter os dados do ranking para então renderizar o novo painel da vitória com o ranking.  
  
Os dados retornados do ranking conterão um array com os dados dos 10 melhores recordistas e um 11º registro com os dados do jogador atual, que pode ou não estar entre os 10 primeiros, mas aparecerá repetido mesmo na 11ª posição nesta primeira versão.  
  
O painel de vitória pode ser renderizado como antes do retorno das 2 chamas à API em sequência, desde que seja apresentada uma animação interessante em CSS informando que está carregando o ranking (o conteúdo da div do ranking) enquanto já mostra o restante do painel de vitória.  

Os avatares dos jogadores no ranking serão fornecidos em versão futura na API, mas nesta versão cada jogador terá, aleatoriamente, uma das 6 imagens ("public/assets/sprites/avatar-jedi-*.png") que constam na página de referência.


