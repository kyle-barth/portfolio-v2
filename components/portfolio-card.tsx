import Image from "next/image";

type PortfolioCardProps = {
  title: string;
  description: string;
  tech: string;
  linkUrl: string;
  imgUrl: string;
};

export default function PortfolioCard({
  linkUrl,
  imgUrl,
  title,
  description,
  tech,
}: PortfolioCardProps) {
  return (
    <a className="transition-all hover:scale-105" href={linkUrl}>
      <div className="h-40 w-full relative">
        <Image
          src={imgUrl}
          alt="Image of website"
          layout="fill"
          objectFit="cover"
          className="rounded-t-lg"
        />
      </div>
      <div className="h-44 bg-slate-900 rounded-b-lg p-4 flex flex-col justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <p>{description}</p>
        <p className="text-slate-400 text-xs italic">Tech: {tech}</p>
      </div>
    </a>
  );
}
