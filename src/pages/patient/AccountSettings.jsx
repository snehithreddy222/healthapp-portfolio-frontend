// src/pages/patient/AccountSettings.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { patientService } from "../../services/patientService";

function normalizeUsPhoneDigits(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

export default function AccountSettings() {
  const { user: ctxUser } = useAuth();
  const localUser = authService.getCurrentUser?.() || {};
  const currentUser = ctxUser || localUser || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [patientId, setPatientId] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: currentUser?.email || "",
    phoneNumber: "",
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const me = await patientService.me();
        setPatientId(me.id);
        const email = currentUser?.email || me?.user?.email || "";
        setForm({
          firstName: me.firstName || "",
          lastName: me.lastName || "",
          email,
          phoneNumber: normalizeUsPhoneDigits(me.phoneNumber || ""),
        });
      } catch (e) {
        console.error(e);
        alert(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.email]);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "phoneNumber") {
      setForm((f) => ({ ...f, phoneNumber: normalizeUsPhoneDigits(value) }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!patientId) return;

    if (form.phoneNumber && form.phoneNumber.length !== 10) {
      alert("Please enter a valid 10-digit US mobile number.");
      return;
    }

    try {
      setSaving(true);
      await patientService.updateSelf(patientId, {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber ? `+1${form.phoneNumber}` : null,
      });
      alert("Profile updated");
    } catch (e) {
      alert(e.message || "Failed to update profile");
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
      alert(e.message || "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-[960px] px-2 sm:px-4 py-6">
      <h1 className="text-[28px] font-bold tracking-tight text-gray-900 mb-4">
        Account Settings
      </h1>

      {/* Personal Info */}
      <section className="card-soft p-6 mb-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Personal information
          </h2>
          <p className="text-sm text-gray-500">
            Keep your profile details up to date so your care team can reach you.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <form
            onSubmit={onSave}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={onChange}
                className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                placeholder="First name"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={onChange}
                className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                placeholder="Last name"
                autoComplete="family-name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                readOnly
                className="input w-full bg-gray-50 focus:ring-[var(--ring-soft)] focus:border-sky-300"
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile number
              </label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700">
                  +1
                </span>
                <input
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={onChange}
                  className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                  placeholder="10-digit US mobile number"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={10}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Used for appointment reminders and important notifications.
              </p>
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
      <section className="card-soft p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Change password
          </h2>
          <p className="text-sm text-gray-500">
            Use a strong password that you do not reuse on other sites.
          </p>
        </div>

        <form
          onSubmit={onChangePw}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              type="password"
              name="current"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
              placeholder="Current password"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              type="password"
              name="next"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              className="input w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
              placeholder="New password"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              name="confirm"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
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
