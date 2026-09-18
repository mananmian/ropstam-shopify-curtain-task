if (!customElements.get('curtain-configurator')) {
  customElements.define(
    'curtain-configurator',
    class CurtainConfigurator extends HTMLElement {
      connectedCallback() {
        if (this.initialized) return;
        this.initialized = true;
        this.form = this.querySelector('[data-curtain-form]');
        this.widthInput = this.querySelector('[data-curtain-width]');
        this.dropSelect = this.querySelector('[data-curtain-drop]');
        this.fabricInputs = [...this.querySelectorAll('[data-curtain-fabric]')];
        this.fabricLabel = this.querySelector('[data-curtain-fabric-label]');
        this.priceOutput = this.querySelector('[data-curtain-price]');
        this.errorOutput = this.querySelector('[data-curtain-error]');
        this.submitButton = this.querySelector('[data-curtain-submit]');
        this.submitLabel = this.querySelector('[data-curtain-submit-label]');
        this.spinner = this.submitButton?.querySelector('.loading__spinner');

        this.tiers = this.readJson('[data-curtain-tiers]', []);
        this.product = this.readJson('[data-curtain-product]', { optionNames: [], variants: [] });
        this.currency = this.dataset.currency || 'USD';
        this.minWidth = Math.min(...this.tiers.map((tier) => Number(tier.minWidth)));
        this.maxWidth = Math.max(...this.tiers.map((tier) => Number(tier.maxWidth)));
        this.pricingStrategy = this.dataset.pricingStrategy || 'priced_variants';
        this.enforcePriceMatch = this.dataset.enforcePriceMatch === 'true';
        this.optionIndexes = this.getOptionIndexes();
        this.initialVariant = this.product.variants.find(
          (variant) => String(variant.id) === String(this.dataset.initialVariantId)
        );

        this.form?.addEventListener('submit', (event) => this.handleSubmit(event));
        this.widthInput?.addEventListener('input', () => this.update());
        this.dropSelect?.addEventListener('change', () => this.update());
        this.fabricInputs.forEach((input) => {
          input.addEventListener('change', () => {
            if (input.checked && this.fabricLabel) this.fabricLabel.textContent = input.dataset.label;
            this.update();
          });
        });

        this.update();
      }

      readJson(selector, fallback) {
        try {
          return JSON.parse(this.querySelector(selector)?.textContent || '');
        } catch (error) {
          console.error(`Curtain configurator: invalid JSON in ${selector}`, error);
          return fallback;
        }
      }

      normalize(value) {
        return String(value ?? '')
          .trim()
          .toLowerCase()
          .replace(/[–—]/g, '-')
          .replace(/\s+/g, '');
      }

      normalizeMeasurement(value) {
        return this.normalize(value).replace(/cm$/, '');
      }

      formatMeasurement(value) {
        return `${String(value).trim().replace(/\s*cm$/i, '')}cm`;
      }

      getOptionIndexes() {
        const names = (this.product.optionNames || []).map((name) => this.normalize(name));
        return {
          width: names.indexOf(this.normalize(this.dataset.widthOptionName)),
          drop: names.indexOf(this.normalize(this.dataset.dropOptionName)),
          fabric: names.indexOf(this.normalize(this.dataset.fabricOptionName)),
        };
      }

      get selectedFabric() {
        return this.fabricInputs.find((input) => input.checked) || null;
      }

      getState() {
        const rawWidth = this.widthInput?.value.trim() || '';
        const width = Number(rawWidth);
        const drop = this.dropSelect?.value || '';
        const fabric = this.selectedFabric?.value || '';
        const tier = Number.isFinite(width)
          ? this.tiers.find((item) => width >= Number(item.minWidth) && width <= Number(item.maxWidth))
          : null;
        const dropValues = [...this.dropSelect.options].map((option) => option.value);
        const dropTierIndex = Math.max(0, dropValues.indexOf(drop));
        const calculatedPriceCents = tier
          ? Number(tier.basePriceCents) + dropTierIndex * Number(tier.pricePerDropTierCents)
          : null;
        const variant = tier ? this.findVariant(tier, drop, fabric) : null;

        return { rawWidth, width, drop, fabric, tier, calculatedPriceCents, variant };
      }

      findVariant(tier, drop, fabric) {
        if (this.pricingStrategy !== 'priced_variants') return this.initialVariant || this.product.variants[0] || null;

        const requiredIndexes = Object.values(this.optionIndexes);
        if (requiredIndexes.some((index) => index < 0)) return null;

        return (
          this.product.variants.find((variant) => {
            const options = variant.options || [];
            const widthMatches =
              this.normalizeMeasurement(options[this.optionIndexes.width]) === this.normalizeMeasurement(tier.optionValue);
            const dropMatches =
              this.normalizeMeasurement(options[this.optionIndexes.drop]) === this.normalizeMeasurement(drop);
            const fabricMatches = this.normalize(options[this.optionIndexes.fabric]) === this.normalize(fabric);
            return widthMatches && dropMatches && fabricMatches;
          }) || null
        );
      }

      validate(state) {
        if (this.pricingStrategy !== 'priced_variants') return 'Purchasing is unavailable until pricing is configured.';
        if (!Array.isArray(this.tiers) || !this.tiers.length) return 'Pricing is currently unavailable. Please contact us.';
        if (!state.rawWidth) return 'Enter your curtain width to calculate the price.';
        if (!Number.isInteger(state.width)) return 'Width must be a whole number in centimetres.';
        if (state.width < this.minWidth || state.width > this.maxWidth) {
          return `Width must be between ${this.minWidth} and ${this.maxWidth} cm.`;
        }
        if (!state.tier) return 'No pricing tier covers this width. Please check the product configuration.';
        if (!state.drop) return 'Select a drop.';
        if (this.fabricInputs.length && !state.fabric) return 'Select a fabric.';

        if (this.pricingStrategy === 'priced_variants') {
          if (Object.values(this.optionIndexes).some((index) => index < 0)) {
            return 'Product option names do not match the configurator settings.';
          }
          if (!state.variant) return 'This measurement, drop, and fabric combination is not configured.';
          if (!state.variant.available) return 'This configuration is currently unavailable.';
          if (this.enforcePriceMatch && Number(state.variant.price) !== Number(state.calculatedPriceCents)) {
            return 'This configuration has a pricing mismatch. Please contact the store team.';
          }
        }

        return '';
      }

      update() {
        const state = this.getState();
        const error = this.validate(state);
        const payablePrice =
          this.pricingStrategy === 'priced_variants' && state.variant
            ? Number(state.variant.price)
            : state.calculatedPriceCents;

        if (Number.isFinite(payablePrice)) this.priceOutput.textContent = this.formatMoney(payablePrice);

        this.setError(error && state.rawWidth ? error : '');
        if (!this.submitButton) return;

        this.submitButton.disabled = Boolean(error) || Boolean(this.isLoading);
        if (!state.rawWidth) {
          this.submitLabel.textContent = 'Enter measurements';
        } else if (error) {
          this.submitLabel.textContent = 'Configuration unavailable';
        } else {
          this.submitLabel.textContent = `Add to cart - ${this.formatMoney(payablePrice)}`;
        }
      }

      formatMoney(cents) {
        return new Intl.NumberFormat(document.documentElement.lang || 'en', {
          style: 'currency',
          currency: this.currency,
        }).format(Number(cents) / 100);
      }

      setError(message) {
        if (!this.errorOutput) return;
        this.errorOutput.textContent = message;
        this.errorOutput.hidden = !message;
        this.widthInput?.setAttribute('aria-invalid', String(Boolean(message && /width|whole number/i.test(message))));
      }

      async handleSubmit(event) {
        event.preventDefault();
        if (this.isLoading) return;
        const state = this.getState();
        const error = this.validate(state);
        if (error) {
          this.setError(error);
          this.widthInput?.focus();
          return;
        }

        const variant = state.variant || this.initialVariant || this.product.variants[0];
        if (!variant) {
          this.setError('No purchasable product variant is configured.');
          return;
        }

        const cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        const sections = cart?.getSectionsToRender?.().map((section) => section.id) || [];
        const payload = {
          items: [
            {
              id: variant.id,
              quantity: 1,
              properties: {
                Width: this.formatMeasurement(state.width),
                Drop: this.formatMeasurement(state.drop),
                Fabric: this.selectedFabric?.dataset.label || state.fabric,
                _fabric_panels: state.tier.panelsRequired,
                _pricing_tier: state.tier.optionValue,
                _calculated_price_cents: state.calculatedPriceCents,
              },
            },
          ],
          sections,
          sections_url: window.location.pathname,
        };

        this.setLoading(true);
        this.setError('');
        cart?.setActiveElement?.(document.activeElement);

        try {
          const response = await fetch(window.routes?.cart_add_url || '/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (!response.ok || result.status) {
            throw new Error(result.description || result.message || 'Unable to add this item.');
          }

          const addedLine = result.items?.[0] || result;
          if (cart?.renderContents && sections.length && sections.every((id) => typeof result.sections?.[id] === 'string')) {
            try {
              cart.classList.remove('is-empty');
              cart.renderContents({ ...addedLine, sections: result.sections });
            } catch (renderError) {
              window.location.assign(window.routes?.cart_url || '/cart');
            }
          } else {
            window.location.assign(window.routes?.cart_url || '/cart');
          }

          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined' && PUB_SUB_EVENTS.cartUpdate) {
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'curtain-configurator',
              productVariantId: variant.id,
              cartData: result,
            });
          }
        } catch (requestError) {
          console.error('Curtain configurator add-to-cart error:', requestError);
          this.setError(requestError.message || 'Something went wrong. Please try again.');
        } finally {
          this.setLoading(false);
        }
      }

      setLoading(isLoading) {
        this.isLoading = isLoading;
        if (!this.submitButton) return;
        this.submitButton.disabled = isLoading || Boolean(this.validate(this.getState()));
        this.submitButton.classList.toggle('loading', isLoading);
        this.spinner?.classList.toggle('hidden', !isLoading);
        this.submitButton.setAttribute('aria-busy', String(isLoading));
      }
    }
  );
}
