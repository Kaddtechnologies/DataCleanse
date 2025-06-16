import { NextRequest, NextResponse } from 'next/server';
import { publicConfig } from '@/config/environment';

// Configure body size limit for this API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

// For App Router, we need to handle the body size limit differently
export async function POST(request: NextRequest) {
  try {
    // Get the backend URL from environment configuration
    const backendUrl = publicConfig.apiBaseUrl;
    
    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/api/find-duplicates`, {
      method: 'POST',
      body: request.body,
      headers: {
        // Forward relevant headers but exclude host and content-length
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(
            ([key]) => !['host', 'content-length'].includes(key.toLowerCase())
          )
        ),
      },
      // @ts-ignore - duplex is needed for streaming
      duplex: 'half',
    });

    // Get the response data
    const data = await response.json();

    // Return the response with the same status
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 