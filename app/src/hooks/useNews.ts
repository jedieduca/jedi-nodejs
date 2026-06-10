import { useState, useEffect, useCallback } from 'react';
import { News } from '../types/news';
import newsService from '../services/newsService';

interface UseNewsResult {
  news: News[];
  //latestNews: News | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook personalizado para gerenciar o estado das notícias
 */
export const useNews = (): UseNewsResult => {
  const [news, setNews] = useState<News[]>([]);
//  const [latestNews, setLatestNews] = useState<News | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  //
  // ***** Substituir pela carga dos objetos de notícia do JSON
  // setNews(jsonObj.items);
  // onde jsonObj é o objeto JSON carregado do arquivo noticias.json com as notícias
  //
  
  /**
   * Função para buscar as notícias
   */
  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Busca todas as notícias
      const response = await newsService.getNews();
      // console.log('*** Resposta API:', response);
      
      // Verifica se a resposta tem a propriedade 'items' e é um array
      if (response && response.items && Array.isArray(response.items)) {
        setNews(response.items);
      } else {
        // Se não tiver a estrutura esperada, trata como array vazio
        console.error('Formato de resposta inesperado:', response);
        setNews([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar notícias';
      setError(errorMessage);
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  

  // Busca as notícias na montagem do componente
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return {
    news,
    //latestNews,
    loading,
    error,
    refetch: fetchNews
  };
};

export default useNews; 