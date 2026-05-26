// CleanEats Feedback API — sends feedback via Resend email API
// Replaces mailto: links to avoid Google Safe Browsing flags and fix empty email body issue

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FEEDBACK_TO = process.env.FEEDBACK_TO || 'ron.sublett@gmail.com';
const FEEDBACK_FROM = process.env.RESEND_FROM || 'CleanEats Feedback <feedback@brandbooststudio.co>';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, subject, body, restaurant, email } = req.body || {};

  if (!subject && !type) {
    return res.status(400).json({ error: 'Subject or type required' });
  }

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Feedback service not configured' });
  }

  // Build email subject
  const emailSubject = subject || `CleanEats ${type || 'Feedback'}`;

  // Build email HTML body
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">🥗 New CleanEats Feedback</h2>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        ${restaurant ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; width: 120px;">Restaurant:</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(restaurant)}</td></tr>` : ''}
        ${type ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Type:</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(type)}</td></tr>` : ''}
        ${email ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">From:</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(email)}</td></tr>` : ''}
      </table>
      <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
        <h3 style="margin-top: 0;">Message:</h3>
        <div style="white-space: pre-wrap;">${escapeHtml(body || '(No message provided)')}</div>
      </div>
      <p style="color: #9ca3af; font-size: 0.75rem; margin-top: 20px;">
        Sent from CleanEats app at ${new Date().toISOString()}
      </p>
    </div>
  `;

  const emailText = [
    `New CleanEats Feedback`,
    restaurant ? `Restaurant: ${restaurant}` : '',
    type ? `Type: ${type}` : '',
    email ? `From: ${email}` : '',
    '',
    `Message:`,
    body || '(No message provided)',
    '',
    `Sent from CleanEats app at ${new Date().toISOString()}`
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FEEDBACK_FROM,
        to: [FEEDBACK_TO],
        subject: emailSubject,
        html: emailHtml,
        text: emailText
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(response.status).json({ error: 'Failed to send feedback', details: data });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Feedback send error:', error);
    return res.status(500).json({ error: 'Failed to send feedback' });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}