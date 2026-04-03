import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from "@ton/core";

export type JettonMinterConfig = {
  admin: Address;
  content: Cell;
  walletCode: Cell;
};

export function jettonMinterConfigToCell(config: JettonMinterConfig): Cell {
  return beginCell()
    .storeCoins(0) // total_supply = 0 initially
    .storeAddress(config.admin)
    .storeRef(config.content)
    .storeRef(config.walletCode)
    .endCell();
}

/**
 * Build off-chain metadata content cell (TEP-64, layout 0x01)
 */
export function buildJettonOnchainMetadata(uri: string): Cell {
  return beginCell()
    .storeUint(0x01, 8) // off-chain prefix
    .storeStringTail(uri)
    .endCell();
}

export class JettonMinter implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new JettonMinter(address);
  }

  static createFromConfig(config: JettonMinterConfig, code: Cell, workchain = 0) {
    const data = jettonMinterConfigToCell(config);
    const init = { code, data };
    return new JettonMinter(contractAddress(workchain, init), init);
  }

  /**
   * Deploy the minter contract
   */
  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /**
   * Mint jettons to a recipient
   */
  async sendMint(
    provider: ContractProvider,
    via: Sender,
    opts: {
      toAddress: Address;
      jettonAmount: bigint;
      forwardTonAmount: bigint;
      totalTonAmount: bigint;
      queryId?: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.totalTonAmount,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(21, 32) // op::mint
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.toAddress)
        .storeCoins(opts.jettonAmount)
        .storeCoins(opts.forwardTonAmount)
        .endCell(),
    });
  }

  /**
   * Change admin address
   */
  async sendChangeAdmin(
    provider: ContractProvider,
    via: Sender,
    newAdmin: Address
  ) {
    await provider.internal(via, {
      value: toNano("0.05"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(3, 32) // op::change_admin
        .storeUint(0, 64)
        .storeAddress(newAdmin)
        .endCell(),
    });
  }

  /**
   * Update content (metadata)
   */
  async sendChangeContent(
    provider: ContractProvider,
    via: Sender,
    newContent: Cell
  ) {
    await provider.internal(via, {
      value: toNano("0.05"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(4, 32) // op::change_content
        .storeUint(0, 64)
        .storeRef(newContent)
        .endCell(),
    });
  }

  /**
   * GET: get_jetton_data
   */
  async getJettonData(provider: ContractProvider) {
    const result = await provider.get("get_jetton_data", []);
    const totalSupply = result.stack.readBigNumber();
    const mintable = result.stack.readBoolean();
    const adminAddress = result.stack.readAddress();
    const content = result.stack.readCell();
    const walletCode = result.stack.readCell();
    return { totalSupply, mintable, adminAddress, content, walletCode };
  }

  /**
   * GET: get_wallet_address (TEP-89)
   */
  async getWalletAddress(provider: ContractProvider, ownerAddress: Address) {
    const result = await provider.get("get_wallet_address", [
      {
        type: "slice",
        cell: beginCell().storeAddress(ownerAddress).endCell(),
      },
    ]);
    return result.stack.readAddress();
  }
}
