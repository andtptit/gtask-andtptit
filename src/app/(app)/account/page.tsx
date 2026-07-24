"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/SubmitButton";

export default function AccountPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("different from the old")
          ? "Mật khẩu mới phải khác mật khẩu cũ."
          : error.message
      );
    } else {
      setOk(true);
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-bold">Tài khoản</h1>
      <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Đổi mật khẩu</h2>
        <div>
          <label className="label">Mật khẩu mới</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label">Nhập lại mật khẩu mới</label>
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {ok && (
          <p className="text-sm text-green-600">
            ✓ Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.
          </p>
        )}
        <button
          className={`btn-primary justify-center ${loading ? "pointer-events-none opacity-60" : ""}`}
          disabled={loading}
        >
          {loading && <Spinner />}
          {loading ? "Đang xử lý…" : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
}
