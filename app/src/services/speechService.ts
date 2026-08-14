/**
 * Serviço para narração por voz usando a Web Speech API
 */
interface SpeakOptions {
  voice?: string | SpeechSynthesisVoice | null;
  pitch?: number;
  rate?: number;
  volume?: number;
}

class SpeechService {
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private preferredVoiceId: string | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private isInitialized: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying: boolean = false;
  private voiceListeners: Set<(voices: SpeechSynthesisVoice[]) => void> = new Set();

  constructor() {
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis ?? null : null;
    if (!this.synthesis) {
      return;
    }

    if (typeof this.synthesis.onvoiceschanged !== 'undefined') {
      this.synthesis.onvoiceschanged = () => this.loadVoices();
    }
    this.loadVoices();
  }

  private loadVoices(retryCount = 0): void {
    if (!this.synthesis) {
      return;
    }

    const voices = this.synthesis.getVoices();

    if (!voices || voices.length === 0) {
      if (retryCount < 3) {
        setTimeout(() => this.loadVoices(retryCount + 1), 500 * (retryCount + 1));
      }
      return;
    }

    this.voices = voices;
    this.preferredVoice = this.resolveVoice(this.preferredVoiceId) 
      || voices.find((voice) => voice.lang.toLowerCase().includes('pt')) 
      || voices[0] 
      || null;
    this.preferredVoiceId = this.preferredVoice?.voiceURI ?? this.preferredVoice?.name ?? null;
    this.isInitialized = true;
    this.notifyVoiceListeners();
  }

  private resolveVoice(voice: string | SpeechSynthesisVoice | null | undefined): SpeechSynthesisVoice | null {
    if (!voice && this.preferredVoice) {
      return this.preferredVoice;
    }
    if (typeof voice === 'string') {
      return this.voices.find(
        (availableVoice) => availableVoice.voiceURI === voice || availableVoice.name === voice
      ) || this.preferredVoice || this.voices[0] || null;
    }
    if (voice) {
      return voice;
    }
    return this.preferredVoice || this.voices[0] || null;
  }

  private notifyVoiceListeners(): void {
    this.voiceListeners.forEach((listener) => listener(this.voices));
  }

  /**
   * Para a narração atual, se houver
   */
  public stop(): void {
    if (this.isPlaying && this.synthesis) {
      this.synthesis.cancel();
      this.isPlaying = false;
    }
  }

  /**
   * Define a voz preferida com base no voiceURI ou nome.
   */
  public setPreferredVoice(voiceId: string | null): void {
    this.preferredVoiceId = voiceId;
    this.preferredVoice = this.resolveVoice(voiceId);
  }

  /**
   * Retorna o identificador (voiceURI ou nome) da voz preferida atual.
   */
  public getPreferredVoiceId(): string | null {
    return this.preferredVoiceId;
  }

  /**
   * Obtém a lista de vozes disponíveis carregadas pelo navegador.
   */
  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  /**
   * Permite assinar atualizações da lista de vozes disponíveis.
   * Retorna uma função para cancelar a inscrição.
   */
  public subscribeToVoices(callback: (voices: SpeechSynthesisVoice[]) => void): () => void {
    this.voiceListeners.add(callback);
    if (this.voices.length > 0) {
      callback(this.voices);
    }
    return () => {
      this.voiceListeners.delete(callback);
    };
  }

  /**
   * Narra um texto usando a voz preferida
   * 
   * @param text - Texto a ser narrado
   * @param options - Opções para a narração (voz, pitch, rate, volume)
   * @returns Uma Promise que é resolvida quando a narração termina
   */
  public speak(text: string, options: SpeakOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
        reject(new Error('Motor de voz indisponível no momento. Tente novamente.'));
        return;
      }

      if (!this.isInitialized) {
        this.loadVoices();
        if (!this.isInitialized) {
          reject(new Error('Motor de voz indisponível no momento. Tente novamente.'));
          return;
        }
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      const resolvedVoice = this.resolveVoice(options.voice);
      if (resolvedVoice) {
        utterance.voice = resolvedVoice;
      }
      if (options.voice && typeof options.voice === 'string') {
        this.preferredVoiceId = resolvedVoice?.voiceURI ?? resolvedVoice?.name ?? options.voice;
      }
      this.preferredVoice = resolvedVoice ?? this.preferredVoice;
      utterance.voice = this.preferredVoice || this.voices[0] || null;
      utterance.pitch = options.pitch ?? 1;
      utterance.rate = options.rate ?? 1.2;
      utterance.volume = options.volume ?? 1;
      utterance.lang = utterance.voice?.lang || 'pt-BR';

      utterance.onstart = () => {};

      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.currentUtterance = null;
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
          return;
        }
        reject(new Error(event.error || 'Erro ao narrar'));
      };

      this.currentUtterance = utterance;
      this.isPlaying = true;

      console.log('🔍 [SpeechService] 🔍 Voz selecionada:', utterance.voice?.name);
      console.log('🔍 [SpeechService] 🔍 Texto a ser narrado:', text);
      console.log('🔍 [SpeechService] 🔍 Pitch:', utterance.pitch);
      console.log('🔍 [SpeechService] 🔍 Rate:', utterance.rate);
      console.log('🔍 [SpeechService] 🔍 Volume:', utterance.volume);
      console.log('🔍 [SpeechService] 🔍 Lang:', utterance.lang);
      console.log('🔍 [SpeechService] 🔍 vozes:', this.voices);

      this.synthesis.speak(utterance);
    });
  }
}

// Instância singleton do serviço
const speechService = new SpeechService();

export default speechService; 