import { workflowImportValidator, validateWorkflowImport } from '../src/lib/flows/workflow-import-schema';
import * as fs from 'fs';
import * as path from 'path';

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
  
  test('should validate a valid workflow import', () => {
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
});