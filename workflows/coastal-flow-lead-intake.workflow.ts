import { workflow, node, trigger, ifElse, switchCase, sticky, expr } from '@n8n/workflow-sdk';

const startDemo = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start Synthetic Demo', position: [120, 300], parameters: {} },
  output: [{}]
});

const loadFixtures = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Load Synthetic Inquiries',
    position: [380, 300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `return [
  { json: { source_submission_id: 'CFM-DEMO-001', fixture_case: 'happy_path', name: 'Jordan Lee', email: 'jordan.lee@example.test', phone: '727-555-0101', project_type: 'Marine Utility — Water System', project_description: 'Location: Clearwater Municipal Marina. A potable water line is leaking near B dock. Please contact us to discuss an assessment.' } },
  { json: { source_submission_id: 'CFM-DEMO-002', fixture_case: 'missing_location_exception', name: 'Sam Ortiz', email: 'sam.ortiz@example.test', phone: '', project_type: 'Marine Utility — Emergency Repair', project_description: 'A buried marina water main failed overnight. We need to discuss the next safe step, but the project location was not included.' } },
  { json: { source_submission_id: 'CFM-DEMO-001', fixture_case: 'duplicate_replay', name: 'Jordan Lee', email: 'jordan.lee@example.test', phone: '727-555-0101', project_type: 'Marine Utility — Water System', project_description: 'Location: Clearwater Municipal Marina. A potable water line is leaking near B dock. Please contact us to discuss an assessment.' } },
  { json: { source_submission_id: '', fixture_case: 'missing_id_rejection', name: 'Casey Morgan', email: 'casey.morgan@example.test', phone: '', project_type: 'General Inquiry', project_description: 'Location: St. Petersburg. Please review this synthetic submission without an idempotency key.' } }
];`
    }
  },
  output: [{ source_submission_id: 'CFM-DEMO-001', fixture_case: 'happy_path', name: 'Jordan Lee', email: 'jordan.lee@example.test', phone: '727-555-0101', project_type: 'Marine Utility — Water System', project_description: 'Location: Clearwater Municipal Marina. A potable water line is leaking near B dock.' }]
});

