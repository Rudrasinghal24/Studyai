import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client instance with aistudio-build user agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Helper to detect and extract YouTube URLs from user input
 */
function extractYouTubeUrl(input: string): string | null {
  if (!input) return null;
  const match = input.match(
    /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|v\/)|youtu\.be\/)[\w\-]+(?:[?&][\w\-=]+)*)/i
  );
  return match ? match[1] : null;
}

const STUDY_BESTIE_SYSTEM_PROMPT = `<persona>
You are the "Ultimate Study Bestie," a humorous, fiercely loyal, and slightly crazy friend who also happens to be a world-class genius. You speak with a fun mix of English and conversational Hinglish (e.g., "mai samjha dunga"). When a user drops a YouTube link or topic, you NEVER ask them to fetch the transcript. You analyze the video or topic directly. Your banter is witty and empathetic, but your teaching style remains fabulous, professional, and mathematically rigorous. You use the Feynman Technique to break down the hardest concepts perfectly.
</persona>

<core_directive>
When the user provides a YouTube link, topic, document, or assignment, analyze the entire context directly. Never ask for a transcript. Reconstruct the information into an engaging, crystal-clear, structured lesson that banishes exam fear and builds rock-solid intuition.
</core_directive>

<operating_rules>
1. Zero Transcript Begging: If a YouTube link is given, analyze the video directly. Never ever ask the user to fetch or paste a transcript.
2. The Feynman Clarity: Explain even the most brain-melting concept so simply that anyone could grasp it, while preserving university-grade technical rigor.
3. Define Jargon Immediately: Whenever introducing a technical term, explain it in 1 simple sentence right away.
4. Desi & Relatable Analogies: Anchor abstract equations or algorithms in hilarious, everyday real-world situations (food, relationships, chai, traffic, cricket, Netflix).
5. Socratic Reinforcement: End with high-yield self-test questions that solidify their mental model.
</operating_rules>

<output_structure>
Always format your response using this exact 5-pillar Markdown structure:

## 1. Asli Mudda (The Big Picture) 🌍
(A simple, 2-3 sentence overview of what this material/video is about, why it matters, and a warm, confidence-boosting bestie reassurance: "Tension mat lo, mai samjha dunga!")

## 2. Dimaag Mein Fit Karne Wali Cheezein (Key Concepts Broken Down) 🧠
(Use clear subheadings for each major concept. Explain each thoroughly with intuitive clarity and mathematical/engineering depth. Use bold text for crucial terms. Define every technical term on the spot.)

## 3. Ek Dum Desi / Real-World Analogy 💡
(Provide a highly relatable, funny, and accurate analogy that maps directly to the mechanics of the concept.)

## 4. Exam & Real-Life Mein Kaise Fodna Hai (Practical Application) 🛠️
(If the input is an assignment or exam problem, provide a step-by-step logical breakdown of how to approach the solution. DO NOT just dump the final answer; explain the "why" behind each step. If it is a video/concept, explain how this knowledge is used in actual software, hardware, or industry projects.)

## 5. Test Yourself Yaar! (Quick Review & Self-Test) 📝
(Provide 2-3 quick self-test questions to verify intuition, along with answers clearly indicated.)
</output_structure>`;

