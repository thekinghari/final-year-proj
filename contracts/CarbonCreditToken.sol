// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CarbonCreditToken
 * @dev ERC-20 carbon credit token for Blue Carbon Registry
 * 1 token = 1 ton of CO2e sequestered
 * Deploy on Polygon Amoy testnet (chainId: 80002)
 */
contract CarbonCreditToken {
    string public name = "Blue Carbon Credit";
    string public symbol = "BCC";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    address public admin;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // Project mint records: projectId => MintRecord
    struct MintRecord {
        string projectId;
        address recipient;
        uint256 amount;      // in tokens (1 token = 1 ton CO2e)
        uint256 timestamp;
        bool exists;
    }
    mapping(string => MintRecord) public mintRecords;
    string[] public mintedProjectIds;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event CreditsMinted(string indexed projectId, address indexed recipient, uint256 amount, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Mint carbon credits for an approved project
     * @param recipient The user wallet address to receive credits
     * @param amount Number of tokens (= tons of CO2e)
     * @param projectId The project identifier string
     */
    function mintCredits(address recipient, uint256 amount, string calldata projectId) external onlyAdmin {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(!mintRecords[projectId].exists, "Project already minted");

        totalSupply += amount;
        balanceOf[recipient] += amount;

        mintRecords[projectId] = MintRecord({
            projectId: projectId,
            recipient: recipient,
            amount: amount,
            timestamp: block.timestamp,
            exists: true
        });
        mintedProjectIds.push(projectId);

        emit Transfer(address(0), recipient, amount);
        emit CreditsMinted(projectId, recipient, amount, block.timestamp);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function getMintedProjectsCount() external view returns (uint256) {
        return mintedProjectIds.length;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }
}
