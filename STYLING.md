# Styling propeller-v2-vue-ui

The package ships a precompiled stylesheet (`dist/styles.css`) that bundles
every Tailwind utility class its components reference plus the theme tokens
those utilities resolve against. Consumers import it once:

```ts
// main.ts (or your app entry)
import 'propeller-v2-vue-ui/styles.css';
```

If you don't want default styling at all, skip the import — every component
will render unstyled (Tailwind classes resolve to nothing) and you'll be on
your own.

The token names and BEM hook class names are **identical** to
`propeller-v2-react-ui`. A project running both frameworks can share a
single stylesheet of overrides.

## Three override surfaces

Pick the one that matches the scope of your change.

### 1. Theme tokens (most cases)

The package's `:root` block declares CSS variables like `--card`,
`--primary`, `--border`, `--radius-container`, etc. at low specificity. A
consumer that re-declares the same variable anywhere with equal or higher
specificity wins, and every utility that resolved against it updates
instantly.

```css
/* your global stylesheet — re-skin the whole package without touching components */
:root {
  --primary:            #ff7043;  /* changes bg-primary, text-primary, … */
  --primary-foreground: #ffffff;
  --card:               #fafafa;
  --border:             #e1e1e1;
  --radius-container:   12px;
}
```

Scope-limited overrides work too:

```css
.brand-x { --primary: #1e88e5; }
.brand-y { --primary: #43a047; }
```

`<div class="brand-x"><ProductCard ... /></div>` and the embedded
`bg-primary` / `text-primary` calls inside the card resolve to blue. Same
component, different scope.

Full token list (declared in `src/styles.css`): background, foreground,
foreground-subtle, card, card-foreground, popover, popover-foreground,
surface-hover, primary (+fg), secondary (+fg), muted (+fg), accent (+fg),
destructive (+fg), success (+fg), warning (+fg), border, border-subtle,
input, ring, radius, radius-control, radius-container.

### 2. BEM hooks (component-specific overrides)

Every styled element in every component carries a BEM class alongside its
Tailwind utilities — `.propeller-product-card`,
`.propeller-product-card__price`, `.propeller-breadcrumbs`, etc. The package
emits its utilities inside `@layer utilities`, so any unlayered consumer
rule that targets a BEM class wins by cascade order regardless of where it
appears in the stylesheet.

```css
.propeller-product-card {
  background: #fff8e1;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.propeller-product-card__price {
  font-weight: 700;
  color: #b45309;
}

.propeller-breadcrumbs__separator { display: none; }
```

The `@layer utilities` vs plain-rule cascade rule is part of the CSS spec —
no `!important` required.

### 3. Per-instance `class`

Vue merges a `class` attribute passed to a component onto that component's
root element automatically (standard fallthrough-attribute behaviour), so a
one-off override is a regular attribute:

```vue
<ProductCard :product="p" class="bg-yellow-100 ring-2 ring-yellow-400" />
<Breadcrumbs :categoryPath="[]" currentLabel="Home" class="text-sm text-muted-foreground" />
```

The consumer's class is merged with the component's base classes — it adds
to them, it does not replace them. To *strip* a default, use the BEM hook
approach.

## What does NOT work

- **No replacing internal markup.** Use slots where a component exposes
  them; otherwise the component's structure is fixed. Re-skin via tokens or
  BEM hooks.
- **No global `@apply` directives that target package classes from the
  host's Tailwind config.** The package's `bg-card` etc. are not registered
  in your `@apply` resolver — they only exist in `dist/styles.css`. Write a
  host-side override as plain CSS targeting the BEM hook.
- **No theme tokens you didn't declare.** Tailwind v4 utility classes that
  reference tokens absent from the cascade resolve to nothing. Declare any
  custom token in your own `@theme` block.

## Tailwind dependency

The package's styles compile to vanilla CSS at build time. **Consumers do
NOT need Tailwind** to use the package — `dist/styles.css` works in any Vue
project. If you also use Tailwind, importing the package's CSS doesn't
conflict; your own Tailwind output is a separate stylesheet.
