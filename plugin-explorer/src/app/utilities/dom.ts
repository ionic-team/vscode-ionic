export function d(id: string): string {
  return document.getElementById('sch')?.getAttribute('current-value') as string;
}
