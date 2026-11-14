import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>', {
  url: 'https://ha.example/atze-test/strom', runScripts: 'outside-only',
});
const w = dom.window;
w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
w.HTMLDialogElement.prototype.close = function () { this.open = false; };
w.confirm = () => true;
// Load the actual bundle, with its asset URL resolved as in a browser module.
const testing = process.argv.includes('--testing');
const strategyType = testing ? 'atze-dashboard-testing' : 'atze-dashboard';
const editorTag = testing ? 'atze-dashboard-strategy-editor-testing' : 'atze-dashboard-strategy-editor';
let source = (await readFile(new URL('../dist/atze-dashboard-strategy.js', import.meta.url), 'utf8'))
  .replaceAll('import.meta.url', '"https://ha.example/local/atze-dashboard-strategy.js"');
if (testing) source = source
  .replace('const STRATEGY_TYPE = "atze-dashboard";', 'const STRATEGY_TYPE = "atze-dashboard-testing";')
  .replace('const ATZE_TESTING_BUILD = false;', 'const ATZE_TESTING_BUILD = true;')
  .replaceAll('"atze-dashboard-strategy-editor"', '"atze-dashboard-strategy-editor-testing"');
w.eval(source);
const clone = value => JSON.parse(JSON.stringify(value));
const original = { strategy: { type: strategyType, home_power_entity: 'sensor.w',
  energy_setup: { total: 'sensor.kwh', year: 'sensor.year', month: 'sensor.month', day: 'sensor.day' },
  energy_individual: [{ total: 'sensor.device', power: 'sensor.device_w', year: 'sensor.dy', month: 'sensor.dm', day: 'sensor.dd' }],
  area_overrides: { kitchen: { energy_meters: { total: 'sensor.room', day: 'sensor.rd' } } },
  direct_layout: { test: ['preserved'] }, custom_pages: [{ path: 'other' }] }, title: 'Keep dashboard' };
