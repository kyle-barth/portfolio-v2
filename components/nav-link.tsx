import Link from "next/link";

export default function NavLink({ text }: { text: string }) {
  return (
    <Link href={`/${text}`} className="group transition duration-300 block w-fit font-bold">
      {text} -&gt;
      <span className="block max-w-0 group-hover:max-w-full transition-all duration-500 h-0.5 bg-white"></span>
    </Link>
  );
}
