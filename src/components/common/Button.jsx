export default function Button({ className = "", children, ...props }) {
  return (
    <button {...props} className={`btn-primary ${className}`}>
      {children}
    </button>
  );
}
