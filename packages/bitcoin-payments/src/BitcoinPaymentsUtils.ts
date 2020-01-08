import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils'
import { toBitcoinishConfig } from './utils'
import { BlockbookConnectedConfig } from './types'

export class BitcoinPaymentsUtils extends BitcoinishPaymentsUtils {
  constructor(config: BlockbookConnectedConfig = {}) {
    super(toBitcoinishConfig(config))
  }
}
