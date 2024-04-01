import Container from "@/components/container";
import NavLink from "@/components/link";

export default function PortfolioPage() {
  return (
    <Container>
      <NavLink text="home" />
      <h1 className="text-4xl font-bold">Portfolio</h1>
      <p className="text-lg">
        This is a Next.js starter template with Tailwind CSS and TypeScript.
      </p>
    </Container>
  );
}
