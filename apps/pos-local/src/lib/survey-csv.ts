import { EXPERIENCE_KEYS, EXPERIENCE_LABELS, type DetailKey } from "@/lib/survey-config";
import type { RatedAnswer, SurveyRecord } from "@/types/survey";

// UTF-8 BOM để Excel mở đúng tiếng Việt.
const BOM = "﻿";

/** Ô text do khách nhập: chặn CSV/formula injection (Excel coi ô bắt đầu bằng = + - @ là công thức). */
function textCell(value: string | undefined): string {
  const raw = value ?? "";
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function numberCell(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function ratedCells(answer: RatedAnswer | undefined, detail: string | undefined): string[] {
  return [numberCell(answer?.rating), textCell(answer?.note), textCell(detail)];
}

export function buildSurveyCsv(records: SurveyRecord[]): string {
  const rated = (label: string) => [`${label} - điểm`, `${label} - ghi chú`, `${label} - lý do chưa hài lòng`];
  const header = [
    "Thời gian",
    "Tên",
    ...rated("Thức uống"),
    "Trải nghiệm đã thử",
    ...EXPERIENCE_KEYS.flatMap((key) => rated(`Trải nghiệm "${EXPERIENCE_LABELS[key]}"`)),
    ...rated("Không gian"),
    ...rated("Nhân viên"),
    "Góp ý",
  ]
    .map((h) => textCell(h))
    .join(",");

  const rows = records.map(({ createdAt, data }) => {
    const detail = (key: DetailKey) => data.details[key];
    return [
      textCell(new Date(data.submittedAt ?? createdAt).toLocaleString("vi-VN")),
      textCell(data.name),
      ...ratedCells(data.drink, detail("drink")),
      textCell(data.experiences.map((k) => EXPERIENCE_LABELS[k]).join("; ")),
      ...EXPERIENCE_KEYS.flatMap((key) => ratedCells(data.experienceRatings[key], detail(`exp_${key}`))),
      ...ratedCells(data.space, detail("space")),
      ...ratedCells(data.staff, detail("staff")),
      textCell(data.suggestion),
    ].join(",");
  });

  return BOM + [header, ...rows].join("\r\n");
}
