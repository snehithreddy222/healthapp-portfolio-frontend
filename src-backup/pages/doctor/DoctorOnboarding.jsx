// src/pages/doctor/DoctorOnboarding.jsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { doctorService } from "../../services/doctorService";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";

const schema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  specialization: z.string().min(1, "Specialization required"),
  licenseNumber: z.string().min(1, "License number required"),
  phoneNumber: z.string().min(5, "Phone number required"),
  yearsExperience: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine(
      (v) => v === undefined || (!Number.isNaN(v) && v >= 0 && v <= 80),
      "Years of experience must be between 0 and 80"
    ),
});

const SPECIALTY_PRESETS = [
  "",
  "Primary Care",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Other",
];

export default function DoctorOnboarding() {
  const navigate = useNavigate();
  const { user: ctxUser } = useAuth();
  const authUser = ctxUser || authService.getCurrentUser() || {};
  const doctorIdDisplay = authUser.username
    ? `dr.${authUser.username}@healthapp`
    : authUser.email || "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      specialization: "",
      licenseNumber: "",
      phoneNumber: "",
      yearsExperience: "",
    },
  });

  const specializationPreset = watch("specialization");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await doctorService.meOrNull();
        if (!mounted || !me) return;

        if (me.firstName) setValue("firstName", me.firstName);
        if (me.lastName) setValue("lastName", me.lastName);
        if (me.specialization) {
          setValue("specialization", me.specialization);
        }
        if (me.licenseNumber) setValue("licenseNumber", me.licenseNumber);
        if (me.phoneNumber) setValue("phoneNumber", me.phoneNumber);
        if (typeof me.yearsExperience === "number") {
          setValue("yearsExperience", String(me.yearsExperience));
        }
      } catch {
      }
    })();

    return () => {
      mounted = false;
    };
  }, [setValue]);

  const onSubmit = async (form) => {
    try {
      await doctorService.onboard({
        firstName: form.firstName,
        lastName: form.lastName,
        specialization: form.specialization,
        licenseNumber: form.licenseNumber,
        phoneNumber: form.phoneNumber,
        yearsExperience:
          typeof form.yearsExperience === "number"
            ? form.yearsExperience
            : undefined,
      });

      toast.success("Profile saved. Welcome to your doctor dashboard.");
      navigate("/doctor/dashboard", { replace: true });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Unable to save profile. Please try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-slate-900">
            Complete your doctor profile
          </h1>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            Tell patients who you are and what you specialise in. You can
            update these details later from account settings.
          </p>
        </div>

        {doctorIdDisplay && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-indigo-800">
            <p className="font-semibold">Your provider ID</p>
            <p className="mt-1 font-mono text-[12px] break-all">
              {doctorIdDisplay}
            </p>
          </div>
        )}
      </div>

      {/* Form card */}
      <div className="card-soft mt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                First name
              </label>
              <Input
                placeholder="Enter your first name"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last name
              </label>
              <Input
                placeholder="Enter your last name"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Specialization and license */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Specialization
              </label>
              <select className="input h-11" {...register("specialization")}>
                {SPECIALTY_PRESETS.map((opt) => (
                  <option key={opt || "blank"} value={opt}>
                    {opt === "" ? "Select specialization" : opt}
                  </option>
                ))}
              </select>
              {errors.specialization && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.specialization.message}
                </p>
              )}
              {specializationPreset === "Other" && (
                <p className="mt-1 text-xs text-slate-500">
                  You can refine your exact specialty in your profile bio later.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                License number
              </label>
              <Input
                placeholder="e.g. IL 123456"
                {...register("licenseNumber")}
              />
              {errors.licenseNumber && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.licenseNumber.message}
                </p>
              )}
            </div>
          </div>

          {/* Contact and experience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Work phone
              </label>
              <Input
                placeholder="Enter a contact number"
                {...register("phoneNumber")}
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Years of experience
              </label>
              <Input
                type="number"
                min="0"
                max="80"
                placeholder="e.g. 5"
                {...register("yearsExperience")}
              />
              {errors.yearsExperience && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.yearsExperience.message}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
            <p className="text-xs text-slate-500 max-w-md">
              Patients will see your name, specialization, and contact details
              on appointments and messages. Please keep them accurate and up to
              date.
            </p>
            <Button type="submit" className="px-6" disabled={isSubmitting}>
              {isSubmitting ? "Saving profile..." : "Save and continue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
