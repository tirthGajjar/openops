import {
  ApplicationError,
  ErrorCode,
  validateWorkflowImport,
} from '@openops/shared';
import { create } from '../../../../src/app/flows/flow/flow.service';
import { flowVersionService } from '../../../../src/app/flows/flow-version/flow-version.service';
import { flowRepo } from '../../../../src/app/flows/flow/flow.repo';

jest.mock('@openops/shared', () => {
  const original = jest.requireActual('@openops/shared');
  return {
    ...original,
    validateWorkflowImport: jest.fn(),
    openOpsId: jest.fn().mockReturnValue('flow-id'),
  };
});

jest.mock('../../../../src/app/flows/flow-version/flow-version.service', () => {
  return {
    flowVersionService: {
      createEmptyVersion: jest.fn(),
    },
  };
});

jest.mock('../../../../src/app/flows/flow/flow.repo', () => {
  return {
    flowRepo: jest.fn().mockReturnValue({
      save: jest.fn(),
    }),
  };
});

const mockValidateWorkflowImport = validateWorkflowImport as jest.Mock;
const mockFlowRepoSave = flowRepo().save as jest.Mock;
const mockCreateEmptyVersion = flowVersionService.createEmptyVersion as jest.Mock;

describe('create function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateWorkflowImport.mockReturnValue({ success: true });
    mockFlowRepoSave.mockResolvedValue({
      id: 'flow-id',
      projectId: 'project-id',
    });
    mockCreateEmptyVersion.mockResolvedValue({
      id: 'version-id',
      flowId: 'flow-id',
    });
  });

  it('should validate workflow import when trigger is provided', async () => {
    const params = {
      userId: 'user-id',
      projectId: 'project-id',
      request: {
        projectId: 'project-id',
        displayName: 'Test Workflow',
        description: 'Test Description',
        trigger: {
          type: 'EMPTY',
          name: 'trigger',
          displayName: 'Test Trigger',
          valid: true,
          settings: {},
        },
      },
    };

    await create(params);

    expect(mockValidateWorkflowImport).toHaveBeenCalledWith({
      displayName: 'Test Workflow',
      description: 'Test Description',
      template: {
        displayName: 'Test Workflow',
        trigger: params.request.trigger,
        valid: true,
      },
    });
  });

  it('should throw VALIDATION error when workflow import validation fails', async () => {
    mockValidateWorkflowImport.mockReturnValue({
      success: false,
      errors: ['Invalid trigger structure', 'Missing required fields'],
    });

    const params = {
      userId: 'user-id',
      projectId: 'project-id',
      request: {
        projectId: 'project-id',
        displayName: 'Test Workflow',
        description: 'Test Description',
        trigger: {
          // Invalid trigger structure
          type: 'EMPTY',
        } as any,
      },
    };

    await expect(create(params)).rejects.toThrow(ApplicationError);

    try {
      await create(params);
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe(ErrorCode.VALIDATION);
      expect((error as ApplicationError).params.message).toContain(
        'Invalid workflow template structure'
      );
      expect((error as ApplicationError).params.message).toContain(
        'Invalid trigger structure, Missing required fields'
      );
    }
  });

  it('should not validate workflow import when no trigger is provided', async () => {
    const params = {
      userId: 'user-id',
      projectId: 'project-id',
      request: {
        projectId: 'project-id',
        displayName: 'Test Workflow',
      },
    };

    await create(params);

    expect(mockValidateWorkflowImport).not.toHaveBeenCalled();
  });

  it('should create a flow with empty description when not provided', async () => {
    const params = {
      userId: 'user-id',
      projectId: 'project-id',
      request: {
        projectId: 'project-id',
        displayName: 'Test Workflow',
      },
    };

    await create(params);

    expect(mockCreateEmptyVersion).toHaveBeenCalledWith('flow-id', {
      displayName: 'Test Workflow',
      description: '',
    });
  });

  it('should create a flow with provided description', async () => {
    const params = {
      userId: 'user-id',
      projectId: 'project-id',
      request: {
        projectId: 'project-id',
        displayName: 'Test Workflow',
        description: 'Test Description',
      },
    };

    await create(params);

    expect(mockCreateEmptyVersion).toHaveBeenCalledWith('flow-id', {
      displayName: 'Test Workflow',
      description: 'Test Description',
    });
  });
});