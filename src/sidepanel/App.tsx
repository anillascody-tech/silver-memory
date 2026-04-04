import { useMemo, useState } from "react";
import { askGemini } from "../core/ai/geminiClient";
import { buildReport } from "../core/ai/reportBuilder";
import { ERROR_CODES } from "../shared/constants/errorCodes";
import { saveAnalysis } from "../shared/utils/analysisHistory";
import type { CollectResponse, RawJob } from "../shared/types/jobs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function collectFromActiveTab(): Promise<CollectResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return {
      ok: false,
      pageType: "non_target",
      isLoggedIn: false,
      errorCode: ERROR_CODES.NOT_TARGET_PAGE,
      message: "未获取到当前标签页，请重试。"
    };
  }

  return (await chrome.tabs.sendMessage(tab.id, {
    type: "COLLECT_RAW_JOBS"
  })) as CollectResponse;
}

async function streamText(text: string, onChunk: (value: string) => void): Promise<void> {
  // 按块渲染：每批 8 个字符触发一次更新，每帧间隔 16ms，避免 O(n²) 累积和长文本卡顿
  const CHUNK = 8;
  const DELAY = 16;
  const chars = Array.from(text);
  let offset = 0;
  while (offset < chars.length) {
    offset = Math.min(offset + CHUNK, chars.length);
    onChunk(chars.slice(0, offset).join(""));
    await new Promise((resolve) => setTimeout(resolve, DELAY));
  }
}

function StatusBar({ result, loading }: { result: CollectResponse | null; loading: boolean }) {
  const status = loading ? "采集中..." : result?.ok ? "已就绪" : result ? "待修复" : "未开始";
  const statusColor = loading ? "#b26a00" : result?.ok ? "#0a7d2b" : result ? "#a00000" : "#666";

  return (
    <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, marginTop: 10 }}>
      <div style={{ fontWeight: 600 }}>状态栏</div>
      <div style={{ color: statusColor }}>状态：{status}</div>
      <div>页面：{result?.pageType ?? "未知"}</div>
      <div>登录：{result ? (result.isLoggedIn ? "已登录" : "未登录") : "未知"}</div>
    </section>
  );
}

function OverviewCards({ result }: { result: Extract<CollectResponse, { ok: true }> }) {
  const cards = [
    { title: "样本数", value: result.rawJobs.length },
    { title: "薪资中位数(K)", value: result.aggregates.salary.medianK ?? "N/A" },
    { title: "JDHS", value: result.aggregates.jdhs.score },
    { title: "Top技能", value: result.aggregates.skillsTop[0]?.skill ?? "N/A" }
  ];

  return (
    <section style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>概览卡</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {cards.map((card) => (
          <div key={card.title} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>{card.title}</div>
            <div style={{ fontWeight: 700 }}>{card.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChatPanel({
  canAsk,
  asking,
  question,
  setQuestion,
  messages,
  onAsk,
  askError
}: {
  canAsk: boolean;
  asking: boolean;
  question: string;
  setQuestion: (question: string) => void;
  messages: ChatMessage[];
  onAsk: () => Promise<void>;
  askError: string;
}) {
  return (
    <section style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
      <div style={{ fontWeight: 600 }}>聊天区</div>
      <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 8, background: "#fafafa", padding: 8, borderRadius: 6 }}>
        {messages.length === 0 && <div style={{ color: "#666" }}>请先采集，然后输入问题进行分析。</div>}
        {messages.map((message, index) => (
          <div key={`${message.role}_${index}`} style={{ marginBottom: 8 }}>
            <strong>{message.role === "user" ? "你" : "助手"}：</strong>
            <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
          </div>
        ))}
      </div>
      <textarea
        rows={3}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        style={{ width: "100%", marginTop: 8, resize: "vertical" }}
      />
      <button style={{ marginTop: 8 }} onClick={onAsk} disabled={!canAsk}>
        {asking ? "生成中..." : "发送问题"}
      </button>
      {askError && <div style={{ color: "#c00", marginTop: 6 }}>错误：{askError}</div>}
    </section>
  );
}

function ReportPanel({ report, jobs }: { report: string; jobs: RawJob[] }) {
  return (
    <section style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
      <div style={{ fontWeight: 600 }}>报告区</div>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f8f8f8", padding: 8, borderRadius: 6 }}>{report || "暂无报告"}</pre>
      <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
        引用样本：{jobs.slice(0, 5).map((job) => job.id).join("、") || "无"}
      </div>
    </section>
  );
}

export function App() {
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<CollectResponse | null>(null);
  const [question, setQuestion] = useState("帮我分析上海 Java 后端岗位趋势");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [report, setReport] = useState("");
  const [askError, setAskError] = useState("");

  const canAsk = useMemo(() => !!result && result.ok && !asking && question.trim().length > 0, [result, asking, question]);

  const onStartAnalysis = async () => {
    setLoading(true);
    try {
      const response = await collectFromActiveTab();
      setResult(response);
      setAskError("");
      setMessages([]);

      if (response.ok) {
        setReport(buildReport(response.queryContext, response.aggregates));
        // 持久化到本地历史（最近 20 次，规范 5.3）
        saveAnalysis(response.queryContext, response.aggregates, response.rawJobs.length).catch(() => {
          // storage 失败不影响主流程
        });
      } else {
        setReport("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setResult({
        ok: false,
        pageType: "non_target",
        isLoggedIn: false,
        errorCode: ERROR_CODES.NETWORK_ERROR,
        message: `采集通信失败：${message}。请确认已在 Boss 直聘页面并刷新后重试。`
      });
      setReport("");
    } finally {
      setLoading(false);
    }
  };

  const onAsk = async () => {
    if (!result || !result.ok) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setAsking(true);
    setAskError("");

    try {
      const answer = await askGemini({
        question,
        queryContext: result.queryContext,
        aggregates: result.aggregates,
        normalizedJobs: result.normalizedJobs,
        rawJobs: result.rawJobs
      });

      await streamText(answer, (current) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: current };
          return next;
        });
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "AI 调用失败";
      const code = errMsg.includes("HTTP") ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.MODEL_ERROR;
      setAskError(`[${code}] ${errMsg}`);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "【调用失败】请检查 API Key、模型名与网络。" };
        return next;
      });
    } finally {
      setAsking(false);
    }
  };

  return (
    <main style={{ fontFamily: "sans-serif", padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Boss 趋势分析（阶段 5）</h2>
      <button onClick={onStartAnalysis} disabled={loading}>
        {loading ? "采集中..." : "开始采集"}
      </button>

      <StatusBar result={result} loading={loading} />

      {result?.ok && (
        <>
          <OverviewCards result={result} />
          <ChatPanel
            canAsk={canAsk}
            asking={asking}
            question={question}
            setQuestion={setQuestion}
            messages={messages}
            onAsk={onAsk}
            askError={askError}
          />
          <ReportPanel report={report} jobs={result.rawJobs} />
        </>
      )}

      {result && !result.ok && (
        <section style={{ marginTop: 10, border: "1px solid #ffd4d4", borderRadius: 8, padding: 10, color: "#9c0000" }}>
          <div>采集失败：{result.errorCode}</div>
          <div>{result.message}</div>
        </section>
      )}
    </main>
  );
}
