import { SchoolSidebar } from "@/components/school/SchoolSidebar";

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-6 lg:flex-row lg:gap-7">
      <SchoolSidebar />
      <main className="min-w-0 flex-1 pb-24">{children}</main>
    </div>
  );
}
