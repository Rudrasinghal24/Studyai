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

// === SHARED LESSONS & FRIEND SYNC STORE ===
interface SharedLessonRecord {
  id: string;
  title: string;
  markdown: string;
  notes?: string;
  mode: string;
  authorName: string;
  createdAt: number;
  views: number;
}

const sharedLessonsMap = new Map<string, SharedLessonRecord>();

// Pre-seed popular bestie study guides
sharedLessonsMap.set('BESTIE-AI101', {
  id: 'BESTIE-AI101',
  title: 'Transformers & Self-Attention Demystified',
  markdown: `## 1. Asli Mudda (The Big Picture) 🌍
Transformers are the foundational architecture behind modern AI like ChatGPT and Gemini. Unlike older models that read text sequentially word-by-word, Transformers analyze all words at the same time and connect relationships instantly. Tension mat lo, mai samjha dunga!

## 2. Dimaag Mein Fit Karne Wali Cheezein (Key Concepts Broken Down) 🧠
### Self-Attention Formula
Every token computes its relevance with every other token in the sequence using:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
- **Query ($Q$):** What the current word is searching for.
- **Key ($K$):** What information each word in the text offers.
- **Value ($V$):** The actual substantive meaning or representation.
- **$\\sqrt{d_k}$ Scaling:** Keeps the dot products from blowing up into flat gradients.

### Positional Encoding
Because Transformers process all words in parallel, they have no built-in sense of order. Sinusoidal or learned vectors are added to token embeddings to encode position.

## 3. Ek Dum Desi / Real-World Analogy 💡
Imagine a chaotic family WhatsApp group before a wedding! When Uncle asks "Who has the car keys?" ($Q$), everyone in the group checks their status ($K$). Chintu says "I have them!" ($V$). Chintu gets 100% of the attention, while random good morning stickers get 0% attention. That is self-attention!

## 4. Exam & Real-Life Mein Kaise Fodna Hai (Practical Application) 🛠️
When asked to draw the Transformer block in exams:
\`\`\`diagram
+------------------------------------+
|       Multi-Head Attention         |
+------------------------------------+
                 |
                 v
+------------------------------------+
|  Add & LayerNorm (Residual Conn)   |
+------------------------------------+
                 |
                 v
+------------------------------------+
|    Feed-Forward Network (FFN)      |
+------------------------------------+
\`\`\`
Always mention: Residual connections are critical to prevent vanishing gradients in deep stacks!

## 5. Test Yourself Yaar! (Quick Review & Self-Test) 📝
**Question 1:** Why do we divide by $\\sqrt{d_k}$ in scaled dot-product attention?
**Answer 1:** For large dimensions, dot products grow very large in magnitude, pushing softmax into regions with tiny gradients. Scaling preserves healthy gradient flow during backprop!

**Question 2:** What is the difference between Self-Attention and Cross-Attention?
**Answer 2:** In Self-Attention, Q, K, and V come from the same sequence. In Cross-Attention, Queries come from the decoder while Keys and Values come from the encoder!`,
  notes: 'Attention(Q,K,V) = softmax(QK^T / sqrt(d_k))V. Scale factor sqrt(d_k) is an exam favourite question!',
  mode: 'bestie_mode',
  authorName: 'Rudra & Bestie 💖',
  createdAt: Date.now() - 3600000,
  views: 89,
});

