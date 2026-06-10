/**
 * Configuração de versão da aplicação
 * 
 * Esta versão é automaticamente obtida do package.json durante o build.
 * A versão é injetada via variável de ambiente REACT_APP_VERSION no processo de build.
 */

/**
 * Versão da aplicação obtida automaticamente do package.json
 * Fallback para '0.1.0' caso a variável de ambiente não esteja disponível
 */
export const APP_VERSION: string = 
  process.env.REACT_APP_VERSION || 
  process.env.npm_package_version || 
  '0.1.7';

/**
 * Informações de build (disponíveis apenas em produção após build)
 */
export interface BuildInfo {
  version: string;
  buildDate?: string;
  buildTime?: string;
}

export const BUILD_INFO: BuildInfo = {
  version: APP_VERSION,
  buildDate: process.env.REACT_APP_BUILD_DATE, // undefined se não disponível
  buildTime: process.env.REACT_APP_BUILD_TIME, // undefined se não disponível
};

/**
 * Formata a versão para exibição (adiciona 'v' antes do número)
 * @returns Versão formatada (ex: "v0.1.0")
 */
export const getFormattedVersion = (): string => {
  return `v${APP_VERSION}`;
};

/**
 * Retorna informações completas de versão (para debug/logs)
 * @returns String com versão e data de build se disponível
 */
export const getFullVersionInfo = (): string => {
  const parts = [getFormattedVersion()];
  if (BUILD_INFO.buildDate) {
    try {
      const date = new Date(BUILD_INFO.buildDate);
      if (!isNaN(date.getTime())) {
        parts.push(date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }));
      }
      // Hora de São Paulo
      const time = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
      if (time) {
        parts.push(' às ' + time);
      }
    } catch (e) {
      // Ignora erros
    }
  }
  return parts.join(' ');
};

/**
 * Versão simples para exibição (sem o prefixo 'v')
 * Útil para casos onde você quer apenas o número da versão
 */
export const getSimpleVersion = (): string => {
  return APP_VERSION;
};

