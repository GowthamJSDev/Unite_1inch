// Fixed 1inch Limit Order Demo using correct V4 protocol structure
import { ethers } from 'ethers';

// Token addresses
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// 1inch Limit Order Protocol V4 contract
const LIMIT_ORDER_PROTOCOL = '0x111111125421ca6dc452d289314280a0f8842a65';

// Correct EIP-712 Domain for 1inch V4
const DOMAIN = {
  name: 'Limit Order Protocol',
  version: '4',
  chainId: 1,
  verifyingContract: LIMIT_ORDER_PROTOCOL
};

// Correct Order type for 1inch V4 protocol
const ORDER_TYPES = {
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

// Correct 1inch V4 ABI - simplified structure
const LIMIT_ORDER_ABI = [
  'function fillOrder((uint256,address,address,address,address,uint256,uint256,uint256) order, bytes signature, uint256 makingAmount, uint256 takingAmount, uint256 skipPermitAndThresholdAmount) external payable returns (uint256, uint256, bytes32)',
  'function hashOrder((uint256,address,address,address,address,uint256,uint256,uint256) order) external view returns (bytes32)',
  'function remaining(bytes32 orderHash) external view returns (uint256)',
  'function remainingsRaw(bytes32 orderHash) external view returns (uint256)'
];

export class Fixed1inchDemo {
  constructor(provider) {
    this.provider = provider;
    this.chainId = 1;
  }

  /**
   * Create proper maker traits for V4
   */
  createMakerTraits() {
    // Simple maker traits: no expiration, allow partial fills
    // Bit layout for V4: different from older versions
    let traits = BigInt(0);
    
    // Set partial fill allowed (bit 255)
    traits = traits | (BigInt(1) << BigInt(255));
    
    // Set multiple fills allowed (bit 254) 
    traits = traits | (BigInt(1) << BigInt(254));
    
    return traits;
  }

  /**
   * Run the complete 1inch limit order demo
   */
  async runDemo(ethAmount) {
    try {
      console.log('🎬 Starting Fixed 1inch Limit Order Demo');
      
      const signer = await this.provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      // Step 1: Verify WETH balance
      const wethContract = new ethers.Contract(
        WETH_ADDRESS,
        ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'],
        signer
      );
      
      const wethBalance = await wethContract.balanceOf(walletAddress);
      const requiredWeth = ethers.parseEther(ethAmount.toString());
      
      console.log(`WETH Balance: ${ethers.formatEther(wethBalance)}`);
      console.log(`Required: ${ethers.formatEther(requiredWeth)}`);
      
      if (wethBalance < requiredWeth) {
        throw new Error(`Insufficient WETH balance. Have ${ethers.formatEther(wethBalance)}, need ${ethers.formatEther(requiredWeth)}`);
      }
      
      // Step 2: Create the order with correct V4 structure
      const usdcAmount = ethAmount * 2500; // ~$2500 per ETH
      const takingAmount = ethers.parseUnits(usdcAmount.toString(), 6);
      
      const salt = BigInt(Math.floor(Date.now() / 1000)); // Use timestamp as salt
      const makerTraits = this.createMakerTraits();
      
      const order = {
        salt: salt,
        maker: walletAddress,
        receiver: walletAddress,
        makerAsset: WETH_ADDRESS,
        takerAsset: USDC_ADDRESS,
        makingAmount: requiredWeth,
        takingAmount: takingAmount,
        makerTraits: makerTraits
      };
      
      console.log('📝 Order created:', {
        salt: order.salt.toString(),
        maker: order.maker,
        receiver: order.receiver,
        makerAsset: order.makerAsset,
        takerAsset: order.takerAsset,
        makingAmount: order.makingAmount.toString(),
        takingAmount: order.takingAmount.toString(),
        makerTraits: order.makerTraits.toString()
      });
      
      // Step 3: Sign the order with EIP-712
      console.log('✏️ Signing order with EIP-712...');
      const signature = await signer.signTypedData(DOMAIN, ORDER_TYPES, order);
      console.log('✅ Order signed!');
      
      // Step 4: Get order hash from contract
      const contract = new ethers.Contract(LIMIT_ORDER_PROTOCOL, LIMIT_ORDER_ABI, signer);
      
      const orderTuple = [
        order.salt,
        order.maker,
        order.receiver,
        order.makerAsset,
        order.takerAsset,
        order.makingAmount,
        order.takingAmount,
        order.makerTraits
      ];
      
      const orderHash = await contract.hashOrder(orderTuple);
      console.log('Order Hash from contract:', orderHash);
      
      // Step 5: Approve tokens
      console.log('🔓 Approving WETH...');
      const wethApproveTx = await wethContract.approve(LIMIT_ORDER_PROTOCOL, requiredWeth);
      await wethApproveTx.wait();
      console.log('✅ WETH approved');
      
      // Check and approve USDC
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
      
      // Step 6: Fill the order using correct V4 parameters
      console.log('🚀 Filling order...');
      
      // V4 fillOrder parameters:
      // - order tuple
      // - signature
      // - makingAmount (how much to fill)
      // - takingAmount (how much to take)
      // - skipPermitAndThresholdAmount (0 for simple case)
      
      const fillTx = await contract.fillOrder(
        orderTuple,
        signature,
        order.makingAmount, // Fill complete making amount
        order.takingAmount, // Take complete taking amount  
        0, // skipPermitAndThresholdAmount = 0
        {
          gasLimit: 600000, // Generous gas limit
          value: 0 // No ETH needed for WETH->USDC
        }
      );
      
      console.log(`Fill transaction sent: ${fillTx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await fillTx.wait();
      console.log(`✅ Order filled successfully! Block: ${receipt.blockNumber}`);
      
      return {
        success: true,
        orderHash,
        order: {
          salt: order.salt.toString(),
          maker: order.maker,
          makingAmount: ethers.formatEther(order.makingAmount),
          takingAmount: ethers.formatUnits(order.takingAmount, 6),
          makerTraits: order.makerTraits.toString()
        },
        signature,
        execution: {
          transactionHash: fillTx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        }
      };
      
    } catch (error) {
      console.error('❌ 1inch demo failed:', error);
      throw error;
    }
  }
}

// Check balances
export async function checkBalances(provider, walletAddress) {
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