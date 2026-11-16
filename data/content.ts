// Everything the page says lives here, so copy changes never touch components.

export type Link = { label: string; href: string; handle: string };

export type Person = {
  name: string;
  role: string;
  shortRole: string;
  location: string;
  since: number;
  intro: string;
  links: Link[];
};

export type Job = {
  key: string;
  company: string;
  role: string;
  place: string;
  start: string;
  end: string;
  years: string;
  summary: string;
  points: string[];
  tech: string[];
};

export type Project = {
  key: string;
  title: string;
  domain?: string;
  featured?: boolean;
  kind: string;
  href: string;
  linkLabel?: string;
  img: string;
  img2?: string;
  /** How the monitor shows it: a page in a browser, or a Windows app on a desktop. */
  screen: 'browser' | 'desktop';
  blurb: string;
  points?: string[];
  tech: string[];
};

export const person: Person = {
  name: 'Kyle Barth',
  role: 'Senior Front-End Software Engineer',
  shortRole: 'Senior front-end engineer',
  location: 'London',
  since: 2018,
  intro: 'I build fast, well-tested web front ends, and the guardrails that keep them shippable.',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kyle-barth/', handle: 'in/kyle-barth' },
    { label: 'GitHub', href: 'https://github.com/kyle-barth/', handle: 'kyle-barth' },
  ],
};

export const jobs: Job[] = [
  {
    key: 'mns',
    company: 'Marks & Spencer',
    role: 'Senior Software Engineer',
    place: 'London',
    start: 'Jul 2022',
    end: 'Present',
    years: '2022 to now',
    summary: 'Bringing M&S tech in-house: developer practices, the UI library, and the rebuild of M&S.com with a focus on checkout.',
    points: [
      'Landed the new Basket with a staggered rollout to keep the blast radius small in a high-risk area.',
      'Configured synthetic tests that alert developers to production issues.',
      'Shaped the team’s development practices through its testing strategy.',
    ],
    tech: ['Next.js', 'TypeScript', 'Jest', 'React Testing Library', 'Playwright', 'GraphQL', 'Storybook', 'Optimizely', 'New Relic', 'PagerDuty'],
  },
  {
    key: 'youview',
    company: 'YouView',
    role: 'Software Engineer',
    place: 'London',
    start: 'Nov 2020',
    end: 'Apr 2022',
    years: '2020 to 2022',
    summary: 'Rolled out features to 1.5 million devices, building web technology that runs on TV set-top boxes.',
    points: ['Shipped features to 1.5 million set-top boxes.'],
    tech: ['React', 'Jest', 'CircleCI', 'Express', 'AWS'],
  },
  {
    key: 'sdm',
    company: 'Smarter DM',
    role: 'Full Stack Web Developer',
    place: 'Luton',
    start: 'Oct 2018',
    end: 'Nov 2020',
    years: '2018 to 2020',
    summary: 'In a small tech startup, led the creation of an analytics portal for a large waste management company.',
    points: ['Led the build of an analytics portal for a large waste management company.'],
    tech: ['Angular', 'Playwright', 'Jest'],
  },
];

// Order matters: Garage is the featured build, Vitals second, then earlier experiments.
export const projects: Project[] = [
  {
    key: 'garage',
    title: 'Garage',
    domain: 'garage.chat',
    featured: true,
    kind: 'Voice and text for your crew',
    href: 'https://garage.chat/',
    linkLabel: 'Open garage.chat',
    img: '/projects/garage.webp',
    screen: 'browser',
    blurb:
      'The biggest thing I have built: a Discord-style chat app with servers, text and voice channels, screen sharing, DMs, mentions, reactions and custom emoji. It runs in the browser and as a desktop app.',
    points: [
      'Voice channels and screen sharing over LiveKit, with noise suppression',
      'Realtime messages, typing indicators and unread mentions on Supabase',
      'A desktop app with its own installers and update feed',
    ],
    tech: ['Next.js', 'React', 'TypeScript', 'Supabase', 'LiveKit', 'Electron'],
  },
  {
    key: 'vitals',
    title: 'Vitals',
    domain: 'github.com/kyle-barth/vitals',
    kind: 'Sensor monitor for Windows',
    href: 'https://github.com/kyle-barth/vitals',
    linkLabel: 'Get Vitals on GitHub',
    img: '/projects/vitals-dashboard.webp',
    img2: '/projects/vitals.png',
    screen: 'desktop',
    blurb:
      'A tiny, fully resizable sensor monitor for Windows, written in Rust. One exe of about 700 KB with nothing to install, using under 1% of one CPU thread.',
    tech: ['Rust', 'Windows', 'GitHub Actions'],
  },
  {
    key: 'resippy',
    title: 'resippy',
    kind: 'Recipe app',
    href: 'https://resippy.vercel.app/',
    img: '/projects/resippy.webp',
    screen: 'browser',
    blurb: 'A recipe app I made for my own cooking. Not as quick as a notepad, so it gets updated less than it should.',
    tech: ['SvelteKit', 'Tailwind', 'Vercel'],
  },
  {
    key: 'mrvf',
    title: 'MRVF',
    kind: 'Mobile Ready Video Formatter',
    href: 'https://ttvf.vercel.app/',
    img: '/projects/mrvf.webp',
    screen: 'browser',
    blurb: 'A small in-browser video editor for experimenting with FFmpeg, used to format clips for TikTok.',
    tech: ['SvelteKit', 'FFmpeg', 'Tailwind', 'Vercel'],
  },
  {
    key: 'mandelbrot',
    title: 'mandelbrot',
    kind: 'Rendering experiment',
    href: 'https://mandelbrot-bice.vercel.app/',
    img: '/projects/mandelbrot.webp',
    screen: 'browser',
    blurb: 'Renders the Mandelbrot set in the browser without blocking the UI, by splitting the work across web workers.',
    tech: ['SvelteKit', 'Web Workers', 'Tailwind', 'Vercel'],
  },
  {
    key: 'emojiboard',
    title: 'emojiboard',
    kind: 'A bad idea, done well',
    href: 'https://emojiboard.kyle-barth.vercel.app/',
    img: '/projects/emojiboard.webp',
    screen: 'browser',
    blurb: 'An awful idea that was funny to make: every letter becomes the emoji that looks most like it.',
    tech: ['Svelte', 'Snowpack', 'Tailwind', 'Vercel'],
  },
];

/** Third-party models in the 3D desk, credited in the footer (CC BY asks for title, author, source, licence and changes). */
export type ModelCredit = { what: string; title: string; author: string; source: string; license: string; licenseUrl: string; changes: string; file: string };

// none at the moment: every prop, the MacBook included, is built in code
export const modelCredits: ModelCredit[] = [];
