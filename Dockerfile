FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependências de dentro da pasta local 'app' para o WORKDIR atual (/app)
COPY app/package*.json ./

# Instala as dependências de forma limpa
RUN npm install --omit=dev

# Copia todo o restante do conteúdo da pasta local 'app' para o WORKDIR do container
COPY app/ .

# Porta padrão que sua aplicação Node escuta internamente
EXPOSE 3000

CMD ["node", "server.js"]