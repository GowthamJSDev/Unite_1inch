// Test script to verify 1inch integration
const { ethers } = require('ethers');
const { Address, MakerTraits, FetchProviderConnector, Sdk } = require('@1inch/limit-order-sdk');

async function testIntegration() {
  console.log('🧪 Testing 1inch Limit Order SDK Integration...');
  
  try {
    // Test SDK import
    console.log('✅ SDK imported successfully');
    
    // Test Address creation
    const ethAddress = new Address('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE');
    console.log('✅ Address class working:', ethAddress.toString());
    
    // Test MakerTraits
    const traits = MakerTraits.default();
    console.log('✅ MakerTraits class working');
    
    // Test SDK creation (without API)
    const sdk = new Sdk({
      networkId: 1,
      httpConnector: new FetchProviderConnector(),
    });
    console.log('✅ SDK instance created');
    
    console.log('🎉 All basic integrations working!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

testIntegration();