import {
  ChannelOption,
  ChatOption,
  ChatTypes,
} from '../src/lib/common/chat-types';
import {
  generateMessageWithButtons,
  TeamsMessageButton,
} from '../src/lib/common/generate-message-with-buttons';
import { getMicrosoftGraphClient } from '../src/lib/common/get-microsoft-graph-client';
import { updateChatOrChannelMessage } from '../src/lib/common/update-chat-or-channel-message';

jest.mock('../src/lib/common/get-microsoft-graph-client');
jest.mock('../src/lib/common/generate-message-with-buttons');

describe('updateChatOrChannelMessage', () => {
  const mockAccessToken = 'mock-access-token';

  const mockChatOption: ChatOption = {
    id: 'mock-chat-id',
    type: ChatTypes.CHAT,
  };

  const mockChannelOption: ChannelOption = {
    id: 'mock-channel-id',
    teamId: 'mock-team-id',
    type: ChatTypes.CHANNEL,
  };

  const mockActions: TeamsMessageButton[] = [
    {
      buttonText: 'Approve',
      buttonStyle: 'positive',
      resumeUrl: 'https://approve.com',
    },
    {
      buttonText: 'Reject',
      buttonStyle: 'destructive',
      resumeUrl: 'https://reject.com',
    },
  ];

  const mockMessagePayload = {
    body: {
      contentType: 'html',
      content: '<attachment id="adaptiveCardAttachment"></attachment>',
    },
    attachments: [
      {
        id: 'adaptiveCardAttachment',
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: '{}',
        contentUrl: null,
      },
    ],
  };

  const mockGraphClient = {
    api: jest.fn(() => ({
      patch: jest.fn(),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getMicrosoftGraphClient as jest.Mock).mockReturnValue(mockGraphClient);
    (generateMessageWithButtons as jest.Mock).mockReturnValue(
      mockMessagePayload,
    );
  });

  test('should update a chat message', async () => {
    const mockPatch = jest
      .fn()
      .mockResolvedValueOnce({ id: 'updated-message-id' });
    mockGraphClient.api.mockReturnValueOnce({
      patch: mockPatch,
    });

    const result = await updateChatOrChannelMessage({
      accessToken: mockAccessToken,
      chatOrChannel: mockChatOption,
      header: 'Test Header',
      message: 'This is a test message',
      actions: mockActions,
      messageId: 'mock-message-id',
    });

    expect(getMicrosoftGraphClient).toHaveBeenCalledWith(mockAccessToken);
    expect(generateMessageWithButtons).toHaveBeenCalledWith({
      header: 'Test Header',
      message: 'This is a test message',
      actions: mockActions,
      enableActions: true,
      additionalText: undefined,
    });
    expect(mockGraphClient.api).toHaveBeenCalledWith(
      '/chats/mock-chat-id/messages/mock-message-id',
    );
    expect(mockPatch).toHaveBeenCalledWith(mockMessagePayload);
    expect(result).toEqual({ id: 'updated-message-id' });
  });

  test('should update a channel message', async () => {
    const mockPatch = jest
      .fn()
      .mockResolvedValueOnce({ id: 'updated-message-id' });
    mockGraphClient.api.mockReturnValueOnce({
      patch: mockPatch,
    });

    const result = await updateChatOrChannelMessage({
      accessToken: mockAccessToken,
      chatOrChannel: mockChannelOption,
      header: 'Channel Header',
      message: 'Channel Message Body',
      actions: mockActions,
      additionalText: 'Additional text here.',
      messageId: 'mock-message-id',
    });

    expect(getMicrosoftGraphClient).toHaveBeenCalledWith(mockAccessToken);
    expect(generateMessageWithButtons).toHaveBeenCalledWith({
      header: 'Channel Header',
      message: 'Channel Message Body',
      actions: mockActions,
      enableActions: true,
      additionalText: 'Additional text here.',
    });
    expect(mockGraphClient.api).toHaveBeenCalledWith(
      '/teams/mock-team-id/channels/mock-channel-id/messages/mock-message-id',
    );
    expect(mockPatch).toHaveBeenCalledWith(mockMessagePayload);
    expect(result).toEqual({ id: 'updated-message-id' });
  });

  test('should handle undefined additionalText and no actions', async () => {
    const mockPatch = jest
      .fn()
      .mockResolvedValueOnce({ id: 'updated-message-id' });
    mockGraphClient.api.mockReturnValueOnce({
      patch: mockPatch,
    });

    const result = await updateChatOrChannelMessage({
      accessToken: mockAccessToken,
      chatOrChannel: mockChatOption,
      header: 'Simple Header',
      message: 'Simple Message',
      actions: [],
      messageId: 'mock-message-id',
    });

    expect(generateMessageWithButtons).toHaveBeenCalledWith({
      header: 'Simple Header',
      message: 'Simple Message',
      actions: [],
      enableActions: true,
      additionalText: undefined,
    });
    expect(mockGraphClient.api).toHaveBeenCalledWith(
      '/chats/mock-chat-id/messages/mock-message-id',
    );
    expect(mockPatch).toHaveBeenCalledWith(mockMessagePayload);
    expect(result).toEqual({ id: 'updated-message-id' });
  });
});