// Endpoint 1: Transform YouTube link, notes, or topic into Feynman-style Bestie Lesson
app.post('/api/educate', async (req, res) => {
  try {
    const { material, materialType, learnerLevel, specificQuestions } = req.body;

    if (!material || typeof material !== 'string' || !material.trim()) {
      return res.status(400).json({ error: 'Please drop a YouTube link, study notes, or an assignment topic!' });
    }

    const trimmedMaterial = material.trim();
    const youtubeUrl = extractYouTubeUrl(trimmedMaterial);

    const promptText = `Hey Bestie! Please analyze and teach this ${youtubeUrl ? 'YouTube video' : 'study material'}.
${youtubeUrl ? `YouTube Video URL: ${youtubeUrl}\n` : ''}
Target Learner Level: ${learnerLevel || 'Undergraduate'}
${specificQuestions ? `Student's Specific Worry / Sticking Point:\n"${specificQuestions}"\n` : ''}

=== MATERIAL / PROMPT CONTENT ===
${trimmedMaterial}
=== END CONTENT ===

Remember your persona: The Ultimate Study Bestie speaking in engaging English + Hinglish banter ("mai samjha dunga!").
Strictly structure with:
## 1. Asli Mudda (The Big Picture) 🌍
## 2. Dimaag Mein Fit Karne Wali Cheezein (Key Concepts Broken Down) 🧠
## 3. Ek Dum Desi / Real-World Analogy 💡
## 4. Exam & Real-Life Mein Kaise Fodna Hai (Practical Application) 🛠️
## 5. Test Yourself Yaar! (Quick Review & Self-Test) 📝`;

    // Construct Gemini contents payload:
    // If a YouTube URL is present, use FileData part with fileUri pointing directly to YouTube!
    const contents: any[] = [];
    if (youtubeUrl) {
      contents.push({
        fileData: {
          fileUri: youtubeUrl,
          mimeType: 'video/mp4',
        },
      });
    }
    contents.push({ text: promptText });

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
        config: {
          systemInstruction: STUDY_BESTIE_SYSTEM_PROMPT,
          temperature: 0.7,
        },
      });
    } catch (videoError: any) {
      // If direct video URI processing fails (e.g. video is private or restricted), fallback to text-only with video context
      console.warn('Native video URI call had an issue, falling back to text prompt with URL context:', videoError?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            text: `[Context: The user provided YouTube link: ${youtubeUrl || ''}. Analyze the topic and teach it with utmost depth as the Study Bestie.]\n\n` + promptText,
          },
        ],
        config: {
          systemInstruction: STUDY_BESTIE_SYSTEM_PROMPT,
          temperature: 0.7,
        },
      });
    }

    const markdownText = response?.text || '';
    res.json({
      success: true,
      lessonMarkdown: markdownText,
      detectedYouTube: Boolean(youtubeUrl),
      youtubeUrl: youtubeUrl || null,
    });
  } catch (error: any) {
    console.error('Error generating lesson in /api/educate:', error);
    res.status(500).json({
      error: error?.message || 'Arrey yaar, something went wrong while analyzing! Try again.',
    });
  }
});

// Endpoint 2: Socratic Follow-Up Q&A with Study Bestie
app.post('/api/ask-educator', async (req, res) => {
  try {
    const { question, lessonContext, conversationHistory } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    const messages = [
      {
        role: 'user' as const,
        parts: [
          {
            text: `Here is the lesson we are studying together:\n\n${(lessonContext || '').slice(0, 8000)}\n\n` +
              (conversationHistory && conversationHistory.length > 0
                ? `Previous banter:\n${conversationHistory.map((h: any) => `${h.role === 'user' ? 'Student' : 'Bestie'}: ${h.text}`).join('\n')}\n\n`
                : '') +
              `Student's question / confusion: ${question}\n\nReply as the Ultimate Study Bestie: warm, witty, using Hinglish banter ("Tension mat le, mai samjha dunga", "bhai suno"), intuitive Feynman analogies, defining any jargon on the spot, and concluding with a quick confidence booster or intuitive checkpoint.`,
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: messages,
      config: {
        systemInstruction: STUDY_BESTIE_SYSTEM_PROMPT,
        temperature: 0.75,
      },
    });

    res.json({
      success: true,
      reply: response.text || '',
    });
  } catch (error: any) {
    console.error('Error in ask-educator:', error);
    res.status(500).json({
      error: error?.message || 'Bhai, network glitch ho gaya! Ask me once more.',
    });
  }
});

// Endpoint 3: Voice narration using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Puck' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const textSnippet = text.slice(0, 1500);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: textSnippet,
              speechMetadata: {
                style: 'Warm, enthusiastic, charismatic, witty study bestie tutor',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({
        success: false,
        fallbackToBrowser: true,
        message: 'No audio returned from model, using browser speech fallback',
      });
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    // Gracefully handle rate limits (e.g. 429 / RESOURCE_EXHAUSTED) without throwing or triggering crash logs
    console.warn('TTS model unavailable or quota reached, delegating to client-side speech synthesis:', error?.message || error);
    res.json({
      success: false,
      fallbackToBrowser: true,
      message: 'Cloud TTS quota reached or unavailable. Falling back to device speech synthesis.',
    });
  }
});

// Vite middleware or production static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Study Bestie server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
