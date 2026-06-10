export interface Rule {
    antecedente:string,
    explicacao: string,
    idAntecedente: number,
    idRegra: number,
    pergunta: string,
    valor: string,
  }
  
  export interface Rules {
    items: Rule[];
  } 