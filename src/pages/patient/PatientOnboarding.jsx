// src/pages/patient/PatientOnboarding.jsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { patientService } from "../../services/patientService";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

function normalizeUsPhoneDigits(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    required_error: "Gender is required",
  }),
  phoneNumber: z
    .string()
    .min(1, "Mobile number is required")
    .transform((val) => normalizeUsPhoneDigits(val))
    .refine(
      (digits) => digits.length === 10,
      "Enter a valid 10-digit US mobile number"
    ),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergyPreset: z.string().optional(),
  allergyNotes: z.string().optional(),
  emergencyContact: z.string().optional(),
});

const BLOOD_GROUPS = [
  "",
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

const ALLERGY_PRESETS = [
  "",
  "None",
  "Penicillin",
  "Peanuts",
  "Eggs",
  "Seafood",
  "Dust",
  "Pollen",
  "Other",
];

export default function PatientOnboarding() {
  const navigate = useNavigate();
  const { user: ctxUser } = useAuth();
  const authUser = ctxUser || authService.getCurrentUser() || {};

  const signedInId = authUser.username || authUser.email || "";

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
      dateOfBirth: "",
      gender: "OTHER",
      phoneNumber: "",
      address: "",
      bloodGroup: "",
      allergyPreset: "",
      allergyNotes: "",
      emergencyContact: "",
    },
  });

  const allergyPreset = watch("allergyPreset");

  // Prefill from existing patient profile or from auth user
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await patientService.meOrNull();

        if (!mounted) return;

        if (me) {
          if (me.firstName) setValue("firstName", me.firstName);
          if (me.lastName) setValue("lastName", me.lastName);
          if (me.dateOfBirth) {
            const d = new Date(me.dateOfBirth);
            const iso = d.toISOString().slice(0, 10);
            setValue("dateOfBirth", iso);
          }
          if (me.gender) setValue("gender", String(me.gender).toUpperCase());
          if (me.phoneNumber) {
            setValue("phoneNumber", normalizeUsPhoneDigits(me.phoneNumber));
          }
          if (me.address) setValue("address", me.address);
          if (me.bloodGroup) setValue("bloodGroup", me.bloodGroup);
          if (me.allergies) {
            setValue("allergyNotes", me.allergies);
          }
          if (me.emergencyContact) {
            setValue("emergencyContact", me.emergencyContact);
          }
          return;
        }

        if (authUser && !me) {
          if (!watch("firstName") && authUser.username) {
            setValue("firstName", authUser.username);
          }
        }
      } catch {
        // Ignore errors and allow manual entry
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setValue]);

  const onSubmit = async (form) => {
    try {
      let allergies = "";

      if (form.allergyPreset === "Other") {
        allergies = form.allergyNotes || "";
      } else if (form.allergyPreset) {
        allergies = form.allergyPreset;
        if (form.allergyNotes) {
          allergies = `${allergies} - ${form.allergyNotes}`;
        }
      } else {
        allergies = form.allergyNotes || "";
      }

      await patientService.onboard({
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        phoneNumber: form.phoneNumber ? `+1${form.phoneNumber}` : null,
        address: form.address || null,
        bloodGroup: form.bloodGroup || null,
        allergies: allergies || null,
        emergencyContact: form.emergencyContact || null,
      });

      toast.success("Profile completed. Welcome to your dashboard.");
      navigate("/patient/dashboard", { replace: true });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Unable to save profile. Please try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[30px] sm:text-[32px] font-extrabold tracking-tight text-gray-900">
            Complete your profile
          </h1>
          <p className="mt-2 text-sm sm:text-[15px] text-gray-600">
            We will use this information to help your care team treat you
            safely. You can update it later from Account Settings.
          </p>
        </div>

        {signedInId && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-sky-800">
            <p className="font-semibold">Signed in as</p>
            <p className="mt-1 font-mono text-[12px] break-all">
              {signedInId}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <Input
                placeholder="Enter your first name"
                autoComplete="given-name"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <Input
                placeholder="Enter your last name"
                autoComplete="family-name"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Date, gender, blood group */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of birth
              </label>
              <Input type="date" autoComplete="bday" {...register("dateOfBirth")} />
              {errors.dateOfBirth && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.dateOfBirth.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select className="input h-11" {...register("gender")}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.gender.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood group
              </label>
              <select className="input h-11" {...register("bloodGroup")}>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg || "blank"} value={bg}>
                    {bg === "" ? "Select blood group" : bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact and address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile number
            </label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700">
                +1
              </span>
              <Input
                placeholder="10-digit US mobile number"
                inputMode="tel"
                autoComplete="tel"
                maxLength={10}
                {...register("phoneNumber", {
                  onChange: (e) => {
                    e.target.value = normalizeUsPhoneDigits(e.target.value);
                  },
                })}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              US numbers only, digits only. We use this to contact you about appointments.
            </p>
            {errors.phoneNumber && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Home address
            </label>
            <textarea
              rows={3}
              className="input py-2 resize-none"
              placeholder="Street, city, state, ZIP"
              autoComplete="street-address"
              {...register("address")}
            />
          </div>

          {/* Allergies and emergency contact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergies
                </label>
                <select className="input h-11" {...register("allergyPreset")}>
                  {ALLERGY_PRESETS.map((opt) => (
                    <option key={opt || "blank"} value={opt}>
                      {opt === "" ? "Select an option" : opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Allergy details (optional)
                </label>
                <textarea
                  rows={3}
                  className="input py-2 resize-none"
                  placeholder={
                    allergyPreset === "Other"
                      ? "Describe your allergy in detail"
                      : "Add extra details if needed"
                  }
                  {...register("allergyNotes")}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency contact
              </label>
              <textarea
                rows={4}
                className="input py-2 resize-none"
                placeholder="Name, relationship, phone number"
                {...register("emergencyContact")}
              />
            </div>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
            <p className="text-xs text-gray-500 max-w-md">
              By continuing, you confirm that the above information is accurate
              to the best of your knowledge. You can update it later from your
              Account Settings.
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
