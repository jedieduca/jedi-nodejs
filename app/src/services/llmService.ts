import { ChatMessage, LLMResponse, LLMRequest } from '../types/llm';
import { getModelApiKey, getModelById } from '../config/llmModels';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Serviço para interagir com diferentes APIs de modelos LLM
 */
class LLMService {
  /**
   * Envia uma requisição para a API do modelo LLM especificado
   * 
   * @param request - Objeto contendo o modelo e as mensagens
   * @returns Uma promise com a resposta do modelo LLM
   */
  public async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const { model, messages } = request;
    
    // Obter informações do modelo
    const modelInfo = getModelById(model);
    if (!modelInfo) {
      throw new Error(`Modelo ${model} não suportado`);
    }
    
    // Obter a API key do modelo
    const apiKey = getModelApiKey(model);
    
    try {
      // Escolher o adaptador correto com base no provedor
      switch (modelInfo.provider) {
        case 'openai':
          return await this.callOpenAI(model, messages, apiKey);
        case 'google':
          return await this.callGoogle(model, messages, apiKey);
        case 'deepseek':
          return await this.callDeepseek(model, messages, apiKey);
        case 'anthropic':
          return await this.callAnthropic(model, messages, apiKey);
        case 'ollama':
          return await this.callOllama(model, messages, apiKey);
        case 'openrouter':
          return await this.callOpenRouterQuasarAlpha(model, messages, apiKey);
        default:
          throw new Error(`Provedor para modelo ${model} não implementado`);
      }
    } catch (error) {
      console.error(`Erro ao chamar modelo LLM ${model}:`, error);
      throw error;
    }
  }
  
  /**
   * Adapta e envia uma requisição para a API da OpenAI
   */
  private async callOpenAI(model: string, messages: ChatMessage[], apiKey: string): Promise<LLMResponse> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    const body = {
      model,
      messages,
      max_completion_tokens: 1500
    };
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro na API OpenAI: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      model
    };
  }
  
  /**
   * Adapta e envia uma requisição para a API do Google (Gemini)
   */
  private async callGoogle(model: string, messages: ChatMessage[], apiKey: string): Promise<LLMResponse> {
    // API do Google Gemini usa um formato diferente, então vamos adaptar
    
    // Converter mensagens para o formato do Gemini
    const geminiMessages = this.convertToGeminiFormat(messages);
    
    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    };
    
    const body = {
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: 500,
      }
    };
    
    // URL da API do Gemini
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro na API Google: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    return {
      text: data.candidates[0].content.parts[0].text,
      model
    };
  }
  
  /**
   * Adapta e envia uma requisição para a API do DeepSeek
   */
  private async callDeepseek(model: string, messages: ChatMessage[], apiKey: string): Promise<LLMResponse> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    const body = {
      model: model,
      messages,
      max_tokens: 500
    };
    
    const response = await fetch('https://api.deepseek.com', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro na API DeepSeek: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      model
    };
  }

  /**
   * Adapta e envia uma requisição para a API do Anthropic
   */
  private async callAnthropic(model: string, messages: ChatMessage[], apiKey: string): Promise<LLMResponse> {
    // const headers = {
    //   'Content-Type': 'application/json',
    //   'Authorization': `Bearer ${apiKey}`
    // };
    
    // const body = {
    //   model,
    //   messages,
    //   max_tokens: 500
    // };
    
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers,
    //   body: JSON.stringify(body)
    // });
    
    // if (!response.ok) {
    //   const error = await response.json();
    //   throw new Error(`Erro na API Anthropic: ${JSON.stringify(error)}`);
    // }
    
    // const data = await response.json();
 
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Hello, Claude" }],
    });
 
    return {
      text: message.content[0].type === "text" ? message.content[0].text : "",
      model
    };
  }

    /**
   * Adapta e envia uma requisição para a API da Ollama
   */
    private async callOllama(model: string, messages: ChatMessage[], apiKey: string): Promise<LLMResponse> {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Ollama requer apenas model e messages, sem max_tokens
      const body = {
        model: model, // Usa o ID do modelo fornecido
        messages: messages
      };
      
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Erro na API Ollama: ${JSON.stringify(error)}`);
      }
      
      // Ollama retorna respostas em streaming, precisamos ler até o final
      const reader = response.body?.getReader();
      let result = '';
      
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Converte o buffer para texto
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            // A última linha completa contém a resposta final
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.message?.content) {
                  result += data.message.content;
                }
                // Se for o último chunk com done:true, podemos parar
                if (data.done === true) {
                  break;
                }
              } catch (e) {
                console.warn('Erro ao processar linha JSON:', line);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
      
      return {
        text: result,
        model
      };
    }
  
    /**
   * Adapta e envia uma requisição para a API da OpenAI
   */
  private async callOpenRouterQuasarAlpha(model: string, messages: ChatMessage[], apiKey: string): Promise<LLMResponse> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    const body = {
      model,
      messages,
      max_tokens: 500
    };
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro na API OpenRouter: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      model
    };
  }
  
  
      
  /**
   * Converte mensagens do formato padrão para o formato esperado pelo Gemini
   */
  private convertToGeminiFormat(messages: ChatMessage[]): any[] {
    const result = [];
    let systemPrompt = '';
    
    // Extrair o prompt do sistema, se existir
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      systemPrompt = systemMessage.content;
    }
    
    // Converter as mensagens para o formato do Gemini
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (message.role === 'system') continue; // Já tratamos isso
      
      if (i === 0 && message.role === 'user' && systemPrompt) {
        // Adicionar o prompt do sistema à primeira mensagem do usuário
        result.push({
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${message.content}` }]
        });
      } else {
        result.push({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }]
        });
      }
    }
    
    return result;
  }
}

// Instância singleton do serviço
const llmService = new LLMService();

export default llmService; 