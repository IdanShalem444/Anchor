/**
 * Ambient background — barely-visible blue + orange gradient blobs that drift
 * slowly. Fixed behind all content. Deliberately very subtle.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#fafbfd] to-[#f6f7fb]" />
      <div className="absolute -left-[10%] top-[-8%] h-[44vw] w-[44vw] animate-aurora rounded-full bg-aurora-orange blur-3xl" />
      <div className="absolute right-[-12%] top-[18%] h-[40vw] w-[40vw] animate-aurora rounded-full bg-aurora-blue blur-3xl [animation-delay:-8s]" />
      <div className="absolute bottom-[-14%] left-[24%] h-[38vw] w-[38vw] animate-aurora rounded-full bg-aurora-blue opacity-70 blur-3xl [animation-delay:-15s]" />
      {/* faint top sheen */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
    </div>
  );
}
