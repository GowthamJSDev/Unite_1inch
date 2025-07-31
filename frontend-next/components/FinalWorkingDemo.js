import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { WorkingLimitOrderDemo, SimpleUniswapDemo, checkBalances } from '../helper/workingLimitOrderDemo';

export default function FinalWorkingDemo() {
  const { provider, account } = useWallet();
  const [balances, setBalances] = useState({ eth: '0', usdc: '0' });
  const [ethAmount, setEthAmount] = useState('0.001');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [quote, setQuote] = useState(null);
  const [demoType, setDemoType] = useState('limitorder'); // 'uniswap' or 'limitorder'

  // Load balances and quote on component mount
  useEffect(() => {
    if (provider && account) {
      loadBalances();
      if (demoType === 'uniswap') {
        getQuote();
      }
    }
  }, [provider, account, ethAmount, demoType]);

  const loadBalances = async () => {
    try {
      const balanceData = await checkBalances(provider, account);
      setBalances(balanceData);
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  };

  const getQuote = async () => {
    if (!provider || !ethAmount || parseFloat(ethAmount) <= 0) return;
    
    try {
      if (demoType === 'uniswap') {
        const uniswap = new SimpleUniswapDemo(provider);
        const expectedOutput = await uniswap.getQuote(parseFloat(ethAmount));
        setQuote(expectedOutput);
      }
    } catch (err) {
      console.error('Quote failed:', err);
      setQuote(null);
    }
  };

  const runDemo = async () => {
    if (!provider || !account) {
      setError('Please connect your wallet first');
      return;
    }

    const minEthRequired = demoType === 'limitorder' ? 0.002 : 0.001;
    if (parseFloat(balances.eth) < parseFloat(ethAmount) + minEthRequired) {
      setError(`Insufficient ETH balance. You have ${balances.eth} ETH but need ${parseFloat(ethAmount) + minEthRequired} ETH (includes gas)`);
      return;
    }

    if (demoType === 'limitorder' && parseFloat(balances.usdc) < 5) {
      setError(`For limit order demo, you need at least 5 USDC to act as the filler. You have ${balances.usdc} USDC.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      if (demoType === 'uniswap') {
        console.log('🎬 Starting Uniswap Demo');
        const uniswap = new SimpleUniswapDemo(provider);
        const demoResult = await uniswap.runDemo(parseFloat(ethAmount));
        
        setResult(demoResult);
        
      } else if (demoType === 'limitorder') {
        console.log('🎬 Starting 1inch Limit Order Demo');
        const limitOrderDemo = new WorkingLimitOrderDemo(provider);
        // Calculate reasonable USDC amount (ETH * ~$2500)
        const expectedUsdc = parseFloat(ethAmount) * 2500;
        const demoResult = await limitOrderDemo.runCompleteDemo(parseFloat(ethAmount), expectedUsdc);
        
        setResult({
          method: '1inch Limit Order',
          orderCreated: demoResult.orderCreated,
          execution: demoResult.orderExecuted
        });
      }
      
      // Reload balances after demo
      setTimeout(loadBalances, 3000);
      
    } catch (err) {
      console.error('Demo failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Working DeFi Demo
      </h2>
      
      {/* Wallet Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Wallet Info</h3>
        <p className="text-sm text-gray-600">Address: {account || 'Not connected'}</p>
        <div className="mt-2">
          <span className="text-sm">ETH: {balances.eth}</span>
          <span className="ml-4 text-sm">USDC: {balances.usdc}</span>
          <button 
            onClick={loadBalances}
            className="ml-4 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Demo Type Selection */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Demo Type</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setDemoType('uniswap')}
            className={`p-3 rounded-lg border ${
              demoType === 'uniswap'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-medium">Uniswap Swap</div>
            <div className="text-xs text-gray-600">Guaranteed to work</div>
          </button>
          <button
            onClick={() => setDemoType('limitorder')}
            className={`p-3 rounded-lg border ${
              demoType === 'limitorder'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-medium">1inch Limit Order</div>
            <div className="text-xs text-gray-600">Requires USDC</div>
          </button>
        </div>
      </div>

      {/* Demo Configuration */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Configuration</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ETH Amount
            </label>
            <input
              type="number"
              step="0.001"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.001"
            />
            {quote && demoType === 'uniswap' && (
              <p className="text-xs text-green-600 mt-1">
                Expected: ~{quote} USDC
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Demo Explanation */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">
          {demoType === 'uniswap' ? 'Uniswap Demo:' : '1inch Limit Order Demo:'}
        </h3>
        {demoType === 'uniswap' ? (
          <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
            <li>Gets price quote from Uniswap V2</li>
            <li>Executes ETH → USDC swap onchain</li>
            <li>Shows transaction results</li>
          </ol>
        ) : (
          <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
            <li>Creates a limit order using 1inch SDK</li>
            <li>Signs order with EIP-712</li>
            <li>Executes order onchain (you act as filler)</li>
            <li>Shows complete transaction flow</li>
          </ol>
        )}
      </div>

      {/* Requirements Check */}
      {demoType === 'limitorder' && parseFloat(balances.usdc) < 5 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="font-medium text-yellow-800">USDC Required:</h4>
          <p className="text-sm text-yellow-700 mt-1">
            You need at least 5 USDC to act as the order filler in the limit order demo. 
            You currently have {balances.usdc} USDC.
          </p>
        </div>
      )}
      
      {demoType === 'limitorder' && parseFloat(balances.usdc) >= 5 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-medium text-green-800">✅ Ready for 1inch Limit Order Demo!</h4>
          <p className="text-sm text-green-700 mt-1">
            You have sufficient USDC ({balances.usdc}) to run the complete 1inch limit order demonstration.
          </p>
        </div>
      )}

      {/* Run Demo Button */}
      <button
        onClick={runDemo}
        disabled={isLoading || !provider || parseFloat(balances.eth) < 0.002}
        className={`w-full py-3 px-4 rounded-md font-medium ${
          isLoading || !provider || parseFloat(balances.eth) < 0.002
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Running Demo...' : `Run ${demoType === 'uniswap' ? 'Uniswap' : '1inch Limit Order'} Demo`}
      </button>

      {parseFloat(balances.eth) < 0.002 && (
        <p className="text-xs text-red-600 mt-2 text-center">
          Insufficient ETH balance for transaction and gas fees.
        </p>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-medium text-red-800">Error:</h4>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-medium text-green-800 mb-3">Demo Results:</h4>
          
          <div className="space-y-3">
            {/* Method Used */}
            <div>
              <h5 className="font-medium text-green-700">🔄 Method:</h5>
              <p className="text-sm text-green-600">{result.method}</p>
            </div>

            {/* Order Created (for limit orders) */}
            {result.orderCreated && (
              <div>
                <h5 className="font-medium text-green-700">✅ Order Created:</h5>
                <p className="text-sm text-green-600">Hash: {result.orderCreated.orderHash}</p>
              </div>
            )}

            {/* Quote */}
            {result.quote && (
              <div>
                <h5 className="font-medium text-green-700">📊 Quote:</h5>
                <p className="text-sm text-green-600">
                  {ethAmount} ETH → {result.quote.expectedOutput} USDC
                </p>
              </div>
            )}

            {/* Execution */}
            <div>
              <h5 className="font-medium text-green-700">⚡ Transaction:</h5>
              <p className="text-sm text-green-600">
                Hash: 
                <a 
                  href={`https://etherscan.io/tx/${result.execution.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:underline"
                >
                  {result.execution.transactionHash}
                </a>
              </p>
              <p className="text-sm text-green-600">Block: {result.execution.blockNumber}</p>
              <p className="text-sm text-green-600">Gas: {result.execution.gasUsed}</p>
              {result.execution.expectedOutput && (
                <p className="text-sm text-green-600">Output: {result.execution.expectedOutput} USDC</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="font-medium text-gray-800">Instructions:</h4>
        <ul className="text-sm text-gray-700 mt-2 space-y-1">
          <li>🎯 <strong>1inch Limit Order</strong>: Full protocol demo for hackathon requirements</li>
          <li>🟢 <strong>Uniswap Demo</strong>: Simple fallback option</li>
          <li>💡 <strong>Recommended</strong>: Use 1inch Limit Order for your presentation</li>
        </ul>
      </div>
    </div>
  );
}