// Vercel Edge Function — sends email notifications via Resend
// Requires RESEND_API_KEY environment variable

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json({ error: 'Email service not configured' }, 503);
  }

  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return json({ error: 'Missing required fields: to, subject, html' }, 400);
    }

    // Basic email validation
    if (!to.includes('@') || to.length > 254) {
      return json({ error: 'Invalid email address' }, 400);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Vanish <alerts@vanish.app>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ error: 'Failed to send email', details: err }, 500);
    }

    const data = await res.json();
    return json({ ok: true, id: data.id });
  } catch {
    return json({ error: 'Internal error' }, 500);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
