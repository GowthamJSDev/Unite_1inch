// Working 1inch Limit Order Demo without API dependencies
import { Address, MakerTraits, LimitOrder } from '@1inch/limit-order-sdk';
import { ethers } from 'ethers';

// Correct token addresses with proper checksums
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

// 1inch Limit Order Protocol V4 contract
const LIMIT_ORDER_PROTOCOL = '0x111111125421ca6dc452d289314280a0f8842a65';

// Minimal ABI for the 1inch Limit Order Protocol
const LIMIT_ORDER_ABI = [
  'function fillOrder((address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes signature, uint256 makingAmount, uint256 takingAmount) external returns (uint256, uint256)',
  'function remainings(bytes32 orderHash) external view returns (uint256)',
  'function invalidatorForOrderRFQ(address maker, uint256 slot) external view returns (uint256)'
];

export class WorkingLimitOrderDemo {
  constructor(provider) {
    this.provider = provider;
    this.chainId = 1; // Ethereum mainnet
  }

  /**
   * Create a limit order using the 1inch SDK
   */
  async createLimitOrder(ethAmount, expectedUsdcAmount = null) {
    try {
      console.log('🚀 Creating 1inch Limit Order...');
      
      const signer = await this.provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      // Convert amounts - if no USDC amount provided, use reasonable estimate
      const makingAmount = ethers.parseEther(ethAmount.toString());
      const usdcAmount = expectedUsdcAmount || (ethAmount * 2500); // Rough ETH price estimate
      const takingAmount = ethers.parseUnits(usdcAmount.toString(), 6);
      
      console.log(`Creating order: ${ethAmount} ETH → ${usdcAmount} USDC`);
      
      // Set expiration (1 hour from now for demo)
      const expiration = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Create maker traits
      const makerTraits = MakerTraits.default()
        .withExpiration(expiration)
        .allowPartialFills()
        .allowMultipleFills();
      
      // Create order data structure
      const orderData = {
        maker: walletAddress,
        receiver: walletAddress,
        makerAsset: WETH_ADDRESS, // Use WETH instead of ETH for limit orders
        takerAsset: USDC_ADDRESS,
        makingAmount: makingAmount.toString(),
        takingAmount: takingAmount.toString(),
        makerTraits: makerTraits.toString()
      };
      
      console.log('Order data:', orderData);
      
      // Create the limit order instance
      const limitOrder = new LimitOrder(orderData);
      
      // Get typed data for EIP-712 signing
      const typedData = limitOrder.getTypedData(this.chainId);
      
      console.log('✏️ Signing order with EIP-712...');
      
      // Sign the order
      const signature = await signer.signTypedData(
        typedData.domain,
        { Order: typedData.types.Order },
        typedData.message
      );
      
      // Get order hash
      const orderHash = limitOrder.getOrderHash(this.chainId);
      
      console.log('✅ Order created and signed!');
      console.log('Order Hash:', orderHash);
      
      return {
        limitOrder,
        signature,
        orderHash,
        orderData,
        typedData: typedData.message
      };
      
    } catch (error) {
      console.error('❌ Error creating limit order:', error);
      throw error;
    }
  }

