<template>
  <div
    class="propeller-login-form"
    :data-loading="isLoading ? 'true' : 'false'"
    :data-variant="accountHeaderLoginForm ? 'compact' : 'full'"
  >
    <template v-if="resolvedTitle">
      <div class="propeller-login-form__header space-y-1 text-center mb-6">
        <h2 class="propeller-login-form__title text-2xl font-bold">{{ resolvedTitle }}</h2>
        <template v-if="subtitle">
          <p class="propeller-login-form__subtitle text-sm text-muted-foreground">{{ subtitle }}</p>
        </template>
      </div>
    </template>

    <form class="propeller-login-form__form space-y-4" @submit="async (e) => handleSubmit(e)">
      <slot
        name="emailField"
        :email="email"
        :onEmailChange="(value: string) => { email = value; }"
        :labels="labels"
      >
        <div class="propeller-login-form__field space-y-2">
          <label for="login-email" class="propeller-login-form__label text-sm font-medium leading-none">{{ emailLabel }}</label
          ><input
            type="email"
            id="login-email"
            name="email"
            class="propeller-login-form__input flex h-10 w-full rounded-[var(--radius-control)] border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            :value="email"
            @input="
              async (e) => {
                email = (e.target as HTMLInputElement).value;
              }
            "
            :placeholder="emailPlaceholder"
            :required="true"
            :disabled="isLoading"
          />
        </div>
      </slot>
      <slot
        name="passwordField"
        :password="password"
        :onPasswordChange="(value: string) => { password = value; }"
        :labels="labels"
        :displayForgotPassword="displayForgotPasswordLink !== false && !accountHeaderLoginForm"
      >
        <div class="propeller-login-form__field space-y-2">
          <div class="flex items-center justify-between">
            <label for="login-password" class="propeller-login-form__label text-sm font-medium leading-none">{{
              passwordLabel
            }}</label>
            <template v-if="showForgotPassword && !accountHeaderLoginForm">
              <button
                type="button"
                class="propeller-login-form__forgot-link text-sm text-primary hover:underline"
                @click="
                  async (event) => {
                    if (onForgotPasswordClick) onForgotPasswordClick();
                  }
                "
              >
                {{ forgotPasswordText }}
              </button>
            </template>
          </div>
          <input
            type="password"
            id="login-password"
            name="password"
            class="propeller-login-form__input flex h-10 w-full rounded-[var(--radius-control)] border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            :value="password"
            @input="
              async (e) => {
                password = (e.target as HTMLInputElement).value;
              }
            "
            :placeholder="passwordPlaceholder"
            :required="true"
            :disabled="isLoading"
          />
        </div>
      </slot>
      <slot
        v-if="!!errorMessage"
        name="errorMessage"
        :error="errorMessage"
      >
        <div class="propeller-login-form__error text-sm text-destructive bg-destructive/10 p-3 rounded-[var(--radius-control)]">
          {{ errorMessage }}
        </div>
      </slot>

      <slot
        name="submitButton"
        :isLoading="isLoading"
        :buttonText="resolvedButtonText"
        :labels="labels"
      >
        <button
          type="submit"
          class="propeller-login-form__submit inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-[var(--radius-control)] hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isLoading"
        >
          <template v-if="isLoading">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              class="propeller-login-form__spinner animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                class="opacity-25"
              ></circle>
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                class="opacity-75"
              ></path>
            </svg>
          </template>

          <template v-if="isLoading"> {{ getLabel('loggingIn', 'Logging in...') }} </template>

          <template v-else>
            {{ resolvedButtonText }}
          </template>
        </button>
      </slot>
    </form>
    <template v-if="(showRegister || showGuestCheckout) && !accountHeaderLoginForm">
      <div class="propeller-login-form__footer mt-6 border-t pt-6 space-y-3">
        <slot
          v-if="displayRegisterLink !== false"
          name="registerLink"
          :onClick="(e: any) => onRegisterClick?.(e)"
          :labels="labels"
        >
          <div class="propeller-login-form__register text-center">
            <p class="propeller-login-form__register-prompt text-sm text-muted-foreground mb-2">{{ registerText }}</p>
            <button
              type="button"
              class="propeller-login-form__register-btn inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium border border-input rounded-[var(--radius-control)] hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              @click="
                async (event) => {
                  if (onRegisterClick) onRegisterClick();
                }
              "
            >
              {{ registerLinkText }}
            </button>
          </div>
        </slot>

        <slot
          v-if="displayGuestCheckoutLink !== false"
          name="guestCheckoutButton"
          :onClick="(e: any) => onGuestCheckoutClick?.(e)"
          :labels="labels"
        >
          <div class="propeller-login-form__guest text-center">
            <button
              type="button"
              class="propeller-login-form__guest-btn text-sm text-primary hover:underline"
              @click="
                async (event) => {
                  if (onGuestCheckoutClick) onGuestCheckoutClick();
                }
              "
            >
              {{ guestCheckoutLinkText }}
            </button>
          </div>
        </slot>
      </div>
    </template>

    <template v-if="accountHeaderLoginForm">
      <div class="propeller-login-form__footer flex flex-col gap-2 text-sm pt-3 text-center">
        <slot
          v-if="displayForgotPasswordLink !== false"
          name="forgotPasswordLink"
          :onClick="(e: any) => onForgotPasswordClick?.(e)"
          :labels="labels"
        >
          <button
            type="button"
            class="propeller-login-form__forgot-link text-secondary hover:underline text-xs"
            @click="
              async (event) => {
                if (onForgotPasswordClick) onForgotPasswordClick();
              }
            "
          >
            {{ getLabel('forgotPassword', 'Forgot Password?') }}
          </button>
        </slot>
        <div class="propeller-login-form__register text-xs text-muted-foreground">
          <!-- Full prompt with a {link} placeholder so the translation owns the
               wording AND the spacing around the register link (was
               "…account?Create an Account", no space). -->
          {{ noAccountParts.before
          }}<slot
            v-if="displayRegisterLink !== false"
            name="registerLink"
            :onClick="(e: any) => onRegisterClick?.(e)"
            :labels="labels"
          >
            <button
              type="button"
              class="propeller-login-form__register-btn text-secondary hover:underline font-medium"
              @click="
                async (event) => {
                  if (onRegisterClick) onRegisterClick();
                }
              "
            >
              {{ getLabel('registerLink', 'Register') }}
            </button>
          </slot>{{ noAccountParts.after }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Cart, Contact, Customer, GraphQLClient } from '@propeller-commerce/propeller-sdk-v2';
