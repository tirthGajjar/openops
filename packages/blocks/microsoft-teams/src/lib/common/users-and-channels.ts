import { BlockPropValueSchema, Property } from '@openops/blocks-framework';
import { ChannelOption, ChatOption } from './chat-types';
import { getAllChannelOptionsByTeam } from './get-all-channel-options-by-team';
import { getAllTeams } from './get-all-teams';
import { getAllUserOptions } from './get-all-user-options';
import { microsoftTeamsAuth } from './microsoft-teams-auth';

export const usersAndChannels = Property.Dropdown({
  displayName: 'Channel or Chat',
  description: 'Channel or Chat to send message to.',
  refreshers: ['auth'],
  required: true,
  options: async ({ auth }) => {
    if (!auth) {
      return {
        disabled: true,
        placeholder: 'Please connect your account first and select team.',
        options: [],
      };
    }
    const authValue = auth as BlockPropValueSchema<typeof microsoftTeamsAuth>;

    const userOptions = await getAllUserOptions(authValue);
    const teamIds = await getAllTeams(authValue);

    const channelOptions = await Promise.all(
      teamIds.map((teamId) => getAllChannelOptionsByTeam(authValue, teamId)),
    );

    const flattenedChannelOptions = channelOptions.flat();

    return {
      disabled: false,
      options: [...userOptions, ...flattenedChannelOptions].map((option) => ({
        label: option.label,
        value: option.value as ChatOption | ChannelOption,
      })),
    };
  },
});
