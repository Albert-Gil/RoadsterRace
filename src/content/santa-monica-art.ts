/** Original decorative placements; foundations are tested against authored land. */
export const santaMonicaAuthoredBuildings = [
  ...Array.from({ length: 5 }, (_, i) => ({ kind: 'shop' as const, x: -30 + i * 6, z: -9, width: 5, depth: 7, height: 4.5 + i % 3, color: i % 3 })),
  ...Array.from({ length: 7 }, (_, i) => ({ kind: 'hotel' as const, x: -90 + i * 16, z: -85, width: 11, depth: 9, height: 5 + i % 3 * 2, color: i % 3 })),
  ...Array.from({ length: 4 }, (_, i) => ({ kind: 'lifeguard' as const, x: -96 + i * 17, z: 69, width: 3.8, depth: 3.2, height: 2, color: i % 2 })),
];
export const santaMonicaBuildings = santaMonicaAuthoredBuildings.map(b => ({ ...b, z: -b.z }));
