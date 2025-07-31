// working1inchRelayer.js
import { Sdk, FetchProviderConnector } from '@1inch/limit-order-sdk';
import { ethers } from 'ethers';

export class Working1inchRelayer {
  constructor(provider, walletAddress) {
    this.provider = provider;
    this.walletAddress = walletAddress;
    this.chainId = 1;
    this.sdk = new Sdk({
      networkId: this.chainId,
      httpConnector: new FetchProviderConnector()
    });
    this.watching = false;
  }

  async startWatching() {
    if (this.watching) return;
    this.watching = true;
    
    console.log('🔍 Starting 1inch Limit Order watcher...');
    
    // Check for new orders every 15 seconds
    this.watchInterval = setInterval(async () => {
      try {
        await this.checkForProfitableOrders();
      } catch (error) {
        console.error('Error checking orders:', error);
      }
    }, 15000);
  }

  stopWatching() {
    clearInterval(this.watchInterval);
    this.watching = false;
    console.log('🛑 Stopped 1inch Limit Order watcher');
  }

  async checkForProfitableOrders() {
    // Get recent orders from the network
    const orders = await this.sdk.getOrders();
    
    console.log(`📊 Found ${orders.length} active orders`);
    
    for (const order of orders) {
      try {
        // Check if order is fillable and profitable
        const isProfitable = await this.evaluateOrderProfitability(order);
        
        if (isProfitable) {
          console.log(`💰 Found profitable order: ${order.hash}`);
          await this.fillOrder(order);
        }
      } catch (error) {
        console.error(`Error processing order ${order.hash}:`, error);
      }
    }
  }

  async evaluateOrderProfitability(order) {
    // Implement your profitability logic here
    // Example: Check if order price is better than current market price
    
    // 1. Get current market price
    const router = new ethers.Contract(
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap Router
      ['function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)'],
      this.provider
    );
    
    const path = [order.makerAsset, order.takerAsset];
    const amounts = await router.getAmountsOut(order.makingAmount, path);
    const marketTakingAmount = amounts[1];
    
    // 2. Compare with order's taking amount
    const priceDifference = BigInt(order.takingAmount) - marketTakingAmount;
    
    // Consider gas costs (adjust based on current gas prices)
    const gasCost = ethers.parseEther('0.001'); // Example gas cost estimation
    
    // 3. Check if profitable after gas
    return priceDifference > gasCost;
  }

  async fillOrder(order) {
    const signer = this.provider.getSigner();
    
    // 1. Approve tokens if needed
    const erc20 = new ethers.Contract(
      order.takerAsset,
      ['function approve(address, uint256) returns (bool)'],
      signer
    );
    
    const allowance = await erc20.allowance(this.walletAddress, order.takerAsset);
    if (allowance < order.takingAmount) {
      const approveTx = await erc20.approve(order.takerAsset, order.takingAmount);
      await approveTx.wait();
    }
    
    // 2. Fill the order
    const limitOrderProtocol = new ethers.Contract(
      '0x111111125421ca6dc452d289314280a0f8842a65', // 1inch Limit Order Protocol
      ['function fillOrder(tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes signature, uint256 makingAmount, uint256 takingAmount, uint256 thresholdAmount) payable returns (uint256, uint256, bytes32)'],
      signer
    );
    
    console.log(`⚡ Filling order ${order.hash}...`);
    
    const tx = await limitOrderProtocol.fillOrder(
      {
        salt: order.salt,
        maker: order.maker,
        receiver: order.receiver || order.maker,
        makerAsset: order.makerAsset,
        takerAsset: order.takerAsset,
        makingAmount: order.makingAmount,
        takingAmount: order.takingAmount,
        makerTraits: order.makerTraits
      },
      order.signature,
      order.makingAmount, // Fill entire amount
      order.takingAmount, // Take entire amount
      0, // No threshold
      { gasLimit: 500000 }
    );
    
    const receipt = await tx.wait();
    console.log(`✅ Order filled in tx ${receipt.transactionHash}`);
    
    return receipt;
  }
}