sharedLessonsMap.set('BESTIE-MATH1', {
  id: 'BESTIE-MATH1',
  title: 'Calculus: Derivatives & Integrals with Chai Analogy',
  markdown: `## 1. Asli Mudda (The Big Picture) 🌍
Calculus is simply the mathematics of change. Derivatives tell you how fast something is changing right now (instantaneous rate), while Integrals add up all tiny slices of change to find the whole story (accumulation). Tension mat lo, mai samjha dunga!

## 2. Dimaag Mein Fit Karne Wali Cheezein (Key Concepts Broken Down) 🧠
### The Derivative (Speedometer)
$$\\frac{df}{dx} = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$$
It is the slope of the tangent line at any single instant.

### The Definite Integral (Odometer / Total Accumulation)
$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$
It computes the exact area under the rate curve by summing infinitesimally thin rectangles.

## 3. Ek Dum Desi / Real-World Analogy 💡
Think of brewing a cup of Masala Chai!
- **Derivative:** Checking how fast the chai is boiling over right this microsecond (the instantaneous sizzle).
- **Integral:** Pouring all the drops of chai into your mug until it fills up completely (accumulating the total volume).

## 4. Exam & Real-Life Mein Kaise Fodna Hai (Practical Application) 🛠️
- Used in Gradient Descent to train AI models: $\\theta_{new} = \\theta_{old} - \\alpha \\nabla L(\\theta)$.
- Used in Rocket Trajectories to compute velocity from acceleration and distance from velocity.

## 5. Test Yourself Yaar! (Quick Review & Self-Test) 📝
**Question 1:** What does the Fundamental Theorem of Calculus prove?
**Answer 1:** That differentiation and integration are inverse operations of each other!

**Question 2:** If velocity is $v(t) = 3t^2$, what is total distance traveled from $t=0$ to $t=2$?
**Answer 2:** Distance = $\\int_{0}^{2} 3t^2\\,dt = [t^3]_{0}^{2} = 8 - 0 = 8$ units!`,
  notes: 'Fundamental Theorem connects derivatives and integrals. Gradient descent is just multidimensional derivatives!',
  mode: 'bestie_mode',
  authorName: 'Bestie Scholar ✨',
  createdAt: Date.now() - 7200000,
  views: 54,
});

function generateUniqueShareId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const fullId = `BESTIE-${code}`;
    if (!sharedLessonsMap.has(fullId)) {
      return fullId;
    }
  }
  return `BESTIE-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

// Endpoint 4: Create a unique Share Code for a lesson
app.post('/api/share', (req, res) => {
  try {
    const { title, markdown, notes, mode, authorName } = req.body;

    if (!markdown || typeof markdown !== 'string' || !markdown.trim()) {
      return res.status(400).json({ error: 'Lesson content is required to share' });
    }

    // Extract title if not provided
    let derivedTitle = (title || '').trim();
    if (!derivedTitle) {
      const match = markdown.match(/^#+\s*(?:1[\.:\)]?\s*)?(?:Asli\s+Mudda|The\s+Big\s+Picture)?[^\n]*\n+([^\n]+)/i);
      if (match && match[1]) {
        derivedTitle = match[1].replace(/[#*`]/g, '').trim().slice(0, 60);
      } else {
        const firstLine = markdown.split('\n').find((l) => l.trim().length > 3) || 'Study Notes';
        derivedTitle = firstLine.replace(/[#*`]/g, '').trim().slice(0, 60);
      }
    }

    const shareId = generateUniqueShareId();
    const record: SharedLessonRecord = {
      id: shareId,
      title: derivedTitle || 'StudyBestie Masterclass Notes',
      markdown: markdown.trim(),
      notes: (notes || '').trim(),
      mode: mode || 'bestie_mode',
      authorName: (authorName || '').trim() || 'Bestie Student',
      createdAt: Date.now(),
      views: 1,
    };

    sharedLessonsMap.set(shareId, record);

    res.json({
      success: true,
      shareId,
      lesson: record,
    });
  } catch (error: any) {
    console.error('Error creating share record:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate share link' });
  }
});

// Endpoint 5: Fetch shared lesson by unique ID (case-insensitive)
app.get('/api/share/:id', (req, res) => {
  try {
    const rawId = req.params.id || '';
    const cleanId = rawId.trim().toUpperCase();

    // Support both "BESTIE-XXXXX" and just "XXXXX"
    let matchId = cleanId;
    if (!matchId.startsWith('BESTIE-') && matchId.length <= 6) {
      matchId = `BESTIE-${matchId}`;
    }

    const record = sharedLessonsMap.get(matchId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: `Oops! Share code "${cleanId}" was not found. Please double-check with your bestie!`,
      });
    }

    record.views += 1;
    res.json({
      success: true,
      lesson: record,
    });
  } catch (error: any) {
    console.error('Error fetching shared lesson:', error);
    res.status(500).json({ error: 'Failed to retrieve shared lesson' });
  }
});

// Endpoint 6: Get recent shared lessons to discover or load sample peer notes
app.get('/api/share-recent', (_req, res) => {
  try {
    const list = Array.from(sharedLessonsMap.values())
      .slice(-6)
      .reverse()
      .map(({ id, title, mode, authorName, createdAt, views }) => ({
        id,
        title,
        mode,
        authorName,
        createdAt,
        views,
      }));

    res.json({
      success: true,
      recent: list,
    });
  } catch (error: any) {
    res.json({ success: false, recent: [] });
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
