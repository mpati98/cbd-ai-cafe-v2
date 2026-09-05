/**
 * app/admin/knowledge/page.tsx
 * -----------------------------------------------------------------------
 * Trang quản lý kiến thức của Dã Quỳ - cấu trúc 2 tầng:
 *   Tầng 1: Category (Cafe, Văn hóa, Địa điểm check-in, CBD Robotics...)
 *   Tầng 2: Topic nhỏ nằm trong từng category
 *
 *  - Upload PDF -> gọi /api/admin/knowledge/upload (tự phân loại theo category)
 *  - Quản lý category: thêm / sửa tên / xóa (chặn nếu còn topic con)
 *  - Quản lý topic: thêm / sửa / xóa, chọn category qua dropdown
 *
 * Client component vì có state tương tác (form, edit inline, expand/collapse).
 * -----------------------------------------------------------------------
 */

"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  description: string | null;
  _count?: { topics: number };
};

type Topic = {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  category: { id: string; name: string };
  keywords: string[];
  askCount: number;
  tier: "hot" | "longtail";
  isManual: boolean;
  document?: { fileName: string } | null;
};

type ReviewTopic = {
  title: string;
  content: string;
  categoryId: string;
  keywords: string[];
  include: boolean;
};

type ReviewUpload = {
  documentId: string;
  fileName: string;
  topics: ReviewTopic[];
};

