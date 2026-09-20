"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildSteps,
  emptyDraft,
  toSubmitPayload,
  withDetail,
  withRating,
  type Step,
  type SurveyDraft,
} from "@/lib/survey-flow";
import { ExperiencesInput, NameInput, OptionalTextInput, RatingInput } from "@/components/survey/SurveyInputs";
import "./survey.css";

// Nhịp hiệu ứng (ms): eyebrow fade in trước, rồi từng từ cách nhau WORD_STEP,
// mỗi từ chuyển opacity 0 -> 1 trong WORD_FADE; chữ cuối hiện xong chờ thêm
// AFTER_LAST_WORD mới hiện phần trả lời.
// (Đã tăng tốc ×1.5 so với nhịp gốc 500/220/700/400.)
const WORD_START = 333;
const WORD_STEP = 147;
const WORD_FADE = 467;
const AFTER_LAST_WORD = 267;
// Sau khi màn cảm ơn hiện xong, chờ chừng này rồi tự về trang chủ.
const REDIRECT_HOME_DELAY = 3000;

/**
 * 1 màn hình = 1 câu hỏi ở giữa: eyebrow -> câu hỏi hiện từng TỪ (chưa tới lượt
 * thì opacity 0 hoàn toàn) -> phần trả lời. Luôn được render với `key` khác nhau
 * cho mỗi bước để hiệu ứng + state input chạy lại từ đầu.
 */
function Stage({
  eyebrow,
  prompt,
  children,
}: {
  eyebrow: string;
  prompt: string;
  children?: (active: boolean) => ReactNode;
}) {
  const words = useMemo(() => prompt.split(/\s+/).filter(Boolean), [prompt]);
  const [answerShown, setAnswerShown] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = reduced ? 0 : WORD_START + (words.length - 1) * WORD_STEP + WORD_FADE + AFTER_LAST_WORD;
    const timer = setTimeout(() => setAnswerShown(true), wait);
    return () => clearTimeout(timer);
  }, [words.length]);

  return (
    <div className="sv-stage">
      <span className="sv-eyebrow">{eyebrow}</span>
      <h1 className="sv-question">
        {words.map((word, i) => (
          <span key={i}>
            <span
              className="sv-word"
              style={{ animationDelay: `${WORD_START + i * WORD_STEP}ms`, animationDuration: `${WORD_FADE}ms` }}
            >
              {word}
            </span>{" "}
          </span>
        ))}
      </h1>
      {children && (
        <div className={`sv-answer ${answerShown ? "sv-on" : ""}`} inert={!answerShown}>
          {children(answerShown)}
        </div>
      )}
    </div>
  );
}

/** Màn cảm ơn: tự về trang chủ sau REDIRECT_HOME_DELAY, hoặc bấm nút để về ngay. */
function BackToHome({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => router.push("/"), REDIRECT_HOME_DELAY);
    return () => clearTimeout(timer);
  }, [active, router]);

  return (
    <div className="sv-actions">
      <button type="button" onClick={() => router.push("/")} className="sv-btn">
        Về trang chủ
      </button>
    </div>
  );
}

type Phase = "asking" | "submitting" | "error" | "done";

export default function SurveyExperience() {
  const [draft, setDraft] = useState<SurveyDraft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  const [errorMessage, setErrorMessage] = useState("");

  const steps = useMemo(() => buildSteps(draft), [draft]);
  const step: Step | undefined = steps[stepIndex];

  // Số câu tổng đổi động (câu trải nghiệm + câu rẽ nhánh được chèn thêm).
  const progress = phase === "asking" ? (stepIndex / steps.length) * 100 : 100;

  async function submit(finalDraft: SurveyDraft) {
    const payload = toSubmitPayload(finalDraft);
    if (!payload) {
      setErrorMessage("Còn thiếu câu trả lời bắt buộc, bạn thử lại từ đầu giúp mình nhé.");
      setPhase("error");
      return;
    }
    setPhase("submitting");
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error ?? "Không gửi được khảo sát.");
      setPhase("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Không gửi được khảo sát.");
      setPhase("error");
    }
  }

  /** Nhận bản nháp mới sau khi trả lời bước hiện tại: sang bước kế, hoặc gửi nếu đã hết. */
  function advance(next: SurveyDraft) {
    setDraft(next);
    if (stepIndex + 1 >= buildSteps(next).length) {
      void submit(next);
    } else {
      setStepIndex(stepIndex + 1);
    }
  }

  function restart() {
    setDraft(emptyDraft);
    setStepIndex(0);
    setErrorMessage("");
    setPhase("asking");
  }

  function renderStepBody(current: Step, active: boolean): ReactNode {
    switch (current.kind) {
      case "name":
        return <NameInput active={active} onSubmit={(name) => advance({ ...draft, name })} />;
      case "rating":
        return <RatingInput onSubmit={(answer) => advance(withRating(draft, current.target, answer))} />;
      case "multiselect":
        return <ExperiencesInput onSubmit={(experiences) => advance({ ...draft, experiences })} />;
      case "detail":
        return (
          <OptionalTextInput
            active={active}
            placeholder="Chia sẻ với mình nhé..."
            submitLabel="Tiếp tục"
            onSubmit={(text) => advance(withDetail(draft, current.target, text))}
          />
        );
      case "suggestion":
        return (
          <OptionalTextInput
            active={active}
            placeholder="Bạn muốn CBD AI Cafe có thêm điều gì..."
            submitLabel="Gửi khảo sát"
            onSubmit={(suggestion) => advance({ ...draft, suggestion })}
          />
        );
    }
  }

  let content: ReactNode;
  if (phase === "done") {
    content = (
      <Stage
        key="done"
        eyebrow="Hoàn thành"
        prompt={`Cảm ơn ${draft.name.trim()}! Ý kiến của bạn giúp CBD AI Cafe ngày càng tốt hơn.`}
      >
        {(active) => <BackToHome active={active} />}
      </Stage>
    );
  } else if (phase === "submitting") {
    content = <Stage key="submitting" eyebrow="Đang gửi" prompt="Đợi mình một chút nhé..." />;
  } else if (phase === "error") {
    content = (
      <Stage key="error" eyebrow="Có trục trặc" prompt="Mình chưa gửi được câu trả lời của bạn.">
        {() => (
          <div>
            <p className="sv-error">{errorMessage}</p>
            <div className="sv-actions">
              <button type="button" onClick={() => void submit(draft)} className="sv-btn">
                Thử gửi lại
              </button>
              <button type="button" onClick={restart} className="sv-btn-ghost">
                Làm lại từ đầu
              </button>
            </div>
          </div>
        )}
      </Stage>
    );
  } else if (step) {
    content = (
      <Stage key={step.id} eyebrow={step.eyebrow} prompt={step.prompt}>
        {(active) => renderStepBody(step, active)}
      </Stage>
    );
  }

  return (
    <div className="sv-root">
      <div className="sv-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
        <div className="sv-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <header className="sv-header">
        <Link href="/" className="sv-home" aria-label="Về trang chủ CBD AI Cafe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" width={36} height={36} className="sv-logo" />
          <span className="sv-brand">CBD AI Cafe</span>
        </Link>
      </header>

      <main className="sv-main">{content}</main>

      <footer className="sv-footer">
        <Link href="/ops/survey" className="sv-admin">
          Quản trị
        </Link>
      </footer>
    </div>
  );
}
