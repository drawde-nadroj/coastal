# Coastal Flow inquiry-to-qualified-lead demo

This BUILD artifact implements the selected SCOUT wedge. A synthetic website inquiry becomes a validated mock CRM lead, a review state, a next action, and an unsent response draft.

## Open and run

1. Open the local workflow: <http://localhost:5679/workflow/xIn7KLkIZBh7wbJ3>.
2. Confirm the workflow is inactive and has no credentials.
3. Select **Start Synthetic Demo** and run the workflow.
4. Inspect **Ready - Human Review** for the happy path.
5. Inspect **Needs Information - Human Review** for the missing-location handoff.
6. Inspect **Fallback - Manual Review** for the missing-id rejection.
7. Open the n8n Data Table named **Coastal Flow Demo Leads**. It should contain exactly two rows even though the workflow processes four input items and has been run repeatedly.

The workflow remains unpublished. It performs no external send or external-system write.

## Reproduce on a clean local n8n instance

The official n8n MCP compiles the Workflow SDK source. No standalone npm SDK dependency is required. Node type versions are pinned in `workflows/coastal-flow-lead-intake.workflow.ts`.

1. Use `n8n-lab_search_projects` to resolve the target local project.
2. Call `n8n-lab_create_data_table` with the name and columns in `setup/data-table.schema.json`.
3. Replace the current environment-specific Data Table value `NfiDuGqUfwUAkXd4` in the workflow source with the returned table ID.
4. Call `n8n-lab_get_workflow_sdk_reference`, then `n8n-lab_validate_workflow` with the complete source.
5. Create the validated workflow with `n8n-lab_create_workflow_from_code`.
6. Use `n8n-lab_prepare_workflow_pin_data` and `n8n-lab_test_workflow` with `{"Start Synthetic Demo":[{"json":{}}]}`.
7. Confirm `n8n-lab_get_data_table_rows` returns two rows after repeated executions.

Do not attach credentials, publish the workflow, or connect external systems during demo reproduction.

## Business path

`synthetic inquiry → deterministic validation → mocked extraction contract → local Data Table upsert → review-state routing → human review`

The happy-path fixture produces `READY_FOR_REVIEW`. The exception fixture produces `NEEDS_INFORMATION` and an unsent location clarification draft. The repeated `CFM-DEMO-001` submission updates the existing row instead of creating another lead.

## Evidence and executable rules

| Rule or claim | Status |
|---|---|
| Name, email, and project description are required website fields | `PUBLICLY_VERIFIED` at <https://coastalflowmarine.com/contact> |
| Published project-type values match the website form | `PUBLICLY_VERIFIED` at <https://coastalflowmarine.com/contact> |
| Missing location becomes `NEEDS_INFORMATION` | `SIMULATED_DEMO_ASSUMPTION` |
| Emergency wording creates `REVIEW_PROMPTLY` as a review prompt only | `SIMULATED_DEMO_ASSUMPTION`; actual priority is `UNKNOWN_CUSTOMER_POLICY` |
| Every valid lead requires human review | `SIMULATED_DEMO_ASSUMPTION` protecting `UNKNOWN_CUSTOMER_POLICY` |
| Duplicate `source_submission_id` values upsert one durable row | `SIMULATED_DEMO_ASSUMPTION`, implemented to protect the named duplicate-lead risk |
| Blank `source_submission_id` values are rejected before persistence | `SIMULATED_DEMO_ASSUMPTION`, implemented to protect the idempotency invariant |
| No response or quote is sent automatically | `PRODUCTION_REQUIREMENT` and observed demo boundary |

## Boundaries

- **REAL:** n8n orchestration, deterministic field validation, review-state routing, local durable Data Table upsert, and duplicate suppression.
- **MOCKED:** website submission, CRM, AI extraction output, follow-up task meaning, and response draft.
- **UNKNOWN:** real CRM, inbox, lead owner, urgency policy, qualification policy, pricing, scheduling, and approval rules.

The extraction shape is deliberately marked `MOCKED_AI_OUTPUT_VALIDATED_BY_DETERMINISTIC_SCHEMA`. No model credential is attached. AI does not determine urgency, feasibility, pricing, scheduling, or project acceptance.

## Acceptance evidence

Observed MCP test executions and current IDs are recorded in `demo-manifest.json`.

Observed after the final repeated execution:

- happy path: `CFM-DEMO-001 → READY_FOR_REVIEW`;
- exception: `CFM-DEMO-002 → NEEDS_INFORMATION`;
- blank idempotency key: `REJECTED → Fallback - Manual Review`, with no Data Table write;
- response drafts remained unsent;
- the Data Table contained two unique rows after processing four items per run repeatedly;
- no credentials were auto-assigned;
- the workflow remained inactive.

See:

- `workflows/coastal-flow-lead-intake.workflow.ts` — validated n8n Workflow SDK source;
- `fixtures/inquiries.json` — representative happy, exception, duplicate, and rejection fixtures;
- `expected/demo-results.json` — expected inspectable outcomes;
- `setup/data-table.schema.json` — reproducible mock CRM table schema;
- `demo-manifest.json` — local ownership, IDs, safety state, and observed verification.

## Technical boundary statement

This is an isolated local demonstration. It does not connect to Coastal Flow Marine's website, CRM, email, estimating, accounting, or scheduling systems. It uses no real customer records or credentials. A human owns project fit, urgency, feasibility, pricing, scheduling, and every outbound message.

## Discovery questions before connection

1. Which system owns leads today: email, spreadsheet, or CRM?
2. What unique form or CRM identifier should provide production idempotency?
3. Who reviews new inquiries, and what response target is approved?
4. Which missing details must be collected before a site visit or quote?
5. What qualifies an inquiry as an emergency, and who can make that decision?
6. Which messages may be automated, drafted only, or always written manually?
7. What customer-data retention, consent, and access controls are required?

## 30–60 second demo narrative

1. Start with four synthetic inquiries: one complete, one missing location, one repeated submission, and one missing idempotency key.
2. Show deterministic validation and the visibly mocked extraction contract.
3. Show the complete inquiry routed to human review with a next action and unsent acknowledgement draft.
4. Show the missing-location inquiry routed to a clarification handoff.
5. Show the missing-key fixture rejected before persistence.
6. Open the local mock CRM Data Table and show only two durable leads, even after another run.
7. Close by stating that the real form, CRM, policies, and approvals remain intentionally unconnected.

## Outreach-ready summary

The demo shows how a Coastal Flow Marine website inquiry can become an organized lead, next action, and response draft without manual re-entry. It also catches missing project information and suppresses duplicate leads while preserving human control over urgency, project fit, pricing, and customer communication.
# coastal