export default function KnowledgeAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [addingTopicToCategory, setAddingTopicToCategory] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [reviewUpload, setReviewUpload] = useState<ReviewUpload | null>(null);

  async function loadAll() {
    setLoading(true);
    const [catRes, topicRes] = await Promise.all([
      fetch("/api/admin/knowledge/categories"),
      fetch("/api/admin/knowledge"),
    ]);
    const catData = await catRes.json();
    const topicData = await topicRes.json();
    setCategories(catData.categories ?? []);
    setTopics(topicData.data?.topics ?? []);
    setExpanded(new Set((catData.categories ?? []).map((c: Category) => c.id)));
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function toggleExpand(categoryId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId);
      return next;
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/knowledge/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload thất bại.");
      setReviewUpload({
        documentId: data.documentId,
        fileName: data.fileName,
        topics: (data.topics as Omit<ReviewTopic, "include">[]).map((t) => ({ ...t, include: true })),
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleApproveUpload(topics: ReviewTopic[]) {
    if (!reviewUpload) return;
    const included = topics
      .filter((t) => t.include)
      .map(({ title, content, categoryId, keywords }) => ({ title, content, categoryId, keywords }));
    const res = await fetch(`/api/admin/knowledge/upload/${reviewUpload.documentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: included }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không lưu được topic đã duyệt.");
    }
    setReviewUpload(null);
    await loadAll();
  }

  async function handleCancelUpload() {
    if (!reviewUpload) return;
    await fetch(`/api/admin/knowledge/upload/${reviewUpload.documentId}`, { method: "DELETE" });
    setReviewUpload(null);
  }

  async function handleAddCategory(name: string, description: string) {
    setCategoryError(null);
    const res = await fetch("/api/admin/knowledge/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCategoryError(data.error || "Không tạo được category.");
      return;
    }
    setShowAddCategory(false);
    await loadAll();
  }

  async function handleDeleteCategory(id: string) {
    if (!window.confirm("Xóa category này?")) return;
    const res = await fetch(`/api/admin/knowledge/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error || "Không xóa được category.");
      return;
    }
    await loadAll();
  }

  async function handleDeleteTopic(id: string) {
    if (!window.confirm("Xóa topic này?")) return;
    await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    await loadAll();
  }

  async function handleSaveTopicEdit(id: string, updated: Partial<Topic> & { keywords?: string[] }) {
    await fetch(`/api/admin/knowledge/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setEditingTopicId(null);
    await loadAll();
  }

  async function handleAddTopic(categoryId: string, newTopic: { title: string; content: string; keywords: string }) {
    await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTopic.title,
        content: newTopic.content,
        categoryId,
        keywords: newTopic.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      }),
    });
    setAddingTopicToCategory(null);
    await loadAll();
  }

  const hotCount = topics.filter((t) => t.tier === "hot").length;
  const topicsByCategory = (categoryId: string) => topics.filter((t) => t.categoryId === categoryId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-latte-100">Kiến thức của Dã Quỳ 🌻</h2>
          <p className="mt-1 text-sm text-latte-200/70">
            Quản lý theo 2 tầng: category lớn (vd Cafe, Văn hóa) chứa các topic nhỏ bên trong.
          </p>
        </div>
        {!showAddCategory && (
          <button
            onClick={() => setShowAddCategory(true)}
            className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm"
          >
            + Thêm category
          </button>
        )}
      </div>

      {/* Upload */}
      <section className="mb-6 rounded-xl border border-latte-700 bg-latte-800/40 p-5">
        <h3 className="font-display text-sm font-bold text-latte-100">Nạp tài liệu mới</h3>
        <p className="mt-1 text-xs text-latte-400">
          Dã Quỳ sẽ tự đọc PDF và xếp nội dung vào đúng category có sẵn bên dưới.
        </p>
        <label className="mt-3 inline-flex items-center gap-3 rounded-lg border border-latte-700 bg-latte-800 px-4 py-2 text-sm text-latte-100 cursor-pointer hover:border-orange-500/50">
          <input type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} className="hidden" />
          {uploading ? "Đang xử lý..." : "Chọn file PDF"}
        </label>
        {uploadError && (
          <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            {uploadError}
          </div>
        )}
      </section>

      {/* Summary */}
      <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-latte-400">
        <span>{categories.length} category</span>
        <span>•</span>
        <span>{topics.length} topic đã học</span>
        <span>•</span>
        <span>{hotCount} topic &quot;hay hỏi&quot;</span>
      </div>

      {/* Add category form */}
      {showAddCategory && (
        <div className="mb-6">
          <AddCategoryForm
            error={categoryError}
            onCancel={() => { setShowAddCategory(false); setCategoryError(null); }}
            onSave={handleAddCategory}
          />
        </div>
      )}

      {/* Category list, mỗi category chứa topic con */}
      {loading ? (
        <p className="text-sm text-latte-400">Đang tải...</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-latte-400">Chưa có category nào, tạo category trước.</p>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catTopics = topicsByCategory(cat.id);
            const isOpen = expanded.has(cat.id);
            return (
              <div key={cat.id} className="overflow-hidden rounded-xl border border-latte-700 bg-latte-800/40">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="flex cursor-pointer items-center gap-2 text-left"
                  >
                    <span className="text-xs text-latte-400">{isOpen ? "▼" : "▶"}</span>
                    <span className="text-sm font-bold text-latte-100">{cat.name}</span>
                    <span className="font-mono text-[0.65rem] text-latte-400">({catTopics.length} topic)</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddingTopicToCategory(cat.id)}
                      className="cursor-pointer rounded-full border border-latte-700 px-3 py-1 text-[0.68rem] font-semibold text-latte-200 hover:bg-latte-700"
                    >
                      + Topic
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="cursor-pointer rounded-full px-3 py-1 text-[0.68rem] font-semibold text-latte-400 hover:text-orange-300"
                    >
                      Xóa category
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="space-y-3 border-t border-latte-700 p-4">
                    {cat.description && (
                      <p className="text-xs italic text-latte-400">{cat.description}</p>
                    )}

                    {addingTopicToCategory === cat.id && (
                      <AddTopicForm
                        onCancel={() => setAddingTopicToCategory(null)}
                        onSave={(t) => handleAddTopic(cat.id, t)}
                      />
                    )}

                    {catTopics.length === 0 ? (
                      <p className="text-sm text-latte-400">Chưa có topic nào trong category này.</p>
                    ) : (
                      catTopics.map((topic) =>
                        editingTopicId === topic.id ? (
                          <EditTopicForm
                            key={topic.id}
                            topic={topic}
                            categories={categories}
                            onCancel={() => setEditingTopicId(null)}
                            onSave={(updated) => handleSaveTopicEdit(topic.id, updated)}
                          />
                        ) : (
                          <div key={topic.id} className="rounded-lg border border-latte-700 bg-latte-900/40 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-bold text-latte-100">{topic.title}</h4>
                                  <span
                                    className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] font-bold ${
                                      topic.tier === "hot"
                                        ? "bg-orange-500/15 text-orange-300"
                                        : "bg-latte-700 text-latte-200"
                                    }`}
                                  >
                                    {topic.tier === "hot" ? "hay hỏi" : "hiếm gặp"}
                                  </span>
                                  {topic.isManual && (
                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-emerald-300">
                                      thêm tay
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-latte-300">{topic.content}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {topic.keywords.map((k) => (
                                    <span key={k} className="rounded-full bg-latte-700 px-2 py-0.5 text-xs text-latte-200">
                                      {k}
                                    </span>
                                  ))}
                                </div>
                                <p className="mt-2 font-mono text-[0.65rem] text-latte-400">
                                  Đã hỏi {topic.askCount} lần
                                  {topic.document?.fileName && ` • từ file "${topic.document.fileName}"`}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  onClick={() => setEditingTopicId(topic.id)}
                                  className="cursor-pointer rounded-full border border-orange-500/40 px-3 py-1 text-[0.68rem] font-semibold text-orange-300 hover:bg-orange-500/10"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteTopic(topic.id)}
                                  className="cursor-pointer rounded-full px-3 py-1 text-[0.68rem] font-semibold text-latte-400 hover:text-orange-300"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewUpload && (
        <ReviewUploadModal
          reviewUpload={reviewUpload}
          categories={categories}
          onCancel={handleCancelUpload}
          onApprove={handleApproveUpload}
        />
      )}
    </div>
  );
}

