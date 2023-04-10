export function d(id: string): string {
  return document.getElementById(id)?.getAttribute('current-value') as string;
}

export function checked(id: string): boolean {
  const value = document.getElementById(id)?.getAttribute('current-checked');
  return value == 'true';
}
