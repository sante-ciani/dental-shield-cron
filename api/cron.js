export default async function handler(req, res) {
  try {
    const ziteApiKey = process.env.ZITE_API_KEY;
    const resendApiKey = process.env.ZITE_RESEND_API_KEY;
    const emailUtente = process.env.EMAIL_UTENTE;
    const ziteAppUrl = process.env.ZITE_APP_URL;

    // 1. Legge tutte le scadenze da Zite
    const response = await fetch(`${ziteAppUrl}/api/getAllScadenze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ziteApiKey}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Zite API error: ${response.status}`);
    }

    const data = await response.json();
    const records = data.records || [];

    // 2. Controlla le scadenze
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const emailDaInviare = [];

    for (const r of records) {
      if (r.pagato || !r.dataScadenza) continue;

      const dataScad = new Date(r.dataScadenza);
      dataScad.setHours(0, 0, 0, 0);
      const giorniMancanti = Math.round((dataScad - oggi) / (1000 * 60 * 60 * 24));

      const isMensile = (r.tipoDiRata || '').toLowerCase().includes('mensile');
      const soglie = isMensile ? [7, 3] : [30, 7, 3];

      if (soglie.includes(giorniMancanti)) {
        emailDaInviare.push({
          scadenza: r.nomeScadenza,
          data: r.dataScadenza,
          giorniMancanti,
        });
      }
    }

    if (emailDaInviare.length === 0) {
      return res.status(200).json({ success: true, emailInviate: 0 });
    }

    // 3. Manda email con Resend
    const righe = emailDaInviare.map(e =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${e.scadenza}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${new Date(e.data).toLocaleDateString('it-IT')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:${e.giorniMancanti <= 3 ? 'red' : e.giorniMancanti <= 7 ? 'orange' : 'black'}">${e.giorniMancanti} giorni</td>
      </tr>`
    ).join('');

    const html = `
      <h2>⚠️ Promemoria Scadenze - Dental Shield</h2>
      <p>Le seguenti scadenze si avvicinano:</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd">Scadenza</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd">Data</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd">Mancano</th>
          </tr>
        </thead>
        <tbody>${righe}</tbody>
      </table>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: emailUtente,
        subject: `⚠️ ${emailDaInviare.length} scadenze in arrivo`,
        html,
      }),
    });

    res.status(200).json({ success: true, emailInviate: emailDaInviare.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
