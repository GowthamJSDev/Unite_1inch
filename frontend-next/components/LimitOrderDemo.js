import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { LimitOrderDemo, checkBalances } from '../helper/limitOrderDemo';

export default function LimitOrderDemoComponent() {
  const { provider, account } = useWallet();
  const [balances, setBalances] = useState({ eth: '0', usdc: '0' });
  const [ethAmount, setEthAmount] = useState('0.01');
  const [usdcAmount, setUsdcAmount] = useState('25');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Load balances on component mount
  useEffect(() => {
    if (provider && account) {
      loadBalances();
    }
  }, [provider, account]);

  const loadBalances = async () => {
    try {
      const balanceData = await checkBalances(provider, account);
      setBalances(balanceData);
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  };

  const runDemo = async () => {
    if (!provider || !account) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const demo = new LimitOrderDemo(provider);
      const demoResult = await demo.runCompleteDemo(parseFloat(ethAmount), parseFloat(usdcAmount));
      
      setResult(demoResult);
      
      // Reload balances after demo
      setTimeout(loadBalances, 2000);
      
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
        1inch Limit Order Protocol Demo
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

      {/* Demo Configuration */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Demo Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ETH Amount (Maker)
            </label>
            <input
              type="number"
              step="0.001"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              USDC Amount (Taker)
            </label>
            <input
              type="number"
              step="0.01"
              value={usdcAmount}
              onChange={(e) => setUsdcAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="25"
            />
          </div>
        </div>
      </div>

      {/* Demo Steps Explanation */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">What This Demo Does:</h3>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Creates a limit order: Sell {ethAmount} ETH for {usdcAmount} USDC</li>
          <li>Signs the order using your wallet (offchain)</li>
          <li>Executes the order onchain (acting as resolver)</li>
          <li>Shows transaction hash and results</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          Note: This demo doesn't post to the official 1inch orderbook (as per hackathon requirements)
        </p>
      </div>

      {/* Run Demo Button */}
      <button
        onClick={runDemo}
        disabled={isLoading || !provider}
        className={`w-full py-3 px-4 rounded-md font-medium ${
          isLoading || !provider
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Running Demo...' : 'Run 1inch Limit Order Demo'}
      </button>

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
            {/* Order Created */}
            <div>
              <h5 className="font-medium text-green-700">✅ Order Created:</h5>
              <p className="text-sm text-green-600">Order Hash: {result.orderCreated.orderHash}</p>
            </div>

            {/* Order Executed */}
            <div>
              <h5 className="font-medium text-green-700">⚡ Order Executed:</h5>
              <p className="text-sm text-green-600">
                Transaction: 
                <a 
                  href={`https://etherscan.io/tx/${result.orderExecuted.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:underline"
                >
                  {result.orderExecuted.transactionHash}
                </a>
              </p>
              <p className="text-sm text-green-600">Block: {result.orderExecuted.blockNumber}</p>
              <p className="text-sm text-green-600">Gas Used: {result.orderExecuted.gasUsed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h4 className="font-medium text-yellow-800">Requirements Check:</h4>
        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
          <li>✅ Onchain execution of strategy (fillOrder transaction)</li>
          <li>✅ Custom Limit Orders (not posted to official API)</li>
          <li>✅ Uses 1inch Limit Order Protocol SDK</li>
          <li>✅ Works with ETH and USDC on Ethereum mainnet</li>
        </ul>
      </div>
    </div>
  );
}