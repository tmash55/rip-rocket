/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      // NextJS <Image> component needs to whitelist domains for src={}
      "lh3.googleusercontent.com",
      "pbs.twimg.com",
      "images.unsplash.com",
      "logos-world.net",
      // Supabase storage for card images
      "xpqjhmxdjpxecdplvygk.supabase.co",
    ],
  },
};

module.exports = nextConfig;
