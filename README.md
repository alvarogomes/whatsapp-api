# WhatsApp API

## Introdução

Este projeto é uma API de integração com o WhatsApp, usando a biblioteca `whatsapp-web.js`. A API permite enviar mensagens de texto, botões, áudio, imagem e link para o WhatsApp. É necessário configurar um webhook para receber as respostas, pois o sistema não armazena essas informações.

## Configuração do ambiente

### Pré-requisitos

- Node.js
- yarn
- ffmpeg
- Docker (opcional)

### Configurando Webhook

Você deve configurar o webhook no arquivo `.env` ou através de variáveis de ambiente. A variável necessária é:

```env
WEBHOOK_URL=https://your-webhook-url.com
```

Esta API não armazena as mensagens, então quando receber mensagens ele enviará as mensagens para esse webhook em formato JSON. Exemplo:

```json
{
    "phone": "+5511999999999",
    "message": "Olá, tudo bem?",
    "button": false
}
```
### Instalação de Dependências

Execute o seguinte comando para instalar todas as dependências necessárias:

```bash
yarn install
```

### Iniciando a aplicação

Execute o seguinte comando para iniciar a aplicação:

```bash
yarn start
```

### Utilizando o Docker

Se preferir usar o Docker, você pode construir a imagem e executar o container com os seguintes comandos:

```bash
docker build -t whatsapp-api .
docker run -p 3000:3000 whatsapp-api
```

## Instalando ffmpeg

### Windows

Você pode baixar o ffmpeg [aqui](https://www.ffmpeg.org/download.html) e seguir as instruções de instalação.

### macOS

Utilize o Homebrew:

```bash
brew install ffmpeg
```

### Linux

No Ubuntu:

```bash
sudo apt-get install ffmpeg
```

Em outras distribuições, você pode consultar a documentação do seu gerenciador de pacotes.

## API Endpoints

### Obter QR Code para Autenticação (Web)

- **URL:** `/qr-web`
- **Método:** `GET`

**Exemplo no Browser:**

```bash
Acesse no Browser: "http://localhost:3000/qr-web"
```

### Obter QR Code para Autenticação

- **URL:** `/qr`
- **Método:** `GET`

**Exemplo CURL:**

```bash
curl -X GET "http://localhost:3000/qr"
```

### Verificar se o Número Contém WhatsApp

- **URL:** `/valid_number/:numero`
- **Método:** `GET`

**Exemplo CURL:**

```bash
curl -X GET "http://localhost:3000/valid_number/5511999999999"
```

### Enviar Mensagens

- **URL:** `/send`
- **Método:** `POST`
- **Parâmetros obrigatórios:**
  - `number`
  - `message`

**Exemplo CURL:**

```bash
curl -X POST -H "Content-Type: application/json" -d '{"number":"5511999999999", "message":"Olá mundo!"}' "http://localhost:3000/send"
```

### Enviar Imagens

- **URL:** `/send-image`
- **Método:** `POST`
- **Parâmetros obrigatórios:**
  - `number`
  - `url`

**Exemplo CURL:**

```bash
curl -X POST -H "Content-Type: application/json" -d '{"number":"5511999999999", "url":"http://example.com/image.jpg"}' "http://localhost:3000/send-image"
```

### Enviar Áudio

- **URL:** `/send-audio`
- **Método:** `POST`
- **Parâmetros obrigatórios:**
  - `number`
  - `url`

**Exemplo CURL:**

```bash
curl -X POST -H "Content-Type: application/json" -d '{"number":"5511999999999", "url":"http://example.com/audio.mp3"}' "http://localhost:3000/send-audio"
```

### Enviar Link

- **URL:** `/send-link`
- **Método:** `POST`
- **Parâmetros obrigatórios:**
  - `number`
  - `url`

**Exemplo CURL:**

```bash
curl -X POST -H "Content-Type: application/json" -d '{"number":"5511999999999", "url":"http://example.com", "caption":"Exemplo", "imageUrl":"http://example.com/image.jpg"}' "http://localhost:3000/send-link"
```

## Documentação Adicional

A documentação completa da API está disponível no Swagger através do caminho `/api-docs`.