export function collectAttachmentFiles(...sources) {
  const files = [];

  const visit = value => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'string') {
      files.push({ url: value, name: 'Arquivo anexado' });
      return;
    }
    if (typeof value !== 'object') return;

    const url = value.url || value.downloadURL || value.downloadUrl || value.uri || value.data;
    if (url) {
      files.push({
        ...value,
        url,
        name: value.name || value.fileName || value.filename || 'Arquivo anexado',
      });
      return;
    }
    Object.values(value).forEach(visit);
  };

  sources.forEach(visit);
  return [...new Map(files.map((file, index) => [file.url || `${file.name}-${index}`, file])).values()];
}
