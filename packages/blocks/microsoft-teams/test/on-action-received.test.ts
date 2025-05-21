import {
  ChannelOption,
  ChatOption,
  ChatTypes,
} from '../src/lib/common/chat-types';
import { onActionReceived } from '../src/lib/common/on-action-received';
import { updateChatOrChannelMessage } from '../src/lib/common/update-chat-or-channel-message';

jest.mock('../src/lib/common/update-chat-or-channel-message');

const mockChannelOption: ChannelOption = {
  id: 'channel-id',
  teamId: 'team-id',
  type: ChatTypes.CHANNEL,
};

const mockChatOption: ChatOption = {
  id: 'chat-id',
  type: ChatTypes.CHAT,
};

const mockMessageObj = {
  id: 'message-id',
};

const mockActions = [
  {
    buttonText: 'Approve',
    buttonStyle: 'positive',
    resumeUrl: 'https://example.com/approve',
  },
  {
    buttonText: 'Reject',
    buttonStyle: 'destructive',
    resumeUrl: 'https://example.com/reject',
  },
];

const mockContext = {
  auth: { access_token: 'mock-token' },
  resumePayload: {
    queryParams: {
      button: 'Approve',
      path: 'execution-path-1',
    },
  },
  currentExecutionPath: 'execution-path-1',
  run: { pause: jest.fn() },
  store: {
    get: jest.fn(),
  },
};

describe('onActionReceived', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return expired response when no button is clicked', async () => {
    mockContext.resumePayload = { queryParams: { button: '', path: '' } };

    (updateChatOrChannelMessage as jest.Mock).mockResolvedValueOnce({
      content: 'Message updated with expiration notice',
    });

    const result = await onActionReceived({
      chatOrChannel: mockChannelOption,
      messageObj: mockMessageObj,
      header: 'Header',
      message: 'Message body',
      actions: mockActions,
      context: mockContext,
    });

    expect(updateChatOrChannelMessage).toHaveBeenCalledWith({
      accessToken: 'mock-token',
      chatOrChannel: mockChannelOption,
      header: 'Header',
      message: 'Message body',
      actions: mockActions,
      enableActions: false,
      additionalText: 'The time to act on this message has expired.',
      messageId: 'message-id',
    });

    expect(result).toEqual({
      action: '',
      isExpired: true,
      message: {
        content: 'Message updated with expiration notice',
      },
    });
  });

  test('should throw error if pause metadata is unavailable', async () => {
    mockContext.resumePayload.queryParams = {
      button: 'RandomAction',
      path: 'random-path',
    };

    mockContext.store.get.mockResolvedValueOnce(null);

    await expect(
      onActionReceived({
        chatOrChannel: mockChatOption,
        messageObj: mockMessageObj,
        header: 'Header',
        message: 'Message body',
        actions: mockActions,
        context: mockContext,
      }),
    ).rejects.toThrow('Could not fetch pause metadata: execution-path-1');
  });

  test('should return action result when a valid button is clicked', async () => {
    mockContext.store.get.mockResolvedValueOnce({ pauseMetadata: 'mock-data' });
    mockContext.resumePayload = {
      queryParams: {
        button: 'Approve',
        path: 'execution-path-1',
      },
    };
    (updateChatOrChannelMessage as jest.Mock).mockResolvedValueOnce({
      content: 'Message updated with action confirmation',
    });

    const result = await onActionReceived({
      chatOrChannel: mockChannelOption,
      messageObj: mockMessageObj,
      header: 'Header',
      message: 'Message body',
      actions: mockActions,
      context: mockContext,
    });

    expect(updateChatOrChannelMessage).toHaveBeenCalledWith({
      accessToken: 'mock-token',
      chatOrChannel: mockChannelOption,
      header: 'Header',
      message: 'Message body',
      actions: mockActions,
      enableActions: false,
      additionalText: `Action received, "Approve" button was clicked!`,
      messageId: 'message-id',
    });

    expect(result).toEqual({
      action: 'Approve',
      message: { content: 'Message updated with action confirmation' },
      isExpired: false,
    });
  });
});
