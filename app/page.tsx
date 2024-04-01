import SideNav from "@/components/side-nav";
import Scene from "@/components/threejs/scene";

export default function Home() {
  return (
    <>
      <Scene />

      <main>
        <SideNav />
      </main>
    </>
  );
}
