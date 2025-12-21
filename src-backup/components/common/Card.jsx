export default function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`card p-7 ${className}`}>
      {title && <h1 className="text-[22px] font-bold text-center">{title}</h1>}
      {subtitle && <p className="text-gray-600 text-center mt-1">{subtitle}</p>}
      <div className={title || subtitle ? "mt-6" : ""}>{children}</div>
    </div>
  );
}
