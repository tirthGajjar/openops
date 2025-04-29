import { createAction, Property } from '@openops/blocks-framework';
import { ChatTypes } from '../common/chat-types';
import { chatsAndChannels } from '../common/chats-and-channels';
import { getMicrosoftGraphClient } from '../common/get-microsoft-graph-client';
import { microsoftTeamsAuth } from '../common/microsoft-teams-auth';

export const requestActionMessageAction = createAction({
  auth: microsoftTeamsAuth,
  name: 'microsoft_teams_request_action_message',
  displayName: 'Request Action',
  description:
    'Send a message to a user or a channel and wait until an action is selected',
  props: {
    chatOrChannel: chatsAndChannels,
    contentType: Property.StaticDropdown({
      displayName: 'Content Type',
      required: true,
      defaultValue: 'text',
      options: {
        disabled: false,
        options: [
          {
            label: 'Text',
            value: 'text',
          },
          {
            label: 'HTML',
            value: 'html',
          },
        ],
      },
    }),
    content: Property.LongText({
      displayName: 'Message',
      required: true,
    }),
  },
  async run(context) {
    const { chatOrChannel, contentType, content } = context.propsValue;

    const client = getMicrosoftGraphClient(context.auth.access_token);

    const chatMessage = {
      body: {
        content: content,
        contentType: contentType,
      },
    };

    if (chatOrChannel.type === ChatTypes.CHAT) {
      return await client
        .api(`/chats/${chatOrChannel.id}/messages`)
        .post(chatMessage);
    } else {
      return await client
        .api(
          `/teams/${chatOrChannel.teamId}/channels/${chatOrChannel.id}/messages`,
        )
        .post(chatMessage);
    }
  },
});
