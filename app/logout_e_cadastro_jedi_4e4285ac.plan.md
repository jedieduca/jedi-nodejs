---
name: Logout e Cadastro JEDi
overview: Adicionar botao "Sair" nas telas de selecao de personagem e jogo (com comportamentos distintos), criar tela de cadastro com chamada a API /cadastrar, e habilitar navegacao entre login e cadastro -- tudo com impacto minimo no codigo existente.
todos:
  - id: add-cadastrar-service
    content: Adicionar funcao cadastrar() em authService.ts para POST /system_user/cadastrar
    status: pending
  - id: create-register-screen
    content: Criar RegisterScreen.tsx + RegisterScreen.css fiel ao prototipo HTML de cadastro
    status: pending
  - id: update-login-screen-link
    content: "LoginScreen: aceitar prop onGoToRegister e habilitar link 'Criar uma conta'"
    status: pending
  - id: add-logout-char-selection
    content: "CharacterSelection: aceitar prop onLogout e renderizar botao 'Sair' no canto superior"
    status: pending
  - id: integrate-app-tsx-nav
    content: "App.tsx: estado authScreen, navegacao login/cadastro, botao Sair no jogo, passar props"
    status: pending
isProject: false
---

# Logout + Cadastro JEDi Educa

## 1. Navegacao entre telas de auth (login / cadastro)

Hoje o `AppContent` em [`src/App.tsx`](src/App.tsx) (L3597-3613) decide: `!user` -> `<LoginScreen />`, senao -> jogo. Para suportar login **e** cadastro sem `react-router`, adicionar um estado `authScreen: 'login' | 'register'` no `AppContent` e renderizar condicionalmente:

```tsx
const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  if (isLoading) return null;

  if (!user) {
    return authScreen === 'register'
      ? <RegisterScreen onGoToLogin={() => setAuthScreen('login')} />
      : <LoginScreen onGoToRegister={() => setAuthScreen('register')} />;
  }

  return (
    <PlayersProvider>
      <GameContent />
    </PlayersProvider>
  );
};
```

## 2. Botao "Sair" -- dois comportamentos

### Na tela de selecao de personagem (logout real)

- Posicao: canto superior direito da tela de `CharacterSelection`.
- Acao: `window.confirm('Deseja sair?')` -> se sim, chama `logout()` do `AuthContext`.
- Implementacao: `CharacterSelection` recebe nova prop opcional `onLogout?: () => void`. Se definida, renderiza botao "Sair". O `GameContent` passa `onLogout` ligado ao `logout` do `AuthContext`.

### Na tela do jogo (volta para selecao, sem logout)

- Posicao: canto superior esquerdo da tela do jogo (dentro do `ui-layer`).
- Acao: `window.confirm('Deseja abandonar a partida?')` -> se sim, reseta estado do jogo para voltar a selecao de personagem (`setGameStarted(false)` + `setPendingSelectedCharacters(null)`).
- Implementacao: pequeno botao inline no JSX do `GameContent`, sem criar componente separado.

## 3. Tela de cadastro

### Novo servico: `cadastrar()` em [`src/services/authService.ts`](src/services/authService.ts)

- `POST https://memore-net.com/api/JEDI-API/system_user/cadastrar`
- Body: `{ id: null, name, nascimento, login, email, password, active: "Y" }`
- Resposta sucesso: `{ id, name, nascimento, login, email, active }` -- retornar como `AuthUser` (preencher `frontpage_id` como `""` se ausente).
- Resposta erro: `{ erro: "..." }` -- tratar igual ao login.

### Novo componente: `src/components/RegisterScreen.tsx` + `RegisterScreen.css`

Fiel ao prototipo [`specs/login/jedi-cadastro.html`](specs/login/jedi-cadastro.html):

- Botao voltar (seta) no topo -> chama `onGoToLogin()`.
- Logo JEDi centralizado no header.
- Campos: Nome Completo, Email, Data de Nascimento, Senha, Confirmar Senha.
- Botao "Cadastrar" com loading state.
- Validacoes: campos obrigatorios, senhas iguais, email com `@`.
- Ao cadastrar com sucesso, **automaticamente faz login** (`auth.login(login, password)`) para o usuario entrar direto.
- Link "Ja tem uma conta? Faca Login" -> chama `onGoToLogin()`.
- CSS reutiliza mesma estrutura visual de `LoginScreen.css` com prefixo `.register-screen-*`.

## 4. Habilitar link na tela de login

Em [`src/components/LoginScreen.tsx`](src/components/LoginScreen.tsx) (L90-95):

- `LoginScreen` recebe nova prop `onGoToRegister?: () => void`.
- Trocar o botao desabilitado "Criar uma conta" por um ativo que chama `onGoToRegister()`.

## Arquivos a criar

- `src/components/RegisterScreen.tsx`
- `src/components/RegisterScreen.css`

## Arquivos a alterar

- `src/services/authService.ts` -- adicionar funcao `cadastrar()`.
- `src/components/LoginScreen.tsx` -- aceitar prop `onGoToRegister`, habilitar link.
- `src/components/CharacterSelection.tsx` -- aceitar prop opcional `onLogout`, renderizar botao "Sair".
- `src/App.tsx` -- estado `authScreen` no `AppContent`, botao "Sair" no jogo, passar props de navegacao e logout.

## O que NAO muda

- `AuthContext`, `AuthProvider`, `useAuth` -- nenhuma alteracao.
- `types/auth.ts` -- nenhuma alteracao (reutiliza `AuthUser` e `AuthError`).
- Todo o fluxo interno do jogo, `PlayersContext`, hooks, services de noticias.
- CSS existente de login (`LoginScreen.css`).

## Observacao sobre CORS

A API `/system_user/cadastrar` pode ter o mesmo bloqueio CORS. O guia [`CORS_BACKEND_API_GUIDE.md`](CORS_BACKEND_API_GUIDE.md) ja cobre os passos necessarios e se aplica a este endpoint tambem.