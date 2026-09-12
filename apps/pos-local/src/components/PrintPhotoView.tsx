"use client";

import { useState } from "react";

/** Trang in ảnh lưu niệm (khổ 4x6 inch, khớp đúng ảnh đã ghép sẵn ở server) -
 * mở trong tab riêng từ /ops/print-photos, tự bật hộp thoại in ngay khi ảnh
 * tải xong. `@page` cố định kích thước để máy in ảnh khổ 4x6 không bị co giãn. */
export default function PrintPhotoView({ id }: { id: string }) {
  const [error, setError] = useState(false);

  return (
    <>
      <style jsx global>{`
        @page {
          size: 4in 6in;
          margin: 0;
        }
        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
        }
      `}</style>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-4 print:p-0">
        {error ? (
          <p className="text-sm text-red-500">Không tải được ảnh (có thể đã bị xoá).</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/print-photos/${id}/image`}
            alt="Ảnh in lưu niệm"
            onLoad={() => window.print()}
            onError={() => setError(true)}
            className="w-[4in] max-w-full object-contain print:w-[4in]"
          />
        )}
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 print:hidden"
        >
          In lại
        </button>
      </div>
    </>
  );
}
