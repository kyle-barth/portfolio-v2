import NextLink from "next/link";

export default function Link({ url, text }: { url: string; text: string }) {
  const isHome = text === "home";
  if (isHome) {
    return (
      <NextLink href="/" className="group w-fit font-bold flex flex-col">
        <p>&lt;- {text}</p>
        <span className="w-0 group-hover:w-full px-1 block transition-all duration-500 h-0.5 rounded-full bg-white self-end"></span>
      </NextLink>
    );
  }

  const isExternal = url.charAt(0) !== "/";
  if (isExternal) {
    return (
      <NextLink
        target="_blank"
        href={url}
        className="group w-fit font-bold flex flex-col"
      >
        <p className="transition-colors text-blue-200 group-hover:text-blue-600">{text} -&gt;</p>
        <span className="w-0 group-hover:w-full px-1 block transition-all duration-500 h-0.5 rounded-full bg-blue-200 group-hover:bg-blue-600"></span>
      </NextLink>
    );
  }

  return (
    <NextLink href={url} className="group w-fit font-bold flex flex-col">
      <p>{text} -&gt;</p>
      <span className="w-0 group-hover:w-full px-1 block transition-all duration-500 h-0.5 rounded-full bg-white"></span>
    </NextLink>
  );
}
