FROM node:lts

WORKDIR /app

COPY /app/package*.json ./
 

# Instala ferramentas de build (evita 99% dos erros)
RUN apt-get update && apt-get install -y \
   python3 \
   make \
   g++ \
   && rm -rf /var/lib/apt/lists/*

RUN npm install

COPY app/ ./

EXPOSE 3000

CMD ["npm", "start"]