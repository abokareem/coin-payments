/** Converts strings to Error */
export function toError(e: any): any {
  if (typeof e === 'string') {
    return new Error(e)
  }
  return e
}

export function toMainDenominationNumber(amountSun: number | string): number {
  const baseUnits = typeof amountSun === 'number' ? amountSun : Number.parseInt(amountSun)
  if (Number.isNaN(baseUnits)) {
    throw new Error('Cannot convert to main denomination - not a number')
  }
  if (!Number.isFinite(baseUnits)) {
    throw new Error('Cannot convert to main denomination - not finite')
  }
  return baseUnits / 1e6
}

export function toMainDenomination(amountSun: number | string): string {
  return toMainDenominationNumber(amountSun).toString()
}

export function toBaseDenominationNumber(amountTrx: number | string): number {
  const mainUnits = typeof amountTrx === 'number' ? amountTrx : Number.parseFloat(amountTrx)
  if (Number.isNaN(mainUnits)) {
    throw new Error('Cannot convert to base denomination - not a number')
  }
  if (!Number.isFinite(mainUnits)) {
    throw new Error('Cannot convert to base denomination - not finite')
  }
  return Math.floor(mainUnits * 1e6)
}

export function toBaseDenomination(amountTrx: number | string): string {
  return toBaseDenominationNumber(amountTrx).toString()
}

export function isValidXprv(xprv: string): boolean {
  return xprv.startsWith('xprv')
}

export function isValidXpub(xpub: string): boolean {
  return xpub.startsWith('xpub')
}
