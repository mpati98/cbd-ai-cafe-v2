"use client";

import { useEffect, useRef, useState } from "react";
import { EXPERIENCE_KEYS, EXPERIENCE_LABELS, RATING_LABELS, type ExperienceKey } from "@/lib/survey-config";
import type { RatedAnswer } from "@/types/survey";

/** Câu hỏi text 1 dòng (tên khách) — Enter = gửi. `active` = phần trả lời đã hiện, lúc đó mới focus. */
export function NameInput({ active, onSubmit }: { active: boolean; onSubmit: (name: string) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        maxLength={80}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nhập tên của bạn..."
        className="sv-input sv-input-line"
      />
      <div className="sv-actions">
        <button type="submit" disabled={!value.trim()} className="sv-btn">
          Tiếp tục
        </button>
      </div>
    </form>
  );
}

/** Rating 1-5: danh sách dọc đủ nhãn + ô cảm nhận thêm. Chỉ bật "Tiếp tục" sau khi chọn 1 mức. */
export function RatingInput({ onSubmit }: { onSubmit: (answer: RatedAnswer) => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");

  return (
    <div>
      <div role="radiogroup" aria-label="Mức đánh giá" className="sv-options">
        {RATING_LABELS.map((label, i) => {
          const value = i + 1;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              onClick={() => setRating(value)}
              className="sv-option"
            >
              <span className="sv-badge">{value}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <textarea
        value={note}
        rows={2}
        maxLength={1000}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Cảm nhận thêm (không bắt buộc)"
        className="sv-input sv-textarea sv-note"
      />

      <div className="sv-actions">
        <button
          type="button"
          disabled={rating === null}
          onClick={() => rating !== null && onSubmit({ rating, note: note.trim() })}
          className="sv-btn"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}

/** Chọn nhiều trải nghiệm (giữ đúng thứ tự khách bấm chọn) hoặc bỏ qua. */
export function ExperiencesInput({ onSubmit }: { onSubmit: (selected: ExperienceKey[]) => void }) {
  const [selected, setSelected] = useState<ExperienceKey[]>([]);

  function toggle(key: ExperienceKey) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  return (
    <div>
      <div role="group" aria-label="Trải nghiệm đã thử" className="sv-options">
        {EXPERIENCE_KEYS.map((key) => {
          const checked = selected.includes(key);
          return (
            <button key={key} type="button" role="checkbox" aria-checked={checked} onClick={() => toggle(key)} className="sv-option">
              <span className="sv-badge sv-badge-check">{checked ? "✓" : ""}</span>
              <span>{EXPERIENCE_LABELS[key]}</span>
            </button>
          );
        })}
      </div>

      <div className="sv-actions">
        <button type="button" disabled={selected.length === 0} onClick={() => onSubmit(selected)} className="sv-btn">
          Tiếp tục
        </button>
        <button type="button" onClick={() => onSubmit([])} className="sv-btn-ghost">
          Mình chưa thử trải nghiệm nào
        </button>
      </div>
    </div>
  );
}

/** Câu text nhiều dòng TUỲ CHỌN (câu rẽ nhánh + góp ý cuối) — luôn có "Bỏ qua câu này". */
export function OptionalTextInput({
  active,
  placeholder,
  submitLabel,
  onSubmit,
}: {
  active: boolean;
  placeholder: string;
  submitLabel: string;
  onSubmit: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (active) areaRef.current?.focus();
  }, [active]);

  return (
    <div>
      <textarea
        ref={areaRef}
        value={value}
        rows={4}
        maxLength={2000}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="sv-input sv-textarea"
      />
      <div className="sv-actions">
        <button type="button" onClick={() => onSubmit(value.trim())} className="sv-btn">
          {submitLabel}
        </button>
        <button type="button" onClick={() => onSubmit("")} className="sv-btn-ghost">
          Bỏ qua câu này
        </button>
      </div>
    </div>
  );
}
