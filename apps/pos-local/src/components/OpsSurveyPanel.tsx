"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { opsApi, OpsApiError } from "@/lib/ops-api";
import { buildSurveyCsv } from "@/lib/survey-csv";
import { EXPERIENCE_LABELS, RATING_LABELS } from "@/lib/survey-config";
import type { RatedAnswer, SurveyRecord } from "@/types/survey";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function average(values: number[]): string {
  if (values.length === 0) return "—";
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

function ratingTone(rating: number): string {
  if (rating <= 2) return "bg-orange-500/15 text-orange-300";
  if (rating === 3) return "bg-latte-700 text-latte-200";
  return "bg-emerald-500/15 text-emerald-300";
}

function RatingLine({ label, answer, detail }: { label: string; answer: RatedAnswer | undefined; detail?: string }) {
  if (!answer) return null;
  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-latte-200/80">{label}</span>
        <span className={`rounded-full px-2 py-0.5 font-mono text-[0.65rem] font-bold ${ratingTone(answer.rating)}`}>
          {answer.rating}/5 · {RATING_LABELS[answer.rating - 1]}
        </span>
      </div>
      {answer.note && <p className="mt-0.5 text-latte-200/70">{answer.note}</p>}
      {detail && <p className="mt-0.5 text-orange-300/90">↳ Chưa hài lòng vì: {detail}</p>}
    </div>
  );
}

/** Màn hình quản trị khảo sát trải nghiệm — thống kê, danh sách từng lượt, xuất CSV, xoá toàn bộ. */
export default function OpsSurveyPanel() {
  const router = useRouter();
  const [records, setRecords] = useState<SurveyRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      setRecords(await opsApi.list<SurveyRecord>("/api/survey"));
    } catch (err) {
      if (err instanceof OpsApiError && err.status === 401) {
        router.push("/ops/print-photos/login?next=%2Fops%2Fsurvey");
        return;
      }
      setRecords([]);
      setLoadError(err instanceof OpsApiError ? err.message : "Không tải được dữ liệu khảo sát.");
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const list = records ?? [];
    return {
      total: list.length,
      drink: average(list.map((r) => r.data.drink.rating)),
      space: average(list.map((r) => r.data.space.rating)),
      staff: average(list.map((r) => r.data.staff.rating)),
    };
  }, [records]);

  function handleExport() {
    if (!records?.length) return;
    const blob = new Blob([buildSurveyCsv(records)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `khao-sat-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAll() {
    if (!records?.length) return;
    if (!window.confirm(`Xoá toàn bộ ${records.length} lượt khảo sát? Không thể hoàn tác — nên xuất CSV trước.`)) return;
    setDeleting(true);
    try {
      await opsApi.remove("/api/survey");
      await load();
    } catch (err) {
      setLoadError(err instanceof OpsApiError ? err.message : "Không xoá được dữ liệu.");
    } finally {
      setDeleting(false);
    }
  }

  const hasData = (records?.length ?? 0) > 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-latte-100">Khảo sát trải nghiệm</h2>
          <p className="mt-1 text-sm text-latte-200/70">
            Kết quả khách điền tại <span className="font-mono text-latte-100">/survey</span>, mới nhất trước.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleExport}
            disabled={!hasData}
            className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm transition-transform enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Xuất CSV
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={!hasData || deleting}
            className="rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-300 transition-colors enabled:hover:border-red-500/40 enabled:hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "Đang xoá..." : "Xoá toàn bộ"}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">{loadError}</div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tổng lượt khảo sát", value: String(stats.total) },
          { label: "Điểm TB Thức uống", value: stats.drink },
          { label: "Điểm TB Không gian", value: stats.space },
          { label: "Điểm TB Nhân viên", value: stats.staff },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-latte-700 bg-latte-800/40 p-4">
            <p className="text-xs text-latte-400">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-black text-orange-400">{card.value}</p>
          </div>
        ))}
      </div>

      {records === null && <p className="text-sm text-latte-400">Đang tải...</p>}
      {records !== null && !hasData && !loadError && <p className="text-sm text-latte-400">Chưa có lượt khảo sát nào.</p>}

      <div className="space-y-3">
        {records?.map(({ id, createdAt, data }) => (
          <div key={id} className="rounded-xl border border-latte-700 bg-latte-800/40 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <b className="text-base font-bold text-latte-100">{data.name}</b>
              <span className="font-mono text-xs text-latte-400">{formatTime(data.submittedAt ?? createdAt)}</span>
            </div>

            <div className="space-y-2.5">
              <RatingLine label="Thức uống" answer={data.drink} detail={data.details.drink} />

              {data.experiences.length === 0 ? (
                <p className="text-sm text-latte-400">Chưa thử trải nghiệm nào.</p>
              ) : (
                data.experiences.map((key) => (
                  <RatingLine
                    key={key}
                    label={`Trải nghiệm "${EXPERIENCE_LABELS[key]}"`}
                    answer={data.experienceRatings[key]}
                    detail={data.details[`exp_${key}`]}
                  />
                ))
              )}

              <RatingLine label="Không gian" answer={data.space} detail={data.details.space} />
              <RatingLine label="Nhân viên" answer={data.staff} detail={data.details.staff} />

              {data.suggestion && (
                <p className="rounded-lg bg-latte-900/60 px-3 py-2 text-sm text-latte-100">
                  <span className="text-latte-400">Góp ý: </span>
                  {data.suggestion}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
