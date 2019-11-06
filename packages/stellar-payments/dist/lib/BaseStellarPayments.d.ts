import { BasePayments, BalanceResult, FeeOption, ResolvedFeeOption, Payport, ResolveablePayport } from '@faast/payments-common';
import { Numeric } from '@faast/ts-common';
import * as Stellar from 'stellar-sdk';
import { BaseStellarPaymentsConfig, StellarUnsignedTransaction, StellarSignedTransaction, StellarBroadcastResult, StellarTransactionInfo, StellarCreateTransactionOptions, FromToWithPayport, StellarSignatory } from './types';
import { StellarPaymentsUtils } from './StellarPaymentsUtil';
export declare abstract class BaseStellarPayments<Config extends BaseStellarPaymentsConfig> extends StellarPaymentsUtils implements BasePayments<Config, StellarUnsignedTransaction, StellarSignedTransaction, StellarBroadcastResult, StellarTransactionInfo> {
    config: Config;
    constructor(config: Config);
    getFullConfig(): Config;
    getPublicConfig(): Pick<Config, Exclude<keyof Config, "logger" | "server">> & Config;
    abstract getPublicAccountConfig(): Config;
    abstract getAccountIds(): string[];
    abstract getAccountId(index: number): string;
    abstract getHotSignatory(): StellarSignatory;
    abstract getDepositSignatory(): StellarSignatory;
    abstract isReadOnly(): boolean;
    private doGetPayport;
    private doResolvePayport;
    resolvePayport(payport: ResolveablePayport): Promise<Payport>;
    resolveFromTo(from: number, to: ResolveablePayport): Promise<FromToWithPayport>;
    getPayport(index: number): Promise<Payport>;
    requiresBalanceMonitor(): boolean;
    getAddressesToMonitor(): string[];
    isSweepableAddressBalance(balance: Numeric): boolean;
    isSweepableBalance(balance: string, payport?: ResolveablePayport): boolean;
    loadAccount(address: string): Promise<Stellar.AccountResponse | null>;
    loadAccountOrThrow(address: string): Promise<Stellar.AccountResponse>;
    getBalance(payportOrIndex: ResolveablePayport): Promise<BalanceResult>;
    getNextSequenceNumber(payportOrIndex: ResolveablePayport): Promise<string>;
    resolveIndexFromAddressAndMemo(address: string, memo?: string): number | null;
    getLatestBlock(): Promise<Stellar.ServerApi.LedgerRecord>;
    getTransactionInfo(txId: string): Promise<StellarTransactionInfo>;
    resolveFeeOption(feeOption: FeeOption): Promise<ResolvedFeeOption>;
    private resolvePayportBalance;
    private getStellarNetwork;
    private serializeTransaction;
    private deserializeTransaction;
    private doCreateTransaction;
    createTransaction(from: number, to: ResolveablePayport, amount: string, options?: StellarCreateTransactionOptions): Promise<StellarUnsignedTransaction>;
    createSweepTransaction(from: number, to: ResolveablePayport, options?: StellarCreateTransactionOptions): Promise<StellarUnsignedTransaction>;
    signTransaction(unsignedTx: StellarUnsignedTransaction): Promise<StellarSignedTransaction>;
    broadcastTransaction(signedTx: StellarSignedTransaction): Promise<StellarBroadcastResult>;
}
