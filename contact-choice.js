(function () {
  const contacts = [
    { label: '010-385 5248', phone: '60103855248' },
    { label: '010-373 8630', phone: '60103738630' }
  ];

  let pendingMessage = '';
  let lastFocusedElement = null;

  function ensureModal() {
    if (document.getElementById('oaWhatsappChooser')) return;

    const modal = document.createElement('div');
    modal.id = 'oaWhatsappChooser';
    modal.className = 'oa-contact-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="oa-contact-modal__backdrop" data-close-contact></div>
      <section class="oa-contact-modal__panel" role="dialog" aria-modal="true" aria-labelledby="oaContactTitle">
        <button class="oa-contact-modal__close" type="button" aria-label="Close" data-close-contact>×</button>
        <p class="oa-contact-modal__eyebrow">OBSIDIAN ARC LAB</p>
        <h2 id="oaContactTitle">Choose a WhatsApp contact</h2>
        <p class="oa-contact-modal__intro">Select either number and continue your enquiry on WhatsApp.</p>
        <div class="oa-contact-modal__choices">
          ${contacts.map((contact, index) => `
            <button class="oa-contact-choice" type="button" data-contact-index="${index}">
              <span class="oa-contact-choice__label">WHATSAPP ${index + 1}</span>
              <strong>${contact.label}</strong>
              <span class="oa-contact-choice__action">Continue ↗</span>
            </button>
          `).join('')}
        </div>
      </section>`;

    document.body.appendChild(modal);

    modal.addEventListener('click', function (event) {
      const closeTarget = event.target.closest('[data-close-contact]');
      if (closeTarget) {
        closeChooser();
        return;
      }

      const choice = event.target.closest('[data-contact-index]');
      if (!choice) return;

      const contact = contacts[Number(choice.dataset.contactIndex)];
      if (!contact) return;

      const url = 'https://wa.me/' + contact.phone + (pendingMessage ? '?text=' + encodeURIComponent(pendingMessage) : '');
      window.open(url, '_blank', 'noopener');
      closeChooser();
    });
  }

  function openChooser(message) {
    ensureModal();
    pendingMessage = message || '';
    lastFocusedElement = document.activeElement;
    const modal = document.getElementById('oaWhatsappChooser');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('oa-contact-modal-open');
    const firstChoice = modal.querySelector('.oa-contact-choice');
    if (firstChoice) firstChoice.focus();
  }

  function closeChooser() {
    const modal = document.getElementById('oaWhatsappChooser');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('oa-contact-modal-open');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  window.openWhatsAppChoice = openChooser;

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeChooser();
  });

  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href*="wa.me/"]');
    if (!link) return;

    let message = '';
    try {
      const url = new URL(link.href, window.location.href);
      message = url.searchParams.get('text') || '';
    } catch (_) {}

    event.preventDefault();
    openChooser(message);
  });
})();
