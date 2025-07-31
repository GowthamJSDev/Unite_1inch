import { Address, MakerTraits, FetchProviderConnector, Sdk, LimitOrder } from '@1inch/limit-order-sdk';
import { ethers } from 'ethers';
import { TOKENS, PROTOCOL_ADDRESSES } from '../config/tokens';
import { config } from '../config/index';

// Demo class for 1inch Limit Order Protocol
export class LimitOrderDemo {
  constructor(provider) {
    this.provider = provider;
    this.chainId = 1; // Ethereum mainnet
  }

  /**
   * Create a limit order for ETH -> USDC swap
   */
  async createLimitOrder(ethAmount, usdcAmount, walletAddress) {
    try {
      console.log('🚀 Creating limit order for ETH -> USDC');
      
      const signer = await this.provider.getSigner();
      
      // Convert amounts to proper units
      const makingAmount = ethers.parseEther(ethAmount.toString());
      const takingAmount = ethers.parseUnits(usdcAmount.toString(), 6); // USDC has 6 decimals
      
      console.log(`Making: ${ethers.formatEther(makingAmount)} ETH`);
      console.log(`Taking: ${ethers.formatUnits(takingAmount, 6)} USDC`);

      // Setup SDK (without posting to official API)
      const sdk = new Sdk({
        networkId: this.chainId,
        httpConnector: new FetchProviderConnector(),
        // Note: No API key or baseUrl to avoid posting to official orderbook
      });

      // Set order expiration (24 hours from now)
      const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400);
      
      const makerTraits = MakerTraits.default()
        .withExpiration(expiration)
        .allowPartialFills()
        .allowMultipleFills();

      // Create order data
      const orderData = {
        makerAsset: new Address(TOKENS.ETH.address), // ETH
        takerAsset: new Address(TOKENS.USDC.address), // USDC
        makingAmount: makingAmount.toString(),
        takingAmount: takingAmount.toString(),
        maker: walletAddress,
        receiver: walletAddress,
      };

      console.log('📝 Order data:', orderData);

      // Create the limit order
      const limitOrder = await sdk.createOrder(orderData, makerTraits);
      
      // Get typed data for signing
      const typedData = limitOrder.getTypedData(this.chainId);
      
      console.log('✏️ Signing order...');
      
      // Sign the order
      const signature = await signer.signTypedData(
        typedData.domain,
        { Order: typedData.types.Order },
        typedData.message
      );

      const orderHash = limitOrder.getOrderHash(this.chainId);
      
      console.log('✅ Order created successfully!');
      console.log('Order Hash:', orderHash);
      
      return {
        limitOrder,
        signature,
        orderHash,
        typedData: typedData.message
      };

    } catch (error) {
      console.error('❌ Error creating limit order:', error);
      throw error;
    }
  }

  /**
   * Execute the limit order onchain (resolver functionality)
   */
  async executeLimitOrder(limitOrder, signature, resolverAddress) {
    try {
      console.log('⚡ Executing limit order onchain...');
      
      const signer = await this.provider.getSigner();
      
      // Get the limit order protocol contract
      const limitOrderContract = new ethers.Contract(
        PROTOCOL_ADDRESSES.LIMIT_ORDER_PROTOCOL,
        [
          // Essential ABI for fillOrder function
          'function fillOrder((address maker,address receiver,address makerAsset,address takerAsset,uint256 makingAmount,uint256 takingAmount,uint256 makerTraits) order, bytes signature, uint256 makingAmount, uint256 takingAmount) external payable returns (uint256 actualMakingAmount, uint256 actualTakingAmount)',
          'function fillOrderArgs((address maker,address receiver,address makerAsset,address takerAsset,uint256 makingAmount,uint256 takingAmount,uint256 makerTraits) order, bytes signature, uint256 makingAmount, uint256 takingAmount, bytes calldata args) external payable returns (uint256 actualMakingAmount, uint256 actualTakingAmount)',
          'function remainingInvalidatorForOrder(address maker, bytes32 orderHash) external view returns (uint256)'
        ],
        signer
      );

      // Prepare order struct for contract call
      const orderStruct = {
        maker: limitOrder.data.maker,
        receiver: limitOrder.data.receiver || limitOrder.data.maker,
        makerAsset: limitOrder.data.makerAsset,
        takerAsset: limitOrder.data.takerAsset,
        makingAmount: limitOrder.data.makingAmount,
        takingAmount: limitOrder.data.takingAmount,
        makerTraits: limitOrder.data.makerTraits
      };

      console.log('📋 Order struct:', orderStruct);

      // Check USDC balance and allowance for resolver
      const usdcContract = new ethers.Contract(
        TOKENS.USDC.address,
        [
          'function balanceOf(address) view returns (uint256)',
          'function allowance(address,address) view returns (uint256)',
          'function approve(address,uint256) returns (bool)',
          'function transfer(address,uint256) returns (bool)'
        ],
        signer
      );

      const resolverUsdcBalance = await usdcContract.balanceOf(resolverAddress);
      const takingAmount = BigInt(limitOrder.data.takingAmount);
      
      console.log(`Resolver USDC balance: ${ethers.formatUnits(resolverUsdcBalance, 6)} USDC`);
      console.log(`Required USDC: ${ethers.formatUnits(takingAmount, 6)} USDC`);

      if (resolverUsdcBalance < takingAmount) {
        throw new Error(`Insufficient USDC balance. Need ${ethers.formatUnits(takingAmount, 6)} USDC but have ${ethers.formatUnits(resolverUsdcBalance, 6)} USDC`);
      }

      // Check and approve USDC allowance
      const allowance = await usdcContract.allowance(resolverAddress, PROTOCOL_ADDRESSES.LIMIT_ORDER_PROTOCOL);
      if (allowance < takingAmount) {
        console.log('🔓 Approving USDC for limit order contract...');
        const approveTx = await usdcContract.approve(PROTOCOL_ADDRESSES.LIMIT_ORDER_PROTOCOL, ethers.MaxUint256);
        await approveTx.wait();
        console.log('✅ USDC approved');
      }

      // Estimate gas
      console.log('⛽ Estimating gas...');
      const gasEstimate = await limitOrderContract.fillOrder.estimateGas(
        orderStruct,
        signature,
        limitOrder.data.makingAmount,
        limitOrder.data.takingAmount,
        { value: 0 }
      );

      console.log(`Gas estimate: ${gasEstimate.toString()}`);

      // Execute the order
      console.log('🚀 Executing fillOrder transaction...');
      const fillTx = await limitOrderContract.fillOrder(
        orderStruct,
        signature,
        limitOrder.data.makingAmount, // Fill full amount
        limitOrder.data.takingAmount, // Take full amount
        {
          gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
          value: 0 // No ETH needed for USDC->ETH fill
        }
      );

      console.log(`Transaction sent: ${fillTx.hash}`);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await fillTx.wait();
      console.log(`✅ Order executed successfully! Block: ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);

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
   * Complete demo flow: Create order -> Execute order
   */
  async runCompleteDemo(ethAmount, usdcAmount) {
    try {
      const signer = await this.provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      console.log('🎬 Starting 1inch Limit Order Demo');
      console.log(`Wallet: ${walletAddress}`);
      console.log(`Swap: ${ethAmount} ETH -> ${usdcAmount} USDC`);
      
      // Step 1: Create limit order
      const orderResult = await this.createLimitOrder(ethAmount, usdcAmount, walletAddress);
      
      // Step 2: Execute the order (simulate resolver)
      console.log('\n🔄 Now acting as resolver to fill the order...');
      const executeResult = await this.executeLimitOrder(
        orderResult.limitOrder,
        orderResult.signature,
        walletAddress // Using same wallet as resolver for demo
      );
      
      console.log('\n🎉 Demo completed successfully!');
      return {
        orderCreated: orderResult,
        orderExecuted: executeResult
      };

    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }
}

// Utility function to check balances
export async function checkBalances(provider, walletAddress) {
  try {
    const ethBalance = await provider.getBalance(walletAddress);
    
    const usdcContract = new ethers.Contract(
      TOKENS.USDC.address,
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