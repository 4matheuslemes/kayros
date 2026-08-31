export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--background)] px-5">
      {children}
    </div>
  );
}
