// Simple 1inch Limit Order Demo using direct SDK approach
import { Address, MakerTraits, Sdk, FetchProviderConnector } from '@1inch/limit-order-sdk';
import { ethers } from 'ethers';

// Token addresses
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// 1inch Limit Order Protocol contract
const LIMIT_ORDER_PROTOCOL = '0x111111125421ca6dc452d289314280a0f8842a65';

export class SimpleLimitOrderDemo {
  constructor(provider) {
    this.provider = provider;
    this.chainId = 1;
  }

  /**
   * Create and execute a limit order demo
   */
  async runDemo(ethAmount) {
    try {
      console.log('🎬 Starting Simple 1inch Limit Order Demo');
      
      const signer = await this.provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      // Convert ETH to WETH first (required for limit orders)
      console.log('🔄 Converting ETH to WETH...');
      await this.wrapETH(ethAmount);
      
      // Calculate USDC amount (~$2500 per ETH)
      const usdcAmount = ethAmount * 2500;
      
      console.log(`Creating limit order: ${ethAmount} WETH → ${usdcAmount} USDC`);
      
      // Setup 1inch SDK
      const sdk = new Sdk({
        networkId: this.chainId,
        httpConnector: new FetchProviderConnector(),
        // No API key needed for local order creation
      });
      
      // Set expiration (1 hour)
      const expiration = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Create maker traits
      const makerTraits = MakerTraits.default()
        .withExpiration(expiration)
        .allowPartialFills()
        .allowMultipleFills();
      
      // Create order
      const orderData = {
        makerAsset: new Address(WETH_ADDRESS),
        takerAsset: new Address(USDC_ADDRESS),
        makingAmount: ethers.parseEther(ethAmount.toString()).toString(),
        takingAmount: ethers.parseUnits(usdcAmount.toString(), 6).toString(),
        maker: walletAddress,
        receiver: walletAddress,
      };
      
      console.log('📝 Creating limit order...');
      const limitOrder = await sdk.createOrder(orderData, makerTraits);
      
      // Sign the order
      const typedData = limitOrder.getTypedData(this.chainId);
      console.log('✏️ Signing order...');
      
      const signature = await signer.signTypedData(
        typedData.domain,
        { Order: typedData.types.Order },
        typedData.message
      );
      
      const orderHash = limitOrder.getOrderHash(this.chainId);
      console.log('✅ Order created and signed!');
      console.log('Order Hash:', orderHash);
      
      // Now execute the order (act as filler)
      console.log('⚡ Executing order as filler...');
      const executionResult = await this.fillOrder(limitOrder, signature, usdcAmount);
      
      return {
        success: true,
        orderHash,
        signature,
        execution: executionResult
      };
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }

  /**
   * Wrap ETH to WETH
   */
  async wrapETH(ethAmount) {
    try {
      const signer = await this.provider.getSigner();
      
      const wethContract = new ethers.Contract(
        WETH_ADDRESS,
        [
          'function deposit() payable',
          'function balanceOf(address) view returns (uint256)',
          'function approve(address,uint256) returns (bool)'
        ],
        signer
      );
      
      const amountWei = ethers.parseEther(ethAmount.toString());
      
      // Check if we already have enough WETH
      const wethBalance = await wethContract.balanceOf(await signer.getAddress());
      
      if (wethBalance < amountWei) {
        console.log('💰 Wrapping ETH to WETH...');
        const wrapTx = await wethContract.deposit({ value: amountWei });
        await wrapTx.wait();
        console.log('✅ ETH wrapped to WETH');
      } else {
        console.log('✅ Already have sufficient WETH');
      }
      
      // Approve WETH for limit order contract
      console.log('🔓 Approving WETH...');
      const approveTx = await wethContract.approve(LIMIT_ORDER_PROTOCOL, amountWei);
      await approveTx.wait();
      console.log('✅ WETH approved');
      
    } catch (error) {
      console.error('❌ WETH wrapping failed:', error);
      throw error;
    }
  }

  /**
   * Fill the limit order
   */
  async fillOrder(limitOrder, signature, usdcAmount) {
    try {
      const signer = await this.provider.getSigner();
      const fillerAddress = await signer.getAddress();
      
      // Check USDC balance
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        [
          'function balanceOf(address) view returns (uint256)',
          'function approve(address,uint256) returns (bool)'
        ],
        signer
      );
      
      const requiredUsdc = ethers.parseUnits(usdcAmount.toString(), 6);
      const usdcBalance = await usdcContract.balanceOf(fillerAddress);
      
      console.log(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)}`);
      console.log(`Required: ${ethers.formatUnits(requiredUsdc, 6)}`);
      
      if (usdcBalance < requiredUsdc) {
        throw new Error(`Insufficient USDC. Have ${ethers.formatUnits(usdcBalance, 6)}, need ${ethers.formatUnits(requiredUsdc, 6)}`);
      }
      
      // Approve USDC
      console.log('🔓 Approving USDC...');
      const approveTx = await usdcContract.approve(LIMIT_ORDER_PROTOCOL, requiredUsdc);
      await approveTx.wait();
      console.log('✅ USDC approved');
      
      // Get contract and fill order
      const contract = new ethers.Contract(
        LIMIT_ORDER_PROTOCOL,
        [
          'function fillOrder((address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes signature, uint256 makingAmount, uint256 takingAmount) external returns (uint256, uint256)'
        ],
        signer
      );
      
      // Prepare order struct
      const orderStruct = {
        maker: limitOrder.data.maker,
        receiver: limitOrder.data.receiver || limitOrder.data.maker,
        makerAsset: limitOrder.data.makerAsset,
        takerAsset: limitOrder.data.takerAsset,
        makingAmount: limitOrder.data.makingAmount,
        takingAmount: limitOrder.data.takingAmount,
        makerTraits: limitOrder.data.makerTraits
      };
      
      console.log('🚀 Filling order...');
      const fillTx = await contract.fillOrder(
        orderStruct,
        signature,
        limitOrder.data.makingAmount,
        limitOrder.data.takingAmount,
        { gasLimit: 500000 }
      );
      
      console.log(`Transaction: ${fillTx.hash}`);
      const receipt = await fillTx.wait();
      
      return {
        transactionHash: fillTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      console.error('❌ Fill order failed:', error);
      throw error;
    }
  }
}

// Check balances including WETH
export async function checkAllBalances(provider, walletAddress) {
  try {
    const ethBalance = await provider.getBalance(walletAddress);
    
    const wethContract = new ethers.Contract(
      WETH_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const wethBalance = await wethContract.balanceOf(walletAddress);
    
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
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