let raw = clone(original), calls = [], failSave = false;
const hass = { user: { is_admin: true }, states: {}, callWS: async request => {
  calls.push(clone(request));
  if (request.type === 'lovelace/config') return clone(raw);
  if (request.type === 'lovelace/config/save') {
    if (failSave) throw new Error('offline');
    raw = clone(request.config); return;
  }
  if (request.type.endsWith('_registry/list')) return [];
  throw new Error('Unexpected mutation/request: ' + request.type);
} };
const card = w.document.createElement(testing ? 'atze-energy-overview-card-testing' : 'atze-energy-overview-card');
card.setConfig({ strategy_settings: true });
card.hass = hass;
assert.equal(card.shadowRoot.querySelector('.energy-settings').hidden, false);
assert(card.shadowRoot.querySelector('.energy-hero > .energy-settings'), 'Zahnrad muss mit dem fixierten Titelbild verbunden sein');
await card._openSettings();
const settle = async () => { for (let i=0; i<15; i++) await new Promise(resolve => setImmediate(resolve)); };
await settle();
let dialog = card._settingsDialog;
let editor = dialog.querySelector(editorTag);
assert.equal(editor.shadowRoot.querySelectorAll('details').length, 2);
assert.equal(editor.shadowRoot.querySelector('.energy-setup-field').value, 'sensor.kwh');
assert.equal(editor.shadowRoot.querySelector('.power-sensor-select').value, 'sensor.w');
assert.deepEqual(clone(editor._config), original.strategy);
assert.equal(calls.filter(c => c.type !== 'lovelace/config' && !c.type.endsWith('_registry/list')).length, 0);
dialog.querySelector('button').click(); await settle();
assert.equal(dialog.isConnected, false);
assert.deepEqual(raw, original);
await card._openSettings(); await settle();
dialog = card._settingsDialog; editor = dialog.querySelector(editorTag);
// Removing the W association must preserve every counter and helper assignment.
const select = editor.shadowRoot.querySelector('.power-sensor-select');
select.value = ''; select.dispatchEvent(new w.Event('change'));
// Concurrent unrelated change must survive the popup save.
raw.strategy.direct_layout.concurrent = true;
await settle();
assert.equal('home_power_entity' in raw.strategy, false);
assert.deepEqual(raw.strategy.energy_setup, original.strategy.energy_setup);
assert.deepEqual(raw.strategy.energy_individual, original.strategy.energy_individual);
assert.deepEqual(raw.strategy.area_overrides, original.strategy.area_overrides);
assert.equal(raw.strategy.direct_layout.concurrent, true);
assert.equal(raw.title, original.title);
assert(calls.filter(c => c.type.startsWith('lovelace/')).every(c => c.url_path === 'atze-test'));
// Failed writes keep the dialog open and allow retry without losing edits.
failSave = true;
editor._addEnergyIndividual(); await settle();
dialog.querySelector('button').click(); await settle();
assert.equal(dialog.isConnected, true);
assert.match(dialog.querySelector('[role="status"]').textContent, /fehlgeschlagen/);
failSave = false;
dialog.querySelector('button').click(); await settle();
assert.equal(dialog.isConnected, false);
assert.equal(raw.strategy.energy_individual.length, 2);
assert.deepEqual(raw.strategy.energy_individual[0], original.strategy.energy_individual[0]);
// Default dashboard requests use HA's null URL path.
w.history.replaceState(null, '', '/lovelace/strom');
await card._openSettings(); await settle();
dialog = card._settingsDialog;
assert.equal(calls.filter(c => c.type === 'lovelace/config').at(-1).url_path, null);
dialog.querySelector('button').click(); await settle();
// Real custom strategy storage forms must load and save without conversion.
for (const nested of [false, true]) {
  const config = { ...clone(original.strategy), type: 'custom:' + strategyType };
  raw = nested ? { strategy: config, title: 'Outer title' } : config;
  const before = clone(raw);
  await card._openSettings(); await settle();
  dialog = card._settingsDialog;
  editor = dialog.querySelector(editorTag);
  assert(editor, 'Custom strategy must load in its original storage shape');
  assert.deepEqual(raw, before, 'Opening must not write configuration');
  editor._setHomePowerEntity('sensor.changed_w'); await settle();
  const saved = nested ? raw.strategy : raw;
  assert.equal(saved.type, 'custom:' + strategyType);
  assert.equal(saved.home_power_entity, 'sensor.changed_w');
  assert.deepEqual(saved.energy_setup, config.energy_setup);
  assert.deepEqual(saved.energy_individual, config.energy_individual);
  assert.deepEqual(saved.area_overrides, config.area_overrides);
  if (nested) assert.equal(raw.title, 'Outer title');
  else assert.equal('strategy' in raw, false);
  dialog.querySelector('button').click(); await settle();
}
// Reject other strategies rather than writing to the wrong dashboard.
raw = { type: 'custom:other-dashboard' };
const writesBefore = calls.filter(c => c.type === 'lovelace/config/save').length;
await card._openSettings(); await settle();
dialog = card._settingsDialog;
assert.equal(dialog.querySelector(editorTag), null);
assert.equal(calls.filter(c => c.type === 'lovelace/config/save').length, writesBefore);
dialog.querySelector('button').click(); await settle();
// An explicit source change continues to use the existing provisioning queue.
const probe = w.document.createElement(editorTag);
probe.energySettingsOnly = true; probe.setConfig(original.strategy);
const queued = []; probe._queueEnergyMeters = context => queued.push(context);
probe._setEnergySetupField('total', 'sensor.new');
assert.equal(queued.length, 1); assert.equal(queued[0].source, 'sensor.new');
assert.equal(probe._config.energy_setup.year, undefined);
assert.equal(original.strategy.energy_setup.year, 'sensor.year');
// The general Settings render no longer includes either moved section.
const editorSource = await readFile(new URL('../src/60-editor.js', import.meta.url), 'utf8');
assert(!editorSource.slice(editorSource.indexOf('  _render() {')).includes('Strom · Gesamtstrom'));
assert(!editorSource.slice(editorSource.indexOf('  _render() {')).includes('Strom · Einzelerfassung'));
card.hass = { ...hass, user: { is_admin: false } };
assert.equal(card.shadowRoot.querySelector('.energy-settings').hidden, true);
await card._openSettings(); assert.equal(card._settingsDialog, null);
console.log('Strom-Popup: bestehende Zuordnungen, Öffnen ohne Mutation, Speichern, Fehler/Retry, Berechtigungen und Quellwechsel erfolgreich.');
w.close();
