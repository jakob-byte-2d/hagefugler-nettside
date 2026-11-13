// Hagefugler: sender bekreftelse fra post.fuglekort@gmail.com når noen setter seg på bestillingslisten.
// Ligger som Google Apps Script i kontoen og er publisert som nettapp. Supabase (Database Webhook på
// INSERT i forhandsbestillinger) sender hver ny påmelding hit. Oppsett: se README.md, «Bekreftelse på e-post».
// HEMMELIG må være den samme koden som står bak ?hemmelig= i webhook-adressen i Supabase.
// Ikke legg den ekte koden i repoet; det er offentlig.
const HEMMELIG = 'SETT_INN_HEMMELIG_KODE';
const PRIS = 199, FRAKT = 69, MAL = 100;
const SIDE = 'https://hagefugler.no';
const VILKAR = SIDE + '/vilkar/';
const KONTAKT = 'post.fuglekort@gmail.com';

function doPost(e) {
  if (!e || !e.parameter || e.parameter.hemmelig !== HEMMELIG) return svar('nei');
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return svar('ugyldig'); }
  if (!data || data.type !== 'INSERT' || data.table !== 'forhandsbestillinger' || !data.record) return svar('hoppet over');
  const r = data.record;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.epost || '')) return svar('ugyldig e-post');
  const cache = CacheService.getScriptCache();          // aldri to e-poster for samme påmelding
  if (r.id && cache.get(String(r.id))) return svar('sendt før');
  sendBekreftelse(r);
  if (r.id) cache.put(String(r.id), '1', 21600);
  return svar('sendt');
}

function sendBekreftelse(r) {
  const e = lagEpost(r);
  MailApp.sendEmail({ to: r.epost, subject: e.emne, body: e.tekst, htmlBody: e.html, name: 'Hagefugler', replyTo: KONTAKT });
}

// Kjør testEpost for å se e-posten. Den sendes til post.fuglekort@gmail.com.
function testEpost() {
  sendBekreftelse({
    navn: 'Kari Nordmann', epost: KONTAKT, mobil: '91234567',
    antall_foto: 1, antall_illustrasjoner: 2, levering: 'post',
    adresse: 'Fuglevei 1', postnummer: '0880', poststed: 'Oslo',
  });
}

