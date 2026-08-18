"use client";

import { useState, useRef, useCallback } from "react";

/**
 * Resize ảnh về tối đa maxDimension (cạnh dài nhất) và nén lại thành JPEG chất lượng
 * quality, để giảm dung lượng payload gửi lên server - ảnh gốc từ camera điện thoại
 * có thể 3-8MB, gây "Load failed" trên mạng chậm/không ổn định (WiFi quán, 4G yếu...).
 */
function resizeAndCompressImage(
  file: File,
  maxDimension = 1024,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Không tạo được canvas để nén ảnh."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không đọc được ảnh."));
    };

    img.src = objectUrl;
  });
}

interface PhotoCaptureProps {
  /** Gọi khi người dùng đã chụp xong và xác nhận dùng ảnh này */
  onCapture: (dataUrl: string) => void;
  /** Gọi khi người dùng bỏ ảnh / muốn chụp lại từ đầu */
  onClear?: () => void;
}

/**
 * Component mở camera trước (selfie) trên điện thoại để chụp ảnh.
 * Ảnh chỉ giữ tạm trong state (data URL), KHÔNG upload lên storage nào.
 * Sau khi component unmount hoặc handleReset() được gọi, ảnh bị xoá khỏi bộ nhớ.
 *
 * capture="user" -> mở camera trước (selfie) trên hầu hết trình duyệt mobile.
 * Trên desktop, input này fallback về chọn file bình thường (không có camera),
 * điều này là hành vi mong đợi - camera capture chỉ có ý nghĩa trên mobile.
 */
export default function PhotoCapture({ onCapture, onClear }: PhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      // Giới hạn kích thước để tránh ảnh quá nặng (10MB)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setError("Ảnh quá lớn, vui lòng chụp lại (tối đa 10MB).");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("File không hợp lệ, vui lòng chụp ảnh.");
        return;
      }

      setIsProcessing(true);
      resizeAndCompressImage(file)
        .then((dataUrl) => {
          setPreview(dataUrl);
          setIsProcessing(false);
        })
        .catch(() => {
          setError("Không xử lý được ảnh, vui lòng thử lại.");
          setIsProcessing(false);
        });

      // Reset input để có thể chọn/chụp lại cùng 1 file nếu cần
      e.target.value = "";
    },
    []
  );

  const handleOpenCamera = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleRetake = useCallback(() => {
    setPreview(null);
    setError(null);
    onClear?.();
  }, [onClear]);

  const handleConfirm = useCallback(() => {
    if (preview) {
      onCapture(preview);
    }
  }, [preview, onCapture]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      {/* Input ẩn, capture="user" mở camera trước trên mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Chụp ảnh"
      />

      {!preview ? (
        <button
          type="button"
          onClick={handleOpenCamera}
          disabled={isProcessing}
          className="flex flex-col items-center justify-center gap-2 w-full aspect-square rounded-2xl border-2 border-dashed border-amber-400/60 bg-black/20 text-amber-300 hover:border-amber-300 hover:bg-black/30 transition-colors disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-12 h-12"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.822 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
            />
          </svg>
          <span className="text-sm font-medium">
            {isProcessing ? "Đang xử lý..." : "Chạm để chụp ảnh"}
          </span>
        </button>
      ) : (
        <div className="w-full flex flex-col gap-3">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-amber-400/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Ảnh vừa chụp"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/80 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Chụp lại
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors"
            >
              Dùng ảnh này
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 text-center" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-white/40 text-center">
        Ảnh chỉ dùng tạm để phân tích, không được lưu trữ.
      </p>
    </div>
  );
}