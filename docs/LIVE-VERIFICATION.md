# Live verification

Store: repstamsolution-wy8pyzu9.myshopify.com
Product: made-to-measure-linen-curtain

## Verified in the Shopify Admin and storefront

- Product created with all 27 Width Tier / Drop / Fabric combinations.
- All persisted variant prices checked against the three existing active Metaobject entries.
- Width tiers: 50-120 (1 panel), 121-240 (2 panels), 241-360 (3 panels).
- PKR prices by drop (150 / 200 / 250): 100 / 125 / 150; 180 / 215 / 250; 250 / 295 / 340.
- Existing definition keys `minimum_width`, `maximum_width`, `panels_required`, `base_price`, `price_per_drop_tier`.
- Product metafield list references all three entries.
- Live width boundary checks: 50, 120, 121, 240, 241, 360 select correct priced variants.
- 49, 361, and 180.5 are rejected.
- Width 180, drop 200, Soft Sage shows PKR 215 and adds successfully using Ajax.
- Ajax cart refreshes without a page reload and displays Width, Drop, Fabric without internal properties.
- Cart drawer enabled and verified: 300cm / 250cm / Charcoal adds at PKR 340; combined with the prior PKR 215
  configuration, drawer total is PKR 555. Internal properties and option rows are hidden from the visible cart.
- Shopify test order `#1003` verifies that the backend order line retains public Width / Drop / Fabric properties and
  the private `_fabric_panels`, `_pricing_tier`, and `_calculated_price_cents` fulfillment properties.
- Product uses a theme-provided curtain illustration until a real product photograph is uploaded.

Test checkout and backend fulfillment-property audit are complete. Network-failure simulation, mobile viewport
validation, and measured Lighthouse/CLS results must still be recorded before claiming full production QA. The
external-browser viewport override did not apply, so no mobile pass is claimed.