import { useAuth } from '../composables/vue/useAuth';
import { useInfraProps } from '../composables/vue/useInfraProps';
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';




     export interface LoginFormProps {
 /**
  * GraphQL client for self-contained login.
  * When provided (and onLoginSubmit is not), the component handles
  * authentication internally via LoginService + UserService.
  */
 graphqlClient?: GraphQLClient;

 /** Title of the login form
  * @default "Log in"
  */
 title?: string;

 /** Subtitle of the login form
  * @default ""
  */
 subtitle?: string;

 /** Show/hide the password reset link
  * @default true
  */
 displayForgotPasswordLink?: boolean;

 /** Action for the password reset link click */
 onForgotPasswordClick?: (event?: any) => void;

 /** Show/hide the registration link
  * @default true
  */
 displayRegisterLink?: boolean;

 /** Action for the registration link click */
 onRegisterClick?: (event?: any) => void;

 /** Show/hide the guest checkout link
  * @default true
  */
 displayGuestCheckoutLink?: boolean;

 /** Action for the guest checkout link click */
 onGuestCheckoutClick?: (event?: any) => void;

 /** Label for the submit button
  * @default "Login"
  */
 buttonText?: string;

 /**
  * Labels for the login form fields.
  *
  * Available keys:
  * - email: Email field label (default: "Email")
  * - password: Password field label (default: "Password")
  * - emailPlaceholder: Email input placeholder (default: "name@example.com")
  * - passwordPlaceholder: Password input placeholder (default: "••••••••")
  * - forgotPassword: Forgot password link text (default: "Forgot password?")
  * - registerText: Text before register link (default: "Don't have an account?")
  * - registerLink: Register link text (default: "Create an Account")
  * - guestCheckoutLink: Guest checkout link text (default: "Continue as Guest")
  */
 labels?: Record<string, string>;

 /**
  * Fires when login form is submitted (delegation mode).
  * When provided, the component does NOT call the SDK — the parent handles authentication.
  * When absent and graphqlClient is provided, the component handles login internally.
  */
 onLoginSubmit?: (email: string, password: string) => void;

 /** Whether login is currently in progress (shows loading state on button).
  * Used in delegation mode. Ignored in self-contained mode.
  * @default false
  */
 loginLoading?: boolean;

 /** Error message to display in the form.
  * Used in delegation mode. In self-contained mode the component manages its own error.
  */
 loginError?: string;

 /** Callback before the login process starts */
 beforeLogin?: () => void;

 /** Callback after successful login with user data.
  * `anonymousCart` is the cart held in the parent's store/state at the moment of submission,
  * forwarded so the parent can merge it into the authenticated user's cart.
  */
 afterLogin?: (user: Contact | Customer, accessToken?: string, refreshToken?: string, expiresAt?: string, anonymousCart?: Cart | null) => void;

 /** Anonymous cart snapshot from the parent's store/state — forwarded to `afterLogin`. */
 cart?: Cart | null;

 /**
  * Show login form in dropdown for immediate login when user is not logged in.
  * @default true
  */
 accountHeaderLoginForm?: boolean;

 /** Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall. */
 configuration?: any;
}
const props = withDefaults(defineProps<LoginFormProps>(), {
  displayForgotPasswordLink: true,
  displayRegisterLink: true,
  displayGuestCheckoutLink: true,
});
// Resolve graphqlClient + configuration from the propellerVue plugin scope when
// the consumer doesn't pass them explicitly — host pages embed LoginForm via
// AccountIconAndMenu's dropdown without threading deps through every prop.
const infra = useInfraProps(props);
const email = ref('');
const password = ref('');

