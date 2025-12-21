import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Input({
  type = "text",
  leftIcon = null,
  rightIcon = null,
  className = "",
  ...props
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="input-wrapper">
      {leftIcon && <span className="input-icon">{leftIcon}</span>}
      <input
        type={effectiveType}
        {...props}
        className={`input ${leftIcon ? "pl-10" : ""} ${className}`}
      />
      {isPassword ? (
        <button
          type="button"
          className="input-right"
          aria-label="Toggle password visibility"
          onClick={() => setShow((s) => !s)}
        >
          {show ? <FiEyeOff /> : <FiEye />}
        </button>
      ) : rightIcon ? (
        <span className="input-right">{rightIcon}</span>
      ) : null}
    </div>
  );
}
