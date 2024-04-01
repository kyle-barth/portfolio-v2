import Container from "@/components/container";
import Link from "@/components/link";
import Image from "next/image";
import { spacing } from "@/constants/spacing";

export default function PortfolioPage() {
  return (
    <Container>
      <nav>
        <Link url="/home" text="home" />
      </nav>
      <main className={"flex flex-col" + " " + spacing}>
        <h1 className="text-4xl font-bold">About</h1>
        <p>
          Side projects are a great way to learn new technologies and keep your
          skills up to date, in web dev the whole stack changes every few years
          so it's worth doing.
        </p>
        <p>Here are some of my recent projects I've made to stay up to date.</p>

        <div className="grid-cols-1 sm:grid-cols-2 grid gap-4">
          <a
            className="transition-all hover:scale-105"
            href="https://resippy.vercel.app/"
          >
            <div className="h-40 w-full relative">
              <Image
                src="/resippy.png"
                alt="Picture of the author"
                layout="fill"
                objectFit="cover"
                className="rounded-t-lg"
              />
            </div>
            <div className="h-44 bg-slate-900 rounded-b-lg p-4 flex flex-col justify-between">
              <h1 className="text-xl font-bold">resippy</h1>
              <p>
                A recipe app I made for my own usage. Not as quick as using a
                notepad though so I don't update it that often...
              </p>
              <p className="text-slate-400 text-xs italic">
                Tech: SvelteKit, TailwindCSS, Vercel.
              </p>
            </div>
          </a>
        </div>
      </main>
      {/* https://resippy.vercel.app/ */}
    </Container>
  );
}
