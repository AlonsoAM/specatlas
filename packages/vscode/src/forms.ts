export interface FormOption {
  value: string
  label: string
  description?: string
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'radio'
  value?: string
  placeholder?: string
  hint?: string
  required?: boolean
  mono?: boolean
  deriveFrom?: string
  options?: FormOption[]
  showWhen?: { field: string; equals: string }
}

export interface FormOptions {
  title: string
  intro: string
  submitLabel: string
  nonce: string
  fields: FormField[]
  cancelLabel?: string
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fieldHtml(field: FormField): string {
  const attributes = [`data-field="${escapeHtml(field.name)}"`, `data-label="${escapeHtml(field.label)}"`]
  if (field.required) attributes.push('data-required="1"')
  if (field.type === 'text' || field.type === 'textarea') attributes.push('data-text="1"')
  if (field.deriveFrom) attributes.push(`data-derive-field="${escapeHtml(field.deriveFrom)}"`)
  if (field.showWhen) {
    attributes.push(`data-show-field="${escapeHtml(field.showWhen.field)}"`, `data-show-value="${escapeHtml(field.showWhen.equals)}"`)
  }
  const hint = field.hint ? `<p class="hint">${escapeHtml(field.hint)}</p>` : ''
  const label = `<label class="label" for="f-${escapeHtml(field.name)}">${escapeHtml(field.label)}${field.required ? ' <span class="req">*</span>' : ''}</label>`
  const cls = field.mono ? ' class="mono"' : ''

  if (field.type === 'select') {
    const options = (field.options ?? []).map((option) => `<option value="${escapeHtml(option.value)}"${option.value === (field.value ?? '') ? ' selected' : ''}>${escapeHtml(option.label)}${option.description ? ` — ${escapeHtml(option.description)}` : ''}</option>`).join('')
    return `<div class="field" ${attributes.join(' ')}>${label}<select id="f-${escapeHtml(field.name)}"${cls}>${options}</select>${hint}</div>`
  }

  if (field.type === 'radio') {
    const options = (field.options ?? [])
      .map(
        (option, index) => `<label class="option">
  <input type="radio" name="${escapeHtml(field.name)}" value="${escapeHtml(option.value)}"${(field.value ?? field.options?.[0]?.value) === option.value || (!field.value && index === 0) ? ' checked' : ''}>
  <span><b>${escapeHtml(option.label)}</b>${option.description ? `<small>${escapeHtml(option.description)}</small>` : ''}</span>
</label>`,
      )
      .join('')
    return `<div class="field" ${attributes.join(' ')}>${label}<div class="options">${options}</div>${hint}</div>`
  }

  if (field.type === 'textarea') {
    return `<div class="field" ${attributes.join(' ')}>${label}<textarea id="f-${escapeHtml(field.name)}" rows="3" placeholder="${escapeHtml(field.placeholder ?? '')}">${escapeHtml(field.value ?? '')}</textarea>${hint}</div>`
  }

  const list = field.options && field.options.length > 0 ? `<datalist id="l-${escapeHtml(field.name)}">${field.options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.description ?? option.label)}</option>`).join('')}</datalist>` : ''
  const listAttr = field.options && field.options.length > 0 ? ` list="l-${escapeHtml(field.name)}"` : ''
  return `<div class="field" ${attributes.join(' ')}>${label}<input id="f-${escapeHtml(field.name)}" type="text" value="${escapeHtml(field.value ?? '')}" placeholder="${escapeHtml(field.placeholder ?? '')}"${listAttr}${cls}>${list}${hint}</div>`
}

export function formHtml(options: FormOptions): string {
  const fields = options.fields.map(fieldHtml).join('\n')
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${options.nonce}';">
<style>
:root { color-scheme: light dark; }
body { margin: 0; padding: 26px 30px 60px; font: 13.5px/1.6 var(--vscode-font-family, system-ui); color: var(--vscode-foreground, #ddd); background: var(--vscode-editor-background, #1f1f1f); }
.shell { max-width: 720px; margin: 0 auto; }
h1 { font-size: 22px; margin: 0 0 4px; }
.intro { color: var(--vscode-descriptionForeground, #999); margin: 0 0 22px; }
.field { margin-bottom: 18px; }
.label { display: block; font-weight: 600; margin-bottom: 6px; }
.req { color: var(--vscode-charts-red, #f14c4c); }
.hint { margin: 5px 0 0; font-size: 12px; color: var(--vscode-descriptionForeground, #999); }
.input-error { border-color: var(--vscode-charts-red, #f14c4c) !important; }
input[type="text"], textarea, select { width: 100%; box-sizing: border-box; background: var(--vscode-input-background, #3c3c3c); color: var(--vscode-input-foreground, #ddd); border: 1px solid var(--vscode-input-border, transparent); border-radius: 8px; padding: 8px 11px; font: inherit; }
textarea { resize: vertical; }
.mono { font-family: var(--vscode-editor-font-family, monospace); }
.options { display: grid; gap: 8px; }
.option { display: flex; gap: 10px; align-items: flex-start; border: 1px solid var(--vscode-panel-border, #444); border-radius: 10px; padding: 10px 12px; cursor: pointer; background: color-mix(in srgb, var(--vscode-editorWidget-background, #252526) 60%, transparent); }
.option:hover { border-color: var(--vscode-focusBorder, #3794ff); }
.option input { margin-top: 3px; }
.option small { display: block; color: var(--vscode-descriptionForeground, #999); }
.actions { display: flex; gap: 10px; margin-top: 26px; }
button { font: inherit; border-radius: 8px; padding: 8px 16px; cursor: pointer; border: 1px solid transparent; }
button.primary { background: var(--vscode-button-background, #0e639c); color: var(--vscode-button-foreground, #fff); }
button.primary:hover { background: var(--vscode-button-hoverBackground, #1177bb); }
button.secondary { background: transparent; color: var(--vscode-foreground, #ddd); border-color: var(--vscode-panel-border, #444); }
.error-box { display: none; margin-bottom: 16px; border: 1px solid var(--vscode-charts-red, #f14c4c); background: color-mix(in srgb, var(--vscode-charts-red, #f14c4c) 12%, transparent); border-radius: 8px; padding: 8px 12px; }
</style>
</head>
<body>
<div class="shell">
  <h1>${escapeHtml(options.title)}</h1>
  <p class="intro">${escapeHtml(options.intro)}</p>
  <div class="error-box" id="errors"></div>
  <form id="form">
${fields}
    <div class="actions">
      <button type="submit" class="primary">${escapeHtml(options.submitLabel)}</button>
      <button type="button" class="secondary" id="cancel">${escapeHtml(options.cancelLabel ?? 'Cancelar')}</button>
    </div>
  </form>
</div>
<script nonce="${options.nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  var form = document.getElementById('form');
  var errorBox = document.getElementById('errors');
  function fields() { return Array.prototype.slice.call(document.querySelectorAll('[data-field]')); }
  function valueOf(field) {
    var name = field.getAttribute('data-field');
    var radios = field.querySelectorAll('input[type="radio"]');
    if (radios.length > 0) {
      for (var index = 0; index < radios.length; index += 1) if (radios[index].checked) return radios[index].value;
      return '';
    }
    var control = field.querySelector('input, textarea, select');
    return control ? control.value : '';
  }
  function refreshVisibility() {
    fields().forEach(function (field) {
      var dependency = field.getAttribute('data-show-field');
      if (!dependency) return;
      var expected = field.getAttribute('data-show-value');
      var source = document.querySelector('[data-field="' + dependency + '"]');
      var current = source ? valueOf(source) : '';
      field.style.display = current === expected ? '' : 'none';
    });
  }
  function slugify(text) {
    return (text || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  }
  function wireDerivations() {
    fields().forEach(function (field) {
      var sourceName = field.getAttribute('data-derive-field');
      if (!sourceName) return;
      var control = field.querySelector('input, textarea');
      var source = document.querySelector('[data-field="' + sourceName + '"]');
      var sourceControl = source ? source.querySelector('input, textarea') : null;
      if (!control || !sourceControl) return;
      var dirty = control.value.trim().length > 0;
      control.addEventListener('input', function () { dirty = control.value.trim().length > 0; });
      sourceControl.addEventListener('input', function () {
        if (!dirty) control.value = slugify(sourceControl.value);
      });
    });
  }
  form.addEventListener('input', refreshVisibility);
  form.addEventListener('change', refreshVisibility);
  wireDerivations();
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    errorBox.style.display = 'none';
    errorBox.textContent = '';
    var values = {};
    var missing = [];
    fields().forEach(function (field) {
      if (field.style.display === 'none') return;
      var control = field.querySelector('input, textarea, select');
      if (control) control.classList.remove('input-error');
      var value = valueOf(field).trim();
      values[field.getAttribute('data-field')] = value;
      if (field.getAttribute('data-required') === '1' && value.length === 0) {
        missing.push(field.getAttribute('data-label'));
        if (control) control.classList.add('input-error');
      }
    });
    if (missing.length > 0) {
      errorBox.textContent = 'Faltan campos obligatorios: ' + missing.join(', ');
      errorBox.style.display = 'block';
      return;
    }
    vscode.postMessage({ type: 'submit', values: values });
  });
  document.getElementById('cancel').addEventListener('click', function () { vscode.postMessage({ type: 'cancel' }); });
  refreshVisibility();
})();
</script>
</body>
</html>
`
}
