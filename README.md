# Made-to-Measure Curtain Configurator

Shopify Online Store 2.0 implementation of a made-to-measure curtain product page. It uses Shopify Metaobjects for
pricing rules, a product metafield list reference, vanilla ES6+ JavaScript, private line item properties, the Ajax Cart
API, and Dawn's cart drawer rendering.

## Architecture

- `sections/curtain-configurator.liquid` renders the product UI and serializes product-specific pricing rules.
- `assets/curtain-configurator.js` validates selections, calculates the price, resolves the purchasable variant, and
  submits the native Ajax Cart request.
- `assets/curtain-configurator.css` provides responsive, accessible styling with reserved result space to prevent CLS.
- `templates/product.curtain.json` is the assignable product template.
- `docs/metaobject-schema.json` records the required Admin data model and sample entries.
- `docs/TESTING.md` contains boundary, cart-integrity, resilience, and accessibility checks.

No jQuery or third-party UI/mathematical library is used.

## 1. Create the Metaobject definition

In Shopify Admin, go to **Settings > Custom data > Metaobjects > Add definition**.

Create **Curtain Pricing Tier** with type `curtain_pricing_tier` and these fields:

| Field name | Key | Type | Required |
| --- | --- | --- | --- |
| Minimum width | `min_width` | Integer | Yes |
| Maximum width | `max_width` | Integer | Yes |
| Panels required | `panels_required` | Integer | Yes |
| Base price | `base_price` | Money | Yes |
| Price per drop tier | `price_per_drop_tier` | Money | Yes |

Enable storefront access for the definition. Create at least these three entries:

### Note on metaobject field keys

The brief specifies the field keys as `min_width` and `max_width`. When the connected demonstration store's fields
were created from the display names **Minimum width** and **Maximum width**, Shopify generated the immutable keys
`minimum_width` and `maximum_width`. The Liquid serialization layer resolves both naming conventions, so the pricing
logic works with either the brief's keys or the connected store's Admin-generated keys. The table above preserves the
brief's requested schema; `docs/metaobject-schema.json` records the connected store's actual schema.

Money fields are already in minor units when rendered in Liquid; only Decimal fields are multiplied by 100.

| Minimum | Maximum | Panels | Example base | Example drop increment |
| ---: | ---: | ---: | ---: | ---: |
| 50 | 120 | 1 | 100.00 | 25.00 |
| 121 | 240 | 2 | 180.00 | 35.00 |
| 241 | 360 | 3 | 250.00 | 45.00 |

The values are examples and can be changed in Admin without editing theme code.

## 2. Create and populate the product metafield

Go to **Settings > Custom data > Products > Add definition** and create:

- Name: `Curtain pricing tiers`
- Namespace and key: `custom.curtain_pricing_tiers`
- Type: Metaobject reference
- Restrict reference to: `Curtain Pricing Tier`
- Accept list of values: enabled

Open the curtain product and attach all three pricing entries to this metafield in ascending width order.

## 3. Pricing calculation

The brief defines the fields but does not specify how a drop increment is applied. This implementation documents and
uses the following deterministic assumption:

```text
drop tier index: 150cm = 0, 200cm = 1, 250cm = 2
calculated price = base_price + (drop tier index * price_per_drop_tier)
```

Example: for a 180cm width, the 121-240cm tier is selected. If its base is 180.00 and increment is 35.00, a 250cm
drop costs `180 + (2 * 35) = 250.00` and requires two panels.

Drop order comes from the section setting `Drop values`; changing that order changes the tier indexes. Confirm this
assumption with the stakeholder before production use.

## 4. Configure price-safe product variants

The Ajax Cart API cannot accept an arbitrary client-provided line price. To guarantee that the displayed, cart, and
checkout prices agree without a custom app, this implementation uses priced variants.

Create these product options in this exact order or update their names in the section settings:

