// src/pages/Register.jsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast, { Toaster } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiLock,
  FiShield,
  FiCalendar,
  FiMessageSquare,
  FiHeart,
  FiCreditCard,
} from "react-icons/fi";

import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { authService } from "../services/authService";

const LAST_USERNAME_KEY = "lastLoginUsername";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
    terms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms to continue" }),
    }),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export default function Register() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const usernameValue = watch("username") || "";

  const onSubmit = async (form) => {
    setApiError("");

    const payload = {
      username: form.username,
      email: form.email,
      password: form.password,
      // Public self-signup is always a PATIENT
      role: "PATIENT",
    };

    try {
      const out = await authService.register(payload);
      if (out?.success) {
        const last = form.username;

        toast.success("Account created successfully. Please sign in.");

        if (last) {
          localStorage.setItem(LAST_USERNAME_KEY, last);
        }

        navigate("/login", { state: { username: last } });
      } else {
        const msg = out?.message || "Registration failed. Please try again.";
        setApiError(msg);
        toast.error(msg);
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Unable to complete registration.";
      setApiError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-4 relative overflow-hidden">
      <Toaster position="top-right" />

      {/* Subtle background glows, kept tight */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-20 h-56 w-56 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute -bottom-28 -right-16 h-60 w-60 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-900/70 via-slate-950 to-transparent" />
      </div>

      <div className="relative w-full max-w-5xl">
        {/* Brand and heading row – compact */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white/10 border border-white/20 grid place-items-center">
              <div className="h-4 w-4 rounded-lg bg-white" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">HealthApp</p>
              <p className="text-[11px] text-slate-300">
                Secure patient portal
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex h-6 px-2 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/10 text-[11px] text-emerald-100">
            <FiShield className="mr-1" size={12} />
            Encrypted access
          </span>
        </div>

        <header className="mb-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-50">
            Create your patient account
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
            View records, manage appointments, message your care team, and pay
            bills in one secure place.
          </p>
        </header>

        {/* Main card kept shallow to avoid page scroll on normal screens */}
        <div className="bg-white/95 text-slate-900 rounded-3xl border border-slate-200/80 shadow-[0_20px_60px_rgba(15,23,42,0.55)] overflow-hidden">
          {/* Clinician banner – low height, clear message */}
          <div className="px-4 sm:px-6 pt-4">
            <div className="mb-3 rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-xl bg-sky-600 text-white grid place-items-center">
                  <FiShield size={14} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-sky-900 uppercase tracking-[0.16em]">
                    Clinician or staff
                  </p>
                  <p className="text-[11px] text-sky-800">
                    Doctors and staff do not sign up here. Use the main
                    organization sign-in page.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-4">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,3.2fr)_minmax(0,2.2fr)] items-stretch">
              {/* Form column */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {apiError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs sm:text-sm text-rose-800">
                      <p className="font-medium">
                        We could not create your account
                      </p>
                      <p className="mt-0.5">{apiError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                        First name
                      </label>
                      <Input
                        placeholder="Enter your first name"
                        leftIcon={<FiUser size={18} />}
                        autoComplete="given-name"
                        {...register("firstName")}
                      />
                      {errors.firstName && (
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          {errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                        Last name
                      </label>
                      <Input
                        placeholder="Enter your last name"
                        leftIcon={<FiUser size={18} />}
                        autoComplete="family-name"
                        {...register("lastName")}
                      />
                      {errors.lastName && (
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          {errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                      Email address
                    </label>
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      leftIcon={<FiMail size={18} />}
                      autoComplete="email"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                      Username
                    </label>
                    <Input
                      placeholder="Create a username"
                      leftIcon={<FiUser size={18} />}
                      autoComplete="username"
                      {...register("username")}
                    />
                    {usernameValue && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        You will use{" "}
                        <span className="font-mono text-slate-800">
                          {usernameValue}
                        </span>{" "}
                        to sign in.
                      </p>
                    )}
                    {errors.username && (
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        {errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                        Password
                      </label>
                      <Input
                        type="password"
                        placeholder="Create a password"
                        leftIcon={<FiLock size={18} />}
                        autoComplete="new-password"
                        {...register("password")}
                      />
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        At least 8 characters with letters and numbers.
                      </p>
                      {errors.password && (
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          {errors.password.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                        Confirm password
                      </label>
                      <Input
                        type="password"
                        placeholder="Confirm password"
                        leftIcon={<FiLock size={18} />}
                        autoComplete="new-password"
                        {...register("confirm")}
                      />
                      {errors.confirm && (
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          {errors.confirm.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      {...register("terms")}
                    />
                    <p className="text-xs sm:text-sm text-slate-600">
                      By creating an account, you agree to our{" "}
                      <button
                        type="button"
                        className="text-sky-700 underline-offset-2 hover:underline"
                      >
                        Terms of Service
                      </button>{" "}
                      and{" "}
                      <button
                        type="button"
                        className="text-sky-700 underline-offset-2 hover:underline"
                      >
                        Privacy Policy
                      </button>
                      .
                    </p>
                  </div>
                  {errors.terms && (
                    <p className="text-[11px] text-rose-600 -mt-1">
                      {errors.terms.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Creating account..."
                      : "Create patient account"}
                  </Button>
                  <p className="text-center text-xs sm:text-sm text-slate-600">
                    Already have an account{" "}
                    <Link
                      to="/login"
                      className="text-sky-700 font-medium hover:underline"
                    >
                      Log in
                    </Link>
                  </p>
                </div>
              </form>

              {/* Right column – compact feature snapshot */}
              <aside className="rounded-2xl bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 text-sky-50 px-4 py-4 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-sky-100/90 mb-1.5">
                    Why create an account
                  </p>
                  <h2 className="text-sm sm:text-base font-bold leading-snug">
                    A simple, modern home for your health information.
                  </h2>
                  <p className="mt-1.5 text-[11px] sm:text-xs text-sky-100/90">
                    Your dashboard keeps appointments, messages, results, and
                    bills in one clean view.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs">
                  <div className="rounded-xl bg-white/10 border border-white/25 px-2.5 py-2 flex items-start gap-2">
                    <span className="mt-0.5 h-7 w-7 rounded-full bg-sky-500/70 grid place-items-center">
                      <FiCalendar size={14} />
                    </span>
                    <div>
                      <p className="font-semibold">Visits</p>
                      <p className="text-sky-100/90">
                        See upcoming appointments and request new ones.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/10 border border-white/25 px-2.5 py-2 flex items-start gap-2">
                    <span className="mt-0.5 h-7 w-7 rounded-full bg-sky-500/70 grid place-items-center">
                      <FiMessageSquare size={14} />
                    </span>
                    <div>
                      <p className="font-semibold">Messages</p>
                      <p className="text-sky-100/90">
                        Send secure messages to your care team.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/10 border border-white/25 px-2.5 py-2 flex items-start gap-2">
                    <span className="mt-0.5 h-7 w-7 rounded-full bg-sky-500/70 grid place-items-center">
                      <FiHeart size={14} />
                    </span>
                    <div>
                      <p className="font-semibold">Results</p>
                      <p className="text-sky-100/90">
                        Review lab results as soon as they are released.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/10 border border-white/25 px-2.5 py-2 flex items-start gap-2">
                    <span className="mt-0.5 h-7 w-7 rounded-full bg-sky-500/70 grid place-items-center">
                      <FiCreditCard size={14} />
                    </span>
                    <div>
                      <p className="font-semibold">Billing</p>
                      <p className="text-sky-100/90">
                        Track statements and pay securely online.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] sm:text-xs text-sky-100/90">
                  <p className="font-medium mb-0.5">Designed for privacy</p>
                  <p>
                    We use encrypted connections and strict access controls so
                    only you and your care team can see your data.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
