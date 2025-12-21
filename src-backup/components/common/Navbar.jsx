import { FiBell, FiSearch } from "react-icons/fi";

export default function Navbar({ user }) {
  const name = user?.username || "Maria";
  const patientId = user?.id ? String(user.id).padStart(6, "0") : "789123";

  return (
    <header className="appbar">
      <div className="appbar-inner">
        {/* Left: (no brand in mock top bar) just the search */}
        <div className="flex-1">
          <div className="max-w-[640px]">
            <div className="search-pill">
              <FiSearch className="text-gray-500" />
              <input className="search-input" placeholder="Search records, messages..." />
            </div>
          </div>
        </div>

        {/* Right: bell + profile */}
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-lg hover:bg-gray-100"><FiBell /></button>
          <div className="flex items-center gap-3">
            <img
              alt=""
              src="https://dummyimage.com/36x36/bae6fd/075985.png&text= "
              className="w-9 h-9 rounded-full object-cover"
            />
            <div className="leading-tight hidden sm:block">
              <div className="text-sm font-medium">{name.replace(/_/g," ")}</div>
              <div className="text-xs text-gray-500">Patient ID: {patientId}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
