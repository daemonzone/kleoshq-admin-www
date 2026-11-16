"use client";

// A submit button that asks first. Used for the destructive decision (revoke).
export default function ConfirmButton({ message, children, ...rest }: { message: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} type="submit" onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
