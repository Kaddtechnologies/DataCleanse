import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'placehold.co', pathname: '/**' }],
  },

  /** ---------- TURBOPACK ---------- **/
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    resolveAlias: {
      // Node core modules → stub so they never hit the browser bundle
      fs: 'empty:', net: 'empty:', tls: 'empty:', dns: 'empty:',
      http2: 'empty:', child_process: 'empty:', async_hooks: 'empty:', buffer: 'empty:',
      // Genkit / OTEL / gRPC packages that are server-only
      '@opentelemetry/exporter-jaeger': 'empty:',
      '@opentelemetry/sdk-node': 'empty:',
      '@opentelemetry/sdk-trace-node': 'empty:',
      '@opentelemetry/exporter-trace-otlp-grpc': 'empty:',
      '@opentelemetry/otlp-grpc-exporter-base': 'empty:',
      '@grpc/grpc-js': 'empty:',
      genkit: 'empty:', 'genkit/*': 'empty:',
      'genkitx-azure-openai': 'empty:', 'genkitx-openai': 'empty:', 'genkitx-anthropic': 'empty:',
      '@genkit-ai/googleai': 'empty:', '@genkit-ai/next': 'empty:',
    },
  },
};

export default nextConfig;
