"use client";

interface ImpersonateButtonProps {
  userId: string;
  userName: string;
}

export function ImpersonateButton({ userId, userName }: ImpersonateButtonProps) {
  function handleClick() {
    // Impersonation not implemented in this build
    alert(`Impersonation not implemented in this build.\nUser: ${userName} (${userId})`);
  }

  return (
    <button
      onClick={handleClick}
      title={`Impersonate ${userName}`}
      style={{
        fontSize: "0.72rem",
        fontWeight: 500,
        padding: "0.2rem 0.5rem",
        borderRadius: "0.375rem",
        border: "1px solid rgba(139,92,246,0.4)",
        cursor: "pointer",
        background: "transparent",
        color: "#a78bfa",
        transition: "opacity 0.15s",
      }}
    >
      Impersonate
    </button>
  );
}
