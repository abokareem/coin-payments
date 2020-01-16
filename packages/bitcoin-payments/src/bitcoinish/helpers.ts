
export function isValidXprv(xprv: string): boolean {
  return xprv.startsWith('xprv')
}

export function isValidXpub(xpub: string): boolean {
  return xpub.startsWith('xpub')
}
