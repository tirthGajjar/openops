import { PageCollection } from '@microsoft/microsoft-graph-client';
import { User } from '@microsoft/microsoft-graph-types';
import {
  DropdownOption,
  OAuth2PropertyValue,
  OAuth2Props,
} from '@openops/blocks-framework';
import { ChatTypes, UserOption } from './chat-types';
import { getMicrosoftGraphClient } from './get-microsoft-graph-client';
import { parseMsPaginatedData } from './parse-ms-paginated-data';

export async function getAllUserOptions(
  auth: OAuth2PropertyValue<OAuth2Props>,
): Promise<DropdownOption<UserOption>[]> {
  const options: DropdownOption<UserOption>[] = [];
  const client = getMicrosoftGraphClient(auth.access_token);

  // Pagination : https://learn.microsoft.com/en-us/graph/sdks/paging?view=graph-rest-1.0&tabs=typescript#manually-requesting-subsequent-pages
  // List Chats : https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0&tabs=http
  const response: PageCollection = await client.api('/users').get();

  await parseMsPaginatedData(client, response, options, populateUserOptions);

  return options;
}

async function populateUserOptions(
  options: DropdownOption<UserOption>[],
  elem: User,
) {
  const userDisplayName = elem.displayName || 'Unknown User';
  const userEmail = elem.mail || elem.userPrincipalName || 'Unknown Email';

  options.push({
    label: `${userDisplayName} (${userEmail})`,
    value: {
      id: elem.id!,
      type: ChatTypes.USER,
    },
  });
}
