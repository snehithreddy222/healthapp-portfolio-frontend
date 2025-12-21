// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  FiUser,
  FiLock,
  FiShield,
  FiCalendar,
  FiMessageSquare,
  FiHeart,
  FiActivity,
} from "react-icons/fi";

import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import { patientService } from "../services/patientService";

const LAST_USERNAME_KEY = "lastLoginUsername";

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm();

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState("");

  const usernameValue = watch("username") || "";

  useEffect(() => {
    const fromState = location.state?.username;
    const fromStorage = localStorage.getItem(LAST_USERNAME_KEY);
    const initial = fromState || fromStorage || "";
    if (initial) {
      setValue("username", initial);
    }
  }, [location.state, setValue]);

  const onSubmit = async (data) => {
    setAuthError("");

    try {
      const identifier = (data.username || "").trim();

      const out = await login({
        username: identifier,
        password: data.password,
      });

      if (!out?.success) {
        const msg =
          out?.message ||
          "Incorrect username or password. Please check your details.";
        setAuthError(
          "Incorrect username or password. Please check your details and try again."
        );
        toast.error(msg);
        return;
      }

      if (identifier) {
        localStorage.setItem(LAST_USERNAME_KEY, identifier);
      }

      const role = out?.data?.role;
      const patientId = out?.data?.patientId || null;
      const doctorId = out?.data?.doctorId || null;

      if (role === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      if (role === "DOCTOR") {
        if (!doctorId) {
          navigate("/doctor/onboarding", { replace: true });
        } else {
          navigate("/doctor/dashboard", { replace: true });
        }
        return;
      }

      if (role === "PATIENT") {
        try {
          const me = await patientService.meOrNull();
          if (!me || !me.id || !patientId) {
            navigate("/patient/onboarding", { replace: true });
          } else {
            navigate("/patient/dashboard", { replace: true });
          }
        } catch {
          if (!patientId) {
            navigate("/patient/onboarding", { replace: true });
          } else {
            navigate("/patient/dashboard", { replace: true });
          }
        }
        return;
      }

      navigate("/patient/dashboard", { replace: true });
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Unable to sign in.";
      setAuthError(
        "We could not sign you in. Please check your username or password and try again."
      );
      toast.error(msg);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col lg:grid lg:grid-cols-2 relative overflow-hidden">
      <Toaster position="top-right" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-sky-900/70 via-slate-950 to-transparent" />
      </div>

      <section className="relative hidden lg:flex items-center justify-center px-10">
        <div className="absolute inset-4 rounded-3xl border border-white/10 bg-gradient-to-br from-sky-900/80 via-slate-950/90 to-slate-950/95 backdrop-blur-xl" />

        <div className="relative z-10 w-full max-w-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/30 grid place-items-center">
                <div className="h-5 w-5 rounded-lg bg-white" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">HealthApp</p>
                <p className="text-[11px] text-sky-200/80">
                  Patient and clinician portal
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center justify-center px-3 h-7 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600 whitespace-nowrap">
              HealthCare portal
            </span>
          </div>

          <div className="mb-7">
            <p className="text-[11px] uppercase tracking-[0.2em] text-sky-300/80 mb-2">
              Your digital front door
            </p>
            <h1 className="text-3xl lg:text-[34px] font-extrabold leading-tight text-slate-50">
              Manage your care in one modern, secure place.
            </h1>
            <p className="mt-3 text-sm text-sky-100/90 max-w-md">
              Check upcoming visits, message, review results, and handle bills in one app.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 text-[11px] text-sky-50">
            <div className="rounded-2xl bg-white/5 border border-sky-400/30 px-3 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-7 w-7 rounded-full bg-sky-500/70 grid place-items-center">
                  <FiCalendar size={14} />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100/90">
                  Visits
                </p>
              </div>
              <p className="text-xs font-semibold">Appointments and schedules.</p>
              <p className="mt-1 text-[11px] text-sky-100/80">
                Patients and doctors see role based views.
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-sky-300/30 px-3 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-7 w-7 rounded-full bg-sky-500/70 grid place-items-center">
                  <FiMessageSquare size={14} />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100/90">
                  Messages
                </p>
              </div>
              <p className="text-xs font-semibold">Secure communication.</p>
              <p className="mt-1 text-[11px] text-sky-100/80">
                Message threads respect access control.
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-sky-300/30 px-3 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-7 w-7 rounded-full bg-sky-500/70 grid place-items-center">
                  <FiHeart size={14} />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100/90">
                  Results
                </p>
              </div>
              <p className="text-xs font-semibold">Labs and reports.</p>
              <p className="mt-1 text-[11px] text-sky-100/80">
                Doctors and patients see only what they should.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-sky-100/80">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/10 border border-emerald-400/60 text-emerald-200">
                <FiActivity size={14} />
              </span>
              <p>We monitor unusual sign-ins to help keep accounts safe.</p>
            </div>
          </div>
        </div>
      </section>

      <header className="lg:hidden px-6 pt-7 pb-5 relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-white/10 border border-white/30 grid place-items-center">
            <div className="h-4 w-4 rounded-md bg-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">HealthApp</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="text-sm text-sky-100 mt-1 max-w-md">
          Sign in to access your account.
        </p>
      </header>

      <section className="flex items-center justify-center px-6 pb-8 pt-2 sm:pt-4 md:pt-6 md:px-10 md:pb-10 relative">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white/98 text-slate-900 border border-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.45)] px-6 sm:px-8 py-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-sky-100 text-sky-700 grid place-items-center">
                  <FiShield size={18} />
                </div>
                <div>
                  <h2 className="text-[22px] sm:text-[24px] font-extrabold text-slate-900">
                    Secure sign in
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Enter your details to access your HealthApp account.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center justify-center px-3 h-7 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                HealthCare portal
              </span>
            </div>

            {authError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
                <p className="font-medium">Unable to sign in</p>
                <p className="mt-1">{authError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-3" noValidate>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username
                </label>
                <Input
                  placeholder="Enter your username"
                  leftIcon={<FiUser size={18} />}
                  autoComplete="username"
                  {...register("username", {
                    required: "Username is required",
                  })}
                />
                {usernameValue && (
                  <p className="mt-1 text-xs text-slate-500">
                    Signing in as{" "}
                    <span className="font-mono text-slate-800">{usernameValue}</span>.
                  </p>
                )}
                {errors.username && (
                  <p className="mt-1 text-xs text-rose-600">{errors.username.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs font-medium text-sky-700 hover:underline"
                  >
                    Forgot password
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  leftIcon={<FiLock size={18} />}
                  autoComplete="current-password"
                  {...register("password", {
                    required: "Password is required",
                  })}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
                )}
              </div>

              <div className="pt-1">
                <div className="h-[6px] w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-[90%] bg-gradient-to-r from-emerald-500 to-sky-500" />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border-2 border-emerald-500 text-emerald-600 bg-emerald-50">
                    <FiShield size={13} />
                  </span>
                  <span>Your connection is encrypted. Do not share your login.</span>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full mt-1">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Need an account{" "}
                <Link to="/register" className="text-sky-700 font-medium hover:underline">
                  Create an account
                </Link>
              </p>

              <div className="pt-4 text-center text-[11px] text-slate-400">
                © {year} HealthApp Inc.{" "}
                <button type="button" className="hover:underline">
                  Privacy Policy
                </button>{" "}
                ·{" "}
                <button type="button" className="hover:underline">
                  Terms of Service
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
