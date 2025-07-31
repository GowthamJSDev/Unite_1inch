import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { SimpleSwapDemo, checkEthBalance } from '../helper/simpleSwapDemo';

export default function SimpleSwapDemoComponent() {
  const { provider, account } = useWallet();
  const [balance, setBalance] = useState({ eth: '0' });
  const [ethAmount, setEthAmount] = useState('0.001');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Load balance on component mount
  useEffect(() => {
    if (provider && account) {
      loadBalance();
    }
  }, [provider, account]);

  const loadBalance = async () => {
    try {
      const balanceData = await checkEthBalance(provider, account);
      setBalance(balanceData);
    } catch (err) {
      console.error('Error loading balance:', err);
    }
  };

  const runDemo = async () => {
    if (!provider || !account) {
      setError('Please connect your wallet first');
      return;
    }

    if (parseFloat(balance.eth) < parseFloat(ethAmount)) {
      setError(`Insufficient ETH balance. You have ${balance.eth} ETH but need ${ethAmount} ETH`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const demo = new SimpleSwapDemo(provider);
      const demoResult = await demo.runSimpleDemo(parseFloat(ethAmount));
      
      setResult(demoResult);
      
      // Reload balance after demo
      setTimeout(loadBalance, 3000);
      
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
        1inch Swap API Demo
      </h2>
      
      {/* Wallet Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Wallet Info</h3>
        <p className="text-sm text-gray-600">Address: {account || 'Not connected'}</p>
        <div className="mt-2">
          <span className="text-sm">ETH: {balance.eth}</span>
          <button 
            onClick={loadBalance}
            className="ml-4 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Demo Configuration */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Swap Configuration</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ETH Amount to Swap
            </label>
            <input
              type="number"
              step="0.001"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.001"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum: 0.001 ETH (plus gas fees)
            </p>
          </div>
        </div>
      </div>

      {/* Demo Steps Explanation */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">What This Demo Does:</h3>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Gets best price quote from 1inch for ETH → USDC swap</li>
          <li>Shows expected USDC output amount</li>
          <li>Executes the swap transaction onchain</li>
          <li>Shows transaction hash and results</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          Note: This uses the official 1inch swap API for demonstration
        </p>
      </div>

      {/* Run Demo Button */}
      <button
        onClick={runDemo}
        disabled={isLoading || !provider || parseFloat(balance.eth) < 0.002}
        className={`w-full py-3 px-4 rounded-md font-medium ${
          isLoading || !provider || parseFloat(balance.eth) < 0.002
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Executing Swap...' : 'Run 1inch Swap Demo'}
      </button>

      {parseFloat(balance.eth) < 0.002 && (
        <p className="text-xs text-red-600 mt-2 text-center">
          Insufficient ETH balance. Need at least 0.002 ETH for swap + gas fees.
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
          <h4 className="font-medium text-green-800 mb-3">Swap Results:</h4>
          
          <div className="space-y-3">
            {/* Quote */}
            <div>
              <h5 className="font-medium text-green-700">📊 Quote:</h5>
              <p className="text-sm text-green-600">
                {ethAmount} ETH → {result.expectedOutput} USDC
              </p>
            </div>

            {/* Execution */}
            <div>
              <h5 className="font-medium text-green-700">⚡ Swap Executed:</h5>
              <p className="text-sm text-green-600">
                Transaction: 
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
              <p className="text-sm text-green-600">Gas Used: {result.execution.gasUsed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h4 className="font-medium text-yellow-800">Demo Requirements:</h4>
        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
          <li>✅ Connected to Ethereum Mainnet</li>
          <li>✅ Have ETH in your wallet for swapping</li>
          <li>✅ Uses 1inch official swap API</li>
          <li>✅ Onchain transaction execution</li>
        </ul>
      </div>
    </div>
  );
}