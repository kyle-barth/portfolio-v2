import Container from "@/components/container";
import EmploymentHistory from "@/components/employment-history";
import Link from "@/components/link";
import { employmentHistory } from "@/data/employment-history";

export default function AboutPage() {
  return (
    <Container>
      <nav>
        <Link url="/home" text="home" />
      </nav>

      <main className={"flex flex-col gap-4"}>
        <h1 className="text-4xl font-bold">About</h1>
        <p>
          Senior Front-End Software Engineer with 7 years experience in Software
          Development. My expertise lies in providing technical guidance,
          automated testing infrastructure, experimentation, and alerting.{" "}
        </p>
        <span className={"self-end flex gap-4"}>
          <Link url="https://www.linkedin.com/in/kyle-barth/" text="LinkedIn" />
          <Link url="https://github.com/kyle-barth/" text="GitHub" />
        </span>

        <section className={"flex flex-col gap-4"}>
          <h2 className="font-bold text-3xl">Employment History</h2>
          {employmentHistory.map((job) => (
            <EmploymentHistory
              key={job.key}
              title={job.title}
              date={job.date}
              description={job.description}
              tech={job.tech}
            />
          ))}
        </section>
      </main>
    </Container>
  );
}