1. `Width Tier`: `50-120cm`, `121-240cm`, `241-360cm`
2. `Drop`: `150cm`, `200cm`, `250cm`
3. `Fabric`: values matching the section's Fabric block `option_value` fields

Create all required combinations and set each variant price to the formula result. The Width Tier is resolved silently
from the customer's numeric width; Fabric Panels is never a variant or customer-selectable input.

`Block cart when variant and calculated prices differ` is enabled by default. This prevents order-integrity failures
caused by an incorrectly priced variant.

### Alternative: Cart Transform Function

The section retains a `Computed preview` setting for a future backend pricing implementation. Purchasing is deliberately
disabled in that mode; no backend pricing Function is included in this theme.
A Shopify Cart Transform Function using a `lineUpdate` operation can make the calculated price authoritative. That
approach requires a custom app and is supported for line updates on development stores and Shopify Plus stores.

## 5. Configure the product template

1. Upload/push this theme to the development store.
2. In Shopify Admin, open the curtain product.
3. Assign the `product.curtain` theme template.
4. Open the Theme Editor and select the curtain product.
5. In **Curtain configurator**, configure the drop values and Fabric blocks.
6. Ensure every Fabric block's `Product variant option value` exactly matches its product option value.

## Cart serialization

The configurator posts JSON to the locale-aware Dawn `routes.cart_add_url` and requests the cart drawer's section IDs
in the same operation. Dawn replaces and opens the returned cart drawer markup without a page refresh.

Public properties:

- `Width`: customer value with `cm`
- `Drop`: selected value with `cm`
- `Fabric`: customer-facing fabric label

Private fulfillment properties:

- `_fabric_panels`: panel count from the matched Metaobject
- `_pricing_tier`: resolved internal width tier
- `_calculated_price_cents`: audit value used to compare pricing configuration

Dawn hides properties whose keys start with `_`, while Shopify preserves them on the cart and order line.

### Trust boundary

The selected variant price is authoritative, so changing browser-side properties cannot change the amount charged.
Line item properties themselves originate in the browser and should not be treated as a security boundary. For a
production manufacturing workflow, an order webhook or backend service should recompute the expected panel count from
the recorded width and flag any mismatch before fulfillment. The private property remains useful operational metadata,
but this independent validation protects against deliberate request tampering.

## Local development and validation

Use Shopify CLI after authenticating with the development store:

```bash
shopify theme dev --store your-development-store.myshopify.com
shopify theme check
```

Run the cases in `docs/TESTING.md`, place a test order, and add an Admin screenshot of the Metaobject definition to
`docs/metaobject-schema.png` before submission.

## Submission checklist

- Password-protected development store preview URL and storefront password
- GitHub repository containing the theme and this documentation
- Screenshot/export of the Metaobject definition
- Product assigned to `product.curtain`
- Complete boundary, cart, mobile, and keyboard testing
- Test order proving private manufacturing properties reach Shopify Admin

## Development-store setup

- Product: `made-to-measure-linen-curtain` (27 priced variants; demonstration prices in PKR).
- Product Admin ID: `8058924367958`.
- Store: `repstamsolution-wy8pyzu9.myshopify.com`.
- Theme: `152192286806`, connected to this repository's `main` branch.
- Existing pricing Metaobjects are attached in ascending width order.
- Inventory tracking is disabled for this made-to-order demonstration.
- Live storefront verification is recorded in `docs/LIVE-VERIFICATION.md`.

Known limits: pricing follows the documented drop-index assumption rather than an arbitrary formula stored in Admin.
Updating a Metaobject price also requires updating the matching variant prices; mismatches block purchasing by default.
Internal width-tier variant titles may still be shown by Shopify checkout and order notifications; theme filtering applies
only to the storefront cart. Fulfillment properties are client supplied, so backend verification is still needed for
tamper-resistant manufacturing workflows. This is a theme-based demonstration, not a completed backend validation app.

## Theme base

Built on Shopify's Dawn reference theme. Dawn's original license is retained in this repository.
