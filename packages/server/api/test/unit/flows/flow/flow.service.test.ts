import {
  ApplicationError,
  ErrorCode,
  FlowOperationType,
} from '@openops/shared';
import { flowService } from '../../../../src/app/flows/flow/flow.service';

jest.mock('@openops/shared', () => {
  const original = jest.requireActual('@openops/shared');
  return {
    ...original,
  };
});

jest.mock('../../../../src/app/flows/flow/flow.service', () => {
  const actual = jest.requireActual('../../../../src/app/flows/flow/flow.service');
  return {
    ...actual,
    flowService: {
      ...actual.flowService,
      create: jest.fn(),
      update: jest.fn(),
    },
  };
});

const mockCreate = flowService.create as jest.Mock;
const mockUpdate = flowService.update as jest.Mock;

describe('flowService', () => {
  describe('createFromTemplate', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      mockCreate.mockResolvedValue({
        id: 'flow-id',
        projectId: 'project-id',
      });
      
      mockUpdate.mockResolvedValue({
        id: 'flow-id',
        projectId: 'project-id',
        version: { id: 'version-id' },
      });
    });

    it('should proceed with flow creation when validation is successful', async () => {
      const params = {
        projectId: 'project-id',
        userId: 'user-id',
        displayName: 'Test Workflow',
        description: 'Test Description',
        trigger: {
          type: 'EMPTY',
          name: 'trigger',
          displayName: 'Test Trigger',
          valid: true,
          settings: {},
        },
        templateId: 'template-id',
        connectionIds: [],
        isSample: false,
      };

      await flowService.createFromTemplate(params);

      expect(mockCreate).toHaveBeenCalledWith({
        userId: 'user-id',
        projectId: 'project-id',
        request: {
          projectId: 'project-id',
          displayName: 'Test Workflow',
        },
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        id: 'flow-id',
        userId: 'user-id',
        projectId: 'project-id',
        operation: {
          type: FlowOperationType.IMPORT_FLOW,
          request: {
            displayName: 'Test Workflow',
            description: 'Test Description',
            trigger: params.trigger,
            connections: [],
          },
        },
      });
    });
  });
});