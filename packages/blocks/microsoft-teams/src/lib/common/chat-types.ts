export enum ChatTypes {
  CHAT = 'chat',
  USER = 'user',
  CHANNEL = 'channel',
}

export type ChatOption = { id: string; type: ChatTypes.CHAT };
export type UserOption = { id: string; type: ChatTypes.USER };

export type ChannelOption = {
  teamId: string;
  id: string;
  type: ChatTypes.CHANNEL;
};