function AddCategoryForm({
  error,
  onCancel,
  onSave,
}: {
  error: string | null;
  onCancel: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-3 rounded-xl border border-latte-700 bg-latte-800/40 p-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
          Tên category
        </label>
        <input
          className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400"
          placeholder="vd: Sự kiện"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
          Mô tả (không bắt buộc)
        </label>
        <input
          className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400"
          placeholder="Mô tả ngắn"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-orange-300">{error}</p>}
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-200 hover:bg-latte-800">
          Hủy
        </button>
        <button
          onClick={() => onSave(name, description)}
          disabled={!name}
          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:opacity-50"
        >
          Lưu
        </button>
      </div>
    </div>
  );
}

function AddTopicForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (t: { title: string; content: string; keywords: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");

  return (
    <div className="space-y-2 rounded-lg border border-latte-700 bg-latte-900/40 p-3">
      <input
        className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400"
        placeholder="Tiêu đề"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400"
        placeholder="Nội dung"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <input
        className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400"
        placeholder="Từ khóa, cách nhau bởi dấu phẩy"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
      />
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-200 hover:bg-latte-800">
          Hủy
        </button>
        <button
          onClick={() => onSave({ title, content, keywords })}
          disabled={!title || !content}
          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:opacity-50"
        >
          Lưu topic
        </button>
      </div>
    </div>
  );
}

function EditTopicForm({
  topic,
  categories,
  onCancel,
  onSave,
}: {
  topic: Topic;
  categories: Category[];
  onCancel: () => void;
  onSave: (t: { title: string; content: string; categoryId: string; keywords: string[] }) => void;
}) {
  const [title, setTitle] = useState(topic.title);
  const [content, setContent] = useState(topic.content);
  const [categoryId, setCategoryId] = useState(topic.categoryId);
  const [keywords, setKeywords] = useState(topic.keywords.join(", "));

  return (
    <div className="space-y-2 rounded-lg border border-orange-500/40 bg-latte-900/40 p-3">
      <input
        className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <select
        className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
      />
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-200 hover:bg-latte-800">
          Hủy
        </button>
        <button
          onClick={() =>
            onSave({
              title,
              content,
              categoryId,
              keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
            })
          }
          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm"
        >
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
}

function ReviewUploadModal({
  reviewUpload,
  categories,
  onCancel,
  onApprove,
}: {
  reviewUpload: ReviewUpload;
  categories: Category[];
  onCancel: () => void;
  onApprove: (topics: ReviewTopic[]) => Promise<void>;
}) {
  const [topics, setTopics] = useState<ReviewTopic[]>(reviewUpload.topics);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTopic(index: number, patch: Partial<ReviewTopic>) {
    setTopics((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  const includedCount = topics.filter((t) => t.include).length;

  async function handleApproveClick() {
    setSaving(true);
    setError(null);
    try {
      await onApprove(topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được topic đã duyệt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelClick() {
    setCancelling(true);
    try {
      await onCancel();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-latte-700 bg-latte-900 shadow-card">
        <div className="border-b border-latte-700 p-6">
          <h3 className="font-display text-lg font-bold text-latte-100">Duyệt topic trích xuất</h3>
          <p className="mt-1 text-xs text-latte-400">
            Từ file &quot;{reviewUpload.fileName}&quot; — Dã Quỳ đề xuất {topics.length} topic. Bỏ chọn, sửa
            nội dung/category rồi bấm &quot;Duyệt &amp; lưu&quot; để ghi vào database.
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {topics.length === 0 ? (
            <p className="text-sm text-latte-400">Không có topic nào được trích xuất.</p>
          ) : (
            topics.map((topic, index) => (
              <div
                key={index}
                className={`space-y-2 rounded-lg border p-3 ${
                  topic.include ? "border-latte-700 bg-latte-800/40" : "border-latte-700/50 bg-latte-900/40 opacity-50"
                }`}
              >
                <label className="flex items-center gap-2 text-xs font-semibold text-latte-200">
                  <input
                    type="checkbox"
                    checked={topic.include}
                    onChange={(e) => updateTopic(index, { include: e.target.checked })}
                  />
                  Thêm topic này
                </label>
                <input
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
                  value={topic.title}
                  onChange={(e) => updateTopic(index, { title: e.target.value })}
                />
                <textarea
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
                  rows={3}
                  value={topic.content}
                  onChange={(e) => updateTopic(index, { content: e.target.value })}
                />
                <select
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
                  value={topic.categoryId}
                  onChange={(e) => updateTopic(index, { categoryId: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
                  placeholder="Từ khóa, cách nhau bởi dấu phẩy"
                  value={topic.keywords.join(", ")}
                  onChange={(e) =>
                    updateTopic(index, { keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })
                  }
                />
              </div>
            ))
          )}
        </div>

        {error && (
          <div className="mx-6 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-latte-700 p-6">
          <span className="font-mono text-xs text-latte-400">{includedCount}/{topics.length} sẽ được lưu</span>
          <div className="flex gap-3">
            <button
              onClick={handleCancelClick}
              disabled={saving || cancelling}
              className="rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-200 hover:bg-latte-800 disabled:opacity-50"
            >
              {cancelling ? "Đang hủy..." : "Hủy tài liệu"}
            </button>
            <button
              onClick={handleApproveClick}
              disabled={saving || cancelling || includedCount === 0}
              className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Duyệt & lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
