import { Static, Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Action } from './actions/action';
import { Trigger } from './triggers/trigger';
import { FlowTemplateMetadata } from './dto/flow-template-request';

/**
 * Schema for workflow import validation
 * 
 * This schema validates imported workflows against the recursive Action type
 * from action.ts, ensuring all supported block, code, loop, branch, and split
 * structures, and all possible branch operators are validated properly.
 * 
 * The schema is designed to be future-proof by directly using the imported types
 * from action.ts, so any updates to action structures or operators will automatically
 * be supported by this schema without requiring updates.
 */

/**
 * The template schema defines the main structure of a workflow
 * with a trigger that may have next actions
 */
export const WorkflowTemplateSchema = Type.Object({
  displayName: Type.String(),
  trigger: Trigger,
  valid: Type.Boolean(),
});

export type WorkflowTemplate = Static<typeof WorkflowTemplateSchema>;

/**
 * The workflow import schema validates the top-level workflow object
 * 
 * This schema validates the structure of imported workflows, including:
 * - Metadata from FlowTemplateMetadata (name, description, tags, etc.)
 * - Template with trigger and actions
 * - Recursive action structures (via the Action type from action.ts)
 */
export const WorkflowImportSchema = Type.Composite([
  Type.Omit(FlowTemplateMetadata, ['id', 'type', 'projectId', 'organizationId']), // Using existing metadata but omitting server-specific fields
  Type.Object({
    // The template contains the trigger and actions
    template: WorkflowTemplateSchema,
  }),
]);

export type WorkflowImport = Static<typeof WorkflowImportSchema>;

/**
 * Compiled validator for workflow imports
 * 
 * This uses TypeCompiler for runtime validation of imported workflows.
 * Since it directly uses the Action type from action.ts, it supports
 * all action types, branch conditions, and operators defined there.
 */
export const workflowImportValidator = TypeCompiler.Compile(WorkflowImportSchema);

/**
 * Input type for workflow import validation
 */
export type WorkflowImportInput = {
  displayName: string;
  description?: string;
  template: {
    displayName: string;
    trigger: Trigger;
    valid: boolean;
  };
  [key: string]: unknown; // Allow additional properties for flexible validation
};

/**
 * Validate a workflow import object
 * 
 * @param workflowImport The workflow import object to validate
 * @returns Validation result with boolean success flag and errors if any
 * 
 * @example
 * ```typescript
 * // Example usage for validating a workflow import in a backend endpoint
 * import { validateWorkflowImport } from '@openops/shared';
 * 
 * // In your API endpoint or service
 * export async function importWorkflow(req: Request, res: Response) {
 *   try {
 *     const workflowData = req.body;
 *     const validationResult = validateWorkflowImport(workflowData);
 *     
 *     if (!validationResult.success) {
 *       return res.status(400).json({
 *         error: 'Invalid workflow structure',
 *         details: validationResult.errors
 *       });
 *     }
 *     
 *     // Process valid workflow data
 *     // ...
 *     
 *     return res.status(200).json({ success: true, message: 'Workflow imported successfully' });
 *   } catch (error) {
 *     // Handle unexpected errors
 *     return res.status(500).json({ error: 'Failed to import workflow' });
 *   }
 * }
 * ```
 */
export function validateWorkflowImport(workflowImport: WorkflowImportInput): {
  success: boolean;
  errors?: string[];
} {
  try {
    // Perform validation once and collect errors in a single pass
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