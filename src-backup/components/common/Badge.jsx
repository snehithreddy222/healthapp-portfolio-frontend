export default function Badge({ tone="gray", children }) {
  const map = {
    green: "bg-green-50 text-green-700 border-green-200",
    red:   "bg-red-50 text-red-700 border-red-200",
    blue:  "bg-blue-50 text-blue-700 border-blue-200",
    gray:  "bg-gray-100 text-gray-700 border-gray-200",
    yellow:"bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${map[tone]}`}>
      {children}
    </span>
  );
}