function lagEpost(r) {
  const foto = Number(r.antall_foto) || 0, teg = Number(r.antall_illustrasjoner) || 0;
  const post = r.levering === 'post', frakt = post ? FRAKT : 0, n = foto + teg, sum = n * PRIS + frakt;
  const fornavn = String(r.navn || '').trim().split(/\s+/)[0] || 'du';
  const varer = [];
  if (foto) varer.push(['Ekte bilder', `${foto} × ${kr(PRIS)}`, kr(foto * PRIS)]);
  if (teg) varer.push(['Tegneseriefugler', `${teg} × ${kr(PRIS)}`, kr(teg * PRIS)]);
  const fraktRad = post ? ['Frakt', 'Sendes i posten', kr(FRAKT)] : ['Henting i Oslo', 'Ingen frakt', kr(0)];
  const levering = post
    ? `Sendes til ${r.adresse}, ${r.postnummer} ${r.poststed}.`
    : 'Hentes i Oslo. Tid og sted avtaler vi på e-post.';
  const hvis = foto && teg ? 'Hvis begge versjonene blir trykket.' : 'Hvis kortene blir trykket.';
  const videre = [
    'Du betaler ingenting nå.',
    `Hver versjon har sitt eget mål. Når en versjon har ${MAL} bestilte kortstokker, vurderer vi å trykke den.`,
    `Blir det trykk, får du en betalingsforespørsel i Vipps på ${mobil(r.mobil)} for det som trykkes. Du er ikke bundet før du har betalt.`,
    `${MAL} bestillinger er ingen garanti for at kortene blir trykket. Blir det ikke trykk, får du beskjed.`,
  ];

  const emne = 'Du står på listen for Hagefugler';
  const tekst = [
    `Hei ${fornavn},`, '',
    'Takk! Du står nå på bestillingslisten for Hagefugler.', '',
    'Dette har du meldt deg på:',
    ...varer.map(v => `- ${v[0]}: ${v[1]} = ${v[2]}`),
    `- ${fraktRad[0]}: ${fraktRad[2]}`,
    `Totalt: ${kr(sum)}. ${hvis}`,
    levering, '',
    'Slik går det videre:', ...videre.map(l => `- ${l}`), '',
    'Vil du endre noe eller melde deg av, svarer du bare på denne e-posten.', '',
    `Vilkår: ${VILKAR}`, '',
    'Hilsen', 'Hagefugler', 'Jakob Myking · org.nr. 938 664 641',
  ].join('\n');

  // Samme farger og stil som hagefugler.no: papir, mørk grønnblå tekst, oransje aksent, Georgia i overskriftene
  const INK = '#16343b', MUTED = '#6d756a', ORANGE = '#ce603a', PAPER = '#f6f3e9', CARD = '#fffdf7', LINE = '#e3e4d8';
  const SANS = 'Arial,Helvetica,sans-serif', SERIF = "Georgia,'Times New Roman',serif";
  const eyebrow = t => `<p style="margin:0 0 12px;font:600 10px/1.5 ${SANS};letter-spacing:2px;color:${INK}">${t}</p>`;
  const rad = (a, b, c) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${LINE};font:600 14px/1.4 ${SANS};color:${INK}">${esc(a)}<br><span style="font-weight:400;font-size:12px;color:${MUTED}">${esc(b)}</span></td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${LINE};font:14px/1.4 ${SANS};color:${INK};white-space:nowrap">${esc(c)}</td></tr>`;
  const punkt = t => `<tr><td valign="top" style="padding:0 10px 10px 0;font:14px/1.6 ${SANS};color:${ORANGE}">●</td>
<td style="padding:0 0 10px;font:14px/1.6 ${SANS};color:#4c5b54">${esc(t)}</td></tr>`;

  const html = `<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${PAPER}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:28px 16px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

<tr><td style="padding:0 4px 18px;border-bottom:1px solid ${LINE}">
<a href="${SIDE}" style="font:800 24px/1 ${SANS};letter-spacing:-1.2px;color:${INK};text-decoration:none">hagefugler<span style="color:${ORANGE}">.no</span></a></td></tr>

<tr><td style="padding:30px 4px 6px">
${eyebrow('BESTILLINGSLISTEN')}
<h1 style="margin:0 0 16px;font:400 36px/1.08 ${SERIF};letter-spacing:-1.2px;color:${INK}">Du står på<br><em style="color:${ORANGE}">listen.</em></h1>
<p style="margin:0 0 26px;font:15px/1.7 ${SANS};color:${MUTED}">Hei ${esc(fornavn)}, takk! Du står nå på bestillingslisten for Hagefugler.</p>
</td></tr>

<tr><td style="padding:0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CARD};border:1px solid ${LINE};border-radius:14px">
<tr><td style="padding:22px 22px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="84" valign="middle" style="padding:0 18px 14px 0"><img src="${SIDE}/assets/box-front.webp" width="66" alt="Hagefugler-esken" style="display:block;width:66px;height:auto;border:0;font:11px/1.3 Arial,Helvetica,sans-serif;color:#6d756a"></td>
<td valign="middle" style="padding:0 0 14px">
<p style="margin:0 0 4px;font:600 17px/1.3 ${SANS};color:${INK}">Hagefugler</p>
<p style="margin:0;font:13px/1.5 ${SANS};color:${MUTED}">50 fugler og noen bonusdyr i illustrert eske.<br><strong style="color:${INK}">199 kr</strong> per kortstokk</p>
</td></tr></table>
${eyebrow('DETTE HAR DU MELDT DEG PÅ')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE}">
${varer.map(v => rad(...v)).join('')}${rad(...fraktRad)}
<tr><td valign="bottom" style="padding:16px 0 6px">${eyebrow('TOTALT')}<span style="font:12px/1.5 ${SANS};color:${MUTED}">${esc(hvis)}</span></td>
<td align="right" valign="bottom" style="padding:16px 0 6px;font:400 34px/1 ${SERIF};letter-spacing:-1px;color:${INK};white-space:nowrap">${esc(kr(sum))}</td></tr>
</table>
<p style="margin:10px 0 14px;font:13px/1.6 ${SANS};color:${MUTED}">${esc(levering)}</p>
</td></tr></table>
</td></tr>

<tr><td style="padding:28px 4px 0">
${eyebrow('SLIK GÅR DET VIDERE')}
<table role="presentation" cellpadding="0" cellspacing="0">${videre.map(punkt).join('')}</table>
<p style="margin:12px 0 24px;font:15px/1.7 ${SANS};color:${INK}">Vil du endre noe eller melde deg av, svarer du bare på denne e-posten.</p>
<a href="${VILKAR}" style="display:inline-block;padding:12px 22px;border:1px solid #bac3b4;border-radius:30px;font:13px/1 ${SANS};color:${INK};text-decoration:none">Les vilkårene&nbsp;&nbsp;↗</a>
</td></tr>

<tr><td style="padding:34px 4px 0">
<p style="margin:0;padding-top:16px;border-top:1px solid ${LINE};font:12px/1.7 ${SANS};color:${MUTED}">Hagefugler · Jakob Myking · org.nr. 938 664 641<br>
<a href="mailto:${KONTAKT}" style="color:${MUTED}">${KONTAKT}</a> · <a href="${SIDE}" style="color:${MUTED}">hagefugler.no</a><br>
Du får denne e-posten fordi du satte deg på bestillingslisten for Hagefugler.</p>
</td></tr>

</table></td></tr></table></body></html>`;
  return { emne, tekst, html };
}

const kr = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} kr`;
const mobil = m => String(m || '').replace(/^(\d{3})(\d{2})(\d{3})$/, '$1 $2 $3');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function svar(t) { return ContentService.createTextOutput(t); }
