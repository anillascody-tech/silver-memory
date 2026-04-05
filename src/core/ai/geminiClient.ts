import { getGeminiRuntimeConfig } from "./modelConfig";
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

interface GeminiRuntimeConfig {
  apiKey?: string;
  defaultModel: string;
  endpoint: string;
  temperature: number;
  topP: number;
}

function getGeminiConfig(): GeminiRuntimeConfig {
  const config = getGeminiRuntimeConfig();

  if (!config.apiKey) {
    throw new Error("缺少 Gemini API Key，请配置 WXT_GEMINI_API_KEY。");
  }

  return config;
}

export async function askGeminiWithRawPrompt(prompt: string): Promise<string> {
  return callGemini(getGeminiConfig(), prompt);
}

export async function askGemini(payload: AiQuestionPayload): Promise<string> {
  return callGemini(getGeminiConfig(), buildAnalysisPrompt(payload));
}

/** 将 API Key 脱敏（保留前4位），用于日志输出 */
function maskKey(key: string): string {
  if (key.length <= 4) return "****";
  return `${key.slice(0, 4)}${"*".repeat(Math.min(key.length - 4, 8))}`;
}

/** 从字符串中移除 API Key，防止意外日志泄露 */
function redactKey(text: string, key: string): string {
  return text.replaceAll(key, maskKey(key));
}

async function callGemini(config: GeminiRuntimeConfig, prompt: string): Promise<string> {
  const response = await fetch(`${config.endpoint}/${config.defaultModel}:generateContent?key=${config.apiKey}`, {
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
        temperature: config.temperature,
        topP: config.topP
      }
    })
  });

  if (!response.ok) {
    const rawDetails = await response.text();
    // 脱敏后再抛出，避免 API Key 出现在错误日志中
    const details = config.apiKey ? redactKey(rawDetails, config.apiKey) : rawDetails;
    throw new Error(`Gemini 请求失败 [${maskKey(config.apiKey ?? "")}]: HTTP ${response.status}, ${details}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();

  if (!text) {
    throw new Error("Gemini 返回为空，请稍后重试。");
  }

  return text;
}
