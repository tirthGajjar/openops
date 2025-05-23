import { Static, Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Trigger } from './triggers/trigger';

export const WorkflowTemplateSchema = Type.Object({
  displayName: Type.String(),
  trigger: Trigger,
  valid: Type.Boolean(),
});

export type WorkflowTemplate = Static<typeof WorkflowTemplateSchema>;

export const triggerValidator = TypeCompiler.Compile(Trigger);

export function validateTriggerImport(triggerImport: Trigger): {
  success: boolean;
  errors?: string[];
} {
  try {
    const errors = Array.from(triggerValidator.Errors(triggerImport));

    if (errors.length > 0) {
      return {
        success: false,
        errors: errors.map((error) => `${error.path}: ${error.message}`),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: [
        (error as Error).message
          ? (error as Error).message
          : 'Unknown validation error',
      ],
    };
  }
}
