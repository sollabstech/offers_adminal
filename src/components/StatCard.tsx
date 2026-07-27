import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: LucideIcon;
  color: "orange" | "blue" | "green" | "purple" | "red";
}

const colorMap = {
  orange: { bg: "bg-orange-50", icon: "bg-orange-500", text: "text-orange-600" },
  blue: { bg: "bg-blue-50", icon: "bg-blue-500", text: "text-blue-600" },
  green: { bg: "bg-emerald-50", icon: "bg-emerald-500", text: "text-emerald-600" },
  purple: { bg: "bg-violet-50", icon: "bg-violet-500", text: "text-violet-600" },
  red: { bg: "bg-red-50", icon: "bg-red-500", text: "text-red-600" },
};

export default function StatCard({ title, value, change, positive, icon: Icon, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center shadow-sm`}>
          <Icon size={20} className="text-white" />
        </div>
        {change && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            {positive ? "+" : ""}{change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
      <p className="text-sm text-slate-500">{title}</p>
    </div>
  );
}
