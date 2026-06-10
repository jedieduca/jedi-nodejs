// Configuração de variáveis de ambiente
const env = {
  // URL base da API
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',

  // Chave de API para autenticação
  API_KEY: process.env.REACT_APP_API_KEY || '',

  // Chaves de API para modelos LLM
  OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY || '',
  GOOGLE_API_KEY: process.env.REACT_APP_GOOGLE_API_KEY || '',
  DEEPSEEK_API_KEY: process.env.REACT_APP_DEEPSEEK_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.REACT_APP_ANTHROPIC_API_KEY || '',
  OLLAMA_API_KEY: process.env.REACT_APP_OLLAMA_API_KEY || '',
  OPENROUTER_API_KEY: process.env.REACT_APP_OPENROUTER_API_KEY || '',
  
  // Credenciais do PostgreSQL (apenas para referência - usadas no backend)
  // No frontend, não precisamos expor essas variáveis, pois o backend gerencia a conexão
  PG_HOST: process.env.REACT_APP_PG_HOST,
  PG_PORT: process.env.REACT_APP_PG_PORT,
  PG_DATABASE: process.env.REACT_APP_PG_DATABASE,
  PG_USER: process.env.REACT_APP_PG_USER,
  PG_PASSWORD: process.env.REACT_APP_PG_PASSWORD,
  
  // Configurações da aplicação
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default env; 