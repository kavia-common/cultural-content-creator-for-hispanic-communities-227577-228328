describe('Onboarding (placeholder)', () => {
  it('shows onboarding for first-time users and can complete it (outline)', () => {
    // Outline only; flesh out selectors once UI stabilizes.
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem('ccch.onboarding.completed', 'false');
      }
    });

    cy.contains(/welcome|bienvenido/i).should('exist');

    // Click through steps
    cy.contains(/next|siguiente/i).click();
    cy.contains(/next|siguiente/i).click();
    cy.contains(/next|siguiente/i).click();
    cy.contains(/next|siguiente/i).click();

    cy.contains(/finish|finalizar/i).click();
    cy.contains(/welcome|bienvenido/i).should('not.exist');
    cy.window().its('localStorage').invoke('getItem', 'ccch.onboarding.completed').should('eq', 'true');
  });
});
