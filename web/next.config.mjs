/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/cgo-demo", destination: "/cgo-demo/index.html", permanent: false },
      { source: "/cgo-demo/", destination: "/cgo-demo/index.html", permanent: false },
    ];
  },
};

export default nextConfig;