export default function Container({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[768px] mx-auto p-4 flex flex-col gap-4">{children}</div>;
}
