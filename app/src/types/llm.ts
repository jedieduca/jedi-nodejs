// Tipo para mensagens de chat
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Tipos para modelos LLM
export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'google' | 'deepseek' | 'anthropic' | 'ollama' | 'openrouter';
  apiKeyEnv: string;
}

// Tipo para a requisição LLM genérica
export interface LLMRequest {
  model: string;
  messages: ChatMessage[];
}

// Tipo para resposta LLM
export interface LLMResponse {
  text: string;
  model: string;
} 