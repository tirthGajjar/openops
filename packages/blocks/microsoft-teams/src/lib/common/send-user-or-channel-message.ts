import { httpClient, HttpMethod, HttpRequest } from '@openops/blocks-common';
import { ChannelOption, UserOption } from './chat-types';
import {
  generateMessageWithButtons,
  TeamsMessageButton,
} from './generate-message-with-buttons';
import { getMicrosoftGraphClient } from './get-microsoft-graph-client';

export const sendUserOrChannelMessage = async ({
  accessToken,
  usersAndChannels,
  header,
  message,
  actions = [],
  enableActions = true,
  additionalText,
}: {
  accessToken: string;
  usersAndChannels: UserOption | ChannelOption;
  header: string;
  message?: string;
  actions: TeamsMessageButton[];
  enableActions?: boolean;
  additionalText?: string;
}) => {
  const client = getMicrosoftGraphClient(accessToken);

  const messagePayload = generateMessageWithButtons({
    header,
    message,
    actions,
    enableActions,
    additionalText,
  });

  // if (chatOrChannel.type === ChatTypes.CHAT) {
  //   return await client
  //     .api(`/chats/${chatOrChannel.id}/messages`)
  //     .post(messagePayload);
  // }
  // return await client
  //   .api(`/teams/${chatOrChannel.teamId}/channels/${chatOrChannel.id}/messages`)
  //   .post(messagePayload);

  const request: HttpRequest = {
    method: HttpMethod.POST,
    url: `http://localhost:3978/api/request-action`,
    body: {
      type: usersAndChannels.type,
      userOrChannelId: usersAndChannels.id,
      value: {
        header,
        message,
        actions,
        enableActions,
        additionalText,
      },
    },
  };

  return await httpClient.sendRequest<any>(request);
};
