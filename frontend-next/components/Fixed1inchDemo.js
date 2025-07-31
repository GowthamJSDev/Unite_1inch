import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Fixed1inchDemo, checkBalances } from '../helper/fixed1inchDemo';

export default function Fixed1inchDemoComponent() {
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

    // Check WETH balance
    if (parseFloat(balances.weth) < parseFloat(ethAmount)) {
      setError(`Insufficient WETH balance. You have ${balances.weth} WETH but need ${ethAmount} WETH`);
      return;
    }

    // Check USDC balance for filling
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
      setStep('Creating 1inch limit order with correct V4 structure...');
      
      const demo = new Fixed1inchDemo(provider);
      const demoResult = await demo.runDemo(parseFloat(ethAmount));
      
      setResult(demoResult);
      setStep('1inch Limit Order Demo completed successfully!');
      
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
        Fixed 1inch Limit Order Protocol Demo
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
        <h3 className="font-semibold mb-4">Fixed Order Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WETH Amount (using your existing WETH)
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
              Order: {ethAmount} WETH → {expectedUsdc.toFixed(2)} USDC (fixed V4 structure)
            </p>
          </div>
        </div>
      </div>

      {/* Demo Flow Explanation */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">Fixed 1inch V4 Demo Flow:</h3>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Create order with correct V4 structure and maker traits</li>
          <li>Sign order with proper EIP-712 domain and types</li>
          <li>Use correct fillOrder function with 5 parameters</li>
          <li>Execute with proper tuple structure for V4 protocol</li>
          <li>Show transaction results</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          🔧 This version fixes the structure issues that caused reverts
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

      {parseFloat(balances.usdc) < expectedUsdc && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-medium text-red-800">❌ Insufficient USDC</h4>
          <p className="text-sm text-red-700 mt-1">
            You need {expectedUsdc.toFixed(2)} USDC to fill this order, but have {balances.usdc} USDC.
          </p>
        </div>
      )}

      {parseFloat(balances.weth) >= parseFloat(ethAmount) && parseFloat(balances.usdc) >= expectedUsdc && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-medium text-green-800">✅ Ready for Fixed Demo!</h4>
          <p className="text-sm text-green-700 mt-1">
            You have sufficient WETH ({balances.weth}) and USDC ({balances.usdc}) to run the fixed 1inch limit order demo.
          </p>
        </div>
      )}

      {/* Run Demo Button */}
      <button
        onClick={runDemo}
        disabled={isLoading || !provider || parseFloat(balances.weth) < parseFloat(ethAmount) || parseFloat(balances.usdc) < expectedUsdc}
        className={`w-full py-3 px-4 rounded-md font-medium ${
          isLoading || !provider || parseFloat(balances.weth) < parseFloat(ethAmount) || parseFloat(balances.usdc) < expectedUsdc
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Running Fixed 1inch Demo...' : 'Run Fixed 1inch Limit Order Demo'}
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
          <h4 className="font-medium text-green-800 mb-3">🎉 Fixed 1inch Limit Order Demo Success!</h4>
          
          <div className="space-y-3">
            <div>
              <h5 className="font-medium text-green-700">📝 Order Details:</h5>
              <div className="text-sm text-green-600 font-mono">
                <div>Hash: {result.orderHash}</div>
                <div>Maker: {result.order.maker}</div>
                <div>Amount: {result.order.makingAmount} WETH → {result.order.takingAmount} USDC</div>
                <div>Salt: {result.order.salt}</div>
                <div>Maker Traits: {result.order.makerTraits}</div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-green-700">⚡ Execution:</h5>
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

      {/* Technical Details */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="font-medium text-gray-800">🔧 Technical Fixes Applied:</h4>
        <ul className="text-sm text-gray-700 mt-2 space-y-1">
          <li>✅ <strong>Correct V4 Order Structure</strong>: 8-tuple format</li>
          <li>✅ <strong>Proper Maker Traits</strong>: V4 bit layout for partial/multiple fills</li>
          <li>✅ <strong>Right EIP-712 Domain</strong>: "Limit Order Protocol" v4</li>
          <li>✅ <strong>5-Parameter fillOrder</strong>: Including skipPermitAndThresholdAmount</li>
          <li>✅ <strong>Correct Contract ABI</strong>: V4 function signatures</li>
        </ul>
      </div>
    </div>
  );
}