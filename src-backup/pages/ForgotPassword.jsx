// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { FiUser, FiArrowLeft, FiShield } from "react-icons/fi";

import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { authService } from "../services/authService";

export default function ForgotPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const navigate = useNavigate();

  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");

  const onSubmit = async (values) => {
    setApiError("");
    setApiSuccess("");

    const identifier = (values.identifier || "").trim();
    if (!identifier) {
      setApiError("Please enter your username or email.");
      return;
    }

    try {
      const res = await authService.requestPasswordReset(identifier);

      const message =
        res?.message ||
        "If we find an account matching these details, we will send reset instructions.";
      setApiSuccess(message);
      toast.success("If your account exists, reset instructions have been sent.");

      // Immediately redirect to the reset page in dev using the shortcut URL
      if (res?.debug?.resetUrl) {
        try {
          const url = new URL(res.debug.resetUrl);
          const path = url.pathname + url.search;
          navigate(path);
        } catch {
          // Fallback: full redirect if parsing fails for some reason
          window.location.href = res.debug.resetUrl;
        }
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "We could not process your request. Please try again.";
      setApiError(msg);
      toast.error("Unable to start password reset. Please try again.");
    }
  };

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
                Forgot password
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Enter your username or email, and we will help you reset your
                password.
              </p>
            </div>
          </div>

          {apiError && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
              <p className="font-medium">Unable to start reset</p>
              <p className="mt-1">{apiError}</p>
            </div>
          )}

          {apiSuccess && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-800">
              <p className="font-medium">Check your email</p>
              <p className="mt-1">{apiSuccess}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username or email
              </label>
              <Input
                placeholder="Enter the username or email on your account"
                leftIcon={<FiUser size={18} />}
                autoComplete="username"
                {...register("identifier", {
                  required: "Please enter your username or email",
                })}
              />
              {errors.identifier && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              For security, we will not tell you whether an account exists. If
              the details match an account, we will send reset instructions.
            </p>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Checking..." : "Reset password"}
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

        <p className="mt-4 text-center text-[11px] text-slate-400">
          If you did not request a reset, you can ignore the email if it arrives.
        </p>
      </div>
    </div>
  );
}
