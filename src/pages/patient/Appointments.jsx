// src/pages/patient/PatientAppointments.jsx
import React, { useEffect, useState, useCallback } from "react";
import { FiPlus, FiRefreshCw, FiXCircle, FiFileText } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import DateBadge from "../../components/common/DateBadge";
import SectionCard from "../../components/common/SectionCard";
import { appointmentService } from "../../services/appointmentService";
import { useAuth } from "../../context/AuthContext";

export default function PatientAppointments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [upcomingList, setUpcomingList] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p] = await Promise.all([
        appointmentService.listUpcoming(),
        appointmentService.listPast(),
      ]);
      setUpcomingList(u);
      setPast(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.token) load();
  }, [user?.token, load]);

  const onCancel = async (id) => {
    await appointmentService.cancel(id);
    await load();
  };

  const primaryCtaClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-[15px] font-semibold text-white shadow-sm hover:from-sky-700 hover:via-sky-600 hover:to-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 focus-visible:ring-offset-sky-50 transition-transform duration-150 active:scale-[0.97]";

  const secondaryCtaClasses =
    "inline-flex items-center justify-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/80 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-sky-700 hover:bg-sky-100 hover:border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 focus-visible:ring-offset-1 focus-visible:ring-offset-sky-50 transition-transform duration-150 active:scale-[0.98]";

  const dangerCtaClasses =
    "inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/90 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-rose-600 hover:bg-rose-100 hover:border-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/80 focus-visible:ring-offset-1 focus-visible:ring-offset-rose-50 transition-transform duration-150 active:scale-[0.98]";

  const tertiaryCtaClasses =
    "inline-flex items-center justify-center gap-1.5 rounded-full border border-sky-100 bg-sky-50/80 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-sky-700 hover:bg-sky-100 hover:border-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 focus-visible:ring-offset-1 focus-visible:ring-offset-sky-50 transition-transform duration-150 active:scale-[0.98]";

  const renderUpcomingContent = () => {
    if (loading) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Loading your appointments
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Fetching your care schedule from the clinic.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-24 animate-pulse rounded-full bg-gray-100" />
              <div className="h-9 w-28 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-10 rounded-xl bg-gray-100 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3 w-36 rounded-full bg-gray-100 animate-pulse" />
                    <div className="h-3 w-52 rounded-full bg-gray-100 animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-20 rounded-full bg-gray-100 animate-pulse" />
                  <div className="h-8 w-20 rounded-full bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!upcomingList.length) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-gray-900">
                No upcoming appointments
              </p>
              <p className="mt-1 text-sm text-gray-600 max-w-xl">
                You do not have any visits scheduled yet. Book your next
                appointment to stay on top of your care.
              </p>
            </div>
            <button
              onClick={() => navigate("/patient/appointments/new")}
              className={primaryCtaClasses}
            >
              <FiPlus className="text-[16px]" />
              <span>Schedule appointment</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            You have{" "}
            <span className="font-semibold text-gray-900">
              {upcomingList.length}
            </span>{" "}
            upcoming appointment
            {upcomingList.length > 1 ? "s" : ""}.
          </p>
          <p className="text-xs text-gray-500">
            Need to make changes? You can reschedule or cancel from here.
          </p>
        </div>

        <div
          className="divide-y rounded-2xl border border-gray-100 bg-white shadow-sm"
          style={{ borderColor: "var(--divider)" }}
        >
          {upcomingList.map((a) => {
            const badge = appointmentService.toBadge(a.date);
            return (
              <div
                key={a.id}
                className="py-4 px-4 sm:px-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <DateBadge mon={badge.mon} day={badge.day} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-gray-900">
                        {a.title}
                      </div>
                      {a.status && (
                        <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                          {a.status}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {a.time && (
                        <span className="font-medium text-gray-900">
                          {a.time}
                        </span>
                      )}
                      {a.time && (a.clinicianName || a.specialty) ? " · " : ""}
                      {a.clinicianName && (
                        <span>
                          with{" "}
                          <span className="font-medium text-gray-900">
                            {a.clinicianName}
                          </span>
                        </span>
                      )}
                      {a.clinicianName && a.specialty ? " · " : ""}
                      {a.specialty && (
                        <span className="text-gray-500">{a.specialty}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() =>
                      navigate("/patient/appointments/new", {
                        state: { mode: "reschedule", appointmentId: a.id },
                      })
                    }
                    className={secondaryCtaClasses}
                  >
                    <FiRefreshCw className="text-[14px]" />
                    <span>Reschedule</span>
                  </button>
                  <button
                    onClick={() => onCancel(a.id)}
                    className={dangerCtaClasses}
                  >
                    <FiXCircle className="text-[14px]" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPastContent = () => {
    if (!past.length) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 sm:px-6">
          <p className="text-sm font-medium text-gray-800">
            No past appointments
          </p>
          <p className="mt-1 text-sm text-gray-500 max-w-xl">
            Once you complete visits, you will see a history of your past
            appointments here along with links to summaries.
          </p>
        </div>
      );
    }

    return (
      <div
        className="divide-y rounded-2xl border border-gray-100 bg-white shadow-sm"
        style={{ borderColor: "var(--divider)" }}
      >
        {past.map((a) => {
          const badge = appointmentService.toBadge(a.date);
          return (
            <div
              key={a.id}
              className="py-4 px-4 sm:px-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4">
                <DateBadge mon={badge.mon} day={badge.day} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-gray-900">
                      {a.title}
                    </div>
                    {a.status && (
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-700">
                        {a.status}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {a.time && (
                      <span className="font-medium text-gray-900">
                        {a.time}
                      </span>
                    )}
                    {a.time && (a.clinicianName || a.specialty) ? " · " : ""}
                    {a.clinicianName && (
                      <span>
                        with{" "}
                        <span className="font-medium text-gray-900">
                          {a.clinicianName}
                        </span>
                      </span>
                    )}
                    {a.clinicianName && a.specialty ? " · " : ""}
                    {a.specialty && (
                      <span className="text-gray-500">{a.specialty}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end">
                <button className={tertiaryCtaClasses}>
                  <FiFileText className="text-[14px]" />
                  <span>View visit summary</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-full">
      <div className="appbar bg-transparent border-0 h-auto">
        <div className="appbar-inner px-0 max-w-none">
          <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-gray-900">
                Your appointments
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                Review upcoming visits, look back at past appointments, and make
                quick changes when your plans shift.
              </p>
            </div>
            <button
              onClick={() => navigate("/patient/appointments/new")}
              className={primaryCtaClasses}
            >
              <FiPlus className="text-[18px]" />
              <span>Schedule new appointment</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl mt-6 space-y-6 px-1 sm:px-0">
        <SectionCard title="Upcoming appointments">
          {renderUpcomingContent()}
        </SectionCard>

        <SectionCard title="Past appointments">
          {renderPastContent()}
        </SectionCard>
      </div>
    </div>
  );
}
