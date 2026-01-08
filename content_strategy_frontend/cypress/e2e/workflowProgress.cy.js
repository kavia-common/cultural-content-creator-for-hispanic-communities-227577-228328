describe('Workflow Progress (outline)', () => {
  it('supports pause/resume, request changes, approve, and advancing steps', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
        win.localStorage.setItem('ccch.onboarding.completed', 'true');
      }
    });

    cy.get('[data-testid="workflow-progress-panel"]').should('exist');

    // Current step should be Strategist initially.
    cy.get('[data-testid="workflow-step-Strategist"]').should('have.attr', 'aria-current', 'step');

    // Request changes
    cy.get('[data-testid="workflow-request-changes"]').click();
    cy.contains(/request changes|pedir cambios/i).should('exist');
    cy.get('#changes-comment').type('Please revise');
    cy.contains('button', /request changes|pedir cambios/i).click();
    cy.get('[data-testid="workflow-step-Strategist"]').contains(/changes requested|cambios solicitados/i);

    // Pause
    cy.get('[data-testid="workflow-pause"]').click();
    cy.get('#pause-reason').type('Waiting');
    cy.contains('button', /pause|pausar/i).click();
    cy.get('[data-testid="workflow-advance"]').should('be.disabled');

    // Resume
    cy.get('[data-testid="workflow-resume"]').click();
    cy.get('[data-testid="workflow-advance"]').should('be.disabled'); // still needs approval

    // Approve then advance
    cy.get('[data-testid="workflow-approve"]').click();
    cy.get('[data-testid="workflow-advance"]').should('not.be.disabled').click();

    // Next step becomes current
    cy.get('[data-testid="workflow-step-Copywriter"]').should('have.attr', 'aria-current', 'step');

    // Notifications appear via FeedbackRegion (role=status callouts)
    cy.get('[role="status"]').should('exist');
  });
});
