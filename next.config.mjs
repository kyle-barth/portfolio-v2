/** @type {import('next').NextConfig} */
const nextConfig = {
  // The old pages are now sections of the home page.
  async redirects() {
    return [
      { source: '/about', destination: '/#experience', permanent: true },
      { source: '/portfolio', destination: '/#work', permanent: true },
    ];
  },
};

export default nextConfig;
