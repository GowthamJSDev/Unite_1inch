// Manual 1inch Limit Order Demo - No API calls, pure onchain
import { ethers } from 'ethers';

// Token addresses
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// 1inch Limit Order Protocol V4 contract
const LIMIT_ORDER_PROTOCOL = '0x111111125421ca6dc452d289314280a0f8842a65';

// EIP-712 Domain for 1inch Limit Order Protocol
const DOMAIN = {
  name: '1inch Limit Order Protocol',
  version: '4',
  chainId: 1,
  verifyingContract: LIMIT_ORDER_PROTOCOL
};

// Order type for EIP-712
const ORDER_TYPE = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'receiver', type: 'address' },
    { name: 'makerAsset', type: 'address' },
    { name: 'takerAsset', type: 'address' },
    { name: 'makingAmount', type: 'uint256' },
    { name: 'takingAmount', type: 'uint256' },
    { name: 'makerTraits', type: 'uint256' }
  ]
};

export class ManualLimitOrderDemo {
  constructor(provider) {
    this.provider = provider;
    this.chainId = 1;
  }

  /**
   * Create order hash manually
   */
  createOrderHash(order) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'address', 'address', 'address', 'uint256', 'uint256', 'uint256'],
      [order.salt, order.maker, order.receiver, order.makerAsset, order.takerAsset, order.makingAmount, order.takingAmount, order.makerTraits]
    );
    return ethers.keccak256(encoded);
  }

  /**
   * Run the complete demo
   */
  async runDemo(ethAmount) {
    try {
      console.log('🎬 Starting Manual 1inch Limit Order Demo');
      
      const signer = await this.provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      // Verify we have WETH (should already be converted)
      const wethContract = new ethers.Contract(
        WETH_ADDRESS,
        ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'],
        signer
      );
      
      const wethBalance = await wethContract.balanceOf(walletAddress);
      const requiredWeth = ethers.parseEther(ethAmount.toString());
      
      console.log(`WETH Balance: ${ethers.formatEther(wethBalance)}`);
      console.log(`Required WETH: ${ethers.formatEther(requiredWeth)}`);
      
      if (wethBalance < requiredWeth) {
        throw new Error(`Insufficient WETH balance. Have ${ethers.formatEther(wethBalance)}, need ${ethers.formatEther(requiredWeth)}`);
      }
      
      // Calculate USDC amount
      const usdcAmount = ethAmount * 2500;
      const takingAmount = ethers.parseUnits(usdcAmount.toString(), 6);
      
      // Create order manually
      const order = {
        salt: BigInt(Date.now()), // Use timestamp as salt
        maker: walletAddress,
        receiver: walletAddress,
        makerAsset: WETH_ADDRESS,
        takerAsset: USDC_ADDRESS,
        makingAmount: requiredWeth.toString(),
        takingAmount: takingAmount.toString(),
        makerTraits: BigInt(0) // Simple order, no special traits
      };
      
      console.log('📝 Created order:', order);
      
      // Sign order with EIP-712
      console.log('✏️ Signing order with EIP-712...');
      const signature = await signer.signTypedData(DOMAIN, ORDER_TYPE, order);
      console.log('✅ Order signed!');
      
      // Calculate order hash
      const orderHash = this.createOrderHash(order);
      console.log('Order Hash:', orderHash);
      
      // Approve WETH for the limit order contract
      console.log('🔓 Approving WETH...');
      const wethApproveTx = await wethContract.approve(LIMIT_ORDER_PROTOCOL, requiredWeth);
      await wethApproveTx.wait();
      console.log('✅ WETH approved');
      
      // Approve USDC for filling the order
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'],
        signer
      );
      
      const usdcBalance = await usdcContract.balanceOf(walletAddress);
      console.log(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)}`);
      
      if (usdcBalance < takingAmount) {
        throw new Error(`Insufficient USDC. Have ${ethers.formatUnits(usdcBalance, 6)}, need ${ethers.formatUnits(takingAmount, 6)}`);
      }
      
      console.log('🔓 Approving USDC...');
      const usdcApproveTx = await usdcContract.approve(LIMIT_ORDER_PROTOCOL, takingAmount);
      await usdcApproveTx.wait();
      console.log('✅ USDC approved');
      
      // Now fill the order
      console.log('🚀 Filling the order...');
      const executionResult = await this.fillOrder(order, signature);
      
      return {
        success: true,
        orderHash,
        order,
        signature,
        execution: executionResult
      };
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }

  /**
   * Fill the limit order using the 1inch contract
   */
  async fillOrder(order, signature) {
    try {
      const signer = await this.provider.getSigner();
      
      // 1inch Limit Order Protocol contract
      const contract = new ethers.Contract(
        LIMIT_ORDER_PROTOCOL,
        [
          'function fillOrder((uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes signature, uint256 makingAmount, uint256 takingAmount) external returns (uint256, uint256)',
          'function hashOrder((uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order) external view returns (bytes32)'
        ],
        signer
      );
      
      // Prepare order struct for contract call
      const orderStruct = {
        salt: order.salt,
        maker: order.maker,
        receiver: order.receiver,
        makerAsset: order.makerAsset,
        takerAsset: order.takerAsset,
        makingAmount: order.makingAmount,
        takingAmount: order.takingAmount,
        makerTraits: order.makerTraits
      };
      
      console.log('📋 Order struct for contract:', orderStruct);
      
      // Verify order hash matches
      const contractOrderHash = await contract.hashOrder(orderStruct);
      console.log('Contract order hash:', contractOrderHash);
      
      // Execute the fill order transaction
      const fillTx = await contract.fillOrder(
        orderStruct,
        signature,
        order.makingAmount, // Fill complete amount
        order.takingAmount, // Take complete amount
        {
          gasLimit: 500000
        }
      );
      
      console.log(`Fill transaction sent: ${fillTx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await fillTx.wait();
      
      console.log(`✅ Order filled successfully! Block: ${receipt.blockNumber}`);
      
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

// Check all token balances
export async function checkTokenBalances(provider, walletAddress) {
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

/**
 * Convert ETH to WETH if needed
 */
export async function convertEthToWeth(provider, ethAmount) {
  try {
    const signer = await provider.getSigner();
    
    const wethContract = new ethers.Contract(
      WETH_ADDRESS,
      [
        'function deposit() payable',
        'function balanceOf(address) view returns (uint256)'
      ],
      signer
    );
    
    const currentBalance = await wethContract.balanceOf(await signer.getAddress());
    const requiredAmount = ethers.parseEther(ethAmount.toString());
    
    if (currentBalance < requiredAmount) {
      const neededAmount = requiredAmount - currentBalance;
      
      console.log(`Converting ${ethers.formatEther(neededAmount)} ETH to WETH...`);
      const wrapTx = await wethContract.deposit({ value: neededAmount });
      await wrapTx.wait();
      console.log('✅ ETH converted to WETH');
      
      return {
        success: true,
        transactionHash: wrapTx.hash
      };
    } else {
      console.log('✅ Already have sufficient WETH');
      return { success: true, message: 'Already have sufficient WETH' };
    }
    
  } catch (error) {
    console.error('❌ ETH to WETH conversion failed:', error);
    throw error;
  }
}