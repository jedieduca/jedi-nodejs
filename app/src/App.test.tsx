import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App authentication screens', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders login screen when there is no authenticated user', () => {
    render(<App />);
    expect(screen.getByText(/Bem-vindo ao JEDi Educa/i)).toBeInTheDocument();
  });

  it('navigates from login to register and back to login', () => {
    render(<App />);

    userEvent.click(screen.getByRole('button', { name: /Cadastre-se/i }));
    expect(screen.getByText(/Crie sua conta/i)).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: /Voltar/i }));
    expect(screen.getByText(/Bem-vindo ao JEDi Educa/i)).toBeInTheDocument();
  });

  it('navigates from login to forgot password and back to login', () => {
    render(<App />);

    userEvent.click(screen.getByRole('button', { name: /Esqueci a senha/i }));
    expect(screen.getByText(/Recuperar senha/i)).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: /Voltar/i }));
    expect(screen.getByText(/Bem-vindo ao JEDi Educa/i)).toBeInTheDocument();
  });
});
