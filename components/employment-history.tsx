export default function EmploymentHistory({
  title,
  date,
  description,
  tech,
}: {
  title: string;
  date: string;
  description: string;
  tech: string;
}) {
  return (
    <section className="flex gap-2">
      <span className="w-1 bg-slate-700 rounded-full h-100 mt-1" />
      <div className="w-fit flex flex-col gap-1">
        <h3 className="font-bold text-xl">{title}</h3>
        <p className="text-xs text-slate-400">{date}</p>
        <p>{description}</p>
        <p className="text-xs text-slate-400 italic">Tech: {tech}</p>
      </div>
    </section>
  );
}
