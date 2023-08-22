const express = require('express');
const { Client, MessageMedia } = require('whatsapp-web.js');
const List = require('whatsapp-web.js/src/structures/List');
const qrcode = require('qrcode');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const { Readable, PassThrough } = require('stream');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

require('dotenv').config()

const main = {}

main.app = express();

const WEBHOOK_URL = process.env.WEBHOOK_URL;

main.client = new Client({
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

main.qrCodeDataURL = null;
main.connected = false;


main.app.use(express.urlencoded({ extended: true }));
main.app.use(express.json());

main.convertMp3ToOgg = async (url) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
            });

            const mp3Buffer = Buffer.from(response.data);
            const readable = new Readable();
            readable._read = () => { };
            readable.push(mp3Buffer);
            readable.push(null);

            const pass = new PassThrough();
            const oggBuffer = [];

            pass.on('data', (chunk) => oggBuffer.push(chunk));
            pass.on('end', () => {
                const base64Ogg = Buffer.concat(oggBuffer).toString('base64');
                resolve(base64Ogg);
            });
            ffmpeg(readable)
                .audioChannels(1)
                .audioCodec('opus')
                .toFormat('ogg')
                .addOutputOptions('-avoid_negative_ts make_zero')
                .output(pass)
                .on('error', reject)
                .run();
        } catch (error) {
            reject('Erro na conversão:' + error);
        }
    });
};


main.extractNumbers = async (inputString) => {
    let numbersOnly = inputString.replace(/\D/g, '');

    const countryCodeLength = 2;
    const cityCodeLength = 2;
    const phoneNumberLength = numbersOnly.length - (countryCodeLength + cityCodeLength);

    if (phoneNumberLength === 9) {
        numbersOnly = numbersOnly.slice(0, countryCodeLength + cityCodeLength) + numbersOnly.slice(countryCodeLength + cityCodeLength + 1);
    }
    return numbersOnly;
};

main.formatPhoneNumber = async (inputString) => {
    let numbersOnly = inputString.replace(/\D/g, '');

    const countryCodeLength = 2;
    const cityCodeLength = 2;
    const phoneNumberLength = numbersOnly.length - (countryCodeLength + cityCodeLength);
    if (phoneNumberLength === 8) {
        numbersOnly = numbersOnly.slice(0, countryCodeLength + cityCodeLength) + '9' + numbersOnly.slice(countryCodeLength + cityCodeLength);
    }
    return '+' + numbersOnly;
};

// Evento para escutar mensagens recebidas
main.client.on('message', async message => {
    if (message.type !== 'chat' && message.type !== 'button' && message.type !== 'ptt') {
        return;
    }
    const phoneNumber = await main.formatPhoneNumber(message.from)
    let media = null;
    if (message.hasMedia) {
        media = await message.downloadMedia();
    }
    const data = {
        phone: phoneNumber,
        message: message.body,
        media: (message.hasMedia),
        base64media: media.data
    };

    // Enviar o JSON para o webhook
    try {
        await axios.post(WEBHOOK_URL, data);
    } catch (error) {
        console.error('Erro ao enviar para o webhook:', error);
    }
});

main.client.on('authenticated', async () => {
    main.connected = true;
});

main.client.on('disconnected', async () => {
    main.connected = false;
});

main.client.on('qr', async (qr) => {
    main.qrCodeDataURL = await qrcode.toDataURL(qr);
});

// Opções do Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'WhatsApp API',
            version: '1.0.0',
            description: 'API para integrar com o WhatsApp utilizando whatsapp-web.js',
        },
    },
    apis: ['./app.js'], // caminho para o arquivo com as anotações do swagger
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
main.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// Endpoint para exibir o QRCode em uma página web
/**
 * @swagger
 * /qr-web:
 *   get:
 *     summary: Obtém o QR Code para a autenticação do WhatsApp.
 *     responses:
 *       200:
 *         description: Retorna uma página HTML com o QR Code.
 */
