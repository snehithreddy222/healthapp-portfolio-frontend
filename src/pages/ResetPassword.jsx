// src/pages/ResetPassword.jsx
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { FiLock, FiShield, FiArrowLeft } from "react-icons/fi";

import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { authService } from "../services/authService";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm();

  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");

  const newPasswordValue = watch("newPassword") || "";

  const onSubmit = async (values) => {
    setApiError("");
    setApiSuccess("");

    if (!token) {
      setApiError("This reset link is invalid or has expired.");
      return;
    }

    if (values.newPassword !== values.confirmPassword) {
      setApiError("New password and confirmation do not match.");
      return;
    }

    try {
      const res = await authService.resetPassword(token, values.newPassword);
      const message =
        res?.message ||
        "Your password has been reset. You can now sign in with your new password.";

      setApiSuccess(message);
      toast.success("Password reset successfully.");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "We could not reset your password. Please try again.";
      setApiError(msg);
      toast.error("Unable to reset password.");
    }
  };

  const tokenMissing = !token;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <Toaster position="top-right" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-900/70 via-slate-950 to-transparent" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs text-sky-200 hover:text-white"
          >
            <FiArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-white/10 border border-white/30 grid place-items-center">
              <div className="h-4 w-4 rounded-md bg-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              HealthApp
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white/98 text-slate-900 border border-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.45)] px-6 sm:px-8 py-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-sky-100 text-sky-700 grid place-items-center">
              <FiShield size={18} />
            </div>
            <div>
              <h1 className="text-[22px] sm:text-[24px] font-extrabold text-slate-900">
                Set a new password
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Choose a strong password that you have not used here before.
              </p>
            </div>
          </div>

          {tokenMissing && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
              <p className="font-medium">Invalid reset link</p>
              <p className="mt-1">
                This reset link is missing or has expired. Please request a new
                reset link from the{" "}
                <Link
                  to="/forgot-password"
                  className="text-rose-900 underline font-medium"
                >
                  Forgot password
                </Link>{" "}
                page.
              </p>
            </div>
          )}

          {apiError && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
              <p className="font-medium">Unable to reset password</p>
              <p className="mt-1">{apiError}</p>
            </div>
          )}

          {apiSuccess && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-800">
              <p className="font-medium">Password reset successful</p>
              <p className="mt-1">
                You will be redirected to the sign-in page shortly.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                New password
              </label>
              <Input
                type="password"
                placeholder="Enter a new password"
                leftIcon={<FiLock size={18} />}
                autoComplete="new-password"
                disabled={tokenMissing}
                {...register("newPassword", {
                  required: "Please enter a new password",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
              {newPasswordValue && newPasswordValue.length < 8 && (
                <p className="mt-1 text-xs text-amber-600">
                  Use at least 8 characters for better security.
                </p>
              )}
              {errors.newPassword && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm new password
              </label>
              <Input
                type="password"
                placeholder="Re-enter your new password"
                leftIcon={<FiLock size={18} />}
                autoComplete="new-password"
                disabled={tokenMissing}
                {...register("confirmPassword", {
                  required: "Please confirm your new password",
                })}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || tokenMissing}
              className="w-full"
            >
              {isSubmitting ? "Updating password..." : "Update password"}
            </Button>

            <p className="text-center text-xs sm:text-sm text-slate-600">
              Remembered your password{" "}
              <Link
                to="/login"
                className="text-sky-700 font-medium hover:underline"
              >
                Go back to sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
