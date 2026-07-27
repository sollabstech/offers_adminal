type Status =
  | "active" | "inactive" | "out_of_stock"
  | "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  | "suspended" | "banned";

const map: Record<Status, { label: string; cls: string }> = {
  active:       { label: "Active",        cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  inactive:     { label: "Inactive",      cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  out_of_stock: { label: "Out of Stock",  cls: "bg-red-50 text-red-600 ring-red-200" },
  pending:      { label: "Pending",       cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  processing:   { label: "Processing",    cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  shipped:      { label: "Shipped",       cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  delivered:    { label: "Delivered",     cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  cancelled:    { label: "Cancelled",     cls: "bg-red-50 text-red-600 ring-red-200" },
  suspended:    { label: "Suspended",     cls: "bg-red-50 text-red-600 ring-red-200" },
  banned:       { label: "Banned",        cls: "bg-red-50 text-red-700 ring-red-200" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${cls}`}>
      {label}
    </span>
  );
}
