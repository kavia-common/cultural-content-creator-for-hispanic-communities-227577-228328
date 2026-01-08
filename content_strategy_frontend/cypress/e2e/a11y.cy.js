describe('Accessibility (axe)', () => {
  it('runs an axe scan on the main shell and Settings modal', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
        win.localStorage.setItem('ccch.onboarding.completed', 'true');
      }
    });

    cy.checkA11yPage();

    cy.get('[data-testid="settings-open"]').click();
    cy.contains(/settings|ajustes/i).should('exist');

    cy.checkA11yPage();
  });
});
