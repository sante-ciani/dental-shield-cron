export default async function handler(req, res) {
  try {
    const response = await fetch(`${process.env.ZITE_APP_URL}/api/sendNotifiche`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailUtente: process.env.EMAIL_UTENTE }),
    });

    const data = await response.json();
    res.status(200).json({ success: true, result: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
