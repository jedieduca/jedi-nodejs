import React from 'react';
import styled from 'styled-components';
import { ComponentPropsWithRef, ElementType } from 'react';

type SemanticClassProps = {
  $semanticClass?: string;
  className?: string;
};

/**
 * Utilitário para criar componentes styled com classes semânticas adicionais
 * 
 * @param elementType - Tipo de elemento HTML a ser criado
 * @param semanticClass - Nome da classe semântica base
 * @returns Função que cria componentes styled com a classe semântica
 */
function styledWithSemanticClass<E extends ElementType>(
  elementType: E,
  semanticClass: string
) {
  return (strings: TemplateStringsArray, ...interpolations: any[]) => {
    const StyledComp = styled(elementType)(strings, ...interpolations);
    
    // Retorna um novo componente styled que combina as classes originais com as semânticas
    return styled(
      ({ $semanticClass, className, ...props }: SemanticClassProps & ComponentPropsWithRef<E>) => {
        const combinedClassName = `${semanticClass} ${$semanticClass || ''} ${className || ''}`.trim();
        return StyledComp({ className: combinedClassName, ...props as any });
      }
    )``;
  };
}

// Exportando versões específicas para elementos comuns
export const styledDiv = styledWithSemanticClass('div', '');
export const styledBoard = styledWithSemanticClass('div', 'isometric-board');
export const styledTile = styledWithSemanticClass('div', 'tile');
export const styledPlayer = styledWithSemanticClass('div', 'player');
export const styledDice = styledWithSemanticClass('div', 'dice');
export const styledDiceFace = styledWithSemanticClass('div', 'dice-face');

export default styledWithSemanticClass; 