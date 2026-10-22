import { test, expect } from 'vitest';
import { assetUrl } from '../../src/presentation/urls';

test.each(['/', '/RoadsterRace/'])('local assets and home respect base %s', base => {
  for (const path of ['assets/car.glb', '/assets/car.glb', './assets/car.glb']) expect(assetUrl(path, base)).toBe(`${base}assets/car.glb`);
  expect(assetUrl('', base)).toBe(base);
  expect(assetUrl(`${base}audio/thrust.mp3`, base)).toBe(`${base}audio/thrust.mp3`);
  expect(assetUrl('assets/mark.svg?theme=day#icon', base)).toBe(`${base}assets/mark.svg?theme=day#icon`);
});
test.each(['https://example.com/car.glb', '//example.com/car.glb', 'data:audio/wav;base64,AA==', 'blob:https://example.com/test', '#icon'])('external reference %s is preserved', url => {
  expect(assetUrl(url, '/RoadsterRace/')).toBe(url);
});
