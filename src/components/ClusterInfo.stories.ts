import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ClusterInfo from './ClusterInfo.vue';
import { makeCluster } from '../__mocks__/fixtures';
import { withPropeller, withMaxWidth } from '../__mocks__/decorators';

/**
 * ClusterInfo renders a cluster's headline info — name, SKU, description.
 */
const meta: Meta<typeof ClusterInfo> = {
  title: 'Cluster/ClusterInfo',
  component: ClusterInfo,
  decorators: [withPropeller, withMaxWidth(560)],
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ClusterInfo>;

/** Default. */
export const Default: Story = {
  args: { cluster: makeCluster() },
};
