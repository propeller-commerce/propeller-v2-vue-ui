<template>
  <div class="propeller-user-details space-y-6">
    <template v-if="isMounted">
      <div class="propeller-user-details__section propeller-user-details__section--personal rounded-[var(--radius-container)] bg-card text-card-foreground shadow-sm">
        <div class="propeller-user-details__section-header p-6 pb-2">
          <h3 class="propeller-user-details__section-title text-lg font-semibold">{{ getLabel('personalInformation', 'Personal Information') }}</h3>
        </div>
        <div class="propeller-user-details__section-body p-6 pt-2 space-y-4">
          <div class="propeller-user-details__field grid grid-cols-1 gap-1">
            <label class="propeller-user-details__field-label text-xs font-semibold text-muted-foreground uppercase tracking-wide"
              >{{ getLabel('nameLabel', 'Name') }}</label
            >
            <div class="propeller-user-details__field-value font-medium">{{ getName() }}</div>
          </div>
          <div class="propeller-user-details__field grid grid-cols-1 gap-1">
            <label class="propeller-user-details__field-label text-xs font-semibold text-muted-foreground uppercase tracking-wide"
              >{{ getLabel('emailLabel', 'Email') }}</label
            >
            <div class="propeller-user-details__field-value font-medium">{{ user?.email }}</div>
          </div>
        </div>
      </div>

      <template v-if="shouldShowCompanyInfo() && getActiveCompany()">
        <div class="propeller-user-details__section propeller-user-details__section--company rounded-[var(--radius-container)] bg-card text-card-foreground shadow-sm">
          <div class="propeller-user-details__section-header p-6 pb-2">
            <h3 class="propeller-user-details__section-title text-lg font-semibold">{{ getLabel('companyInformation', 'Company Information') }}</h3>
          </div>
          <div class="propeller-user-details__section-body p-6 pt-2 space-y-4">
            <div class="propeller-user-details__field grid grid-cols-1 gap-1">
              <label class="propeller-user-details__field-label text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >{{ getLabel('companyNameLabel', 'Company Name') }}</label
              >
              <div class="propeller-user-details__field-value font-medium">{{ getActiveCompany()?.name }}</div>
            </div>
            <template v-if="getActiveCompany()?.taxNumber">
              <div class="propeller-user-details__field grid grid-cols-1 gap-1">
                <label class="propeller-user-details__field-label text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >{{ getLabel('taxNumberLabel', 'Tax Number') }}</label
                >
                <div class="propeller-user-details__field-value font-medium">
                  {{ getActiveCompany()?.taxNumber }}
                </div>
              </div>
            </template>

            <template v-if="getActiveCompany()?.cocNumber">
              <div class="propeller-user-details__field grid grid-cols-1 gap-1">
                <label class="propeller-user-details__field-label text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >{{ getLabel('cocNumberLabel', 'CoC Number') }}</label
                >
                <div class="propeller-user-details__field-value font-medium">
                  {{ getActiveCompany()?.cocNumber }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <template v-if="shouldListCompanies() && getCompanies().length > 0">
        <div class="propeller-user-details__section propeller-user-details__section--companies rounded-[var(--radius-container)] bg-card text-card-foreground shadow-sm">
          <div class="propeller-user-details__section-header p-6 pb-2">
            <h3 class="propeller-user-details__section-title text-lg font-semibold">{{ getLabel('companies', 'Companies') }}</h3>
          </div>
          <div class="propeller-user-details__section-body p-6 pt-2">
            <ul class="propeller-user-details__companies space-y-2">
              <template :key="String(company.companyId)" v-for="(company, index) in getCompanies()">
                <li
                  :data-active="getActiveCompany()?.companyId === company.companyId ? 'true' : 'false'"
                  :class="`propeller-user-details__company flex items-center gap-2 py-2 px-3 rounded-[var(--radius-control)] ${
                    getActiveCompany()?.companyId === company.companyId
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-foreground'
                  }`"
                >
                  <span class="propeller-user-details__company-name truncate">{{ company.name }}</span>
                  <template v-if="getActiveCompany()?.companyId === company.companyId">
                    <span class="propeller-user-details__company-badge text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full"
                      >{{ getLabel('activeBadge', 'Active') }}</span
                    >
                  </template>
                </li>
              </template>
            </ul>
          </div>
        </div>
      </template>

      <template v-if="shouldShowInvoiceAddress() || shouldShowDeliveryAddress()">
        <div class="propeller-user-details__section propeller-user-details__section--addresses rounded-[var(--radius-container)] bg-card text-card-foreground shadow-sm">
          <div class="propeller-user-details__section-header p-6 pb-2">
            <h3 class="propeller-user-details__section-title text-lg font-semibold">{{ getLabel('defaultAddresses', 'Default Addresses') }}</h3>
          </div>
          <div class="propeller-user-details__section-body p-6 pt-2">
            <div class="propeller-user-details__addresses grid grid-cols-1 md:grid-cols-2 gap-6">
              <template v-if="shouldShowInvoiceAddress()">
                <div class="propeller-user-details__address-group space-y-3" data-address="invoice">
                  <h4 class="propeller-user-details__address-title text-base font-bold">{{ getLabel('invoiceAddress', 'Invoice Address') }}</h4>
                  <template v-if="getDefaultInvoiceAddress()">
                    <div class="propeller-user-details__address-card bg-card p-4 rounded-[var(--radius-container)] shadow-sm border border-border">
                      <template v-if="getDefaultInvoiceAddress()?.company">
                        <div class="propeller-user-details__address-company font-bold text-lg mb-1">
                          {{ getDefaultInvoiceAddress()?.company }}
                        </div>
                      </template>

                      <template v-if="getAddressName(getDefaultInvoiceAddress() as Address)">
                        <div class="propeller-user-details__address-name font-medium mb-1">
                          {{ getAddressName(getDefaultInvoiceAddress() as Address) }}
                        </div>
                      </template>

                      <div class="propeller-user-details__address-line text-muted-foreground">
                        {{ getAddressLine1(getDefaultInvoiceAddress() as Address) }}
                      </div>
                      <div class="propeller-user-details__address-line text-muted-foreground">
                        {{ getAddressLine2(getDefaultInvoiceAddress() as Address) }}
                      </div>
                      <template v-if="getDefaultInvoiceAddress()?.country">
                        <div class="propeller-user-details__address-country text-muted-foreground">
                          {{ getCountryName(getDefaultInvoiceAddress()?.country || '') }}
                        </div>
                      </template>
                    </div>
                  </template>

                  <template v-if="!getDefaultInvoiceAddress()">
                    <p class="propeller-user-details__address-empty text-muted-foreground italic">{{ getLabel('noInvoiceAddress', 'No invoice address found') }}</p>
                  </template>
                </div>
              </template>

              <template v-if="shouldShowDeliveryAddress()">
                <div class="propeller-user-details__address-group space-y-3" data-address="delivery">
                  <h4 class="propeller-user-details__address-title text-base font-bold">{{ getLabel('deliveryAddress', 'Delivery Address') }}</h4>
                  <template v-if="getDefaultDeliveryAddress()">
                    <div class="propeller-user-details__address-card bg-card p-4 rounded-[var(--radius-container)] shadow-sm border border-border">
                      <template v-if="getDefaultDeliveryAddress()?.company">
                        <div class="propeller-user-details__address-company font-bold text-lg mb-1">
                          {{ getDefaultDeliveryAddress()?.company }}
                        </div>
                      </template>

                      <template v-if="getAddressName(getDefaultDeliveryAddress() as Address)">
                        <div class="propeller-user-details__address-name font-medium mb-1">
                          {{ getAddressName(getDefaultDeliveryAddress() as Address) }}
                        </div>
                      </template>

                      <div class="propeller-user-details__address-line text-muted-foreground">
                        {{ getAddressLine1(getDefaultDeliveryAddress() as Address) }}
                      </div>
                      <div class="propeller-user-details__address-line text-muted-foreground">
                        {{ getAddressLine2(getDefaultDeliveryAddress() as Address) }}
                      </div>
                      <template v-if="getDefaultDeliveryAddress()?.country">
                        <div class="propeller-user-details__address-country text-muted-foreground">
                          {{ getCountryName(getDefaultDeliveryAddress()?.country || '') }}
                        </div>
                      </template>
                    </div>
                  </template>

                  <template v-if="!getDefaultDeliveryAddress()">
                    <p class="propeller-user-details__address-empty text-muted-foreground italic">{{ getLabel('noDeliveryAddress', 'No delivery address found') }}</p>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useInfraProps } from '../composables/vue/useInfraProps';

import { Contact, Customer, Company, Address } from '@propeller-commerce/propeller-sdk-v2';
import { getCountryName as _getCountryName, getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';

export interface UserDetailsProps {
  /** The currently logged in user (Contact or Customer). Resolved from `<PropellerProvider>` when omitted. */
  user?: Contact | Customer;

  /**
   * The currently active company
   */
  activeCompany: Company | null;

  /**
   * Display basic company information for the default company if the user is Contact
   * @default true
   */
  showCompanyInfo?: boolean;

  /**
   * Display a list of all companies if the user is Contact
   * @default false
   */
  listAllContactCompanies?: boolean;

  /**
   * Display details of the user's default invoice address
   * @default true
   */
  showDefaultInvoiceAddress?: boolean;

  /**
   * Display details of the user's default delivery address
   * @default false
   */
  showDefaultDeliveryAddress?: boolean;

  /** Country code-to-name mapping for address display */
  countries?: {
    code: string;
    name: string;
  }[];

  /** Translated labels keyed by the slugs used inside the component (see
   * `getLabel` calls). Missing keys fall back to the English defaults. */
  labels?: Record<string, string>;
}
interface UserDetailsState {
  isMounted: boolean;
  isContact: () => boolean;
  getName: () => string;
  getActiveCompany: () => Company | null;
  getCompanies: () => Company[];
  getAllAddresses: () => Address[];
  getDefaultInvoiceAddress: () => Address | null;
  getDefaultDeliveryAddress: () => Address | null;
  getAddressName: (addr: Address) => string;
  getAddressLine1: (addr: Address) => string;
  getAddressLine2: (addr: Address) => string;
  getCountryName: (code: string) => string;
  shouldShowCompanyInfo: () => boolean;
  shouldListCompanies: () => boolean;
  shouldShowInvoiceAddress: () => boolean;
  shouldShowDeliveryAddress: () => boolean;
}

const props = withDefaults(defineProps<UserDetailsProps>(), {
  showCompanyInfo: true,
  listAllContactCompanies: false,
  showDefaultInvoiceAddress: true,
  showDefaultDeliveryAddress: false,
});
// Resolve user from the propellerVue plugin scope when the consumer doesn't
// pass :user explicitly (the documented contract — AccountView wires only
// labels/activeCompany).
const infra = useInfraProps(props);
// Local `user` ref overrides Vue's prop auto-exposure so the template binds
// to the provider-fallback value rather than the raw (possibly undefined)
// prop.
const user = computed(() => (infra.user ?? props.user) as Contact | Customer | undefined);
const isMounted = ref<UserDetailsState['isMounted']>(false);

onMounted(() => {
  isMounted.value = true;
});

function isContact(): ReturnType<UserDetailsState['isContact']> {
  return !!user.value && 'company' in user.value;
}
function getName(): ReturnType<UserDetailsState['getName']> {
  if (user.value && user.value.firstName) {
    return [user.value.firstName, user.value.lastName].filter(Boolean).join(' ');
  }
  return getLabel('userFallback', 'User');
}
function getActiveCompany(): ReturnType<UserDetailsState['getActiveCompany']> {
  return isContact() ? props.activeCompany : null;
}
function getCompanies(): ReturnType<UserDetailsState['getCompanies']> {
  if (!isContact()) return [];
  const contact = user.value as Contact;
  const companiesResponse = contact.companies;
  if (companiesResponse?.items && companiesResponse.items.length > 0) {
    return companiesResponse.items;
  }
  const defaultCompany = contact.company;
  if (defaultCompany) {
    return [defaultCompany];
  }
  return [];
}
function getAllAddresses(): ReturnType<UserDetailsState['getAllAddresses']> {
  if (isContact()) {
    const company = getActiveCompany();
    return company?.addresses || [];
  }
  const customer = user.value as Customer;
  return customer?.addresses || [];
}
function getDefaultInvoiceAddress(): ReturnType<UserDetailsState['getDefaultInvoiceAddress']> {
  const addresses = getAllAddresses();
  return (
    addresses.find((addr: Address) => addr.type === 'invoice' && addr.isDefault === 'Y') ?? null
  );
}
function getDefaultDeliveryAddress(): ReturnType<UserDetailsState['getDefaultDeliveryAddress']> {
  const addresses = getAllAddresses();
  return (
    addresses.find((addr: Address) => addr.type === 'delivery' && addr.isDefault === 'Y') ?? null
  );
}
function getAddressName(addr: Address): ReturnType<UserDetailsState['getAddressName']> {
  const parts = [addr.firstName, addr.middleName, addr.lastName].filter(Boolean);
  return parts.join(' ');
}
function getAddressLine1(addr: Address): ReturnType<UserDetailsState['getAddressLine1']> {
  const parts = [addr.street, addr.number, addr.numberExtension].filter(Boolean);
  return parts.join(' ');
}
function getAddressLine2(addr: Address): ReturnType<UserDetailsState['getAddressLine2']> {
  const parts = [addr.postalCode, addr.city].filter(Boolean);
  return parts.join(' ');
}
function getCountryName(code: string): ReturnType<UserDetailsState['getCountryName']> {
  return _getCountryName(code, props.countries);
}
function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
function shouldShowCompanyInfo(): ReturnType<UserDetailsState['shouldShowCompanyInfo']> {
  return props.showCompanyInfo !== false && isContact();
}
function shouldListCompanies(): ReturnType<UserDetailsState['shouldListCompanies']> {
  return props.listAllContactCompanies === true && isContact();
}
function shouldShowInvoiceAddress(): ReturnType<UserDetailsState['shouldShowInvoiceAddress']> {
  return props.showDefaultInvoiceAddress !== false;
}
function shouldShowDeliveryAddress(): ReturnType<UserDetailsState['shouldShowDeliveryAddress']> {
  return props.showDefaultDeliveryAddress === true;
}
</script>
