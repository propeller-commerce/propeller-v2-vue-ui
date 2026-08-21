/**
 * useAuth (Vue) — Login, registration, and forgot-password flows.
 *
 * Covers: LoginForm, RegisterForm, ForgotPassword components.
 *
 * Responsibilities:
 * - login: LoginService + getViewer for session token + user
 * - registerContact: createCompany → registerContact (ContactRegisterInput wrapper) → createCompanyAddress
 * - registerCustomer: registerCustomer (CustomerRegisterInput wrapper) → login → createCustomerAddress
 * - forgotPassword: UserService.sendPasswordResetEmail
 */

import { ref, type Ref } from 'vue';
import { AddressType, Gender, LoginService, UserService, YesNo, MagicTokenService } from '@propeller-commerce/propeller-sdk-v2';
import type {
  GraphQLClient,
  Contact,
  Customer,
  CreateCompanyInput,
  CompanyAddressCreateInput,
  CustomerAddressCreateInput,
} from '@propeller-commerce/propeller-sdk-v2';
import type {
  ViewerInput,
  ContactRegisterInput,
  CustomerRegisterInput,
  PasswordResetInput,
  MagicToken,
  MagicTokenCreateInput,
} from '@propeller-commerce/propeller-sdk-v2';
import { isCustomer, ok, err, type Result } from '@propeller-commerce/propeller-v2-core-ui';
import { createServices } from '@propeller-commerce/propeller-v2-core-ui';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Success payload for login / registerContact / registerCustomer.
 *
 * `user` + tokens are optional: the `autoLogin: false` branches of the
 * register flows complete server-side but deliberately drop the session,
 * yielding an `ok({})`.
 */
export interface AuthSuccess {
  user?: Contact | Customer;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

/** Backwards-friendly alias kept for the public `UseAuth*` type re-exports. */
export type LoginResult = Result<AuthSuccess, string>;

export interface RegisterContactInput {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  gender?: Gender;
  companyName?: string;
  vatNumber?: string;
  cocNumber?: string;
  street?: string;
  number?: string;
  numberExtension?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  deliveryStreet?: string;
  deliveryNumber?: string;
  deliveryNumberExtension?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  sameDeliveryAsBilling?: boolean;
}

export interface RegisterCustomerInput {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  gender?: Gender;
  street?: string;
  number?: string;
  numberExtension?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  deliveryStreet?: string;
  deliveryNumber?: string;
  deliveryNumberExtension?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  sameDeliveryAsBilling?: boolean;
}

export interface UseAuthOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  onAuthHeaderUpdate?: (token: string) => void;
  configuration?: any;
}

export interface UseAuthReturn {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  login: (
    email: string,
    password: string,
    onLoginSubmit?: (email: string, password: string) => Promise<Contact | Customer>,
  ) => Promise<Result<AuthSuccess, string>>;
  magicLogin: (token: string) => Promise<Result<AuthSuccess, string>>;
  createMagicToken: (input: MagicTokenCreateInput) => Promise<Result<MagicToken, string>>;
  registerContact: (
    input: RegisterContactInput,
    preferredLanguage?: string,
    autoLogin?: boolean,
  ) => Promise<Result<AuthSuccess, string>>;
  registerCustomer: (
    input: RegisterCustomerInput,
    preferredLanguage?: string,
    autoLogin?: boolean,
  ) => Promise<Result<AuthSuccess, string>>;
  forgotPassword: (email: string) => Promise<Result<void, string>>;
}

// ── Composable ────────────────────────────────────────────────────────────────

/**
 * A viewer search/pagination input (contactPAConfigInput /
 * contactCompaniesSearchInput) must be a GraphQL *input object*. A truthiness
 * guard is not enough: an empty array `[]` is truthy yet the backend rejects it
 * ("Expected type ContactPurchaseAuthorizationConfigSearchInput to be an
 * object"). Only spread values that are genuine non-array objects so a host that
 * configures `[]` (or anything non-object) is safely omitted instead of erroring
 * the whole viewer query.
 */
