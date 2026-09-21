const QR_ENDPOINT = 'https://quickchart.io/qr';

export function appointmentQrPayload({ collection, id, module, appointmentDate, appointmentTime }) {
  return JSON.stringify({
    type: 'blu-agendamento',
    version: 1,
    collection,
    id,
    module,
    appointmentDate,
    appointmentTime,
  });
}

export function appointmentQrUrl(data) {
  return `${QR_ENDPOINT}?text=${encodeURIComponent(appointmentQrPayload(data))}&size=600&margin=2`;
}

export function parseAppointmentQr(value) {
  const raw = String(value || '').trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'blu-agendamento' && parsed.collection && parsed.id) return parsed;
  } catch (_error) {
    // Keep a small fallback for QR codes created by older portal versions.
  }
  const match = raw.match(/^blu-agendamento:([^:]+):([^:]+)$/i);
  return match ? { type: 'blu-agendamento', collection: match[1], id: match[2] } : null;
}
