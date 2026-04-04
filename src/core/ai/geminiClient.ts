import { buildAnalysisPrompt } from "./promptBuilder";
import type { AiQuestionPayload } from "./promptBuilder";

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

function readEnv(name: string): string | undefined {
  return (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[name];
}

function getGeminiConfig() {
  const apiKey = readEnv("GEMINI_API_KEY") ?? readEnv("VITE_GEMINI_API_KEY");
  const model = readEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("缺少 GEMINI_API_KEY（或 VITE_GEMINI_API_KEY）环境变量。");
  }

  return { apiKey, model };
}

export async function askGemini(payload: AiQuestionPayload): Promise<string> {
  const { apiKey, model } = getGeminiConfig();
  const prompt = buildAnalysisPrompt(payload);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9
        }
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini 请求失败: HTTP ${response.status}, ${details}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();

  if (!text) {
    throw new Error("Gemini 返回为空，请稍后重试。");
  }

  return text;
}
