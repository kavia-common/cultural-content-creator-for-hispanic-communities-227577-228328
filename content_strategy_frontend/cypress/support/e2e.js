import 'cypress-axe';

// PUBLIC_INTERFACE
Cypress.Commands.add('checkA11yPage', () => {
  /** Inject axe and run a basic WCAG 2.1 AA scan for the current page. */
  cy.injectAxe();
  cy.checkA11y();
});
