import { BlockAuth, Property } from '@openops/blocks-framework';
import { getConnectionProvider, Provider } from '@openops/shared';

export const flexeraAuth = BlockAuth.CustomAuth({
  description:
    'Authenticate with your Flexera API Token to access Flexera services.',
  required: true,
  provider: getConnectionProvider(Provider.FLEXERA),
  props: {
    apiToken: Property.SecretText({
      displayName: 'API Token',
      description: 'Your Flexera API Token',
      required: true,
    }),
  },
});
