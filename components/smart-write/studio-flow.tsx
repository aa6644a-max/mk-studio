import type { RunView } from "@/lib/writing/types";
import StudioIcon, { type StudioIconName } from "./studio-icon";

const steps: { title: string; detail: string; icon: StudioIconName }[] = [
  { title: "이야기", detail: "주제와 내 시선", icon: "pen" },
  { title: "자료 조사", detail: "필요한 근거 찾기", icon: "search" },
  { title: "글의 방향", detail: "나에게 맞는 구성", icon: "plan" },
  { title: "작성·검수", detail: "MK의 문체로", icon: "spark" },
  { title: "완성", detail: "내 글 확인하기", icon: "check" },
];
export function flowStep(run: RunView) {
  const stage = run.stage === "failed" ? run.retryStage : run.stage;
  if (stage === "ready" || stage === "needs_review") return 4;
  if (stage === "drafting" || stage === "checking") return 3;
  if (stage === "planning" || stage === "awaiting_input") return 2;
  if (stage === "cancelled") return run.article ? 3 : run.strategy ? 2 : 1;
  return 1;
}
export function StudioFlow({ current, stopped = false }: { current: number; stopped?: boolean }) {
  return <nav className="sw-flow" aria-label="글 작성 진행 단계"><ol>{steps.map((step, i) => <li key={step.title} className={i < current ? "is-complete" : i === current ? `is-current${stopped ? " is-stopped" : ""}` : ""} aria-current={i === current ? "step" : undefined}>
    <span className="sw-flow-icon"><StudioIcon name={i < current ? "check" : step.icon} size={19} /></span><span className="sw-flow-text"><strong>{step.title}</strong><small>{step.detail}</small></span><span className="sw-flow-number">0{i + 1}</span>
  </li>)}</ol></nav>;
}
export function StudioVisual({ mode, running = false }: { mode: "input" | "research" | "plan" | "write"; running?: boolean }) {
  const icon = mode === "research" ? "search" : mode === "plan" ? "plan" : mode === "write" ? "pen" : "spark";
  return <div className={`sw-visual sw-visual-${mode} ${running ? "is-running" : ""}`} aria-hidden="true">
    <div className="sw-visual-grid" /><div className="sw-visual-orbit" />
    <div className="sw-floating-card sw-floating-left"><span className="sw-mini-icon"><StudioIcon name="file" size={16} /></span><div><i /><i /></div><span className="sw-mini-check"><StudioIcon name="check" size={12} /></span></div>
    <div className="sw-paper"><div className="sw-paper-top"><span /><small>MY STORY</small><StudioIcon name="spark" size={13} /></div><div className="sw-paper-title" /><div className="sw-paper-line" /><div className="sw-paper-line short" /><div className="sw-paper-image"><StudioIcon name={icon} size={32} /></div><div className="sw-paper-line" /><div className="sw-paper-line short" /><div className="sw-paper-highlight" /></div>
    <div className="sw-floating-card sw-floating-right"><span className="sw-mini-icon"><StudioIcon name="shield" size={16} /></span><strong>MK voice</strong><span className="sw-mini-check"><StudioIcon name="check" size={12} /></span></div>
    {running && <div className="sw-visual-scan" />}
  </div>;
}
