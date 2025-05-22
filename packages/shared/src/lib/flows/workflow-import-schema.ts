import { Static, Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Action } from './actions/action';
import { Trigger } from './triggers/trigger';
import { FlowTemplateMetadata } from './dto/flow-template-request';

export const WorkflowTemplateSchema = Type.Object({
  displayName: Type.String(),
  trigger: Trigger,
  valid: Type.Boolean(),
});

export type WorkflowTemplate = Static<typeof WorkflowTemplateSchema>;

export const WorkflowImportSchema = Type.Composite([
  Type.Omit(FlowTemplateMetadata, ['id', 'type', 'projectId', 'organizationId']),
  Type.Object({
    template: WorkflowTemplateSchema,
  }),
]);

export type WorkflowImport = Static<typeof WorkflowImportSchema>;

export const workflowImportValidator = TypeCompiler.Compile(WorkflowImportSchema);

export type WorkflowImportInput = {
  displayName: string;
  description?: string;
  template: {
    displayName: string;
    trigger: Trigger;
    valid: boolean;
  };
  [key: string]: unknown;
};

export function validateWorkflowImport(workflowImport: WorkflowImportInput): {
  success: boolean;
  errors?: string[];
} {
  try {
    const errors = Array.from(workflowImportValidator.Errors(workflowImport));
    
    if (errors.length > 0) {
      return { 
        success: false, 
        errors: errors.map(error => `${error.path}: ${error.message}`)
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: [(error as Error).message ? (error as Error).message : 'Unknown validation error']
    };
  }
}