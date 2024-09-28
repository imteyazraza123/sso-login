/** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
//   swcMinify: true,
// }

// module.exports = nextConfig

const path = require('path');
const NextFederationPlugin = require('@module-federation/nextjs-mf');
// this enables you to use import() and the webpack parser
// loading remotes on demand, not ideal for SSR
const remotes = (options) => {
  const location = options.isServer ? 'ssr' : 'chunks';
  return {
    oc_auto_frontend_predeposit: `oc_auto_frontend_predeposit@https://aedevomnicommon.corp.al-futtaim.com/_next/static/${location}/remoteEntry.js`,
    oc_auto_frontend_express_checkout: `oc_auto_frontend_express_checkout@https://aedevomnicommon.corp.al-futtaim.com/expresscheckout/_next/static/${location}/remoteEntry.js`,
  };
};

module.exports = {
  webpack5: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: {
    publicPath: '',
  },
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'oc_auto_frontend_predeposit',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
        },
        remotes: remotes(options, ''),
        shared: {},
        extraOptions: {
          automaticAsyncBoundary: true
        }
      }),
    );
    config.experiments = { ...config.experiments, topLevelAwait: true };
    return config;
  },
  trailingSlash: true,
  headers: () => {
    return [
      {
        source: `/assets/fonts/:font*`,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  rewrites: async () => {
    return [
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
    ];
  },
  // i18n: {
  //   locales: ['ar', 'en', 'en-ae', 'en-sa', 'en-bh', 'en-qa', 'ar-ae', 'ar-sa', 'ar-bh', 'ar-qa', 'catchAll'],
  //   // defaultLocale: 'catchAll',
  //   defaultLocale: 'en',
  //   localeDetection: true,
  // },
  async redirects() {
    return [
      {
        source: '/catchAll',
        destination: '/en/',
        locale: false,
        permanent: true,
      },
      {
        source: '/catchAll/:slug*/',
        destination: '/en/:slug*/',
        locale: false,
        permanent: true,
      },
      {
        source: '/catchAll/:slug/:slug*/',
        destination: '/en/:slug/:slug*/',
        locale: false,
        permanent: true,
      },
    ];
  },
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
    prependData: `@import "_main.scss";`,
    optimizeFonts: true,
    generateEtags: false,
    poweredByHeader: false
  }
};