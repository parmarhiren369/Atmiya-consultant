export const config = {
  runtime: 'edge',
};

// n8n Webhook URL - Set this in Vercel environment variables as N8N_SIGNUP_WEBHOOK_URL
const N8N_WEBHOOK_URL = process.env.N8N_SIGNUP_WEBHOOK_URL || '';

export default async function handler(req: Request) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Check if webhook URL is configured
  if (!N8N_WEBHOOK_URL) {
    console.warn('N8N_SIGNUP_WEBHOOK_URL not configured - skipping webhook');
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook not configured' }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const userData = await req.json();
    
    // Forward the request to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      console.error('Webhook failed:', response.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook failed' }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error sending webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
