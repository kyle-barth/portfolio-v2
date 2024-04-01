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
    <section className="flex flex-col gap-1">
      <h3 className="font-bold">{title}</h3>
      <p className="text-xs text-gray-300">{date}</p>
      <p>{description}</p>
      <p className="text-xs text-gray-300 italic">Tech: {tech}</p>
    </section>
  );
}