const prepareRecords = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validate and Prepare Mock CRM Records',
    position: [680, 300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const items = $input.all();
const allowedProjectTypes = ['Marine Utility — Water System', 'Marine Utility — Sewer/Wastewater', 'Marine Utility — Emergency Repair', 'Marina Repair — Pile Guides/Gangway', 'Marina Repair — Decking/Hardware', 'Marina Infrastructure — Full Replacement', 'General Inquiry'];
return items.map((item) => {
  const source = item.json;
  const name = String(source.name || '').trim();
  const email = String(source.email || '').trim();
  const description = String(source.project_description || '').trim();
  const sourceSubmissionId = String(source.source_submission_id || '').trim();
  const projectType = String(source.project_type || 'General Inquiry').trim();
  const requiredFieldsPresent = Boolean(sourceSubmissionId && name && email && description);
  const projectTypeAllowed = allowedProjectTypes.includes(projectType);
  const locationMatch = description.match(/Location:\\s*([^.]+)/i);
  const projectLocation = locationMatch ? locationMatch[1].trim() : '';
  const urgencyCandidate = projectType === 'Marine Utility — Emergency Repair' || /failed overnight|emergency|urgent/i.test(description) ? 'REVIEW_PROMPTLY' : 'STANDARD_REVIEW';
  const state = !requiredFieldsPresent || !projectTypeAllowed ? 'REJECTED' : projectLocation ? 'READY_FOR_REVIEW' : 'NEEDS_INFORMATION';
  const nextAction = state === 'REJECTED' ? 'Human reviews invalid or unsupported submission; no outbound action.' : state === 'NEEDS_INFORMATION' ? 'Human reviews and may send the unsent location clarification draft.' : 'Human reviews project fit, urgency, feasibility, schedule, and response.';
  const responseDraft = state === 'NEEDS_INFORMATION' ? 'Thanks for contacting Coastal Flow Marine. Before our team reviews the project, please reply with the marina or project location. This is a demo draft and has not been sent.' : state === 'READY_FOR_REVIEW' ? 'Thanks for contacting Coastal Flow Marine. Our team will review the project information and follow up about the appropriate next step. This is a demo draft and has not been sent.' : '';
  return { json: { source_submission_id: sourceSubmissionId, lead_id: sourceSubmissionId ? 'LEAD-' + sourceSubmissionId : '', name, email, phone: String(source.phone || '').trim(), project_type: projectType, project_description: description, project_location: projectLocation, summary: projectType + ': ' + description, urgency_candidate: urgencyCandidate, extraction_confidence: projectLocation ? 0.98 : 0.72, extraction_boundary: 'MOCKED_AI_OUTPUT_VALIDATED_BY_DETERMINISTIC_SCHEMA', state, next_action: nextAction, response_draft: responseDraft, follow_up_required: state !== 'REJECTED', policy_status: 'SIMULATED_DEMO_ASSUMPTION; CUSTOMER_APPROVAL_REQUIRED', decision_owner: 'HUMAN' } };
});`
    }
  },
  output: [{ source_submission_id: 'CFM-DEMO-001', lead_id: 'LEAD-CFM-DEMO-001', name: 'Jordan Lee', email: 'jordan.lee@example.test', phone: '727-555-0101', project_type: 'Marine Utility — Water System', project_description: 'Location: Clearwater Municipal Marina. A potable water line is leaking near B dock.', project_location: 'Clearwater Municipal Marina', summary: 'Marine Utility — Water System: Location: Clearwater Municipal Marina.', urgency_candidate: 'STANDARD_REVIEW', extraction_confidence: 0.98, extraction_boundary: 'MOCKED_AI_OUTPUT_VALIDATED_BY_DETERMINISTIC_SCHEMA', state: 'READY_FOR_REVIEW', next_action: 'Human reviews project fit, urgency, feasibility, schedule, and response.', response_draft: 'This is a demo draft and has not been sent.', follow_up_required: true, policy_status: 'SIMULATED_DEMO_ASSUMPTION; CUSTOMER_APPROVAL_REQUIRED', decision_owner: 'HUMAN' }]
});

const persistableSubmission = ifElse({
  version: 2.3,
  config: {
    name: 'Has Valid Submission ID',
    position: [990, 160],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [
          {
            leftValue: expr('{{ $json.state }}'),
            operator: { type: 'string', operation: 'notEquals' },
            rightValue: 'REJECTED'
          }
        ],
        combinator: 'and'
      }
    }
  }
});

const upsertMockCrm = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Upsert Mock CRM Lead',
    position: [1260, 160],
    parameters: {
      resource: 'row', operation: 'upsert',
      dataTableId: { __rl: true, mode: 'id', value: 'NfiDuGqUfwUAkXd4', cachedResultName: 'Coastal Flow Demo Leads' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'source_submission_id', condition: 'eq', keyValue: expr('{{ $json.source_submission_id }}') }] },
      columns: { mappingMode: 'autoMapInputData', matchingColumns: ['source_submission_id'], value: null },
      options: {}
    }
  },
  output: [{ id: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }]
});

const routeByState = switchCase({
  version: 3.4,
  config: {
    name: 'Route by Review State', position: [1010, 420],
    parameters: {
      mode: 'rules',
      rules: { values: [
        { renameOutput: true, outputKey: 'Ready for Human Review', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.state }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'READY_FOR_REVIEW' }], combinator: 'and' } },
        { renameOutput: true, outputKey: 'Needs Information', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.state }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'NEEDS_INFORMATION' }], combinator: 'and' } }
      ] },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'Manual Review Fallback' }
    }
  }
});

const readyForReview = node({
  type: 'n8n-nodes-base.set', version: 3.5,
  config: { name: 'Ready - Human Review', position: [1320, 340], parameters: { mode: 'manual', includeOtherFields: true, assignments: { assignments: [{ id: 'demo-outcome', name: 'demo_outcome', value: 'MOCK CRM lead upserted; human review required; no external message sent.', type: 'string' }, { id: 'external-send', name: 'external_send_performed', value: false, type: 'boolean' }] } } },
  output: [{ source_submission_id: 'CFM-DEMO-001', state: 'READY_FOR_REVIEW', demo_outcome: 'MOCK CRM lead upserted; human review required; no external message sent.', external_send_performed: false }]
});

const needsInformation = node({
  type: 'n8n-nodes-base.set', version: 3.5,
  config: { name: 'Needs Information - Human Review', position: [1320, 500], parameters: { mode: 'manual', includeOtherFields: true, assignments: { assignments: [{ id: 'demo-outcome', name: 'demo_outcome', value: 'MOCK CRM lead upserted; unsent location clarification draft prepared for human review.', type: 'string' }, { id: 'external-send', name: 'external_send_performed', value: false, type: 'boolean' }] } } },
  output: [{ source_submission_id: 'CFM-DEMO-002', state: 'NEEDS_INFORMATION', demo_outcome: 'MOCK CRM lead upserted; unsent location clarification draft prepared for human review.', external_send_performed: false }]
});

const fallbackReview = node({
  type: 'n8n-nodes-base.set', version: 3.5,
  config: { name: 'Fallback - Manual Review', position: [1320, 660], parameters: { mode: 'manual', includeOtherFields: true, assignments: { assignments: [{ id: 'demo-outcome', name: 'demo_outcome', value: 'Submission held for manual review; no external message sent.', type: 'string' }, { id: 'external-send', name: 'external_send_performed', value: false, type: 'boolean' }] } } },
  output: [{ state: 'REJECTED', demo_outcome: 'Submission held for manual review; no external message sent.', external_send_performed: false }]
});

const boundariesNote = sticky('## Demo boundaries\n- **REAL:** n8n orchestration, deterministic validation, durable local Data Table upsert.\n- **MOCKED:** website submission, CRM, AI extraction, follow-up task, response draft.\n- **UNKNOWN:** customer CRM, inbox, urgency policy, qualification, pricing, assignment, and approval rules.\n- No credentials, external sends, quote calculations, or project acceptance.', [startDemo, loadFixtures, prepareRecords], { color: 5 });
const authorityNote = sticky('## Rule authority\n- Required form fields and published project categories: **PUBLICLY_VERIFIED** from coastalflowmarine.com/contact.\n- State names, follow-up behavior, urgency candidate, and response wording: **SIMULATED_DEMO_ASSUMPTION**.\n- Actual urgency, fit, feasibility, schedule, pricing, and outbound approval: **UNKNOWN_CUSTOMER_POLICY** owned by a human.', [routeByState, readyForReview, needsInformation, fallbackReview], { color: 3 });

export default workflow('coastal-flow-lead-intake-demo', 'Coastal Flow — Inquiry to Qualified Lead Demo')
  .add(startDemo).to(loadFixtures).to(prepareRecords)
  .add(prepareRecords).to(persistableSubmission.onTrue(upsertMockCrm))
  .add(prepareRecords).to(routeByState.onCase(0, readyForReview).onCase(1, needsInformation).onCase(2, fallbackReview))
  .add(boundariesNote).add(authorityNote);
