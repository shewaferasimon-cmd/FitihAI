import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Service Setup
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  // API Routes
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: messages,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Server AI Chat error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/tool', async (req, res) => {
    try {
      const { toolType, inputData, files, systemInstruction } = req.body;
      const contents: any[] = [{ role: 'user', parts: [{ text: `Tool: ${toolType}\nInput: ${inputData}` }] }];
      
      if (files && files.length > 0) {
        files.forEach((file: any) => {
          if (file.base64 && file.type.startsWith('image/')) {
            contents[0].parts.push({
              inlineData: {
                data: file.base64,
                mimeType: file.type
              }
            });
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Server AI Tool error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/document', async (req, res) => {
    try {
      const { docType, details, systemInstruction } = req.body;
      const prompt = `Document Type: ${docType}\nDetails: ${JSON.stringify(details)}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Server AI Document error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
