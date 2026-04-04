import { useMemo, useState } from "react";
import { askGemini } from "../core/ai/geminiClient";
import type { CollectResponse, RawJob, NormalizedJob } from "../shared/types/jobs";

async function collectFromActiveTab(): Promise<CollectResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return {
      ok: false,
      pageType: "non_target",
      isLoggedIn: false,
      errorCode: "NOT_TARGET_PAGE",
      message: "未获取到当前标签页，请重试。"
    };
  }

  const response = (await chrome.tabs.sendMessage(tab.id, {
    type: "COLLECT_RAW_JOBS"
  })) as CollectResponse;

  return response;
}

function RawJobList({ jobs }: { jobs: RawJob[] }) {
  return (
    <ul style={{ padding: 0, listStyle: "none", marginTop: 12 }}>
      {jobs.map((job) => (
        <li key={job.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>{job.title || "未识别职位名称"}</div>
          <div>{job.salaryText || "薪资未识别"}</div>
          <div style={{ color: "#666", fontSize: 12 }}>{job.companyName || "公司未识别"}</div>
        </li>
      ))}
    </ul>
  );
}

function NormalizedPreview({ jobs }: { jobs: NormalizedJob[] }) {
  const first = jobs[0];
  if (!first) {
    return null;
  }

  return (
    <div style={{ marginTop: 12, border: "1px solid #d3e3ff", borderRadius: 8, padding: 8, background: "#f5f9ff" }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>标准化预览（首条）</div>
      <div>title: {first.title.value ?? "null"} ({first.title.source})</div>
      <div>salary_min_k: {first.salaryMinK.value ?? "null"} ({first.salaryMinK.source})</div>
      <div>salary_max_k: {first.salaryMaxK.value ?? "null"} ({first.salaryMaxK.source})</div>
      <div>salary_months: {first.salaryMonths.value ?? "null"} ({first.salaryMonths.source})</div>
      <div>exp_level: {first.expLevel.value ?? "null"} ({first.expLevel.source})</div>
      <div>degree: {first.degree.value ?? "null"} ({first.degree.source})</div>
      <div>company_size: {first.companySize.value ?? "null"} ({first.companySize.source})</div>
      <div>funding_stage: {first.fundingStage.value ?? "null"} ({first.fundingStage.source})</div>
      <div>skills: {(first.skills.value ?? []).join(", ") || "null"} ({first.skills.source})</div>
    </div>
  );
}

function AggregatesPreview({ result }: { result: Extract<CollectResponse, { ok: true }> }) {
  return (
    <div style={{ marginTop: 12, border: "1px solid #e6e6e6", borderRadius: 8, padding: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>统计层输出（aggregates）</div>
      <div>salary.mean_k: {result.aggregates.salary.meanK ?? "null"}</div>
      <div>salary.median_k: {result.aggregates.salary.medianK ?? "null"}</div>
      <div>salary.p25_k: {result.aggregates.salary.p25K ?? "null"}</div>
      <div>salary.p75_k: {result.aggregates.salary.p75K ?? "null"}</div>
      <div>skills_top[0]: {result.aggregates.skillsTop[0]?.skill ?? "null"}</div>
      <div>JDHS: {result.aggregates.jdhs.score}</div>
    </div>
  );
}

export function App() {
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<CollectResponse | null>(null);
  const [question, setQuestion] = useState("帮我分析上海 Java 后端岗位趋势");
  const [answer, setAnswer] = useState<string>("");
  const [askError, setAskError] = useState<string>("");

  const canAsk = useMemo(() => !!result && result.ok && !asking, [result, asking]);

  const onStartAnalysis = async () => {
    setLoading(true);
    try {
      const response = await collectFromActiveTab();
      setResult(response);
      setAnswer("");
      setAskError("");
    } finally {
      setLoading(false);
    }
  };

  const onAsk = async () => {
    if (!result || !result.ok) {
      return;
    }

    setAsking(true);
    setAskError("");
    try {
      const text = await askGemini({
        question,
        queryContext: result.queryContext,
        aggregates: result.aggregates,
        normalizedJobs: result.normalizedJobs,
        rawJobs: result.rawJobs
      });
      setAnswer(text);
    } catch (error) {
      setAskError(error instanceof Error ? error.message : "AI 调用失败");
    } finally {
      setAsking(false);
    }
  };

  return (
    <main style={{ fontFamily: "sans-serif", padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Boss 趋势分析（阶段 4）</h2>
      <button onClick={onStartAnalysis} disabled={loading}>
        {loading ? "解析中..." : "开始分析"}
      </button>

      {result && (
        <section style={{ marginTop: 12 }}>
          {result.ok ? (
            <>
              <div>状态：✅ 已采集</div>
              <div>页面类型：{result.pageType}</div>
              <div>登录状态：{result.isLoggedIn ? "已登录" : "未登录"}</div>
              <div>样本数量：{result.rawJobs.length}</div>
              <div>标准化数量：{result.normalizedJobs.length}</div>
              <div>城市：{result.queryContext.city ?? "未知"}</div>
              <div>关键词：{result.queryContext.keyword ?? "未知"}</div>

              <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>AI 问答</div>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={3}
                  style={{ width: "100%", resize: "vertical" }}
                />
                <button style={{ marginTop: 8 }} onClick={onAsk} disabled={!canAsk}>
                  {asking ? "生成中..." : "发送问题"}
                </button>
                {askError && <div style={{ color: "#d00", marginTop: 8 }}>错误：{askError}</div>}
                {answer && (
                  <pre
                    style={{
                      marginTop: 8,
                      whiteSpace: "pre-wrap",
                      background: "#f8f8f8",
                      borderRadius: 8,
                      padding: 8
                    }}
                  >
                    {answer}
                  </pre>
                )}
              </div>

              <NormalizedPreview jobs={result.normalizedJobs} />
              <AggregatesPreview result={result} />
              <RawJobList jobs={result.rawJobs} />
            </>
          ) : (
            <>
              <div>状态：❌ 采集失败</div>
              <div>错误码：{result.errorCode}</div>
              <div>提示：{result.message}</div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
