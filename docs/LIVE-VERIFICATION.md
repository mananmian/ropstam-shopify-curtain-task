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
- Cart notification refreshes without page reload and displays Width, Drop, Fabric without internal properties.

No new checkout order was placed during this verification pass. A test order and backend fulfillment-property audit,
network-failure simulation, and measured Lighthouse/CLS results must be recorded before claiming full production QA.
