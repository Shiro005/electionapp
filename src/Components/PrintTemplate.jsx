import { marathiTranslations as t } from '../translations/marathi';

// export as default function that returns HTML string (not JSX)
function PrintTemplate({ voter, familyMembers = [], candidateInfo = {}, type = 'voter' }) {
  const voterBlock = (v) => `
    <div style="padding:8px 0;font-size:14px;line-height:1.4;">
      <div style="margin-bottom:6px;"><strong>${t.name}:</strong> ${v?.name || 'N/A'}</div>
      <div style="margin-bottom:6px;"><strong>${t.voterId}:</strong> ${v?.voterId || v?.voterID || 'N/A'}</div>
      <div style="margin-bottom:6px;"><strong>${t.serialNumber}:</strong> ${v?.serialNumber || v?.sr || 'N/A'}</div>
      <div style="margin-bottom:6px;"><strong>${t.booth}:</strong> ${v?.boothNumber || 'N/A'}</div>
      <div style="margin-bottom:6px;"><strong>${t.age}:</strong> ${v?.age || 'N/A'}</div>
      <div style="margin-bottom:6px;"><strong>${t.gender}:</strong> ${v?.gender || 'N/A'}</div>
      <div style="margin-bottom:6px;"><strong>${t.address}:</strong> ${v?.pollingStationAddress || v?.address || 'N/A'}</div>
      <div style="margin-bottom:6px;"><strong>${t.phone}:</strong> ${v?.phoneNumber || v?.phone || 'N/A'}</div>
    </div>
  `;

  const familyHtml = familyMembers.length
    ? `<div style="margin-top:8px;">
         <div style="text-align:center;font-weight:700;margin-bottom:6px">${t.familyMembers}</div>
         ${familyMembers.map(m => voterBlock(m)).join('')}
       </div>`
    : '';

  // include Google font for Devanagari (will be downloaded by html2canvas if CORS allowed)
  const fontLink = `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet">`;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        ${fontLink}
        <style>
          body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; margin:0; padding:0; color:#000; }
          .brand { background: linear-gradient(90deg,#f97316,#fb923c); color:#fff; padding:10px 8px; text-align:center; }
          .brand .party{ font-size:12px; opacity:0.9; }
          .brand .name{ font-size:16px; font-weight:700; margin-top:3px; }
          .container{ padding:10px; width:360px; box-sizing:border-box; }
          .divider{ border-top:1px dashed #000; margin:8px 0; }
        </style>
      </head>
      <body>
        <div class="brand">
          <div class="party">${candidateInfo.party || ''}</div>
          <div class="name">${candidateInfo.name || ''}</div>
          <div class="slogan" style="font-size:12px;opacity:0.9;margin-top:4px">${candidateInfo.slogan || ''}</div>
        </div>

        <div class="container">
          <div style="text-align:center;margin:8px 0;font-weight:700;font-size:16px;">${t.name}: ${voter?.name || ''}</div>
          ${voterBlock(voter)}
          ${type === 'family' ? familyHtml : ''}
          <div class="divider"></div>
          <div style="font-size:11px; margin-top:6px;">${candidateInfo.contact ? `Contact: ${candidateInfo.contact}` : ''}</div>
          <div style="font-size:11px; margin-top:4px;">${candidateInfo.area ? `Area: ${candidateInfo.area}` : ''}</div>
        </div>
      </body>
    </html>
  `;
}

export { PrintTemplate };