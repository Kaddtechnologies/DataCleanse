import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Custom webpack configuration to prevent client bundle errors caused by
  // Node-specific optional dependencies pulled in by Genkit/OpenTelemetry.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Provide empty fallbacks for core Node modules that aren't available
      // in the browser so Webpack doesn't attempt to polyfill them.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        http2: false,
        child_process: false,
        module: false,
        async_hooks: false,
        buffer: false,
      };

      // Some optional telemetry exporters reference packages that are not
      // required in the browser bundle. Aliasing them to false excludes them.
      config.resolve.alias = {
        ...config.resolve.alias,
        '@opentelemetry/exporter-jaeger': false,
        // Exclude all Node-only telemetry / gRPC stacks that drag in core
        // modules like async_hooks, http2, tls, etc.  Aliasing to false
        // prevents them from being pulled into the client bundle.
        '@opentelemetry/sdk-node': false,
        '@opentelemetry/sdk-trace-node': false,
        '@opentelemetry/exporter-trace-otlp-grpc': false,
        '@opentelemetry/otlp-grpc-exporter-base': false,
        '@grpc/grpc-js': false,
        // Genkit itself is server-side only; stub it (and its peer packages)
        // so client compilation doesn’t try to bundle them.
        genkit: false,
        'genkit/*': false,
        // Stub Genkit plugin packages so they are never pulled into the
        // browser bundle (they rely on server-only OpenAI/Azure SDKs).
        'genkitx-azure-openai': false,
        'genkitx-openai': false,
        'genkitx-anthropic': false,
        '@genkit-ai/googleai': false,
        '@genkit-ai/next': false,
      };

      // Also alias the `node:` specifier variants that some deps use so
      // Webpack doesn’t throw UnhandledSchemeError when it sees them.
      const nodeCoreStubs = [
        'async_hooks',
        'buffer',
        'fs',
        'net',
        'tls',
        'dns',
        'http2',
      ];
      nodeCoreStubs.forEach((coreMod) => {
        config.resolve.alias[`node:${coreMod}`] = false;
      });
    }

    return config;
  },
};

export default nextConfig;