main.app.get('/qr-web', (req, res) => {
    if (main.qrCodeDataURL) {
        const html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta http-equiv="refresh" content="10"> <!-- Página será atualizada a cada 10 segundos -->
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QR Code</title>
          </head>
          <body>
            <img src="${main.qrCodeDataURL}" alt="QR Code">
          </body>
          </html>
        `;

        res.send(html);
    } else {
        res.send('<p>Gerando QR Code, por favor atualize a página em alguns segundos.</p>');
    }
});

// Endpoint para gerar o QR code para autenticação
/**
 * @swagger
 * /connected:
 *   get:
 *     description: Retorna se o whatsapp esta conectado a um numero.
 *     responses:
 *       200:
 *         description: Retorna true ou false
 */
main.app.get('/connected', (req, res) => {
    res.json({ connected: main.connected });
});


// Endpoint para gerar o QR code para autenticação
/**
 * @swagger
 * /qr:
 *   get:
 *     description: Retorna o QR Code para autenticação
 *     responses:
 *       200:
 *         description: Retorna o QR Code
 */
main.app.get('/qr', (req, res) => {
    res.json({ qrCodeBase64: main.qrCodeDataURL });
});

// Endpoint para fazer o logout
/**
 * @swagger
 * /logout:
 *   post:
 *     description: Api para realizar o logout do whatsapp
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso.
 */
main.app.post('/logout', async (req, res) => {
    try {
        await main.client.logout();
        main.connected = false;
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

/**
 * @openapi
 * /valid_number/{numero}:
 *   get:
 *     summary: Check if a WhatsApp number is registered
 *     tags: [Validation]
 *     parameters:
 *       - name: numero
 *         in: path
 *         required: true
 *         description: The WhatsApp number to validate (without country code)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A JSON object containing validation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exists:
 *                   type: boolean
 */
main.app.get('/valid_number/:numero', async (req, res) => {
    const numero = await main.extractNumbers(req.params.numero) + '@c.us';
    try {
        const exists = await main.client.isRegisteredUser(numero);
        res.json({
            success: true,
            exists: exists
        });
    } catch (error) {
        console.error('Erro ao verificar número registrado:', error);
        res.status(500).json({
            success: false,
            exists: false
        });
    }
});

// Endpoint para enviar mensagens
/**
 * @swagger
 * /send:
 *  post:
 *    description: Envia uma mensagem para o número especificado
 *    parameters:
 *      - in: body
 *        name: message
 *        description: Dados da mensagem
 *        schema:
 *          type: object
 *          properties:
 *            number:
 *              type: string
 *            message:
 *              type: string
 *    responses:
 *      '200':
 *        description: Mensagem enviada com sucesso
 */
main.app.post('/send', async (req, res) => {
    const number = req.body.number;
    const message = req.body.message;

    const chatId = await main.extractNumbers(number) + '@c.us';

    const chat = await main.client.getChatById(chatId);
    await chat.sendStateTyping();

    const msg = await chat.sendMessage(message);
    await chat.clearState();
    res.json({ success: true, messageId: msg.id });
});

// Endpoint para enviar imagens
/**
 * @swagger
 * /send-image:
 *   post:
 *     summary: Envia uma imagem.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - url
 *             properties:
 *               number:
 *                 type: string
 *                 description: Número do destinatário.
 *               url:
 *                 type: string
 *                 description: URL da imagem.
 *     responses:
 *       200:
 *         description: A imagem foi enviada com sucesso.
 *       400:
 *         description: Falha ao enviar a imagem.
 */
main.app.post('/send-image', async (req, res) => {
    const number = req.body.number;
    const url = req.body.url;

    if (!number || !url) {
        return res.status(400).json({ error: 'Número e URL da imagem são obrigatórios.' });
    }
    const chatId = await main.extractNumbers(number) + '@c.us';
    try {
        const chat = await main.client.getChatById(chatId);
        const media = await MessageMedia.fromUrl(url);
        await chat.sendMessage(media);
        return res.json({ status: 'success' });
    } catch (error) {
        console.error('Erro ao enviar imagem:', error);
        return res.status(500).json({ error: 'Falha ao enviar a imagem.' });
    }
});

// Endpoint para enviar áudio
/**
 * @swagger
 * /send-audio:
 *   post:
 *     summary: Envia um áudio.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - url
 *             properties:
 *               number:
 *                 type: string
 *                 description: Número do destinatário.
 *               url:
 *                 type: string
 *                 description: URL do áudio.
 *     responses:
 *       200:
 *         description: O áudio foi enviado com sucesso.
 *       400:
 *         description: Falha ao enviar o áudio.
 */
main.app.post('/send-audio', async (req, res) => {
    const number = req.body.number;
    const url = req.body.url;

    if (!number || !url) {
        return res.status(400).json({ error: 'Número e URL da imagem são obrigatórios.' });
    }
    const chatId = await main.extractNumbers(number) + '@c.us';

    try {
        const chat = await main.client.getChatById(chatId);
        await chat.sendStateRecording();
        const base64Audio = await main.convertMp3ToOgg(url);
        const media = new MessageMedia('audio/ogg', base64Audio);
        await chat.sendMessage(media);
        await chat.clearState();
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Erro ao enviar áudio:', error);
        return res.status(500).json({ error: 'Falha ao enviar o áudio.' });
    }
});


/**
 * @swagger
 * /send-link:
 *   post:
 *     summary: Envia um link.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - url
 *               - caption
 *             properties:
 *               number:
 *                 type: string
 *                 description: Número do destinatário.
 *               url:
 *                 type: string
 *                 description: URL do link.
 *               caption:
 *                 type: string
 *                 description: Titulo do link.
 *     responses:
 *       200:
 *         description: O áudio foi enviado com sucesso.
 *       400:
 *         description: Falha ao enviar o áudio.
 */
main.app.post('/send-link', async (req, res) => {
    const number = req.body.number;
    const url = req.body.url;
    const caption = req.body.caption;
    const imageUrl = req.body.imageUrl;

    if (!number || !url) {
        return res.status(400).json({ error: 'Número e URL do link são obrigatórios.' });
    }
    const chatId = await main.extractNumbers(number) + '@c.us';

    try {
        const chat = await main.client.getChatById(chatId);
        const media = await MessageMedia.fromUrl(imageUrl);
        await chat.sendMessage(url, { media: media, linkPreview: true, caption: caption });
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Erro ao enviar link:', error);
        return res.status(500).json({ error: 'Falha ao enviar o Link.' });
    }
});

main.client.initialize();

const PORT = process.env.PORT || 3000;

main.app.listen(PORT, () => {
    console.log(`Aplicação rodando na porta ${PORT}`);
});

module.exports = main