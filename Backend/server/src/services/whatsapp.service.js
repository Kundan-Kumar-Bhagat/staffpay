const cfg = () => ({ token: process.env.WA_TOKEN, phoneId: process.env.WA_PHONE_ID });

export const waEnabled = () => !!(cfg().token && cfg().phoneId);

export async function sendWhatsApp(to, message) {
  if (!waEnabled()) return false;
  const { token, phoneId } = cfg();
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'template',
      template: {
        name: process.env.WA_TEMPLATE || 'staffpay_alert',
        language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }],
      },
    }),
  });
  if (!res.ok) console.error('✗ WhatsApp send failed:', await res.text());
  return res.ok;
}

export async function sendWhatsAppDocument(to, pdfBuffer, filename, caption) {
  if (!waEnabled()) return false;
  const { token, phoneId } = cfg();
  const fd = new FormData();
  fd.append('messaging_product', 'whatsapp');
  fd.append('type', 'application/pdf');
  fd.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);
  const up = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/media`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
  });
  if (!up.ok) { console.error('✗ WhatsApp media upload failed'); return false; }
  const { id: mediaId } = await up.json();
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'document',
      document: { id: mediaId, filename, caption },
    }),
  });
  return res.ok;
}
