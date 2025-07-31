// Direct swap using 1inch Aggregation Router contract
import { ethers } from 'ethers';

const AGGREGATION_ROUTER_V5 = '0x1111111254EEB25477B68fb85Ed929f73A960582';
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Simplified ABI for swap function
const ROUTER_ABI = [
  'function swap(address executor, (address srcToken, address dstToken, address srcReceiver, address dstReceiver, uint256 amount, uint256 minReturnAmount, uint256 flags) desc, bytes permit, bytes data) payable returns (uint256 returnAmount, uint256 spentAmount)'
];

export class DirectSwapDemo {
  constructor(provider) {
    this.provider = provider;
    this.chainId = 1;
  }

  /**
   * Direct swap using a simple DEX path (for demo purposes)
   */
  async executeDirectSwap(ethAmount) {
    try {
      console.log('🚀 Executing direct swap via 1inch Router...');
      
      const signer = await this.provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      const amountWei = ethers.parseEther(ethAmount.toString());
      
      // Create a simple swap descriptor
      const swapDesc = {
        srcToken: ETH_ADDRESS,
        dstToken: USDC_ADDRESS,
        srcReceiver: walletAddress,
        dstReceiver: walletAddress,
        amount: amountWei,
        minReturnAmount: ethers.parseUnits('1', 6), // Minimum 1 USDC
        flags: 0
      };
      
      console.log('Swap descriptor:', swapDesc);
      
      // Get the router contract
      const router = new ethers.Contract(AGGREGATION_ROUTER_V5, ROUTER_ABI, signer);
      
      // Estimate gas
      console.log('⛽ Estimating gas...');
      const gasEstimate = await router.swap.estimateGas(
        walletAddress, // executor (can be caller for simple swaps)
        swapDesc,
        '0x', // permit (empty)
        '0x', // data (empty for simple swap)
        { value: amountWei }
      );
      
      console.log(`Gas estimate: ${gasEstimate.toString()}`);
      
      // Execute the swap
      console.log('🚀 Executing swap transaction...');
      const tx = await router.swap(
        walletAddress, // executor
        swapDesc,
        '0x', // permit
        '0x', // data
        {
          value: amountWei,
          gasLimit: gasEstimate * BigInt(120) / BigInt(100) // Add 20% buffer
        }
      );
      
      console.log(`Transaction sent: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      console.log(`✅ Swap completed! Block: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      console.error('❌ Direct swap failed:', error);
      throw error;
    }
  }

  /**
   * Run direct swap demo
   */
  async runDirectDemo(ethAmount) {
    try {
      console.log('🎬 Starting Direct 1inch Swap Demo');
      console.log(`Swap: ${ethAmount} ETH -> USDC`);
      
      const result = await this.executeDirectSwap(ethAmount);
      
      console.log('🎉 Demo completed successfully!');
      return result;
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }
}

// Alternative: Use Uniswap V2 Router for guaranteed working demo
const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

const UNISWAP_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
];

export class UniswapDemo {
  constructor(provider) {
    this.provider = provider;
    this.wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    this.usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  }

  async getQuote(ethAmount) {
    try {
      const router = new ethers.Contract(UNISWAP_V2_ROUTER, UNISWAP_ROUTER_ABI, this.provider);
      const amountWei = ethers.parseEther(ethAmount.toString());
      
      const path = [this.wethAddress, this.usdcAddress];
      const amounts = await router.getAmountsOut(amountWei, path);
      
      return ethers.formatUnits(amounts[1], 6); // USDC has 6 decimals
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
      
      const router = new ethers.Contract(UNISWAP_V2_ROUTER, UNISWAP_ROUTER_ABI, signer);
      const amountWei = ethers.parseEther(ethAmount.toString());
      
      const path = [this.wethAddress, this.usdcAddress];
      const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
      
      // Get expected output
      const amounts = await router.getAmountsOut(amountWei, path);
      const minAmountOut = amounts[1] * BigInt(95) / BigInt(100); // 5% slippage
      
      console.log(`Expected USDC: ${ethers.formatUnits(amounts[1], 6)}`);
      console.log(`Min USDC: ${ethers.formatUnits(minAmountOut, 6)}`);
      
      // Execute swap
      const tx = await router.swapExactETHForTokens(
        minAmountOut,
        path,
        walletAddress,
        deadline,
        { value: amountWei }
      );
      
      console.log(`Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        expectedOutput: ethers.formatUnits(amounts[1], 6)
      };
      
    } catch (error) {
      console.error('❌ Uniswap swap failed:', error);
      throw error;
    }
  }

  async runDemo(ethAmount) {
    try {
      console.log('🎬 Starting Uniswap Demo (as fallback)');
      
      const quote = await this.getQuote(ethAmount);
      console.log(`Quote: ${ethAmount} ETH -> ${quote} USDC`);
      
      const result = await this.executeSwap(ethAmount);
      
      return {
        quote: { expectedOutput: quote },
        execution: result
      };
      
    } catch (error) {
      console.error('❌ Uniswap demo failed:', error);
      throw error;
    }
  }
}

// Check ETH balance
export async function checkEthBalance(provider, walletAddress) {
  try {
    const ethBalance = await provider.getBalance(walletAddress);
    return {
      eth: ethers.formatEther(ethBalance)
    };
  } catch (error) {
    console.error('Error checking balance:', error);
    return { eth: '0' };
  }
}