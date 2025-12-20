// src/pages/doctor/DoctorSettings.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import http from "../../services/http";

function normalizeUsPhoneDigits(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

export default function DoctorSettings() {
  const { user: ctxUser } = useAuth();
  const localUser = authService.getCurrentUser?.() || {};
  const currentUser = ctxUser || localUser || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [doctorId, setDoctorId] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: currentUser?.email || "",
    phoneNumber: "",
    specialization: "",
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const res = await http.get("/doctors/me");
        const me = res?.data?.data || res?.data || {};

        if (!mounted) return;

        setDoctorId(me.id);
        const email = currentUser?.email || me?.user?.email || "";

        setForm({
          firstName: me.firstName || "",
          lastName: me.lastName || "",
          email,
          phoneNumber: normalizeUsPhoneDigits(me.phoneNumber || ""),
          specialization: me.specialization || "",
        });
      } catch (e) {
        console.error("Failed to load doctor profile", e);
        alert(
          e?.response?.data?.message ||
            e.message ||
            "Failed to load your profile"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  const onChangeField = (e) => {
    const { name, value } = e.target;
    if (name === "phoneNumber") {
      setForm((prev) => ({
        ...prev,
        phoneNumber: normalizeUsPhoneDigits(value),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!doctorId) return;

    if (form.phoneNumber && form.phoneNumber.length !== 10) {
      alert("Please enter a valid 10-digit US work number.");
      return;
    }

    try {
      setSaving(true);

      await http.put(`/doctors/${doctorId}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber ? `+1${form.phoneNumber}` : null,
        specialization: form.specialization,
      });

      alert("Profile updated");
    } catch (e) {
      console.error("Failed to update doctor profile", e);
      alert(
        e?.response?.data?.message ||
          e.message ||
          "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const onChangePw = async (e) => {
    e.preventDefault();
    if (!pw.next || pw.next !== pw.confirm) {
      alert("New passwords do not match");
      return;
    }

    try {
      setChangingPw(true);
      await authService.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      alert("Password updated");
    } catch (e) {
      console.error("Failed to change password", e);
      alert(
        e?.response?.data?.message ||
          e.message ||
          "Failed to change password"
      );
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-slate-900">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-xl">
            Manage your professional profile and sign-in details for the doctor
            portal.
          </p>
        </div>
      </div>

      {/* Personal Info */}
      <section className="card-soft p-6 sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Profile information
          </h2>
          <p className="text-sm text-slate-500">
            Keep your contact details and specialty current so patients see the
            right information.
          </p>
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : (
          <form
            onSubmit={onSave}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                First name
              </label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={onChangeField}
                className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                placeholder="First name"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last name
              </label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={onChangeField}
                className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                placeholder="Last name"
                autoComplete="family-name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                readOnly
                className="input w-full bg-slate-50 focus:ring-[var(--ring-soft)] focus:border-sky-300"
                placeholder="name@example.com"
                autoComplete="email"
              />
              <p className="mt-1 text-xs text-slate-500">
                Email is managed by your administrator and cannot be changed
                here.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Work phone
              </label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700">
                  +1
                </span>
                <input
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={onChangeField}
                  className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                  placeholder="10-digit US work number"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={10}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Shown on your profile and appointment details.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Specialization
              </label>
              <input
                name="specialization"
                value={form.specialization}
                onChange={onChangeField}
                className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                placeholder="e.g. Cardiology, Orthopedics"
                autoComplete="off"
              />
            </div>

            <div className="md:col-span-2 mt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-soft)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Change Password */}
      <section className="card-soft p-6 sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Change password
          </h2>
          <p className="text-sm text-slate-500">
            Use a strong password that you do not reuse on other sites.
          </p>
        </div>

        <form
          onSubmit={onChangePw}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
        >
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Current password
            </label>
            <input
              type="password"
              name="current"
              value={pw.current}
              onChange={(e) =>
                setPw((prev) => ({ ...prev, current: e.target.value }))
              }
              className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
              placeholder="Current password"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New password
            </label>
            <input
              type="password"
              name="next"
              value={pw.next}
              onChange={(e) =>
                setPw((prev) => ({ ...prev, next: e.target.value }))
              }
              className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
              placeholder="New password"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              name="confirm"
              value={pw.confirm}
              onChange={(e) =>
                setPw((prev) => ({ ...prev, confirm: e.target.value }))
              }
              className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>

          <div className="md:col-span-2 mt-2">
            <button
              type="submit"
              disabled={changingPw}
              className="px-4 py-2 rounded-lg bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-soft)] disabled:opacity-60"
            >
              {changingPw ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
