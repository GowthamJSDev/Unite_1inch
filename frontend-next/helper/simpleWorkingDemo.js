// Simple Working Demo - WETH to USDC via Uniswap (guaranteed to work)
import { ethers } from 'ethers';

// Token addresses
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V2 Router (proven, reliable)
const UNISWAP_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function allowance(address,address) view returns (uint256)'
];

const UNISWAP_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
];

export class SimpleWorkingDemo {
  constructor(provider) {
    this.provider = provider;
    this.chainId = 1;
  }

  /**
   * Get live quote from Uniswap
   */
  async getQuote(wethAmount) {
    try {
      const router = new ethers.Contract(UNISWAP_ROUTER, UNISWAP_ABI, this.provider);
      const amountIn = ethers.parseEther(wethAmount.toString());
      const path = [WETH_ADDRESS, USDC_ADDRESS];
      
      const amounts = await router.getAmountsOut(amountIn, path);
      const usdcOut = ethers.formatUnits(amounts[1], 6);
      
      console.log(`Live quote: ${wethAmount} WETH → ${usdcOut} USDC`);
      return {
        input: wethAmount,
        output: usdcOut,
        rate: (parseFloat(usdcOut) / parseFloat(wethAmount)).toFixed(2)
      };
      
    } catch (error) {
      console.error('Quote failed:', error);
      return { input: wethAmount, output: '0', rate: '0' };
    }
  }

  /**
   * Execute WETH → USDC swap
   */
  async executeSwap(wethAmount) {
    try {
      console.log('🚀 Executing WETH → USDC swap...');
      
      const signer = await this.provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      // Contract instances
      const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);
      const router = new ethers.Contract(UNISWAP_ROUTER, UNISWAP_ABI, signer);
      
      const amountIn = ethers.parseEther(wethAmount.toString());
      
      // Check WETH balance
      const wethBalance = await wethContract.balanceOf(walletAddress);
      console.log(`WETH Balance: ${ethers.formatEther(wethBalance)}`);
      
      if (wethBalance < amountIn) {
        throw new Error(`Insufficient WETH. Have ${ethers.formatEther(wethBalance)}, need ${wethAmount}`);
      }
      
      // Check allowance
      const allowance = await wethContract.allowance(walletAddress, UNISWAP_ROUTER);
      if (allowance < amountIn) {
        console.log('🔓 Approving WETH for Uniswap...');
        const approveTx = await wethContract.approve(UNISWAP_ROUTER, amountIn);
        console.log(`Approval tx: ${approveTx.hash}`);
        await approveTx.wait();
        console.log('✅ WETH approved');
      } else {
        console.log('✅ WETH already approved');
      }
      
      // Get expected output and set slippage
      const path = [WETH_ADDRESS, USDC_ADDRESS];
      const amounts = await router.getAmountsOut(amountIn, path);
      const expectedOut = amounts[1];
      const minAmountOut = expectedOut * BigInt(95) / BigInt(100); // 5% slippage
      
      console.log(`Expected USDC output: ${ethers.formatUnits(expectedOut, 6)}`);
      console.log(`Minimum USDC output: ${ethers.formatUnits(minAmountOut, 6)}`);
      
      // Execute swap
      const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
      
      console.log('🔄 Executing swap transaction...');
      const swapTx = await router.swapExactTokensForTokens(
        amountIn,
        minAmountOut,
        path,
        walletAddress,
        deadline,
        { 
          gasLimit: 300000 // Conservative gas limit
        }
      );
      
      console.log(`Swap transaction sent: ${swapTx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await swapTx.wait();
      console.log(`✅ Swap completed! Block: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: swapTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        inputAmount: wethAmount,
        expectedOutput: ethers.formatUnits(expectedOut, 6),
        minOutput: ethers.formatUnits(minAmountOut, 6),
        approvalTx: allowance < amountIn ? approveTx?.hash : null
      };
      
    } catch (error) {
      console.error('❌ Swap failed:', error);
      throw error;
    }
  }

  /**
   * Complete demo with quote and execution
   */
  async runDemo(wethAmount) {
    try {
      console.log('🎬 Starting Simple Working Demo');
      console.log(`Trading: ${wethAmount} WETH → USDC`);
      
      // Step 1: Get live quote
      const quote = await this.getQuote(wethAmount);
      
      // Step 2: Execute the swap
      const execution = await this.executeSwap(wethAmount);
      
      return {
        success: true,
        quote,
        execution,
        summary: {
          trade: `${wethAmount} WETH → ${quote.output} USDC`,
          rate: `$${quote.rate} per WETH`,
          method: 'Uniswap V2 (Direct DEX interaction)'
        }
      };
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }
}

// Check balances
export async function checkWorkingDemoBalances(provider, walletAddress) {
  try {
    const ethBalance = await provider.getBalance(walletAddress);
    
    const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, provider);
    const wethBalance = await wethContract.balanceOf(walletAddress);
    
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdcBalance = await usdcContract.balanceOf(walletAddress);
    
    return {
      eth: ethers.formatEther(ethBalance),
      weth: ethers.formatEther(wethBalance),
      usdc: ethers.formatUnits(usdcBalance, 6)
    };
  } catch (error) {
    console.error('Error checking balances:', error);
    return { eth: '0', weth: '0', usdc: '0' };
  }
}