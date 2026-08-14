import apiService from './api';
import { News, NewsResponse } from '../types/news';
import { toNetworkFailureError } from '../utils/networkFailure';

/**
 * Serviço para gerenciar dados de notícias
 */
class NewsService {
  private normalizeNewsItem(item: any): News {
    return {
      ...item,
      id: Number(item?.id),
      publica: Number(item?.publica)
    } as News;
  }

  private normalizeNewsResponse(response: any): NewsResponse {
    if (Array.isArray(response)) {
      return { items: response.map((item) => this.normalizeNewsItem(item)) };
    }

    if (response && Array.isArray(response.items)) {
      return { ...response, items: response.items.map((item: any) => this.normalizeNewsItem(item)) };
    }

    if (response && typeof response === 'object' && typeof response.erro === 'string') {
      throw new Error(response.erro);
    }

    throw toNetworkFailureError(new Error('Formato inesperado na resposta de notícias'), 'NOTÍCIAS', 'newsService.normalizeNewsResponse', 'match');
  }

  /**
   * Busca todas as notícias disponíveis
   */
  public async getNews(quantidade: number = 100): Promise<NewsResponse> {
    try {
      const response = await apiService.post<any>('news', { quantidade });

      const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
      const normalizedResponse = this.normalizeNewsResponse(parsedResponse);

      if (!Array.isArray(normalizedResponse.items) || normalizedResponse.items.length === 0) {
        throw toNetworkFailureError(new Error('Lista de notícias vazia ou inválida'), 'NOTÍCIAS', 'newsService.getNews', 'match');
      }

      return normalizedResponse;
    } catch (error) {
      console.error('Falha ao buscar notícias:', error);
      throw error;
    }
  }

  /**
   * Busca uma notícia pelo ID
   */
  public async getNewsById(id: number): Promise<News | null> {
    try {
      const response = await this.getNews();
      
      if (!response.items || response.items.length === 0) {
        throw new Error('Falha ao buscar notícia');
      }
      
      const news = response.items.find(item => item.id === id);
      return news || null;
    } catch (error) {
      console.error(`Falha ao buscar notícia com id ${id}:`, error);
      return null;
    }
  }

  /**
   * Busca uma notícia aleatória
   */
  public async getRandomNews(): Promise<News | null> {
    try {
      const response = await this.getNews();
      
      if (!response.items || response.items.length === 0) {
        return null;
      }
      
      const randomNewsIndex = Math.floor(Math.random() * response.items.length);
      return response.items[randomNewsIndex];
    } catch (error) {
      console.error('Falha ao buscar notícia aleatória:', error);
      return null;
    }
  }
}

const newsService = new NewsService();

export default newsService; 