import { PersonalSidebar } from "@/components/personal/PersonalSidebar";

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 lg:flex-row lg:gap-7">
      <PersonalSidebar />
      <main className="min-w-0 flex-1 pb-24">{children}</main>
    </div>
  );
}
