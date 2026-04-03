import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from "@ton/core";

export class JettonWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new JettonWallet(address);
  }

  /**
   * Transfer jettons to another address
   */
  async sendTransfer(
    provider: ContractProvider,
    via: Sender,
    opts: {
      toAddress: Address;
      jettonAmount: bigint;
      forwardTonAmount: bigint;
      forwardPayload?: Cell;
      value: bigint;
      queryId?: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0xf8a7ea5, 32) // op::transfer
        .storeUint(opts.queryId ?? 0, 64)
        .storeCoins(opts.jettonAmount)
        .storeAddress(opts.toAddress)
        .storeAddress(via.address!) // response_address
        .storeBit(false) // no custom_payload
        .storeCoins(opts.forwardTonAmount)
        .storeBit(opts.forwardPayload ? true : false)
        .storeMaybeRef(opts.forwardPayload ?? null)
        .endCell(),
    });
  }

  /**
   * Burn jettons
   */
  async sendBurn(
    provider: ContractProvider,
    via: Sender,
    opts: {
      jettonAmount: bigint;
      responseAddress: Address;
      value: bigint;
      queryId?: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x595f07bc, 32) // op::burn
        .storeUint(opts.queryId ?? 0, 64)
        .storeCoins(opts.jettonAmount)
        .storeAddress(opts.responseAddress)
        .endCell(),
    });
  }

  /**
   * GET: wallet data (balance, owner, master, code)
   */
  async getWalletData(provider: ContractProvider) {
    const result = await provider.get("get_wallet_data", []);
    const data = result.stack.readCell().beginParse();
    return {
      balance: data.loadCoins(),
      ownerAddress: data.loadAddress(),
      jettonMasterAddress: data.loadAddress(),
      jettonWalletCode: data.loadRef(),
    };
  }

  /**
   * GET: just the balance
   */
  async getBalance(provider: ContractProvider) {
    const { balance } = await this.getWalletData(provider);
    return balance;
  }
}
