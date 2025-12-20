// src/pages/patient/Billings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FiCreditCard, FiFileText } from "react-icons/fi";
import { format } from "date-fns";
import { billingService } from "../../services/billingService";

const StatusPill = ({ kind }) => {
  const map = {
    DUE: "bg-amber-50 text-amber-700 border border-amber-200",
    PAID: "bg-green-50 text-green-700 border border-green-200",
    CANCELED: "bg-gray-50 text-gray-600 border border-gray-200",
  };
  const label = { DUE: "Due", PAID: "Paid", CANCELED: "Canceled" }[kind] || kind;
  return (
    <span
      className={`px-2.5 h-6 inline-flex items-center rounded-full text-xs font-medium ${
        map[kind] || ""
      }`}
    >
      {label}
    </span>
  );
};

function dollars(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Billings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await billingService.list();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const onPayNow = async (id) => {
    try {
      const resp = await billingService.pay(id);
      if (resp?.url) {
        window.location.href = resp.url;
      }
    } catch (e) {
      console.error(e);
      alert("Failed to start payment");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    const init = async () => {
      try {
        if (sessionId) {
          await billingService.confirm(sessionId).catch(() => {});
          // clean the query so refresh does not re-confirm
          const url = new URL(window.location.href);
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.toString());
        }
      } finally {
        await load();
      }
    };

    init();
  }, []);

  const dueInvoices = useMemo(
    () => rows.filter((r) => r.status === "DUE"),
    [rows]
  );

  const balanceCents = useMemo(
    () => dueInvoices.reduce((sum, inv) => sum + (inv.amountCents || 0), 0),
    [dueInvoices]
  );

  const nextDueInvoice = useMemo(() => {
    if (!dueInvoices.length) return null;
    let best = null;
    for (const inv of dueInvoices) {
      if (!inv.dueDate) continue;
      if (!best) {
        best = inv;
      } else if (new Date(inv.dueDate) < new Date(best.dueDate)) {
        best = inv;
      }
    }
    return best || dueInvoices[0];
  }, [dueInvoices]);

  const dueDateText = (d) =>
    d ? format(new Date(d), "MMM dd, yyyy") : "—";

  return (
    <div className="main-inner">
      <h1 className="text-[32px] leading-[38px] font-extrabold tracking-tight text-gray-900">
        Billings & Payments
      </h1>
      <p className="mt-2 text-gray-500">View and manage your medical bills.</p>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card-soft">
          <div className="text-base font-semibold mb-3">Billing History</div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr className="[&>th]:px-5 [&>th]:py-3 text-left">
                  <th>DATE</th>
                  <th>DESCRIPTION</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading && (
                  <tr>
                    <td className="px-5 py-6 text-gray-500" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="px-5 py-6 text-gray-500" colSpan={5}>
                      No invoices found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((r) => (
                    <tr key={r.id} className="[&>td]:px-5 [&>td]:py-4">
                      <td className="text-gray-700">
                        {format(new Date(r.createdAt), "MMM dd, yyyy")}
                      </td>
                      <td className="text-gray-900">{r.description}</td>
                      <td className="text-gray-900">
                        {dollars(r.amountCents)}
                      </td>
                      <td>
                        <StatusPill kind={r.status} />
                      </td>
                      <td className="space-x-4">
                        {r.status === "DUE" ? (
                          <button
                            className="text-sky-700 hover:text-sky-800 font-medium"
                            onClick={() => onPayNow(r.id)}
                          >
                            Pay Now
                          </button>
                        ) : r.receiptUrl ? (
                          <a
                            href={r.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800 font-medium"
                          >
                            <FiFileText className="text-[16px]" /> View Receipt
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card-soft">
            <div className="text-base font-semibold mb-3">
              Current Balance
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm text-amber-800 mb-1">
                Outstanding balance:
              </div>
              <div className="text-4xl font-extrabold text-amber-900">
                {dollars(balanceCents)}
              </div>
              <div className="mt-1 text-sm text-amber-800">
                {nextDueInvoice?.dueDate
                  ? `Next due by ${dueDateText(nextDueInvoice.dueDate)}`
                  : "No outstanding invoices"}
              </div>
            </div>
            {balanceCents > 0 && (
              <button
                className="btn-primary w-full mt-4"
                onClick={() => {
                  if (dueInvoices.length) {
                    onPayNow(dueInvoices[0].id);
                  }
                }}
              >
                Pay Full Amount
              </button>
            )}
          </div>

          <div className="card-soft">
            <div className="text-base font-semibold mb-3">
              Payment Methods
            </div>
            <div className="rounded-xl border border-gray-200 p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 grid place-items-center">
                <FiCreditCard className="text-gray-600 text-[18px]" />
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  Stripe Test Card
                </div>
                <div className="text-sm text-gray-500">
                  Use 4242 4242 4242 4242
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
