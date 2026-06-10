export interface News {
  id: number,
  pergunta: string,
  idregra?: number,
  respcerta: string,
  resp2: string,
  resp3?: string,
  resp4?: string,
  caminhoimagem?: string,
  fala_proposta?: string,
  publica: number,

  caract_proposta?: string,
  analise_proposta?: string,
  analise_gpt?: string,
  analise_gemini?: string,
  origem_analise?: number,
  fala_gpt?: string,
  fala_gemini?: string,
  origem_fala?: number

}

export interface NewsResponse {
  items: News[];
  status?: string;
  message?: string;
} 