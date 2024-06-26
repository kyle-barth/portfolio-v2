export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className={"max-w-[768px] mx-auto p-6 grid grid-cols-1 gap-4"}>
      {children}
    </div>
  );
}
