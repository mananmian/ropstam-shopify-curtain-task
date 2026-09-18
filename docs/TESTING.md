# Curtain configurator test plan

## Pricing boundaries

Test every boundary because gaps and overlaps are the most likely source of manufacturing errors.

| Width | Expected tier | Panels |
| ---: | --- | ---: |
| 49 | Validation error | - |
| 50 | 50-120cm | 1 |
| 120 | 50-120cm | 1 |
| 121 | 121-240cm | 2 |
| 240 | 121-240cm | 2 |
| 241 | 241-360cm | 3 |
| 360 | 241-360cm | 3 |
| 361 | Validation error | - |

For each valid width, test all three drops and all configured fabrics. Confirm the displayed price, button price,
cart price, and checkout price are identical.

## Cart and order integrity

1. Add a valid configuration and confirm the cart drawer opens without a full-page reload.
2. Confirm `Width`, `Drop`, and `Fabric` are visible on the cart line.
3. Confirm `_fabric_panels`, `_pricing_tier`, and `_calculated_price_cents` are not visible in the storefront cart.
4. Place a test order and confirm all private properties exist in the Shopify Admin order line item.
5. Confirm separate measurements create separate cart lines rather than merging unexpectedly.
6. Confirm a sold-out matching variant cannot be added.

## Resilience and accessibility

- Use keyboard-only navigation for width, drop, swatches, and Add to Cart.
- Confirm visible focus styles and that validation errors are announced by a screen reader.
- Test mobile widths at 320px, 375px, and 768px.
- Throttle the network and confirm the loading state prevents duplicate submissions.
- Force `/cart/add.js` to fail and confirm an actionable error appears.
- Use Chrome Performance/Lighthouse to verify dynamic price updates do not create layout shift.
