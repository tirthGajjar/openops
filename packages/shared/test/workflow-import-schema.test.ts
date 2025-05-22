import { workflowImportValidator, validateWorkflowImport } from '../src/lib/flows/workflow-import-schema';
import * as fs from 'fs';
import * as path from 'path';
import { ActionType, BranchOperator } from '../src/lib/flows/actions/action';
import { TriggerType } from '../src/lib/flows/triggers/trigger';

describe('WorkflowImportSchema', () => {
  let sampleWorkflow: any;
  
  beforeAll(() => {
    // Load sample workflow from e2e tests
    const samplePath = path.resolve(
      __dirname, 
      '../../tests-e2e/assets/workflow-with-all-simple-nested-blocks.json'
    );
    sampleWorkflow = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  });
  
  test('should validate a valid workflow import with sample file', () => {
    const isValid = workflowImportValidator.Check(sampleWorkflow);
    expect(isValid).toBe(true);
  });
  
  test('validateWorkflowImport should return success for valid workflow', () => {
    const result = validateWorkflowImport(sampleWorkflow);
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });
  
  test('validateWorkflowImport should return errors for invalid workflow', () => {
    const invalidWorkflow = { ...sampleWorkflow, template: {} };
    const result = validateWorkflowImport(invalidWorkflow);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('should validate a workflow with all action types', () => {
    // Create a test workflow with all action types
    const workflow = {
      ...sampleWorkflow,
      template: {
        ...sampleWorkflow.template,
        trigger: {
          name: 'test-trigger',
          displayName: 'Test Trigger',
          valid: true,
          type: TriggerType.EMPTY,
          settings: {},
          nextAction: {
            name: 'code-action',
            displayName: 'Code Action',
            type: ActionType.CODE,
            valid: true,
            settings: {
              sourceCode: {
                code: 'export const code = async () => { return true; }',
                packageJson: '{}'
              },
              input: {},
              inputUiInfo: {},
              errorHandlingOptions: {}
            },
            nextAction: {
              name: 'branch-action',
              displayName: 'Branch Action',
              type: ActionType.BRANCH,
              valid: true,
              settings: {
                conditions: [
                  [
                    {
                      operator: BranchOperator.TEXT_CONTAINS,
                      firstValue: 'test',
                      secondValue: 'value',
                      caseSensitive: false
                    }
                  ]
                ],
                inputUiInfo: {}
              }
            }
          }
        }
      }
    };

    const result = validateWorkflowImport(workflow);
    expect(result.success).toBe(true);
  });
});