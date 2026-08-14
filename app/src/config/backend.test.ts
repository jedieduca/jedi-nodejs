import { getActiveBackendLabel, getBackendEndpoint } from './backend';

describe('backend configuration', () => {
  it('keeps Jedieduca as the active backend for migrated API endpoints', () => {
    expect(getActiveBackendLabel()).toBe('jedieduca');
    expect(getBackendEndpoint('autenticar')).toBe('https://api2.jedieduca.com.br/api/system_user/autenticar');
    expect(getBackendEndpoint('cadastrarUsuario')).toBe('https://api2.jedieduca.com.br/api/system_user/cadastrar');
    expect(getBackendEndpoint('recuperarSenha')).toBe('https://api2.jedieduca.com.br/api/system_user/recuperarSenha');
    expect(getBackendEndpoint('sortearPerguntas')).toBe('https://api2.jedieduca.com.br/api/pergunta2/sortearPerguntas');
    expect(getBackendEndpoint('ranking')).toBe('https://api2.jedieduca.com.br/api/partidasperguntas/ranking');
  });
});
