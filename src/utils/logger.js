let logContainer;

export function initLogger(container) {
  logContainer = container;
}

export function logAgent(message, details = '') {
  if (!logContainer) {
    return;
  }

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span>Agent</span>
    <p><strong>${message}</strong><br />${details}</p>
  `;
  logContainer.prepend(entry);
}
