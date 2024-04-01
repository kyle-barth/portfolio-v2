import Container from "@/components/container";
import Link from "@/components/link";
import PortfolioCard from "@/components/portfolio-card";

export default function PortfolioPage() {
  return (
    <Container>
      <nav>
        <Link url="/home" text="home" />
      </nav>

      <main className={"flex flex-col gap-4"}>
        <h1 className="text-4xl font-bold">Portfolio</h1>
        <p>
          Side projects are a great way to learn new technologies and keep your
          skills up to date, in web dev the whole stack changes every few years
          so it&apos;s worth doing.
        </p>
        <p>
          Here are some of my recent projects I&apos;ve made to stay up to date.
        </p>

        <section className={"grid-cols-1 sm:grid-cols-2 grid gap-4"}>
          <PortfolioCard
            linkUrl="https://resippy.vercel.app/"
            imgUrl="/resippy.png"
            title="resippy"
            description="A recipe app I made for my own usage. Not as quick as using a notepad though so I don't update it that often..."
            tech="SvelteKit, TailwindCSS, Vercel."
          />

          <PortfolioCard
            linkUrl="https://ttvf.vercel.app/"
            imgUrl="/mrvf.png"
            title="MRVF"
            description="A basic video editing app I made for experimenting with FFMPEG. Used for formatting clips for TikTok."
            tech="SvelteKit, TailwindCSS, Vercel, FFMPEG."
          />

          <PortfolioCard
            linkUrl="https://mandelbrot-bice.vercel.app/"
            imgUrl="/mandelbrot.png"
            title="mandelbrot"
            description="An experiment in rendering the mandelbrot set in the browser without blocking the UI using workers."
            tech="SvelteKit, TailwindCSS, Vercel, Markdown."
          />

          <PortfolioCard
            linkUrl="https://emojiboard.kyle-barth.vercel.app/"
            imgUrl="/emojiboard.png"
            title="emojiboard"
            description="An awful idea that was funny to make, each letter corresponds to the nearest looking emoji."
            tech="Svelte, TailwindCSS, Vercel, SnowPack."
          />
        </section>

        <p className="text-center">
          I think this website counts! Made using NextJS, TailwindCSS, ThreeJS
          FramerMotion and Vercel.
        </p>
        <p className="text-center">Checkout the code on my GitHub!</p>

        <span className="self-center">
          <Link
            url="https://github.com/kyle-barth/portfolio-v2"
            text="GitHub"
          />
        </span>
      </main>
    </Container>
  );
}
