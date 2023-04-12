export function getTestFilters(): TestFilter[] {
  const capacitorFrom = 3; // Capacitor 3
  const capacitorTo = 5; // Capacitor 5

  const results = [];
  for (let v = capacitorFrom; v <= capacitorTo; v++) {
    results.push({
      name: `Capacitor ${v}`,
      id: `capacitor-${v}`,
      list: [`capacitor-ios-${v}`, `capacitor-android-${v}`],
    });
  }
  results.push({
    name: 'Cordova',
    id: 'cordova',
    list: ['cordova-android-11', 'cordova-ios-6'],
  });
  return results;
}

export interface TestFilter {
  id: string;
  name: string;
  list: string[];
}