const isViewerSearchInput = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function useAuth(options: UseAuthOptions): UseAuthReturn {
  const { graphqlClient, language = 'NL', onAuthHeaderUpdate, configuration } = options;
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ── Login ─────────────────────────────────────────────────────────────────

  async function login(
    email: string,
    password: string,
    onLoginSubmit?: (email: string, password: string) => Promise<Contact | Customer>,
  ): Promise<Result<AuthSuccess, string>> {
    loading.value = true;
    error.value = null;
    try {
      if (onLoginSubmit) {
        const user = await onLoginSubmit(email, password);
        return ok({ user });
      }
      const loginService = createServices(graphqlClient).login;
      const loginResult = await loginService.login({ email, password });
      const session = loginResult?.session;
      const accessToken = session?.accessToken;
      const refreshToken = session?.refreshToken;
      const expiresAt = session?.expirationTime;
      if (accessToken) {
        graphqlClient.setAccessToken(accessToken);
        onAuthHeaderUpdate?.(accessToken);
      }
      const userService = createServices(graphqlClient).user;
      const viewerInput: ViewerInput = {
        ...(configuration?.contactTrackAttributes?.length && {
          contactAttributesInput: { attributeDescription: { names: configuration.contactTrackAttributes } },
        }),
        ...(configuration?.customerTrackAttributes?.length && {
          customerAttributesInput: { attributeDescription: { names: configuration.customerTrackAttributes } },
        }),
        ...(configuration?.companyTrackAttributes?.length && {
          companyAttributesInput: { attributeDescription: { names: configuration.companyTrackAttributes } },
        }),
        // Contact-scoped pagination inputs. Kept out unless the host supplies a
        // real input object — see isViewerSearchInput (an empty array `[]` is
        // truthy but invalid and 400s the whole viewer query).
        ...(isViewerSearchInput(configuration?.contactPAConfigInput) && {
          contactPAConfigInput: configuration.contactPAConfigInput,
        }),
        ...(isViewerSearchInput(configuration?.contactCompaniesSearchInput) && {
          contactCompaniesSearchInput: configuration.contactCompaniesSearchInput,
        }),
      };
      const viewer = await userService.getViewer(viewerInput);
      const user = viewer as Contact | Customer;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
      }
      return ok({ user, accessToken, refreshToken, expiresAt });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      error.value = msg;
      return err(msg);
    } finally {
      loading.value = false;
    }
  }

  // ── Magic-token login ───────────────────────────────────────────────────────
  // Passwordless: exchange a backend-issued magic token for a session, then run
  // the IDENTICAL tail as login() (Bearer + getViewer). The token is
  // single-use/expiring and typically arrives in a deep link (ERP / punchout
  // handoff). See MagicTokenService.magicTokenLogin.

  async function magicLogin(token: string): Promise<Result<AuthSuccess, string>> {
    loading.value = true;
    error.value = null;
    try {
      const loginResult = await new MagicTokenService(graphqlClient).magicTokenLogin(token);
      const session = loginResult?.session;
      const accessToken = session?.accessToken;
      const refreshToken = session?.refreshToken;
      const expiresAt = session?.expirationTime;
      if (accessToken) {
        // Mirrors login(): setAccessToken here (the host persists the token). NB
        // this is the un-hardened Vue path — the React package uses an in-memory
        // header only. Fold into the pending Vue localStorage-hardening pass.
        graphqlClient.setAccessToken(accessToken);
        onAuthHeaderUpdate?.(accessToken);
      }
      const userService = createServices(graphqlClient).user;
      const viewerInput: ViewerInput = {
        ...(configuration?.contactTrackAttributes?.length && {
          contactAttributesInput: { attributeDescription: { names: configuration.contactTrackAttributes } },
        }),
        ...(configuration?.customerTrackAttributes?.length && {
          customerAttributesInput: { attributeDescription: { names: configuration.customerTrackAttributes } },
        }),
        ...(configuration?.companyTrackAttributes?.length && {
          companyAttributesInput: { attributeDescription: { names: configuration.companyTrackAttributes } },
        }),
        // See isViewerSearchInput — an empty array `[]` is truthy but 400s the viewer.
        ...(isViewerSearchInput(configuration?.contactPAConfigInput) && {
          contactPAConfigInput: configuration.contactPAConfigInput,
        }),
        ...(isViewerSearchInput(configuration?.contactCompaniesSearchInput) && {
          contactCompaniesSearchInput: configuration.contactCompaniesSearchInput,
        }),
      };
      const viewer = await userService.getViewer(viewerInput);
      const user = viewer as Contact | Customer;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
      }
      return ok({ user, accessToken, refreshToken, expiresAt });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Magic-token login failed';
      error.value = msg;
      return err(msg);
    } finally {
      loading.value = false;
    }
  }

  // ── Create magic token ──────────────────────────────────────────────────────
  // Issue a magic token for a contact/customer (authenticated call). Returns the
  // MagicToken whose `id` is embedded in a magic-login link. The real caller is
  // punchout link-generation; exposed here as the auth-adjacent capability.

  async function createMagicToken(input: MagicTokenCreateInput): Promise<Result<MagicToken, string>> {
    loading.value = true;
    error.value = null;
    try {
      const token = await new MagicTokenService(graphqlClient).createMagicToken(input);
      return ok(token);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create magic token';
      error.value = msg;
      return err(msg);
    } finally {
      loading.value = false;
    }
  }

  // ── Register contact ──────────────────────────────────────────────────────
  // Contact registration path:
  // createCompany → registerContact (ContactRegisterInput) → createCompanyAddress(es)

  async function registerContact(
    input: RegisterContactInput,
    preferredLanguage = language,
    autoLogin = true,
  ): Promise<Result<AuthSuccess, string>> {
    loading.value = true;
    error.value = null;
    try {
      const userService = createServices(graphqlClient).user;
      const companyService = createServices(graphqlClient).company;
      const addressService = createServices(graphqlClient).address;

      let companyId: number | undefined;
      if (input.companyName) {
        const companyInput: CreateCompanyInput = {
          name: input.companyName,
          ...(input.vatNumber && { taxNumber: input.vatNumber }),
          ...(input.cocNumber && { cocNumber: input.cocNumber }),
          email: input.email,
          ...(input.phone && { phone: input.phone }),
        };
        const company = await companyService.createCompany({
          input: companyInput,
          contactPAConfigInput: { page: 1, offset: 10 },
          companyAttributesInput: {},
          contactSearchArguments: { page: 1, offset: 10 },
        });
        companyId = company.companyId;
      }

      const contactInput: ContactRegisterInput = {
        contactRegisterInput: {
          email: input.email,
          password: input.password,
          firstName: input.firstName,
          ...(input.middleName && { middleName: input.middleName }),
          lastName: input.lastName,
          ...(input.phone && { phone: input.phone }),
          ...(input.gender && { gender: input.gender }),
          primaryLanguage: preferredLanguage,
          parentId: companyId as number,
        },
        companyAttributesInput: {},
        contactAttributesInput: {},
        contactPAConfigInput: { page: 1, offset: 10 },
      };
      // The contact-register response carries the new contact's id AND a freshly
      // issued `session` (accessToken/refreshToken/expirationTime) — the backend
      // logs the contact in as part of registration. We capture both here.
      //
      // The response also includes a `favoriteLists` sub-selection that the
      // FavoriteListsV2 service rejects with FORBIDDEN for newly-created contacts.
      // That's a *partial* error: the SDK's executeMutation returns `data`
      // alongside the error (it only throws when `data` is null), so
      // `registerResult` — including `session` — is still returned. The try/catch
      // is defensive in case a future SDK change starts throwing on partials.
      let registeredContactId: number | undefined;
      let registerAccessToken: string | undefined;
      try {
        const registerResult = await userService.registerContact(contactInput);
        registeredContactId = (registerResult?.contact as unknown as Contact | undefined)?.contactId;
        registerAccessToken = registerResult?.session?.accessToken;
      } catch {
        // Swallow: contact creation succeeded server-side; the only failing
        // sub-selection is the favoriteLists field, which is empty for new users.
      }

      // Authenticate company-address creation with the token from the register
      // response — NOT with a separate login(). `companyAddressCreate` is a
      // company-scoped mutation the backend authorizes against the logged-in
      // contact; called anonymously (API key only) it returns FORBIDDEN. Set the
      // register-session token on graphqlClient so the address calls are
      // authenticated. login() below is a separate concern, run only to
      // establish the real user session when autoLogin is requested.
      if (registerAccessToken) {
        graphqlClient.setAccessToken(registerAccessToken);
        onAuthHeaderUpdate?.(registerAccessToken);
      }

      if (input.street && companyId) {
        const invoiceAddress: CompanyAddressCreateInput = {
          firstName: input.firstName,
          lastName: input.lastName,
          ...(input.gender && { gender: input.gender }),
          street: input.street,
          number: input.number,
          numberExtension: input.numberExtension,
          postalCode: input.postalCode ?? '',
          city: input.city ?? '',
          country: input.country ?? 'NL',
          type: AddressType.invoice,
          isDefault: YesNo.Y,
          companyId,
        };
        await addressService.createCompanyAddress(invoiceAddress);

        // Determine the delivery-address payload:
        // - If "same as billing" is checked, copy the billing fields and only
        //   change `type` to `delivery` so Propeller has a dedicated delivery
        //   record for the contact.
        // - Otherwise, use the separately-entered delivery fields (skip if the
        //   user left them empty).
        if (input.sameDeliveryAsBilling) {
          const deliveryAddress: CompanyAddressCreateInput = {
            ...invoiceAddress,
            type: AddressType.delivery,
          };
          await addressService.createCompanyAddress(deliveryAddress);
        } else if (input.deliveryStreet) {
          const deliveryAddress: CompanyAddressCreateInput = {
            firstName: input.firstName,
            lastName: input.lastName,
            ...(input.gender && { gender: input.gender }),
            street: input.deliveryStreet,
            number: input.deliveryNumber,
            numberExtension: input.deliveryNumberExtension,
            postalCode: input.deliveryPostalCode ?? '',
            city: input.deliveryCity ?? '',
            country: input.deliveryCountry ?? 'NL',
            type: AddressType.delivery,
            isDefault: YesNo.Y,
            companyId,
          };
          await addressService.createCompanyAddress(deliveryAddress);
        }
      }

      if (registeredContactId) {
        try {
          await userService.triggerContactSendWelcomeEmailEvent({
            contactId: registeredContactId,
            language: preferredLanguage,
            ...(configuration?.channelId && { channelId: configuration.channelId }),
          });
        } catch (e) {
          console.error('Failed to send welcome email to contact', e);
        }
      }

      if (!autoLogin) {
        // Address creation used the register-session token (set above). The
        // caller asked not to stay logged in, so drop it: setAccessToken('')
        // clears the token and we notify the host to drop it.
        graphqlClient.setAccessToken('');
        onAuthHeaderUpdate?.('');
        return ok({});
      }

      // Separate concern: establish the real user session. login() re-issues a
      // session (overwriting the register-session token) and returns the viewer
      // + token for the host to persist via its afterLogin/afterRegistration.
      return await login(input.email, input.password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      error.value = msg;
      return err(msg);
    } finally {
      loading.value = false;
    }
  }

  // ── Register customer ──────────────────────────────────────────────────
  // Customer registration path:
  // registerCustomer (CustomerRegisterInput) → login → createCustomerAddress

  async function registerCustomer(
    input: RegisterCustomerInput,
    preferredLanguage = language,
    autoLogin = true,
  ): Promise<Result<AuthSuccess, string>> {
    loading.value = true;
    error.value = null;
    try {
      const userService = createServices(graphqlClient).user;
      const addressService = createServices(graphqlClient).address;

      const customerInput: CustomerRegisterInput = {
        customerRegisterInput: {
          email: input.email,
          password: input.password,
          firstName: input.firstName,
          ...(input.middleName && { middleName: input.middleName }),
          lastName: input.lastName,
          ...(input.phone && { phone: input.phone }),
          ...(input.gender && { gender: input.gender }),
          primaryLanguage: preferredLanguage,
        },
        customerAttributesInput: {},
      };
      await userService.registerCustomer(customerInput);

      const loginResult = await login(input.email, input.password);
      if (!loginResult.ok) return loginResult;
      const loggedInUser = loginResult.data.user;

      let addressesCreated = false;
      if (input.street && isCustomer(loggedInUser ?? null)) {
        const customer = loggedInUser as Customer;
        const invoiceAddress: CustomerAddressCreateInput = {
          firstName: input.firstName,
          lastName: input.lastName,
          ...(input.gender && { gender: input.gender }),
          street: input.street,
          number: input.number,
          numberExtension: input.numberExtension,
          postalCode: input.postalCode ?? '',
          city: input.city ?? '',
          country: input.country ?? 'NL',
          type: AddressType.invoice,
          isDefault: YesNo.Y,
          customerId: customer.customerId,
        };
        await addressService.createCustomerAddress(invoiceAddress);
        addressesCreated = true;

        // As with the contact flow: when "same as billing" is checked, copy the
        // billing fields into a delivery-typed record so Propeller has a
        // dedicated default delivery address. Otherwise, use the separately
        // entered delivery fields (skip if the user left them empty).
        if (input.sameDeliveryAsBilling) {
          const deliveryAddress: CustomerAddressCreateInput = {
            ...invoiceAddress,
            type: AddressType.delivery,
          };
          await addressService.createCustomerAddress(deliveryAddress);
        } else if (input.deliveryStreet) {
          const deliveryAddress: CustomerAddressCreateInput = {
            firstName: input.firstName,
            lastName: input.lastName,
            ...(input.gender && { gender: input.gender }),
            street: input.deliveryStreet,
            number: input.deliveryNumber,
            numberExtension: input.deliveryNumberExtension,
            postalCode: input.deliveryPostalCode ?? '',
            city: input.deliveryCity ?? '',
            country: input.deliveryCountry ?? 'NL',
            type: AddressType.delivery,
            isDefault: YesNo.Y,
            customerId: customer.customerId,
          };
          await addressService.createCustomerAddress(deliveryAddress);
        }
      }

      if (isCustomer(loggedInUser ?? null)) {
        try {
          await userService.triggerCustomerSendWelcomeEmailEvent({
            customerId: (loggedInUser as Customer).customerId,
            language: preferredLanguage,
            ...(configuration?.channelId && { channelId: configuration.channelId }),
          });
        } catch (e) {
          console.error('Failed to send welcome email to customer', e);
        }
      }

      if (!autoLogin) {
        // Address creation needed the customerId from login(); now drop the
        // session so the caller doesn't see this as a logged-in flow.
        graphqlClient.setAccessToken('');
        onAuthHeaderUpdate?.('');
        return ok({});
      }

      // Re-fetch the viewer so the returned user includes the just-created
      // addresses. The user object captured by login() above is a snapshot
      // taken before the addresses existed, and consumers that store it
      // (authStore, dashboard, /account/addresses) would otherwise see no
      // addresses until the next page load.
      if (addressesCreated) {
        try {
          const viewerInput: ViewerInput = {
            ...(configuration?.customerTrackAttributes?.length && {
              customerAttributesInput: { attributeDescription: { names: configuration.customerTrackAttributes } },
            }),
          };
          const refreshedViewer = await userService.getViewer(viewerInput);
          const refreshedUser = refreshedViewer as Contact | Customer;
          return ok({ ...loginResult.data, user: refreshedUser });
        } catch {
          // Fall through to original loginResult — addresses still exist
          // server-side; only the local snapshot is stale.
        }
      }
      return loginResult;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      error.value = msg;
      return err(msg);
    } finally {
      loading.value = false;
    }
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  async function forgotPassword(email: string): Promise<Result<void, string>> {
    loading.value = true;
    error.value = null;
    try {
      const userService = createServices(graphqlClient).user;
      const resetInput: PasswordResetInput = { email };
      await userService.sendPasswordResetEmail(resetInput);
      return ok(undefined);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send reset email';
      error.value = msg;
      return err(msg);
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, login, magicLogin, createMagicToken, registerContact, registerCustomer, forgotPassword };
}
