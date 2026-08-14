import React from 'react';
import { formatNetworkFailureMessage } from '../utils/networkFailure';
import './NetworkFailurePopup.css';

interface NetworkFailurePopupProps {
  resourceLabel: string;
  onExit: () => void;
}

const NetworkFailurePopup: React.FC<NetworkFailurePopupProps> = ({ resourceLabel, onExit }) => {
  const message = formatNetworkFailureMessage(resourceLabel);

  return (
    <div className="network-failure-popup-backdrop" role="presentation">
      <div
        className="network-failure-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="network-failure-popup-title"
      >
        <h2 id="network-failure-popup-title" className="network-failure-popup-title">
          Falha de conexão
        </h2>
        <p className="network-failure-popup-message">
          {message}
        </p>
        <button
          type="button"
          className="network-failure-popup-exit-button"
          onClick={onExit}
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default NetworkFailurePopup;
