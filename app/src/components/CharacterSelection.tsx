import React, { useState, useEffect, useRef, useMemo } from 'react';
import './CharacterSelection.css';
import { getFullVersionInfo, getVersionWithBackend } from '../config/version';
import { CAMERA_DISTANCE_MAX, CAMERA_DISTANCE_MIN, CAMERA_DISTANCE_STEP } from '../config/camera';
import { GamePreferences } from '../types/preferences';
import { PlayerLevel, usePlayers } from '../contexts/PlayersContext';
import { HELP_GAME_OVERVIEW } from '../config/helpTexts';

export interface Character {
  id: string;
  name: string;
  imagePath: string;
}

interface CharacterSelectionProps {
  availableCharacters: Character[];
  maxPlayers: number;
  minPlayers: number;
  onPlayersSelected: (selectedCharacters: string[]) => void;
  loadingSprites?: boolean;
  spriteLoadingProgress?: number;
  loadingCharacters?: string[];
  loadingError?: string | null;
  onCancelLoading?: () => void;
  gamePreferences: GamePreferences;
  availableVoices: SpeechSynthesisVoice[];
  onPreferencesChange: (updatedPreferences: Partial<GamePreferences>) => void;
  onLogout?: () => void;
}

const CharacterSelection: React.FC<CharacterSelectionProps> = ({
  availableCharacters,
  maxPlayers = 4,
  minPlayers = 1,
  onPlayersSelected,
  loadingSprites = false,
  spriteLoadingProgress = 0,
  loadingCharacters = [],
  loadingError = null,
  onCancelLoading,
  gamePreferences,
  availableVoices,
  onPreferencesChange,
  onLogout
}) => {
  const {
    playerLevel,
    playerName,
    playerAge,
    setPlayerLevel,
    setPlayerName,
    setPlayerAge
  } = usePlayers();
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTtsHelpOpen, setIsTtsHelpOpen] = useState(false);
  const [draggedCharacter, setDraggedCharacter] = useState<string | null>(null);
  const [touchDragData, setTouchDragData] = useState<{
    characterId: string | null;
    isDragging: boolean;
    startPos: { x: number; y: number } | null;
    currentPos: { x: number; y: number } | null;
  }>({ characterId: null, isDragging: false, startPos: null, currentPos: null });
  const boardRef = useRef<HTMLDivElement>(null);
  const dragImageRef = useRef<HTMLDivElement>(null);
  const clampedProgress = Math.max(0, Math.min(1, spriteLoadingProgress ?? 0));
  const progressPercent = Math.round(clampedProgress * 100);
  const isLoading = loadingSprites;
  const playerLevelOptions: Array<{ value: PlayerLevel; label: string }> = [
    { value: 'proplayer', label: 'Proplayer' },
    { value: 'avancado', label: 'Avançado' },
    { value: 'casual', label: 'Casual' },
    { value: 'iniciante', label: 'Iniciante' },
    { value: 'noob', label: 'Noob' }
  ];
  
  // Filtrar vozes: preferencialmente pt-BR, caso não tenha nenhuma, mostrar todas
  const sortedVoices = useMemo(() => {
    const ptBRVoices = availableVoices.filter(voice => 
      voice.lang && voice.lang.toLowerCase().includes('pt-br')
    );
    
    if (ptBRVoices.length > 0) {
      return [...ptBRVoices].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Se não houver pt-BR, mostrar todas as vozes
    return [...availableVoices].sort((a, b) => a.name.localeCompare(b.name));
  }, [availableVoices]);

  // Reset de seleção se caracteres disponíveis mudarem
  useEffect(() => {
    setSelectedCharacters([]);
  }, [availableCharacters]);

  // Manipuladores de eventos para drag and drop (mouse)
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, characterId: string) => {
    if (isLoading) return;
    if (selectedCharacters.length >= maxPlayers) return;
    setDraggedCharacter(characterId);
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', characterId);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  // Manipuladores de eventos touch
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, characterId: string) => {
    if (isLoading) return;
    if (selectedCharacters.length >= maxPlayers) return;
    if (selectedCharacters.includes(characterId)) return;
    
    const touch = e.touches[0];
    setTouchDragData({
      characterId,
      isDragging: true,
      startPos: { x: touch.clientX, y: touch.clientY },
      currentPos: { x: touch.clientX, y: touch.clientY }
    });
    setDraggedCharacter(characterId);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchDragData.isDragging || !touchDragData.characterId) return;
    
    const touch = e.touches[0];
    
    setTouchDragData(prev => ({
      ...prev,
      currentPos: { x: touch.clientX, y: touch.clientY }
    }));
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchDragData.isDragging || !touchDragData.characterId) return;
    
    // Verificar se o toque terminou sobre a área de drop
    if (touchDragData.currentPos && boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const { x, y } = touchDragData.currentPos;
      
      if (x >= boardRect.left && x <= boardRect.right && 
          y >= boardRect.top && y <= boardRect.bottom) {
        // Simular o drop
        if (selectedCharacters.length < maxPlayers && 
            !selectedCharacters.includes(touchDragData.characterId)) {
          setSelectedCharacters(prev => [...prev, touchDragData.characterId!]);
        }
      }
    }
    
    // Reset do estado de toque
    setTouchDragData({
      characterId: null,
      isDragging: false,
      startPos: null,
      currentPos: null
    });
    setDraggedCharacter(null);
  };

  // Handler para toques na área de drop
  const handleTouchEndOnBoard = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchDragData.isDragging || !touchDragData.characterId) return;
    
    if (selectedCharacters.length < maxPlayers && 
        !selectedCharacters.includes(touchDragData.characterId)) {
      setSelectedCharacters(prev => [...prev, touchDragData.characterId!]);
    }
    
    setTouchDragData({
      characterId: null,
      isDragging: false,
      startPos: null,
      currentPos: null
    });
    setDraggedCharacter(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLoading) return;
    
    if (!draggedCharacter || selectedCharacters.length >= maxPlayers) return;
    
    // Verifique se o personagem já está selecionado
    if (!selectedCharacters.includes(draggedCharacter)) {
      setSelectedCharacters(prev => [...prev, draggedCharacter]);
    }
    
    setDraggedCharacter(null);
  };

  // Remover um personagem da seleção
  const handleRemoveCharacter = (characterId: string) => {
    setSelectedCharacters(prev => prev.filter(id => id !== characterId));
  };

  // Iniciar o jogo com os personagens selecionados
  const handleStartGame = () => {
    console.log('🎮 [CharacterSelection] handleStartGame chamado', { 
      isLoading, 
      selectedCharacters, 
      minPlayers 
    });
    
    if (isLoading) {
      console.log('⏳ [CharacterSelection] Ainda carregando sprites, aguardando...');
      return;
    }

    if (!playerLevel) {
      console.log('⚠️ [CharacterSelection] Autoavaliação obrigatória: selecione o nível do jogador');
      return;
    }

    console.log('🧭 [CharacterSelection] playerLevel selecionado:', playerLevel);
    
    if (selectedCharacters.length >= minPlayers) {
      console.log('✅ [CharacterSelection] Chamando onPlayersSelected com:', selectedCharacters);
      onPlayersSelected(selectedCharacters);
    } else {
      console.log('⚠️ [CharacterSelection] Número de jogadores insuficiente');
    }
  };

  const togglePreferences = () => {
    setIsPreferencesOpen(prev => !prev);
  };

  // Encontrar detalhes do personagem pelo ID
  const getCharacterById = (id: string) => {
    return availableCharacters.find(char => char.id === id);
  };

  const handlePreferenceChange = (updates: Partial<GamePreferences>) => {
    onPreferencesChange(updates);
  };

  const handleLogoutClick = () => {
    if (!onLogout) return;

    const confirmed = window.confirm('Deseja sair da conta?');
    if (confirmed) {
      onLogout();
    }
  };

  // Função para adicionar personagem por clique/toque simples
  const handleCharacterClick = (characterId: string) => {
    if (selectedCharacters.includes(characterId) || selectedCharacters.length >= maxPlayers) return;
    
    setSelectedCharacters(prev => [...prev, characterId]);
  };

  return (
    <div className="character-selection-container" aria-busy={isLoading}>
      <button
        type="button"
        className="character-selection-help-button"
        onClick={() => setIsHelpOpen(true)}
        aria-label="Como jogar"
      >
        ?
      </button>
      {onLogout && (
        <button
          type="button"
          className="character-selection-logout-button"
          onClick={handleLogoutClick}
        >
          Sair
        </button>
      )}

      {isHelpOpen && (
        <div className="help-overlay" onClick={() => setIsHelpOpen(false)}>
          <div className="help-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="help-card-close"
              onClick={() => setIsHelpOpen(false)}
              aria-label="Fechar ajuda"
            >
              ✕
            </button>
            <h2 className="help-card-title">{HELP_GAME_OVERVIEW.title}</h2>
            <div className="help-card-body">
              {HELP_GAME_OVERVIEW.sections.map((section, idx) => (
                <div key={idx} className="help-section">
                  <h3 className="help-section-title">{section.title}</h3>
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="help-section-text">{p}</p>
                  ))}
                </div>
              ))}
              <div className="help-section">
                <h3 className="help-section-title">Dificuldades com a voz da narração?</h3>
                <button
                  type="button"
                  className="help-tts-link"
                  onClick={() => setIsTtsHelpOpen(true)}
                >
                  Clique aqui para ajuda com a voz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isTtsHelpOpen && (
        <div
          className="help-overlay help-tts-overlay"
          onClick={() => setIsTtsHelpOpen(false)}
        >
          <div className="help-card help-tts-card" onClick={(e) => e.stopPropagation()}>
            <iframe
              className="help-tts-iframe"
              src={`${process.env.PUBLIC_URL}/tts_help.html`}
              title="Ajuda com a voz da narração"
            />
            <div className="help-tts-footer">
              <button
                type="button"
                className="help-tts-back-button"
                onClick={() => setIsTtsHelpOpen(false)}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="character-selection-content">
        <div className="character-selection-header">
          <div className='logo-jedi' style={{
        margin: '0',
        background: '#ffffff00',
        borderRadius: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px'
      }}>
            <img 
              src="/assets/Logo_JEDi_fundo_escuro.png" 
              alt="Imagem JEDi Educa" 
              style={{ width: '15%', height: 'auto',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.9))' }} 
            />        
          </div>

          <h2 className="title">Selecione os Personagens</h2>
          <p className="instructions">Selecione (arraste ou clique) 1 personagem para o tabuleiro para iniciar o jogo.</p>
        </div>

        <div className="character-selection-main">
          <div className="characters-container">
            {availableCharacters.map(character => (
              <div
                key={character.id}
                className={`character-item ${
                  selectedCharacters.includes(character.id) ? 'selected' : ''
                } ${
                  touchDragData.isDragging && touchDragData.characterId === character.id ? 'dragging' : ''
                }`}
                draggable={!selectedCharacters.includes(character.id) && !isLoading && selectedCharacters.length < maxPlayers}
                onDragStart={(e) => handleDragStart(e, character.id)}
                onTouchStart={(e) => handleTouchStart(e, character.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onClick={() => handleCharacterClick(character.id)}
              >
                <img 
                  src={character.imagePath} 
                  alt={character.name} 
                  className="character-image"
                />
                <div className="character-name">{character.name}</div>
              </div>
            ))}
          </div>
          
          <div className="userInfo-container">
            <div 
              className={`board-drop-area ${
                touchDragData.isDragging ? 'touch-drag-active' : ''
              }`}
              ref={boardRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTouchEnd={handleTouchEndOnBoard}
              aria-disabled={isLoading}
            >
              <p>Arraste os personagens para aqui ou toque neles</p>
              
              <div className="selected-characters">
                {selectedCharacters.map((characterId, index) => {
                  const character = getCharacterById(characterId);
                  return character ? (
                    <div key={characterId} className="selected-character">
                      <img 
                        src={character.imagePath} 
                        alt={character.name} 
                        className="selected-character-image"
                      />
                      <div className="selected-character-info">
                        <div className="selected-character-name">{character.name}</div>
                        <div className="player-number">Jogador {index + 1}</div>
                      </div>
                      <button 
                        className="remove-character" 
                        onClick={() => handleRemoveCharacter(characterId)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="userInfo">
              <p className="userInfo-title">Informações do usuário:</p>
              <div className="userInfo-items" aria-label="Informações do usuário">
                <div className="userInfo-item">
                  <label htmlFor="name" style={{ fontSize: '0.8rem', color: '#ffffff' }}>Nome:</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    style={{ fontSize: '0.8rem', color: '#3f219b' }}
                  />
                </div>
                <div className="userInfo-item">
                  <label htmlFor="age" style={{ fontSize: '0.8rem', color: '#ffffff' }}>Idade:</label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={playerAge ?? ''}
                    onChange={(event) => {
                      const { value } = event.target;
                      setPlayerAge(value === '' ? null : Number(value));
                    }}
                    style={{ fontSize: '0.8rem', color: '#3f219b', width: '50px' }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="autoavaliacao">
            <p className="autoavaliacao-title">Autoavaliação (obrigatório):</p>
            <div className="autoavaliacao-options" role="radiogroup" aria-label="Nível do jogador">
              {playerLevelOptions.map((option) => (
                <label key={option.value} className={`autoavaliacao-option ${playerLevel === option.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="playerLevel"
                    value={option.value}
                    checked={playerLevel === option.value}
                    onChange={() => {
                      setPlayerLevel(option.value);
                      console.log('🧭 [CharacterSelection] playerLevel selecionado:', option.value);
                    }}
                    required
                  />
                  <span> {option.label} </span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="actions">
            <button 
              className="start-game-button"
              disabled={selectedCharacters.length < minPlayers || isLoading || !playerLevel}
              onClick={handleStartGame}
            >
              Iniciar jogo com {selectedCharacters.length} {selectedCharacters.length === 1 ? 'jogador' : 'jogadores'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Elemento visual para feedback de arrastar no touch */}
      {touchDragData.isDragging && touchDragData.characterId && touchDragData.currentPos && (
        <div 
          ref={dragImageRef}
          className="touch-drag-image"
          style={{
            position: 'fixed',
            left: touchDragData.currentPos.x - 40,
            top: touchDragData.currentPos.y - 40,
            pointerEvents: 'none',
            zIndex: 10000,
            opacity: 0.8,
            transform: 'scale(0.8)'
          }}
        >
          {(() => {
            const character = getCharacterById(touchDragData.characterId);
            return character ? (
              <div className="character-item dragging-preview">
                <img 
                  src={character.imagePath} 
                  alt={character.name} 
                  className="character-image"
                />
                <div className="character-name">{character.name}</div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      <button className="preferences-trigger" type="button" onClick={togglePreferences}>
        {isPreferencesOpen ? 'Fechar preferências' : 'Abrir preferências'}
      </button>

      <div className={`bottom-sheet ${isPreferencesOpen ? 'bottom-sheet--open' : ''}`} aria-hidden={!isPreferencesOpen}>
        <div className="bottom-sheet__overlay" onClick={togglePreferences} />
        <div className="bottom-sheet__panel">
          <div className="bottom-sheet__handle" onClick={togglePreferences}>
            <span>Preferências do jogo</span>
            <span className="bottom-sheet__chevron">{isPreferencesOpen ? '↓' : '↑'}</span>
          </div>

          <div className="game-preferences-panel">
            <div className="preference-group">
              <div className="preference-header">
                <span>Duração do ritmo da caminhada</span>
                <span>{gamePreferences.walkingPaceDuration} ms</span>
              </div>
              <div className="walking-pace-slider">
                <input
                  id="walking-pace-slider"
                  type="range"
                  min={100}
                  max={1200}
                  step={10}
                  value={gamePreferences.walkingPaceDuration}
                  onChange={(event) => handlePreferenceChange({ walkingPaceDuration: Number(event.target.value) })}
                />
                <div className="preference-helper">1200 ms (mais lento) &nbsp;⇄&nbsp; 100 ms (mais rápido)</div>
              </div>
              <div className="camera-distance-factor">
                <div className="preference-header">
                  <span>Distância da câmera</span>
                  <span>{gamePreferences.cameraDistanceFactor.toFixed(1)}x</span>
                </div>
                <input
                  id="camera-distance-slider"
                  type="range"
                  min={CAMERA_DISTANCE_MIN}
                  max={CAMERA_DISTANCE_MAX}
                  step={CAMERA_DISTANCE_STEP}
                  value={gamePreferences.cameraDistanceFactor}
                  onChange={(event) => handlePreferenceChange({ cameraDistanceFactor: Number(event.target.value) })}
                />
                <div className="preference-helper">
                  {CAMERA_DISTANCE_MIN.toFixed(1)} (mais longe) &nbsp;⇄&nbsp; {CAMERA_DISTANCE_MAX.toFixed(1)} (mais perto)
                </div>
              </div>
            </div>
{/*}
            <div className="preference-group">
              <div className="preference-header">
                <span>Velocidade do deslocamento</span>
                <span>{gamePreferences.movementSpeedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                id="movement-speed-slider"
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={gamePreferences.movementSpeedMultiplier}
                onChange={(event) => handlePreferenceChange({ movementSpeedMultiplier: Number(event.target.value) })}
              />
              <div className="preference-helper">0.5x (mais lento) &nbsp;⇄&nbsp; 2.0x (mais rápido)</div>
            </div>
*/}
            <div className="preference-group">
              <div className="preference-header">
                <label htmlFor="voice-select">Voz da narração</label>
              </div>
              <select
                id="voice-select"
                value={gamePreferences.narrationVoice ?? ''}
                onChange={(event) => handlePreferenceChange({ narrationVoice: event.target.value || null })}
                disabled={sortedVoices.length === 0}
              >
                <option value="">Automática ({sortedVoices[0]?.name || 'carregando vozes...'})</option>
                {sortedVoices.map((voice) => (
                  <option key={voice.voiceURI || voice.name} value={voice.voiceURI || voice.name}>
                    {voice.name} {voice.lang ? `(${voice.lang})` : ''}
                  </option>
                ))}
              </select>
              {sortedVoices.length === 0 && (
                <div className="preference-helper">Carregando vozes disponíveis...</div>
              )}
            </div>

            <div className="voice-selection-container" style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>

              <div className="preference-group">
                <div className="preference-header">
                  <span>Velocidade</span>
                  <span>{gamePreferences.narrationRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={gamePreferences.narrationRate}
                  onChange={(event) => handlePreferenceChange({ narrationRate: Number(event.target.value) })}
                />
                <div className="preference-helper" style={{ textAlign: 'center' }}>lenta &nbsp;⇄&nbsp; rápida</div>
              </div>

              <div className="preference-group">
                <div className="preference-header">
                  <span>Tom</span>
                  <span>{gamePreferences.narrationPitch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={gamePreferences.narrationPitch}
                  onChange={(event) => handlePreferenceChange({ narrationPitch: Number(event.target.value) })}
                />
                <div className="preference-helper" style={{ textAlign: 'center' }}>grave &nbsp;⇄&nbsp; aguda</div>
              </div>

              <div className="preference-group">
                <div className="preference-header">
                  <span>Volume</span>
                  <span>{Math.round(gamePreferences.narrationVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={gamePreferences.narrationVolume}
                  onChange={(event) => handlePreferenceChange({ narrationVolume: Number(event.target.value) })}
                />
                <div className="preference-helper" style={{ textAlign: 'center' }}>silencioso &nbsp;⇄&nbsp; máximo</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* versão do jogo no canto inferior direito */}
      <div className="game-version" style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'right',
        zIndex: 10000,
        fontSize: '0.8rem',
        color: '#ffffff',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 1.0)'
      }}>
        <p className="build-info">Build: {getFullVersionInfo()}</p>
        <p className="version-info">Versão {getVersionWithBackend()}</p>      
      </div>
      {(isLoading || loadingError) && (
        <div className="sprite-loading-overlay" role="alert" aria-live="assertive">
          <div className="sprite-loading-card">
            {isLoading && (
              <>
                <p>Carregando sprites dos personagens selecionados…</p>
                <div className="sprite-loading-progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} role="progressbar">
                  <div className="sprite-loading-progress-bar" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="sprite-loading-percentage">{progressPercent}%</p>
                {loadingCharacters && loadingCharacters.length > 0 && (
                  <ul className="sprite-loading-list">
                    {loadingCharacters.map((id) => {
                      const character = getCharacterById(id);
                      return (
                        <li key={id}>{character ? character.name : id}</li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
            {loadingError && (
              <>
                <p className="sprite-loading-error">{loadingError}</p>
                {onCancelLoading && (
                  <div className="sprite-loading-actions">
                    <button className="sprite-loading-close" onClick={onCancelLoading}>
                      Entendi
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterSelection; 
