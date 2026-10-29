// Presentation only: the caller validates eligibility and owns score submission.
export function createGuestForm({submit, document: doc = globalThis.document, location = globalThis.location, referrer = doc?.referrer} = {}) {
  if (typeof submit !== 'function' || !doc) throw new TypeError('A document and submit callback are required');
  const form = doc.createElement('form');
  form.className = 'embed-guest-form';
  form.hidden = true;
  form.setAttribute('aria-label', 'Submit a guest score');
  const heading = doc.createElement('h2');
  heading.textContent = 'Submit a guest score';
  const context = doc.createElement('p');
  let fromX = false;
  try {
    const params = new URL(location?.href ?? 'https://example.invalid/').searchParams;
    const host = referrer ? new URL(referrer).hostname.toLowerCase() : '';
    fromX = ['x', 'twitter'].includes((params.get('source') ?? params.get('utm_source') ?? '').toLowerCase()) ||
      ['x.com', 'twitter.com'].some(domain => host === domain || host.endsWith('.' + domain));
  } catch { /* An invalid referrer does not establish a source. */ }
  context.textContent = fromX ? 'Guest · From X (unverified)' : 'Guest';
  const fieldset = doc.createElement('fieldset');
  const legend = doc.createElement('legend');
  legend.textContent = 'Guest name: four letters A–Z';
  fieldset.append(legend);
  const inputs = Array.from({length: 4}, (_, index) => {
    const input = doc.createElement('input');
    input.type = 'text'; input.maxLength = 1; input.autocomplete = 'off';
    input.setAttribute('aria-label', `Guest name letter ${index + 1} of 4`);
    input.setAttribute('inputmode', 'text');
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
      if (input.value && index < 3) inputs[index + 1].focus();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Backspace' && !input.value && index > 0) {
        event.preventDefault(); inputs[index - 1].value = ''; inputs[index - 1].focus();
      }
    });
    input.addEventListener('paste', event => {
      const value = event.clipboardData?.getData('text')?.trim().toUpperCase() ?? '';
      event.preventDefault();
      if (!/^[A-Z]{4}$/.test(value)) { status.textContent = 'Paste exactly four letters A–Z.'; return; }
      inputs.forEach((slot, i) => { slot.value = value[i]; });
      status.textContent = ''; inputs[3].focus();
    });
    fieldset.append(input);
    return input;
  });
  const button = doc.createElement('button'); button.type = 'submit'; button.textContent = 'Submit score';
  const status = doc.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  form.append(heading, context, fieldset, button, status);
  let generation = 0, current = null, pending = false, accepted = false, disposed = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!current || pending || accepted || disposed) return;
    const name = inputs.map(input => input.value).join('');
    if (!/^[A-Z]{4}$/.test(name)) { status.textContent = 'Enter four letters A–Z.'; return; }
    const token = generation, record = current;
    pending = true; button.disabled = true; fieldset.disabled = true; legend.textContent='Guest name for this run (fixed for retries)'; status.textContent = 'Submitting…';
    try {
      const result = await submit(record, name);
      if (token !== generation || disposed) return;
      if (result?.success === false) throw new Error(result.message || 'Score submission is unavailable. Please retry.');
      accepted = true; button.textContent='Score saved'; status.textContent = result?.message || 'Score submitted.';
    } catch (error) {
      if (token !== generation || disposed) return;
      button.textContent='Retry score'; status.textContent = error?.message || 'Score submission is unavailable. Please retry.';
    } finally {
      if (token === generation && !disposed) { pending = false; button.disabled = accepted; }
    }
  });
  return {
    element: form,
    show(record) {
      if (disposed) return;
      if (current === record && !form.hidden) return;
      generation++; current = record; pending = false; accepted = false;
      inputs.forEach(input => { input.value = ''; });
      fieldset.disabled = false;
      legend.textContent='Guest name: four letters A–Z';button.textContent='Submit score';button.disabled = false; status.textContent = ''; form.hidden = false;
    },
    hide() { generation++; current = null; pending = false; form.hidden = true; status.textContent = ''; },
    dispose() { generation++; disposed = true; current = null; form.hidden = true; form.remove(); },
  };
}

