describe('Preview (outline)', () => {
  it('toggles between Facebook and WhatsApp preview modes', () => {
    cy.visit('/');

    // NOTE: This is an outline spec; selectors may evolve as UI stabilizes.
    // Current PreviewPanel uses these stable testids:
    // - channel-whatsapp
    // - channel-facebook
    // - wa-preview
    // - fb-preview

    cy.get('[data-testid="channel-facebook"]').click();
    cy.get('[data-testid="fb-preview"]').should('exist');

    cy.get('[data-testid="channel-whatsapp"]').click();
    cy.get('[data-testid="wa-preview"]').should('exist');
  });

  it('shows warnings for overly long text (outline)', () => {
    cy.visit('/');

    // Outline only: once UI includes a direct way to input long text into preview,
    // add steps to create/approve a caption > max length and assert validation UI.
    // Example expected assertion:
    // cy.contains(/text is too long|demasiado largo/i).should('exist');
  });
});
