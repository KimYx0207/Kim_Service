export async function copyRequest(textarea, clipboard) {
    try {
      if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('Clipboard unavailable');
      await clipboard.writeText(textarea.value);
      return true;
    } catch {
      const editor = textarea.closest?.('details');
      if (editor) editor.open = true;
      textarea.focus();
      textarea.select();
      return false;
    }
  }
