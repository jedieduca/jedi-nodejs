import { LLMModel } from '../types/llm';
import env from './env';

// Definição dos modelos disponíveis
const llmModels: LLMModel[] = [ 
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini (OpenAI)',
    provider: 'openai',
    apiKeyEnv: 'OPENAI_API_KEY'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash (Google)',
    provider: 'google',
    apiKeyEnv: 'GOOGLE_API_KEY'
  }
  /*
  ,
  {
    id: 'gemma3:4b',
    name: 'Gemma 3 local (Google)',
    provider: 'ollama',
    apiKeyEnv: ''
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3 (DeepSeek)',
    provider: 'deepseek',
    apiKeyEnv: 'DEEPSEEK_API_KEY'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku (Anthropic)',
    provider: 'anthropic',
    apiKeyEnv: 'ANTHROPIC_API_KEY'
  },
  {
    id: 'openrouter/quasar-alpha',
    name: 'Quasar Alpha (OpenRouter)',
    provider: 'openrouter',
    apiKeyEnv: 'OPENROUTER_API_KEY'
  }
  */
 
];

// Função auxiliar para obter a API key do modelo
export const getModelApiKey = (modelId: string): string => {
  const model = llmModels.find(m => m.id === modelId);
  if (!model) {
    throw new Error(`Modelo ${modelId} não encontrado`);
  }

  const keyName = model.apiKeyEnv;
  // @ts-ignore: Acessando propriedades dinamicamente
  const apiKey = env[keyName] || '';

  // console.log('model ',model, ' env ', JSON.stringify(env));


  if (!apiKey) {
    console.warn(`API Key para ${model.name} não encontrada no arquivo .env`);
  }
  
  return apiKey;
};

// Função para obter um modelo por ID
export const getModelById = (modelId: string): LLMModel | undefined => {
  return llmModels.find(m => m.id === modelId);
};

// Modelo padrão
export const defaultModel = llmModels[0]; // gpt-4o-mini

export default llmModels; 