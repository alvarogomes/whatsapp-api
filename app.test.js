const request = require('supertest');
const main = require('./app');
const { Client } = require('whatsapp-web.js');

jest.mock('whatsapp-web.js');

describe('convertMp3ToOgg', () => {
  it('should convert MP3 to OGG', async () => {
    // GIVEN
    const mockMp3Data = 'mp3Data';
    const mockOggData = 'oggData';
    
    main.convertMp3ToOgg = jest.fn(() => Promise.resolve(mockOggData));
    
    // WHEN
    const result = await main.convertMp3ToOgg(mockMp3Data);
    
    // THEN
    expect(result).toEqual(mockOggData);
  });
});


describe('extractNumbers', () => {
  it('should extract numbers from the input', async () => {
    // GIVEN
    const input = '+5511923457765';
    const expectedOutput = '551123457765'; // exemplo de formato esperado
    
    // WHEN
    const result = await main.extractNumbers(input);
    
    // THEN
    expect(result).toEqual(expectedOutput);
  });
});


describe('formatPhoneNumber', () => {
  it('should format a phone number', async () => {
    // GIVEN
    const input = '551123457765';
    const expectedOutput = '+5511923457765'; // exemplo de formato esperado
    
    // WHEN
    const result = await main.formatPhoneNumber(input);
    
    // THEN
    expect(result).toEqual(expectedOutput);
  });
});

describe('GET /qr', () => {
  it('should return a QR code data URL', async () => {
    // GIVEN
    Client.mockImplementation(() => {
      return {
        on: jest.fn(),
      };
    });

    const mockQrCodeDataURL = 'data:image/png;base64,ABC123';
    main.qrCodeDataURL = mockQrCodeDataURL;

    // WHEN
    const response = await request(main.app).get('/qr');

    // THEN
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ qrCodeBase64: mockQrCodeDataURL });
  });
});


describe('GET /valid_number/:numero', () => {
    it('should validate a phone number', async () => {
      // GIVEN
      const mockNumber = '1234567890';
      const mockExists = true;
  
      main.client.isRegisteredUser = jest.fn(() => Promise.resolve(mockExists));
  
      // WHEN
      const response = await request(main.app).get(`/valid_number/${mockNumber}`);
  
      // THEN
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        success: true,
        exists: mockExists
      });
    });
  });

  describe('POST /logout', () => {
    it('should log out from the client', async () => {
      // GIVEN
      main.client.logout = jest.fn(() => Promise.resolve());
  
      // WHEN
      const response = await request(main.app).post('/logout');
  
      // THEN
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /send', () => {
    it('should send a message', async () => {
      // GIVEN
      const mockNumber = '1234567890';
      const mockMessage = 'Hello World!';
      const mockChat = { sendMessage: jest.fn(), sendStateTyping: jest.fn(), clearState: jest.fn() };
      const mockMsg = { id: 'msgId123' };
  
      main.client.getChatById = jest.fn(() => Promise.resolve(mockChat));
      mockChat.sendMessage.mockReturnValue(Promise.resolve(mockMsg));
      main.extractNumbers = jest.fn(() => mockNumber);
  
      // WHEN
      const response = await request(main.app).post('/send').send({ number: mockNumber, message: mockMessage });
  
      // THEN
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ success: true, messageId: mockMsg.id });
    });
  });

  describe('POST /send-image', () => {
    it('should send an image', async () => {
      // GIVEN
      const mockNumber = '1234567890';
      const mockUrl = 'https://example.com/image.png';
      const mockChat = { sendMessage: jest.fn() };
  
      main.client.getChatById = jest.fn(() => Promise.resolve(mockChat));
      main.extractNumbers = jest.fn(() => mockNumber);
  
      // WHEN
      const response = await request(main.app).post('/send-image').send({ number: mockNumber, url: mockUrl });
  
      // THEN
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
    });
  });

  describe('POST /send-audio', () => {
    it('should send an audio', async () => {
      // GIVEN
      const mockNumber = '1234567890';
      const mockUrl = 'https://example.com/audio.mp3';
      const mockBase64Audio = 'base64AudioData';
      const mockChat = { sendMessage: jest.fn(), sendStateRecording: jest.fn(), clearState: jest.fn() };
  
      main.client.getChatById = jest.fn(() => Promise.resolve(mockChat));
      main.extractNumbers = jest.fn(() => mockNumber);
      main.convertMp3ToOgg = jest.fn(() => Promise.resolve(mockBase64Audio));
  
      // WHEN
      const response = await request(main.app).post('/send-audio').send({ number: mockNumber, url: mockUrl });
  
      // THEN
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
    });
  }, 10000);

  
  describe('POST /send-link', () => {
    it('should send a link', async () => {
      // GIVEN
      const mockNumber = '1234567890';
      const mockUrl = 'https://example.com';
      const mockCaption = 'Link Caption';
      const mockImageUrl = 'https://example.com/image.png';
      const mockChat = { sendMessage: jest.fn() };
  
      main.client.getChatById = jest.fn(() => Promise.resolve(mockChat));
      main.extractNumbers = jest.fn(() => mockNumber);
  
      // WHEN
      const response = await request(main.app).post('/send-link').send({ number: mockNumber, url: mockUrl, caption: mockCaption, imageUrl: mockImageUrl });
  
      // THEN
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
    });
  });