import { Static, Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Action } from './actions/action';
import { Trigger } from './triggers/trigger';

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
 * - Basic metadata (name, description, tags)
 * - Template with trigger and actions
 * - Recursive action structures (via the Action type from action.ts)
 */
export const WorkflowImportSchema = Type.Object({
  // Common workflow metadata
  name: Type.String(),
  description: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  
  // Timestamps (as string for compatibility)
  created: Type.Optional(Type.String()),
  updated: Type.Optional(Type.String()),
  
  // Optional blocks array for workflow definitions
  blocks: Type.Optional(Type.Array(Type.Any())),
  
  // The template contains the trigger and actions
  template: WorkflowTemplateSchema,
});

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
export function validateWorkflowImport(workflowImport: unknown): {
  success: boolean;
  errors?: string[];
} {
  try {
    const isValid = workflowImportValidator.Check(workflowImport);
    
    if (!isValid) {
      const errors = Array.from(workflowImportValidator.Errors(workflowImport)).map(
        (error) => `${error.path}: ${error.message}`
      );
      return { success: false, errors };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: [(error as Error).message ? (error as Error).message : 'Unknown validation error']
    };
  }
}