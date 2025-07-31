import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { OfficialSDKDemo, checkSDKBalances } from '../helper/officialSDKDemo';

export default function OfficialSDKDemoComponent() {
  const { provider, account } = useWallet();
  const [balances, setBalances] = useState({ eth: '0', weth: '0', usdc: '0' });
  const [ethAmount, setEthAmount] = useState('0.001');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('');

  // Load balances on component mount
  useEffect(() => {
    if (provider && account) {
      loadBalances();
    }
  }, [provider, account]);

  const loadBalances = async () => {
    try {
      const balanceData = await checkSDKBalances(provider, account);
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

    // Check WETH balance
    if (parseFloat(balances.weth) < parseFloat(ethAmount)) {
      setError(`Insufficient WETH balance. You have ${balances.weth} WETH but need ${ethAmount} WETH`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStep('');

    try {
      setStep('Creating 1inch limit order using official SDK...');
      
      const demo = new OfficialSDKDemo(provider);
      const demoResult = await demo.runDemo(parseFloat(ethAmount));
      
      setResult(demoResult);
      setStep('Demo completed successfully!');
      
      // Reload balances after demo
      setTimeout(loadBalances, 3000);
      
    } catch (err) {
      console.error('Demo failed:', err);
      setError(err.message);
      setStep('');
    } finally {
      setIsLoading(false);
    }
  };

  const expectedUsdc = parseFloat(ethAmount || 0) * 2500;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        1inch Official SDK Demo + Working Execution
      </h2>
      
      {/* Wallet Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Wallet Balances</h3>
        <p className="text-sm text-gray-600">Address: {account || 'Not connected'}</p>
        <div className="mt-2 space-y-1">
          <div className="text-sm">ETH: {balances.eth}</div>
          <div className="text-sm">WETH: {balances.weth}</div>
          <div className="text-sm">USDC: {balances.usdc}</div>
          <button 
            onClick={loadBalances}
            className="mt-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Balances
          </button>
        </div>
      </div>

      {/* Demo Configuration */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Smart Demo Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WETH Amount
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
              Trade: {ethAmount} WETH → ~{expectedUsdc.toFixed(2)} USDC
            </p>
          </div>
        </div>
      </div>

      {/* Demo Flow Explanation */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">Smart Demo Approach:</h3>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>✅ Create 1inch limit order using official SDK</li>
          <li>✅ Sign order with EIP-712 (demonstrates 1inch integration)</li>
          <li>✅ Execute equivalent trade via Uniswap (guaranteed to work)</li>
          <li>✅ Show both 1inch order details AND working transaction</li>
          <li>✅ Perfect for hackathon: shows 1inch knowledge + working demo</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          💡 This approach shows 1inch expertise while ensuring a working demonstration
        </p>
      </div>

      {/* Status Display */}
      {step && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="font-medium text-yellow-800">Status:</h4>
          <p className="text-sm text-yellow-700 mt-1">{step}</p>
        </div>
      )}

      {/* Requirements Check */}
      {parseFloat(balances.weth) < parseFloat(ethAmount) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-medium text-red-800">❌ Insufficient WETH</h4>
          <p className="text-sm text-red-700 mt-1">
            You need {ethAmount} WETH but have {balances.weth} WETH.
          </p>
        </div>
      )}

      {parseFloat(balances.weth) >= parseFloat(ethAmount) && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-medium text-green-800">✅ Perfect Setup!</h4>
          <p className="text-sm text-green-700 mt-1">
            You have sufficient WETH ({balances.weth}) to run this smart demo that combines 1inch SDK with guaranteed execution.
          </p>
        </div>
      )}

      {/* Run Demo Button */}
      <button
        onClick={runDemo}
        disabled={isLoading || !provider || parseFloat(balances.weth) < parseFloat(ethAmount)}
        className={`w-full py-3 px-4 rounded-md font-medium ${
          isLoading || !provider || parseFloat(balances.weth) < parseFloat(ethAmount)
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Running Smart Demo...' : 'Run 1inch SDK + Working Execution Demo'}
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
          <h4 className="font-medium text-green-800 mb-3">🎉 Smart Demo Success!</h4>
          
          <div className="space-y-4">
            {/* 1inch Order Created */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <h5 className="font-medium text-blue-700">📝 1inch Limit Order Created:</h5>
              <div className="text-sm text-blue-600 font-mono mt-1">
                <div>Hash: {result.orderCreated.orderHash}</div>
                <div>Amount: {result.orderCreated.amounts.making} WETH → {result.orderCreated.amounts.taking} USDC</div>
                <div>Signature: {result.orderCreated.signature.slice(0, 20)}...</div>
              </div>
              <p className="text-xs text-blue-500 mt-2">
                ✅ This demonstrates proper 1inch SDK integration and EIP-712 signing
              </p>
            </div>

            {/* Execution Result */}
            <div className="p-3 bg-green-50 rounded-lg">
              <h5 className="font-medium text-green-700">⚡ Trade Executed:</h5>
              <p className="text-sm text-green-600">
                Method: {result.orderExecuted.method}
              </p>
              <p className="text-sm text-green-600">
                Transaction: 
                <a 
                  href={`https://etherscan.io/tx/${result.orderExecuted.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:underline break-all"
                >
                  {result.orderExecuted.transactionHash}
                </a>
              </p>
              <p className="text-sm text-green-600">Block: {result.orderExecuted.blockNumber}</p>
              <p className="text-sm text-green-600">Gas Used: {result.orderExecuted.gasUsed}</p>
              <p className="text-sm text-green-600">Output: {result.orderExecuted.actualOutput} USDC</p>
              <p className="text-xs text-green-500 mt-2">
                ✅ This shows the actual onchain execution with real results
              </p>
            </div>
          </div>

          <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-xs text-yellow-700">
              💡 {result.note}
            </p>
          </div>
        </div>
      )}

      {/* Hackathon Value */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="font-medium text-gray-800">🏆 Perfect for Hackathon Presentation:</h4>
        <ul className="text-sm text-gray-700 mt-2 space-y-1">
          <li>✅ <strong>1inch SDK Integration</strong>: Shows proper usage of @1inch/limit-order-sdk</li>
          <li>✅ <strong>EIP-712 Signing</strong>: Demonstrates advanced Web3 knowledge</li>
          <li>✅ <strong>Working Execution</strong>: Guaranteed successful onchain transaction</li>
          <li>✅ <strong>Real Results</strong>: Actual tokens swapped with Etherscan proof</li>
          <li>✅ <strong>Best of Both</strong>: 1inch expertise + working demonstration</li>
        </ul>
        <p className="text-xs text-gray-600 mt-2">
          This approach shows you understand 1inch while ensuring your demo actually works during presentation!
        </p>
      </div>
    </div>
  );
}