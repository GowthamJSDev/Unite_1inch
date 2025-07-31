import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ManualLimitOrderDemo, checkTokenBalances, convertEthToWeth } from '../helper/manualLimitOrderDemo';

export default function ManualLimitOrderDemoComponent() {
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
      const balanceData = await checkTokenBalances(provider, account);
      setBalances(balanceData);
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  };

  const convertEthIfNeeded = async () => {
    try {
      setStep('Converting ETH to WETH if needed...');
      const result = await convertEthToWeth(provider, parseFloat(ethAmount));
      
      if (result.transactionHash) {
        setStep(`ETH converted to WETH: ${result.transactionHash}`);
      } else {
        setStep('Already have sufficient WETH');
      }
      
      // Reload balances after conversion
      setTimeout(loadBalances, 2000);
      
      return result;
    } catch (error) {
      setError(`ETH to WETH conversion failed: ${error.message}`);
      throw error;
    }
  };

  const runDemo = async () => {
    if (!provider || !account) {
      setError('Please connect your wallet first');
      return;
    }

    const totalEthNeeded = parseFloat(ethAmount) + 0.01; // ETH amount + gas
    if (parseFloat(balances.eth) < totalEthNeeded) {
      setError(`Insufficient ETH. Need ${totalEthNeeded} ETH (${ethAmount} for conversion + 0.01 for gas), have ${balances.eth} ETH`);
      return;
    }

    const expectedUsdc = parseFloat(ethAmount) * 2500;
    if (parseFloat(balances.usdc) < expectedUsdc) {
      setError(`Need ${expectedUsdc} USDC to fill the order, but you have ${balances.usdc} USDC`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStep('');

    try {
      // Step 1: Convert ETH to WETH if needed
      await convertEthIfNeeded();
      
      // Step 2: Run the limit order demo
      setStep('Creating and executing 1inch limit order...');
      console.log('🎬 Starting Manual 1inch Limit Order Demo');
      
      const demo = new ManualLimitOrderDemo(provider);
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
  const hasEnoughWeth = parseFloat(balances.weth) >= parseFloat(ethAmount || 0);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        1inch Limit Order Protocol Demo
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
        <h3 className="font-semibold mb-4">Order Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ETH/WETH Amount for Limit Order
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
              Order: {ethAmount} WETH → {expectedUsdc.toFixed(2)} USDC
            </p>
            {hasEnoughWeth && (
              <p className="text-xs text-green-600 mt-1">
                ✅ You have enough WETH for this order
              </p>
            )}
            {!hasEnoughWeth && parseFloat(balances.eth) >= parseFloat(ethAmount) && (
              <p className="text-xs text-yellow-600 mt-1">
                💡 Will convert {ethAmount} ETH to WETH automatically
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Demo Flow Explanation */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">Demo Flow (No API Dependencies):</h3>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Convert ETH to WETH if needed</li>
          <li>Create limit order manually (no SDK API calls)</li>
          <li>Sign order with EIP-712 signature</li>
          <li>Execute order directly on 1inch protocol contract</li>
          <li>Show transaction results</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          ⚡ Pure onchain demo - no external API dependencies
        </p>
      </div>

      {/* Status Display */}
      {step && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="font-medium text-yellow-800">Current Step:</h4>
          <p className="text-sm text-yellow-700 mt-1">{step}</p>
        </div>
      )}

      {/* Requirements Check */}
      {parseFloat(balances.usdc) < expectedUsdc && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-medium text-red-800">❌ Insufficient USDC</h4>
          <p className="text-sm text-red-700 mt-1">
            You need {expectedUsdc.toFixed(2)} USDC to fill this order, but have {balances.usdc} USDC.
          </p>
        </div>
      )}

      {parseFloat(balances.usdc) >= expectedUsdc && parseFloat(balances.eth) > 0.01 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-medium text-green-800">✅ Ready for Demo!</h4>
          <p className="text-sm text-green-700 mt-1">
            You have sufficient funds to run the complete 1inch limit order demo.
          </p>
          <div className="text-xs text-green-600 mt-2">
            <div>• ETH: {balances.eth} (✅ enough for gas + conversion)</div>
            <div>• WETH: {balances.weth} {hasEnoughWeth ? '(✅ enough)' : '(will convert from ETH)'}</div>
            <div>• USDC: {balances.usdc} (✅ enough to fill order)</div>
          </div>
        </div>
      )}

      {/* Run Demo Button */}
      <button
        onClick={runDemo}
        disabled={isLoading || !provider || parseFloat(balances.eth) < 0.01 || parseFloat(balances.usdc) < expectedUsdc}
        className={`w-full py-3 px-4 rounded-md font-medium ${
          isLoading || !provider || parseFloat(balances.eth) < 0.01 || parseFloat(balances.usdc) < expectedUsdc
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Running 1inch Limit Order Demo...' : 'Run 1inch Limit Order Demo'}
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
          <h4 className="font-medium text-green-800 mb-3">🎉 1inch Limit Order Demo Completed!</h4>
          
          <div className="space-y-3">
            <div>
              <h5 className="font-medium text-green-700">📝 Order Created:</h5>
              <p className="text-sm text-green-600 font-mono break-all">
                Hash: {result.orderHash}
              </p>
              <div className="text-xs text-green-600 mt-1">
                <div>Maker: {result.order.maker}</div>
                <div>WETH Amount: {parseFloat(result.order.makingAmount) / 1e18}</div>
                <div>USDC Amount: {parseFloat(result.order.takingAmount) / 1e6}</div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-green-700">⚡ Order Executed:</h5>
              <p className="text-sm text-green-600">
                Transaction: 
                <a 
                  href={`https://etherscan.io/tx/${result.execution.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:underline break-all"
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

      {/* Hackathon Requirements */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="font-medium text-gray-800">🏆 Hackathon Requirements Met:</h4>
        <ul className="text-sm text-gray-700 mt-2 space-y-1">
          <li>✅ <strong>Onchain execution</strong>: Direct fillOrder transaction</li>
          <li>✅ <strong>Custom Limit Orders</strong>: Manual order creation, no API</li>
          <li>✅ <strong>1inch Protocol</strong>: Uses official contract (0x111111125421ca6dc452d289314280a0f8842a65)</li>
          <li>✅ <strong>EIP-712 Signatures</strong>: Proper typed data signing</li>
          <li>✅ <strong>Complete Flow</strong>: Order creation → Signing → Execution</li>
          <li>✅ <strong>No API Dependencies</strong>: Pure smart contract interaction</li>
        </ul>
      </div>
    </div>
  );
}