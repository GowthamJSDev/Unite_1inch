# Working DeFi Demo - Uniswap & 1inch Limit Orders

This demo showcases working DeFi integrations with proper token addresses and robust error handling for ETHGlobal hackathon requirements.

## ✅ Hackathon Requirements Met

1. **Onchain execution of strategy** - ✅ Implemented in `fillOrder` transaction
2. **Custom Limit Orders not posted to official API** - ✅ Orders stay local, no API calls
3. **Consistent commit history** - ✅ Multiple commits throughout development

## 🚀 Demo Features

- **Order Creation**: Create ETH → USDC limit orders using 1inch SDK
- **Order Signing**: EIP-712 signature for secure order validation  
- **Onchain Execution**: Direct contract interaction to fill orders
- **Resolver Functionality**: Acts as both maker and resolver for demo purposes
- **Real-time UI**: Live balance updates and transaction tracking

## 🔧 Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (create `.env.local`):
   ```
   NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-key
   NEXT_PUBLIC_HACKER_KEY=your-1inch-api-key
   ```

3. **Run the application**:
   ```bash
   npm run dev
   ```

4. **Access the demo**:
   - Open http://localhost:3000
   - Connect your MetaMask wallet
   - Navigate to "Demo" tab
   - Ensure you have ETH and USDC in your wallet

## 🎯 Demo Flow

### Step 1: Order Creation
- User specifies ETH amount (e.g., 0.01 ETH)
- User specifies desired USDC amount (e.g., 25 USDC)
- System creates limit order using 1inch SDK
- Order is signed with EIP-712 signature

### Step 2: Order Execution
- System acts as resolver (fills own order for demo)
- Checks balance and allowance requirements
- Executes `fillOrder` transaction on 1inch Protocol contract
- Returns transaction hash and confirmation

## 📋 Technical Implementation

### Key Files:
- `helper/limitOrderDemo.js` - Main demo logic
- `components/LimitOrderDemo.js` - UI component
- `config/tokens.js` - Token configurations
- `pages/dashboard.js` - Updated dashboard with demo tab

### Smart Contract Integration:
- **Contract**: `0x111111125421ca6dc452d289314280a0f8842a65` (1inch Limit Order Protocol)
- **Functions**: `fillOrder`, `remainingInvalidatorForOrder`
- **Chain**: Ethereum Mainnet (Chain ID: 1)

### Order Structure:
```javascript
{
  maker: walletAddress,
  receiver: walletAddress,
  makerAsset: ETH_ADDRESS,
  takerAsset: USDC_ADDRESS,
  makingAmount: ethAmount,
  takingAmount: usdcAmount,
  makerTraits: expiration + partial fills allowed
}
```

## 🛠 Resolver Implementation

The demo includes a built-in resolver that:
1. Monitors created orders
2. Validates order fillability
3. Checks balance/allowance requirements
4. Executes fill transactions onchain
5. Handles gas estimation and error cases

## 💡 Usage Notes

- **Balance Requirements**: Ensure sufficient ETH for gas and USDC for order filling
- **Network**: Must be connected to Ethereum Mainnet
- **Gas Costs**: Transactions require ~200k-500k gas
- **Order Expiry**: Orders expire after 24 hours by default

## 🔍 Testing

Run the integration test:
```bash
node scripts/testDemo.js
```

This verifies that all 1inch SDK components are properly integrated.

## 📈 Transaction Flow

1. **Create Order** → Sign EIP-712 message → Generate order hash
2. **Execute Order** → Check balances → Approve tokens → Call contract
3. **Confirm Transaction** → Wait for block confirmation → Update UI

## 🎪 Demo Script

1. Connect wallet to Ethereum Mainnet
2. Ensure you have 0.05+ ETH and 50+ USDC
3. Click "Run 1inch Limit Order Demo"
4. Approve token spending when prompted
5. Wait for order creation and execution
6. View transaction on Etherscan
7. Check updated balances

## 🚨 Important Notes

- This is a DEMO implementation for hackathon purposes
- Orders are NOT posted to official 1inch orderbook (per requirements)
- The same wallet acts as both maker and resolver for demonstration
- Real production use would have separate resolver services
- Gas fees will be incurred on mainnet transactions

## 📞 Troubleshooting

**Common Issues:**
- Insufficient USDC balance → Add USDC to wallet
- Gas estimation fails → Check network connection
- Transaction reverts → Verify token allowances
- SDK errors → Ensure correct token addresses

**Error Logs:**
Check browser console for detailed error messages and transaction status.