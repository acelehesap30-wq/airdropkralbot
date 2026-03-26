// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * NXT Token — AirdropKral Nexus native utility token
 * ERC-20 on BNB Smart Chain (BSC)
 *
 * Features:
 *  - Minter role: backend mints tokens when users convert SC/HC/RC → NXT
 *  - Burnable: users can burn their own tokens
 *  - Capped supply: hard cap prevents inflation
 *  - Pausable: admin emergency pause
 *  - Transfer tax: configurable fee on transfers (treasury revenue)
 *  - Anti-whale: max wallet balance limit
 */

// ── Minimal OpenZeppelin interfaces (no external deps needed) ────────

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

// ── ERC20 Base ───────────────────────────────────────────────────────

contract ERC20 is Context, IERC20, IERC20Metadata {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual override returns (string memory) { return _name; }
    function symbol() public view virtual override returns (string memory) { return _symbol; }
    function decimals() public view virtual override returns (uint8) { return 18; }
    function totalSupply() public view virtual override returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view virtual override returns (uint256) { return _balances[account]; }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), to, amount);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        address spender = _msgSender();
        uint256 currentAllowance = _allowances[from][spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked { _approve(from, spender, currentAllowance - amount); }
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal virtual {
        require(from != address(0), "ERC20: transfer from zero");
        require(to != address(0), "ERC20: transfer to zero");
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: insufficient balance");
        unchecked { _balances[from] = fromBalance - amount; }
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to zero");
        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from zero");
        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn exceeds balance");
        unchecked { _balances[account] = accountBalance - amount; }
        _totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0) && spender != address(0), "ERC20: zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}

// ── NXT Token ────────────────────────────────────────────────────────

contract NXTToken is ERC20 {
    // ── Roles ──
    address public owner;
    mapping(address => bool) public minters;

    // ── Supply cap ──
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18; // 1 billion NXT

    // ── Transfer tax ──
    uint256 public transferTaxBps = 0; // basis points (100 = 1%), default 0
    address public treasury;
    mapping(address => bool) public taxExempt;

    // ── Anti-whale ──
    uint256 public maxWalletBalance = MAX_SUPPLY; // disabled by default
    mapping(address => bool) public whaleExempt;

    // ── Pausable ──
    bool public paused = false;

    // ── Events ──
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TaxUpdated(uint256 newTaxBps);
    event TreasuryUpdated(address indexed newTreasury);
    event MaxWalletUpdated(uint256 newMax);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    // ── Modifiers ──
    modifier onlyOwner() {
        require(msg.sender == owner, "NXT: not owner");
        _;
    }

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner, "NXT: not minter");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "NXT: paused");
        _;
    }

    // ── Constructor ──
    constructor(address _treasury) ERC20("AirdropKral Nexus", "NXT") {
        owner = msg.sender;
        treasury = _treasury != address(0) ? _treasury : msg.sender;
        taxExempt[msg.sender] = true;
        taxExempt[_treasury] = true;
        whaleExempt[msg.sender] = true;
        whaleExempt[_treasury] = true;

        // Initial mint: 10M NXT to treasury for liquidity + early rewards
        _mint(treasury, 10_000_000 * 1e18);
    }

    // ── Admin: ownership ──
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "NXT: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ── Admin: minter management ──
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
        taxExempt[minter] = true;
        whaleExempt[minter] = true;
        emit MinterAdded(minter);
    }

    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    // ── Minting (backend calls this when user converts SC/HC/RC → NXT) ──
    function mint(address to, uint256 amount) external onlyMinter whenNotPaused {
        require(totalSupply() + amount <= MAX_SUPPLY, "NXT: cap exceeded");
        _mint(to, amount);
    }

    // ── Burning (users can burn their own tokens) ──
    function burn(uint256 amount) external whenNotPaused {
        _burn(msg.sender, amount);
    }

    // ── Transfer with tax + anti-whale ──
    function _transfer(address from, address to, uint256 amount) internal virtual override whenNotPaused {
        uint256 taxAmount = 0;

        // Apply tax if both parties are not exempt
        if (transferTaxBps > 0 && !taxExempt[from] && !taxExempt[to]) {
            taxAmount = (amount * transferTaxBps) / 10000;
        }

        uint256 sendAmount = amount - taxAmount;

        // Anti-whale check on receiver
        if (!whaleExempt[to]) {
            require(balanceOf(to) + sendAmount <= maxWalletBalance, "NXT: exceeds max wallet");
        }

        super._transfer(from, to, sendAmount);

        if (taxAmount > 0) {
            super._transfer(from, treasury, taxAmount);
        }
    }

    // ── Admin: tax config ──
    function setTransferTax(uint256 _taxBps) external onlyOwner {
        require(_taxBps <= 1000, "NXT: tax max 10%");
        transferTaxBps = _taxBps;
        emit TaxUpdated(_taxBps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "NXT: zero address");
        treasury = _treasury;
        taxExempt[_treasury] = true;
        whaleExempt[_treasury] = true;
        emit TreasuryUpdated(_treasury);
    }

    function setTaxExempt(address account, bool exempt) external onlyOwner {
        taxExempt[account] = exempt;
    }

    // ── Admin: anti-whale config ──
    function setMaxWalletBalance(uint256 _max) external onlyOwner {
        require(_max >= totalSupply() / 100, "NXT: min 1% of supply");
        maxWalletBalance = _max;
        emit MaxWalletUpdated(_max);
    }

    function setWhaleExempt(address account, bool exempt) external onlyOwner {
        whaleExempt[account] = exempt;
    }

    // ── Admin: pause/unpause ──
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ── View: circulating supply (total - treasury) ──
    function circulatingSupply() external view returns (uint256) {
        return totalSupply() - balanceOf(treasury);
    }
}
