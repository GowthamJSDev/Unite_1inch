// Token addresses for Ethereum mainnet
export const TOKENS = {
  ETH: {
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Special ETH address for 1inch
    symbol: 'ETH',
    decimals: 18,
    name: 'Ethereum'
  },
  WETH: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether'
  },
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC', 
    decimals: 6,
    name: 'USD Coin'
  }
};

// 1inch Protocol addresses for Ethereum mainnet
export const PROTOCOL_ADDRESSES = {
  LIMIT_ORDER_PROTOCOL: '0x111111125421ca6dc452d289314280a0f8842a65',
  AGGREGATION_ROUTER_V5: '0x1111111254EEB25477B68fb85Ed929f73A960582'
};