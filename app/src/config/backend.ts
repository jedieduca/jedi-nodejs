export const BACKENDS = {
  MEMORE: 'memore',
  JEDIEDUCA: 'jedieduca'
} as const;

export type BackendId = typeof BACKENDS[keyof typeof BACKENDS];

// Altere apenas esta constante para trocar o backend usado pela aplicacao.
export const ACTIVE_BACKEND: BackendId = BACKENDS.JEDIEDUCA;

type StaticBackendEndpointName =
  | 'sortearPerguntas'
  | 'ranking'
  | 'rankingEscola'
  | 'rankingTurma'
  | 'autenticar'
  | 'cadastrarUsuario'
  | 'trocarSenha'
  | 'recuperarSenha'
  | 'salvarPartida'
  | 'listarPartidasAgrupadas'
  | 'listarCategorias';

type DynamicBackendEndpointName =
  | 'listarPartida'
  | 'listarTodasJogadas'
  | 'listarPergunta';

type BackendEndpointMap = Record<StaticBackendEndpointName, string | undefined> &
  Record<DynamicBackendEndpointName, (id: string | number) => string>;

type BackendConfig = {
  id: BackendId;
  label: string;
  endpoints: BackendEndpointMap;
};

const MEMORE_API_BASE_URL = 'https://memore-net.com/api/JEDI-API';
const JEDIEDUCA_API_BASE_URL = 'https://api2.jedieduca.com.br/api';

const buildEndpoint = (baseUrl: string, path: string): string => {
  return `${baseUrl}/${path}`;
};

const buildEndpointWithId = (baseUrl: string, path: string, id: string | number): string => {
  return buildEndpoint(baseUrl, `${path}/${encodeURIComponent(String(id))}`);
};

const BACKEND_CONFIGS: Record<BackendId, BackendConfig> = {
  [BACKENDS.MEMORE]: {
    id: BACKENDS.MEMORE,
    label: 'memore',
    endpoints: {
      sortearPerguntas: buildEndpoint(MEMORE_API_BASE_URL, 'pergunta2/sortearPerguntas'),
      ranking: buildEndpoint(MEMORE_API_BASE_URL, 'partidasperguntas/ranking'),
      rankingEscola: buildEndpoint(MEMORE_API_BASE_URL, 'partidasperguntas/ranking-escola'),
      rankingTurma: buildEndpoint(MEMORE_API_BASE_URL, 'partidasperguntas/ranking-turma'),
      autenticar: buildEndpoint(MEMORE_API_BASE_URL, 'system_user/autenticar'),
      cadastrarUsuario: buildEndpoint(MEMORE_API_BASE_URL, 'system_user/cadastrar'),
      trocarSenha: buildEndpoint(MEMORE_API_BASE_URL, 'system_user/trocarSenha'),
      recuperarSenha: undefined,
      salvarPartida: buildEndpoint(MEMORE_API_BASE_URL, 'partidasperguntas/salvarPartida'),
      listarPartida: (partidaId) =>
        buildEndpointWithId(MEMORE_API_BASE_URL, 'partidasperguntas/listarPartida', partidaId),
      listarTodasJogadas: (partidaId) =>
        buildEndpointWithId(MEMORE_API_BASE_URL, 'logPerguntas/listarLogPergunta', partidaId),
      listarPergunta: (perguntaId) =>
        buildEndpointWithId(MEMORE_API_BASE_URL, 'pergunta2/listarPergunta', perguntaId),
      listarPartidasAgrupadas: buildEndpoint(MEMORE_API_BASE_URL, 'partidasperguntas/listarPartida/group%20by%20login'),
      listarCategorias: buildEndpoint(MEMORE_API_BASE_URL, 'categoria/listarCategorias/')
    }
  },
  [BACKENDS.JEDIEDUCA]: {
    id: BACKENDS.JEDIEDUCA,
    label: 'jedieduca',
    endpoints: {
      sortearPerguntas: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'pergunta2/sortearPerguntas'),
      ranking: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'partidasperguntas/ranking'),
      rankingEscola: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'partidasperguntas/ranking-escola'),
      rankingTurma: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'partidasperguntas/ranking-turma'),
      autenticar: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'system_user/autenticar'),
      cadastrarUsuario: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'system_user/cadastrar'),
      trocarSenha: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'system_user/trocarSenha'),
      recuperarSenha: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'system_user/recuperarSenha'),
      salvarPartida: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'partidasperguntas/salvarPartida'),
      listarPartida: (partidaId) =>
        buildEndpointWithId(JEDIEDUCA_API_BASE_URL, 'partidasperguntas/listarPartida', partidaId),
      listarTodasJogadas: (partidaId) =>
        buildEndpointWithId(JEDIEDUCA_API_BASE_URL, 'logPerguntas/listarLogPergunta', partidaId),
      listarPergunta: (perguntaId) =>
        buildEndpointWithId(JEDIEDUCA_API_BASE_URL, 'pergunta2/listarPergunta', perguntaId),
      listarPartidasAgrupadas: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'partidasperguntas/listarPartida/group%20by%20login'),
      listarCategorias: buildEndpoint(JEDIEDUCA_API_BASE_URL, 'categoria/listarCategorias/')
    }
  }
};

export const getActiveBackendLabel = (): string => {
  return BACKEND_CONFIGS[ACTIVE_BACKEND].label;
};

export function getBackendEndpoint(endpointName: StaticBackendEndpointName): string;
export function getBackendEndpoint(endpointName: DynamicBackendEndpointName, id: string | number): string;
export function getBackendEndpoint(
  endpointName: StaticBackendEndpointName | DynamicBackendEndpointName,
  id?: string | number
): string {
  const endpoint = BACKEND_CONFIGS[ACTIVE_BACKEND].endpoints[endpointName];

  if (typeof endpoint === 'function') {
    if (id === undefined) {
      throw new Error(`Endpoint "${endpointName}" exige um identificador`);
    }

    return endpoint(id);
  }

  if (!endpoint) {
    throw new Error(`Endpoint "${endpointName}" nao configurado para o backend "${getActiveBackendLabel()}"`);
  }

  return endpoint;
}
