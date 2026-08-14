import {
  NetworkFailureError,
  ensureOkResponse,
  formatNetworkFailureMessage,
  isFetchFailure,
  isNetworkFailureError,
  toNetworkFailureError
} from './networkFailure';

describe('networkFailure', () => {
  it('formats a user-facing failure message with the resource label', () => {
    expect(formatNetworkFailureMessage('NOTÍCIAS')).toContain('Não foi possível carregar “NOTÍCIAS”');
    expect(formatNetworkFailureMessage('NOTÍCIAS')).toContain('Verifique o sinal de internet');
  });

  it('classifies browser fetch failures', () => {
    expect(isFetchFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isFetchFailure(new Error('Erro de negócio'))).toBe(false);
  });

  it('converts unknown errors to NetworkFailureError preserving details', () => {
    const cause = new Error('HTTP 500');
    const error = toNetworkFailureError(cause, 'RANKING', 'rankingService', 'victory');

    expect(isNetworkFailureError(error)).toBe(true);
    expect(error).toBeInstanceOf(NetworkFailureError);
    expect(error.resourceLabel).toBe('RANKING');
    expect(error.context).toBe('victory');
    expect(error.source).toBe('rankingService');
    expect(error.cause).toBe(cause);
  });

  it('throws NetworkFailureError when a response is not ok', () => {
    const response = { ok: false, status: 503 } as Response;

    expect(() => ensureOkResponse(response, 'AUTENTICAÇÃO', 'authService', 'auth')).toThrow(NetworkFailureError);
  });
});