const { loading, error, login } = useAuth({
  graphqlClient: infra.graphqlClient as GraphQLClient,
  configuration: infra.configuration,
});










const emailLabel = computed(() => {
  return props.labels?.email || 'Email';
});
const passwordLabel = computed(() => {
  return props.labels?.password || 'Password';
});
const emailPlaceholder = computed(() => {
return props.labels?.emailPlaceholder || 'name@example.com';
})
const passwordPlaceholder = computed(() => {
return props.labels?.passwordPlaceholder || '••••••••';
})
const forgotPasswordText = computed(() => {
return props.labels?.forgotPassword || 'Forgot password?';
})
const registerText = computed(() => {
return props.labels?.registerText || "Don't have an account?";
})
const registerLinkText = computed(() => {
return props.labels?.registerLink || 'Create an Account';
})
const guestCheckoutLinkText = computed(() => {
return props.labels?.guestCheckoutLink || 'Continue as Guest';
})
const resolvedTitle = computed(() => {
return props.title !== undefined ? props.title : 'Log in';
})
const resolvedButtonText = computed(() => {
return props.buttonText || 'Login';
})
const showForgotPassword = computed(() => {
return props.displayForgotPasswordLink !== false;
})
const showRegister = computed(() => {
return props.displayRegisterLink !== false;
})
const showGuestCheckout = computed(() => {
return props.displayGuestCheckoutLink !== false;
})
const isLoading = computed(() => {
  if (props.onLoginSubmit) {
    return props.loginLoading === true;
  }
  return loading.value;
});
// Surface a friendly fixed message for any login failure — server-side error
// strings can be cryptic ("HTTP 401", GraphQL "Unauthorized", etc.) and aren't
// safe to show to end users. Override via the `labels.invalidCredentials` prop
// if a specific copy is needed.
const errorMessage = computed(() => {
  const raw = props.onLoginSubmit ? props.loginError : error.value;
  if (!raw) return '';
  return getLabel(
    'invalidCredentials',
    "The credentials you entered don't match our records. Please try again.",
  );
});




function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
// Split the register prompt around {link} so the register button renders in
// place and the translation owns the wording + spacing.
const noAccountParts = computed(() => {
  const tpl = getLabel('noAccount', "Don't have an account? {link}");
  const [before, after = ''] = tpl.split('{link}');
  return { before, after };
});
async function handleSubmit(e: any) {
  e.preventDefault();
  if (props.beforeLogin) {
    props.beforeLogin();
  }
  if (props.onLoginSubmit) {
    // Delegation mode: parent handles authentication
    props.onLoginSubmit(email.value, password.value);
    return;
  }
  if (!infra.graphqlClient) return;
  if (loading.value) return;

  const result = await login(email.value, password.value);
  if (result.ok && result.data.user) {
    email.value = '';
    password.value = '';
    if (props.afterLogin) {
      props.afterLogin(
        result.data.user as Contact | Customer,
        result.data.accessToken,
        result.data.refreshToken,
        result.data.expiresAt,
        props.cart ?? null,
      );
    }
  }
}
</script>
