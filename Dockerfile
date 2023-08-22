# Utilizando uma imagem com Node.js e suporte ao Puppeteer
FROM node:14-slim

# Instalando dependências para Puppeteer
RUN apt-get update \
    && apt-get install -yq --no-install-recommends \
    libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 \
    libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 \
    libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
    libxrender1 libxss1 libxtst6 \
    ca-certificates fonts-liberation libappindicator1 libnss3 \
    lsb-release xdg-utils wget \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Definindo a pasta de trabalho
WORKDIR /app

# Copiando somente os arquivos package.json e app.js
COPY package.json ./
COPY app.js ./
COPY app.tests.js ./

# Instalando as dependências do projeto
RUN yarn install

# Expondo a porta 3000
EXPOSE 3000

RUN yarn test

# Comando para iniciar o servidor
CMD ["yarn", "start"]