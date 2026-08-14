import env from '../config/env';
import { getBackendEndpoint } from '../config/backend';
import { ensureOkResponse, isFetchFailure, toNetworkFailureError } from '../utils/networkFailure';

// Flag para ativar modo mock quando não houver servidor
const USE_MOCK = false; // Altere para false quando tiver um servidor real

/**
 * Classe para gerenciar requisições HTTP
 */
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Método genérico para realizar requisições HTTP
   */
  
  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    data?: any,
    headers: HeadersInit = {}
  ): Promise<T> {
    if (USE_MOCK && env.NODE_ENV === 'development') {
      console.log(`[MOCK] ${method} ${endpoint}`);
      return this.getMockData<T>(endpoint);
    }

    let url = '';
    
    if (endpoint === 'news') {
      url = getBackendEndpoint('sortearPerguntas');
    } else if (endpoint.startsWith('regra/')) {
      url = 'https://memore-net.com/jogos/trilha/PHP_STI/montaFraseSTIJson.php?'+endpoint.replace('/', '=');
    } else {
      console.log('===> endpoint:', endpoint, 'Não encontrado');
      throw new Error(`endpoint "${endpoint}" não encontrado`);
    }

    const resourceLabel = endpoint === 'news' ? 'NOTÍCIAS' : 'REGRA DA NOTÍCIA';

    console.log('===> endpoint:', endpoint, 'Fazendo requisição para:', url);

    const requestHeaders: HeadersInit = {
      'Accept': 'application/json',
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    };

    const requestInit: RequestInit = {
      method,
      mode: 'cors',
      credentials: 'omit',
      headers: requestHeaders,
      ...(data !== undefined ? { body: JSON.stringify(data) } : {})
    };

    try {
      const response = await fetch(url, requestInit);
      ensureOkResponse(response, resourceLabel, url, 'match');

      let responseData: unknown;
      try {
        responseData = await response.json();
      } catch (error) {
        throw toNetworkFailureError(error, resourceLabel, url, 'match');
      }
      // console.log('Resposta recebida:', responseData);
      return responseData as T;
    } catch (error) {
      console.error('Falha na requisição:', error);
      if (isFetchFailure(error)) {
        throw toNetworkFailureError(error, resourceLabel, url, 'match');
      }
      throw error;
    }
  }
  /**
   * Método para simular resposta de API com dados mockados
   */
  private getMockData<T>(endpoint: string): Promise<T> {
    // Simular delay de rede
    return new Promise((resolve) => {
      setTimeout(() => {
        if (endpoint.startsWith('news')) {
          if (endpoint === 'news') {
            // Lista de notícias
            resolve({
              status: 'success',
              data: [
                {
                  id: 1,
                  title: 'Nova expansão do jogo',
                  content: 'Uma nova expansão do jogo chegará em breve com novos mapas e personagens!',
                  publishedAt: '2023-03-30T14:30:00Z',
                  imageUrl: 'https://via.placeholder.com/300'
                },
                {
                  id: 2,
                  title: 'Torneio online',
                  content: 'Participe do nosso torneio online e concorra a prêmios incríveis.',
                  publishedAt: '2023-03-25T10:15:00Z',
                  imageUrl: 'https://via.placeholder.com/300'
                },
                {
                  id: 3,
                  title: 'Atualização do sistema',
                  content: 'Uma nova atualização do sistema foi lançada, melhorando o desempenho geral.',
                  publishedAt: '2023-03-20T09:00:00Z',
                  imageUrl: 'https://via.placeholder.com/300'
                }
              ]
            } as unknown as T);
          } else {
            // Notícia específica
            const id = endpoint.split('/')[1];
            resolve({
              status: 'success',
              data: {
                id: parseInt(id),
                title: `Notícia ${id}`,
                content: `Conteúdo detalhado da notícia ${id}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
                publishedAt: '2023-03-30T14:30:00Z',
                imageUrl: 'https://via.placeholder.com/300'
              }
            } as unknown as T);
          }
        } else {
          // Endpoint desconhecido
          resolve({
            status: 'error',
            message: 'Endpoint não encontrado no mock'
          } as unknown as T);
        }
      }, 500); // Delay de 500ms para simular latência de rede
    });
  }

  /**
   * Método para requisições GET
   */
  public async get<T>(endpoint: string, headers: HeadersInit = {}): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, headers);
  }

  /**
   * Método para requisições POST
   */
  public async post<T>(endpoint: string, data: any, headers: HeadersInit = {}): Promise<T> {
    return this.request<T>(endpoint, 'POST', data, headers);
  }

  /**
   * Método para requisições PUT
   */
  public async put<T>(endpoint: string, data: any, headers: HeadersInit = {}): Promise<T> {
    return this.request<T>(endpoint, 'PUT', data, headers);
  }

  /**
   * Método para requisições DELETE
   */
  public async delete<T>(endpoint: string, headers: HeadersInit = {}): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', undefined, headers);
  }
}

const apiService = new ApiService(env.API_URL);

export default apiService; 