import React from 'react';

interface PortraitWarningProps {
  isVisible: boolean;
}

const PortraitWarning: React.FC<PortraitWarningProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="portrait-warning-overlay">
      <div className="portrait-warning-icon">
        <img src="/tiabel-com-celular-setas.png" alt="Portrait Warning" />
      </div>
      <div className="portrait-warning-text">
        VIRE SEU CELULAR
      </div>
      <div className="portrait-warning-subtitle">
        O jogo JEDi Educa funciona melhor na horizontal
      </div>
    </div>
  );
};

export default PortraitWarning;
