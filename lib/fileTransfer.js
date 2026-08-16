const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function validateFile(file) {
  if (!file) return { valid: false, error: 'No file selected.' };
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}` };
  }
  return { valid: true };
}

// FIX: Guard against undefined/null/NaN bytes — was producing "NaN undefined"
export function formatFileSize(bytes) {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getFileIcon(fileType) {
  if (!fileType) return '📄';
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎬';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return '📦';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📎';
  if (fileType.startsWith('text/')) return '📃';
  return '📄';
}

export function getFileColor(fileType) {
  if (!fileType) return '#7c3aed';
  if (fileType.startsWith('image/')) return '#ec4899';
  if (fileType.startsWith('video/')) return '#f59e0b';
  if (fileType.startsWith('audio/')) return '#10b981';
  if (fileType.includes('pdf')) return '#ef4444';
  if (fileType.includes('zip') || fileType.includes('rar')) return '#f59e0b';
  return '#7c3aed';
}

export function prepareFileForSending(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        data: reader.result,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function createDownloadUrl(data, type) {
  const blob = new Blob([data], { type });
  return URL.createObjectURL(blob);
}

export function createPreviewUrl(data, type) {
  if (type && type.startsWith('image/')) {
    return createDownloadUrl(data, type);
  }
  return null;
}