  /**
   * Execute the limit order onchain
   */
  async executeLimitOrder(orderResult) {
    try {
      console.log('⚡ Executing limit order onchain...');
      
      const signer = await this.provider.getSigner();
      const fillerAddress = await signer.getAddress();
      
      // Get the limit order protocol contract
      const contract = new ethers.Contract(LIMIT_ORDER_PROTOCOL, LIMIT_ORDER_ABI, signer);
      
      const { orderData, signature } = orderResult;
      
      // Check if we have enough USDC to fill the order
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'],
        signer
      );
      
      const usdcBalance = await usdcContract.balanceOf(fillerAddress);
      const requiredUsdc = BigInt(orderData.takingAmount);
      
      console.log(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)}`);
      console.log(`Required USDC: ${ethers.formatUnits(requiredUsdc, 6)}`);
      
      if (usdcBalance < requiredUsdc) {
        throw new Error(`Insufficient USDC balance. Have ${ethers.formatUnits(usdcBalance, 6)}, need ${ethers.formatUnits(requiredUsdc, 6)}`);
      }
      
      // Approve USDC spending
      console.log('🔓 Approving USDC...');
      const approveTx = await usdcContract.approve(LIMIT_ORDER_PROTOCOL, requiredUsdc);
      await approveTx.wait();
      console.log('✅ USDC approved');
      
      // Prepare order struct for contract call
      const orderStruct = {
        maker: orderData.maker,
        receiver: orderData.receiver,
        makerAsset: orderData.makerAsset,
        takerAsset: orderData.takerAsset,
        makingAmount: orderData.makingAmount,
        takingAmount: orderData.takingAmount,
        makerTraits: orderData.makerTraits
      };
      
      console.log('📋 Executing fillOrder...');
      
      // Execute the order
      const fillTx = await contract.fillOrder(
        orderStruct,
        signature,
        orderData.makingAmount, // Fill full amount
        orderData.takingAmount,
        {
          gasLimit: 500000 // Conservative gas limit
        }
      );
      
      console.log(`Transaction sent: ${fillTx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await fillTx.wait();
      
      console.log(`✅ Order executed! Block: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: fillTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      console.error('❌ Error executing limit order:', error);
      throw error;
    }
  }

  /**
   * Complete demo flow
   */
  async runCompleteDemo(ethAmount, expectedUsdcAmount) {
    try {
      console.log('🎬 Starting Working 1inch Limit Order Demo');
      
      // Step 1: Create and sign the order
      const orderResult = await this.createLimitOrder(ethAmount, expectedUsdcAmount);
      
      // Step 2: Execute the order
      const executionResult = await this.executeLimitOrder(orderResult);
      
      console.log('🎉 Demo completed successfully!');
      
      return {
        orderCreated: orderResult,
        orderExecuted: executionResult
      };
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }
}

/**
 * Simple Uniswap Demo as guaranteed working fallback
 */
export class SimpleUniswapDemo {
  constructor(provider) {
    this.provider = provider;
    this.routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    this.wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    this.usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  }

  async getQuote(ethAmount) {
    try {
      const router = new ethers.Contract(
        this.routerAddress,
        ['function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'],
        this.provider
      );
      
      const amountIn = ethers.parseEther(ethAmount.toString());
      const path = [this.wethAddress, this.usdcAddress];
      
      const amounts = await router.getAmountsOut(amountIn, path);
      return ethers.formatUnits(amounts[1], 6);
      
    } catch (error) {
      console.error('Quote failed:', error);
      return '0';
    }
  }

  async executeSwap(ethAmount) {
    try {
      console.log('🚀 Executing Uniswap swap...');
      
      const signer = await this.provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      const router = new ethers.Contract(
        this.routerAddress,
        [
          'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
          'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
        ],
        signer
      );
      
      const amountIn = ethers.parseEther(ethAmount.toString());
      const path = [this.wethAddress, this.usdcAddress];
      const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
      
      // Get expected output and apply 5% slippage
      const amounts = await router.getAmountsOut(amountIn, path);
      const minAmountOut = amounts[1] * BigInt(95) / BigInt(100);
      
      console.log(`Expected: ${ethers.formatUnits(amounts[1], 6)} USDC`);
      console.log(`Minimum: ${ethers.formatUnits(minAmountOut, 6)} USDC`);
      
      const tx = await router.swapExactETHForTokens(
        minAmountOut,
        path,
        walletAddress,
        deadline,
        { value: amountIn }
      );
      
      console.log(`Transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        expectedOutput: ethers.formatUnits(amounts[1], 6)
      };
      
    } catch (error) {
      console.error('Uniswap swap failed:', error);
      throw error;
    }
  }

  async runDemo(ethAmount) {
    try {
      const quote = await this.getQuote(ethAmount);
      const execution = await this.executeSwap(ethAmount);
      
      return {
        method: 'Uniswap V2',
        quote: { expectedOutput: quote },
        execution
      };
      
    } catch (error) {
      throw error;
    }
  }
}

// Helper function to check balances
export async function checkBalances(provider, walletAddress) {
  try {
    const ethBalance = await provider.getBalance(walletAddress);
    
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const usdcBalance = await usdcContract.balanceOf(walletAddress);
    
    return {
      eth: ethers.formatEther(ethBalance),
      usdc: ethers.formatUnits(usdcBalance, 6)
    };
  } catch (error) {
    console.error('Error checking balances:', error);
    return { eth: '0', usdc: '0' };
  }
}