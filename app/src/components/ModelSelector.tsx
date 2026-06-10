import React from 'react';
import llmModels from '../config/llmModels';

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ currentModel, onModelChange }) => {
  return (
    <div className="model-selector">
      <label htmlFor="model-select">Modelo de IA: </label>
      <select 
        id="model-select"
        value={currentModel}
        onChange={(e) => onModelChange(e.target.value)}
      >
        {llmModels.map(model => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector; 