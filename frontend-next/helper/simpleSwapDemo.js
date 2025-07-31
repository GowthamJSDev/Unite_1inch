// Simple swap demo using 1inch API instead of complex limit orders
import { ethers } from 'ethers';
import { config } from '../config/index';

export class SimpleSwapDemo {
  constructor(provider) {
    this.provider = provider;
    this.chainId = 1;
  }

  /**
   * Get swap quote from 1inch API
   */
  async getSwapQuote(fromToken, toToken, amount) {
    try {
      console.log('📊 Getting swap quote from 1inch...');
      
      const fromTokenAddress = fromToken === 'ETH' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : fromToken;
      const toTokenAddress = toToken === 'USDC' ? '0xA0b86a33E6441b6b63e70D7b0F8E5ef5F70ff5d7' : toToken;
      
      const amountWei = fromToken === 'ETH' ? ethers.parseEther(amount.toString()) : ethers.parseUnits(amount.toString(), 6);
      
      // Use proxy if available, otherwise direct API call
      const baseUrl = config.oneInch.proxy || 'https://api.1inch.dev';
      const quoteUrl = `${baseUrl}/swap/v6.0/1/quote?src=${fromTokenAddress}&dst=${toTokenAddress}&amount=${amountWei.toString()}`;
      
      console.log('Quote URL:', quoteUrl);
      
      const headers = {
        'Accept': 'application/json',
      };
      
      if (config.oneInch.apiKey) {
        headers['Authorization'] = `Bearer ${config.oneInch.apiKey}`;
      }
      
      const response = await fetch(quoteUrl, {
        method: 'GET',
        headers,
        mode: 'cors',
      });
      
      if (!response.ok) {
        throw new Error(`Quote API failed: ${response.status}`);
      }
      
      const quote = await response.json();
      console.log('✅ Quote received:', quote);
      
      return quote;
      
    } catch (error) {
      console.error('❌ Quote failed:', error);
      throw error;
    }
  }

  /**
   * Execute swap using 1inch API
   */
  async executeSwap(fromToken, toToken, amount) {
    try {
      console.log('🚀 Executing swap via 1inch API...');
      
      const signer = await this.provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      const fromTokenAddress = fromToken === 'ETH' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : fromToken;
      const toTokenAddress = toToken === 'USDC' ? '0xA0b86a33E6441b6b63e70D7b0F8E5ef5F70ff5d7' : toToken;
      
      const amountWei = fromToken === 'ETH' ? ethers.parseEther(amount.toString()) : ethers.parseUnits(amount.toString(), 6);
      
      // Get swap transaction data
      const baseUrl = config.oneInch.proxy || 'https://api.1inch.dev';
      const swapUrl = `${baseUrl}/swap/v6.0/1/swap?src=${fromTokenAddress}&dst=${toTokenAddress}&amount=${amountWei.toString()}&from=${walletAddress}&slippage=1`;
      
      console.log('Swap URL:', swapUrl);
      
      const headers = {
        'Accept': 'application/json',
      };
      
      if (config.oneInch.apiKey) {
        headers['Authorization'] = `Bearer ${config.oneInch.apiKey}`;
      }
      
      const response = await fetch(swapUrl, {
        method: 'GET',
        headers,
        mode: 'cors',
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Swap API failed: ${response.status} - ${errorData}`);
      }
      
      const swapData = await response.json();
      console.log('✅ Swap data received:', swapData);
      
      // Execute the transaction
      const tx = await signer.sendTransaction({
        to: swapData.tx.to,
        data: swapData.tx.data,
        value: swapData.tx.value,
        gasLimit: swapData.tx.gas,
      });
      
      console.log(`Transaction sent: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      console.log(`✅ Swap completed! Block: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        expectedOutput: swapData.toAmount
      };
      
    } catch (error) {
      console.error('❌ Swap failed:', error);
      throw error;
    }
  }

  /**
   * Simple ETH to USDC demo using 1inch swap API
   */
  async runSimpleDemo(ethAmount) {
    try {
      console.log('🎬 Starting Simple 1inch Swap Demo');
      console.log(`Swap: ${ethAmount} ETH -> USDC`);
      
      // Step 1: Get quote
      const quote = await this.getSwapQuote('ETH', 'USDC', ethAmount);
      
      const expectedUsdc = ethers.formatUnits(quote.toAmount, 6);
      console.log(`Expected output: ${expectedUsdc} USDC`);
      
      // Step 2: Execute swap
      const result = await this.executeSwap('ETH', 'USDC', ethAmount);
      
      console.log('🎉 Demo completed successfully!');
      return {
        quote,
        execution: result,
        expectedOutput: expectedUsdc
      };
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }
}

// Check ETH balance only
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