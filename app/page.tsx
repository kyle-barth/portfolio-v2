import DeskScene from '@/components/desk-scene';
import ProjectList from '@/components/project-list';
import ScrollSpy from '@/components/scroll-spy';
import { jobs, modelCredits, person, projects } from '@/data/content';

const sections = [
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
];

function SectionLinks() {
  return sections.map((s) => (
    <a key={s.id} href={`#${s.id}`} data-nav={s.id}>
      {s.label}
    </a>
  ));
}

export default function Home() {
  return (
    <>
      <DeskScene person={person} jobs={jobs} projects={projects} />

      <header className="top">
        <a className="brand" href="#intro">
          <span className="mark">KB</span>
          <span className="name">{person.name}</span>
        </a>
        <nav aria-label="Sections">
          <SectionLinks />
        </nav>
      </header>

      <main>
        <section className="shot hero" id="intro" data-stage="">
          <div className="panel">
            <h1>{person.name}</h1>
            <p className="role">
              {person.role}, {person.location}
            </p>
            <p className="lede">{person.intro}</p>
            <div className="actions">
              <a className="btn primary" href="#work">
                See my work
              </a>
              {person.links.map((l) => (
                <a key={l.label} className="btn" href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div className="hint">
            <i />
            Click and drag to look around the desk
          </div>
        </section>

        <section className="shot tall work" id="work" data-stage="">
          <div className="panel glass">
            <div className="work-head">
              <h2>Side projects</h2>
              <p className="sub">What I build outside work, biggest first. The one you pick plays on the monitor.</p>
            </div>
            <ProjectList projects={projects} />
          </div>
        </section>

        <section className="shot tall right" id="experience" data-stage="">
          <div className="panel glass">
            <h2>Experience</h2>
            <ul className="jobs">
              {jobs.map((j) => (
                <li className="job" key={j.key}>
                  <span className="job-years">{j.years}</span>
                  <div>
                    <h3>{j.company}</h3>
                    <span className="job-role">
                      {j.role} in {j.place}
                    </span>
                    <p>{[j.summary, ...(j.points.length > 1 ? j.points : [])].join(' ')}</p>
                    <p className="stack">{j.tech.join(', ')}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="shot contact" id="contact" data-stage="">
          <div className="panel">
            <h2>Let&apos;s build something.</h2>
            <p className="sub">The coffee&apos;s still warm. LinkedIn is the quickest way to reach me.</p>
            <div className="links">
              {person.links.map((l) => (
                <a key={l.label} className="link-row" href={l.href} target="_blank" rel="noopener noreferrer">
                  <b>{l.label}</b>
                  <span>{l.handle}</span>
                </a>
              ))}
            </div>
            <footer className="foot">
              <span>Built with Next.js and Three.js.</span>
              <a href="https://github.com/kyle-barth/portfolio-v2" target="_blank" rel="noopener noreferrer">
                Source on GitHub
              </a>
              {modelCredits.map((c) => (
                <small key={c.title} className="credit">
                  {c.what} model:{' '}
                  <a href={c.source} target="_blank" rel="noopener noreferrer">&ldquo;{c.title}&rdquo;</a> by {c.author},{' '}
                  <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">{c.license}</a>, {c.changes}.
                </small>
              ))}
            </footer>
          </div>
        </section>
      </main>

      <nav className="dock" aria-label="Sections">
        <SectionLinks />
      </nav>
      <ScrollSpy />
    </>
  );
}
