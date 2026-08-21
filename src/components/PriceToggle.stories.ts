import type { Meta, StoryObj } from '@storybook/vue3-vite';
import PriceToggle from './PriceToggle.vue';

/**
 * PriceToggle is an incl./excl. VAT switch. It is uncontrolled — it holds
 * its own state, seeded by `initialState`, and reports each change through
 * the `inclExclVatSwitched` callback. A consumer wires that callback to the
 * Propeller provider's `includeTax` field.
 */
const meta: Meta<typeof PriceToggle> = {
  title: 'Display/PriceToggle',
  component: PriceToggle,
  tags: ['autodocs'],
  args: {
    inclExclVatSwitched: (on: boolean) => console.log('VAT switched:', on),
  },
};
export default meta;

type Story = StoryObj<typeof PriceToggle>;

/** Default — starts in the "excl. VAT" position. */
export const Default: Story = {
  args: {
    initialState: false,
  },
};

/** Starts in the "incl. VAT" position. */
export const TaxInclusive: Story = {
  args: {
    initialState: true,
  },
};
