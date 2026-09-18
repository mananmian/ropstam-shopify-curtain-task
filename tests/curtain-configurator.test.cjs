const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

let CurtainConfigurator;
const context = {
  console,
  HTMLElement: class HTMLElement {},
  customElements: {
    get: () => undefined,
    define: (_name, elementClass) => {
      CurtainConfigurator = elementClass;
    },
  },
};

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'curtain-configurator.js'), 'utf8');
vm.runInNewContext(source, context);

const tiers = [
  { minWidth: 50, maxWidth: 120, panelsRequired: 1, basePriceCents: 10000, pricePerDropTierCents: 2500, optionValue: '50-120cm' },
  { minWidth: 121, maxWidth: 240, panelsRequired: 2, basePriceCents: 18000, pricePerDropTierCents: 3500, optionValue: '121-240cm' },
  { minWidth: 241, maxWidth: 360, panelsRequired: 3, basePriceCents: 25000, pricePerDropTierCents: 4500, optionValue: '241-360cm' },
];
const drops = ['150', '200', '250'];
const fabrics = ['Natural Linen', 'Soft Sage'];
const variants = [];
let nextId = 1;

for (const tier of tiers) {
  for (const [dropIndex, drop] of drops.entries()) {
    for (const fabric of fabrics) {
      variants.push({
        id: nextId++,
        options: [tier.optionValue, `${drop}cm`, fabric],
        price: tier.basePriceCents + dropIndex * tier.pricePerDropTierCents,
        available: true,
      });
    }
  }
}

function createConfigurator(width, drop = '150', fabric = fabrics[0]) {
  const configurator = new CurtainConfigurator();
  configurator.dataset = {
    widthOptionName: 'Width Tier',
    dropOptionName: 'Drop',
    fabricOptionName: 'Fabric',
  };
  configurator.product = { optionNames: ['Width Tier', 'Drop', 'Fabric'], variants };
  configurator.optionIndexes = configurator.getOptionIndexes();
  configurator.tiers = tiers;
  configurator.pricingStrategy = 'priced_variants';
  configurator.enforcePriceMatch = true;
  configurator.minWidth = 50;
  configurator.maxWidth = 360;
  configurator.widthInput = { value: String(width) };
  configurator.dropSelect = {
    value: drop,
    options: drops.map((value) => ({ value })),
  };
  configurator.fabricInputs = [
    { checked: true, value: fabric, dataset: { label: fabric } },
  ];
  return configurator;
}

const boundaryCases = [
  [50, 1, '50-120cm'],
  [120, 1, '50-120cm'],
  [121, 2, '121-240cm'],
  [240, 2, '121-240cm'],
  [241, 3, '241-360cm'],
  [360, 3, '241-360cm'],
];

for (const [width, panels, optionValue] of boundaryCases) {
  const configurator = createConfigurator(width);
  const state = configurator.getState();
  assert.equal(state.tier.panelsRequired, panels);
  assert.equal(state.tier.optionValue, optionValue);
  assert.equal(configurator.validate(state), '');
}

assert.match(createConfigurator(49).validate(createConfigurator(49).getState()), /between 50 and 360/);
assert.match(createConfigurator(361).validate(createConfigurator(361).getState()), /between 50 and 360/);

const priced = createConfigurator(180, '250', 'Soft Sage').getState();
assert.equal(priced.tier.panelsRequired, 2);
assert.equal(priced.calculatedPriceCents, 25000);
assert.equal(priced.variant.price, 25000);
assert.equal(createConfigurator(180).formatMeasurement('200cm'), '200cm');
assert.equal(createConfigurator(180).formatMeasurement(200), '200cm');

const mismatchConfigurator = createConfigurator(180, '250');
const mismatchState = mismatchConfigurator.getState();
mismatchState.variant = { ...mismatchState.variant, price: 999 };
assert.match(mismatchConfigurator.validate(mismatchState), /pricing mismatch/);

console.log('Curtain configurator unit tests passed.');
