import Link from "next/link";

export default function NavLink({ text }: { text: string }) {
  const isHome = text === "home";

  if (isHome) {
    return (
      <Link href="/" className="group w-fit font-bold flex flex-col">
        <p>&lt;- {text}</p>
        <span className="w-0 group-hover:w-full px-1 block transition-all duration-500 h-0.5 rounded-full bg-white self-end"></span>
      </Link>
    );
  }

  return (
    <Link href={`/${text}`} className="group w-fit font-bold flex flex-col">
      <p>{text} -&gt;</p>
      <span className="w-0 group-hover:w-full px-1 block transition-all duration-500 h-0.5 rounded-full bg-white"></span>
    </Link>
  );
}
