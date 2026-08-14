import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NetworkFailurePopup from './NetworkFailurePopup';

describe('NetworkFailurePopup', () => {
  it('shows the connection failure message and calls onExit', () => {
    const onExit = jest.fn();

    render(<NetworkFailurePopup resourceLabel="NOTÍCIAS" onExit={onExit} />);

    expect(screen.getByRole('dialog', { name: /Falha de conexão/i })).toBeInTheDocument();
    expect(screen.getByText(/Não foi possível carregar “NOTÍCIAS”/i)).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: /Sair/i }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
