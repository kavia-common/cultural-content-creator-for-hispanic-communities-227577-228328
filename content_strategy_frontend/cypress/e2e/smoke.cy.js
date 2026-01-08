describe("Smoke", () => {
  it("loads the app shell", () => {
    cy.visit("/");
    cy.contains("Content Strategy").should("exist");
  });
});
