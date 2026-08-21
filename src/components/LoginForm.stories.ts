import type { Meta, StoryObj } from '@storybook/vue3-vite';
import LoginForm from './LoginForm.vue';
import { withPropeller, withMaxWidth } from '../__mocks__/decorators';

/**
 * LoginForm is the email/password sign-in form.
 */
const meta: Meta<typeof LoginForm> = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  decorators: [withPropeller, withMaxWidth(420)],
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof LoginForm>;

/** Default. */
export const Default: Story = {};

/** With a custom title. */
export const CustomTitle: Story = {
  args: { title: 'Sign in to your account' },
};
