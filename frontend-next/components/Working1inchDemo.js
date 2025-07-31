import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Working1inchLimitOrder, check1inchBalances } from '../helper/working1inchLimitOrder';

export default function Working1inchDemo() {
  const { provider, account } = useWallet();
  const [balances, setBalances] = useState({ eth: '0', weth: '0', usdc: '0' });
  const [wethAmount, setWethAmount] = useState('0.001');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isFillingOrder, setIsFillingOrder] = useState(false);
  const [fillResult, setFillResult] = useState(null);

  useEffect(() => {
    if (provider && account) {
      loadBalances();
    }
  }, [provider, account]);

  const loadBalances = async () => {
    try {
      const balanceData = await check1inchBalances(provider, account);
      setBalances(balanceData);
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  };

  const createAndExecuteOrder = async () => {
    if (!provider || !account) {
      setError('Please connect your wallet first');
      return;
    }

    if (parseFloat(wethAmount) <= 0) {
      setError('Please enter a valid WETH amount');
      return;
    }

    if (parseFloat(balances.weth) < parseFloat(wethAmount)) {
      setError(`Insufficient WETH balance. You have ${balances.weth} WETH but need ${wethAmount} WETH`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const demo = new Working1inchLimitOrder(provider);
      const demoResult = await demo.runCompleteDemo(parseFloat(wethAmount));
      
      setResult(demoResult);
      setTimeout(loadBalances, 3000);
      
    } catch (err) {
      console.error('1inch demo failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillExistingOrder = async () => {
    if (!result || !result.orderCreated || !result.orderCreated.orderData) {
      setError('No order available to fill. Create an order first.');
      return;
    }

    setIsFillingOrder(true);
    setError(null);
    setFillResult(null);

    try {
      const demo = new Working1inchLimitOrder(provider);
      const fillRes = await demo.fillOrderAsTaker(result.orderCreated, parseFloat(wethAmount));
      
      setFillResult(fillRes);
      setTimeout(loadBalances, 3000);
      
    } catch (err) {
      console.error('Order fill failed:', err);
      setError('Fill failed: ' + err.message);
    } finally {
      setIsFillingOrder(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          1inch Limit Order Demo
        </h2>
        <p className="text-gray-600">
          Create WETH → USDC limit order using 1inch Protocol
        </p>
      </div>

      {/* Wallet Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Wallet Balances</h3>
        <p className="text-sm text-gray-600 mb-2">Address: {account || 'Not connected'}</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-2 rounded">
            <div className="font-medium text-gray-800">ETH</div>
            <div className="text-blue-600">{balances.eth}</div>
          </div>
          <div className="bg-white p-2 rounded">
            <div className="font-medium text-gray-800">WETH</div>
            <div className="text-blue-600">{balances.weth}</div>
          </div>
          <div className="bg-white p-2 rounded">
            <div className="font-medium text-gray-800">USDC</div>
            <div className="text-blue-600">{balances.usdc}</div>
          </div>
        </div>
        <button 
          onClick={loadBalances}
          className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {/* Order Configuration */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Limit Order Setup</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WETH Amount
          </label>
          <input
            type="number"
            step="0.001"
            value={wethAmount}
            onChange={(e) => setWethAmount(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.001"
          />
          <p className="text-xs text-gray-500 mt-1">
            Will create order: {wethAmount} WETH → Live market rate USDC (≈{parseFloat(wethAmount) * 3800} USDC)
          </p>
        </div>
      </div>

      {/* Balance Check */}
      {parseFloat(balances.weth) < parseFloat(wethAmount) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-medium text-red-800">❌ Insufficient WETH</h4>
          <p className="text-sm text-red-700 mt-1">
            You need {wethAmount} WETH but have {balances.weth} WETH.
          </p>
        </div>
      )}

      {/* Create and Execute Order Button */}
      <button
        onClick={createAndExecuteOrder}
        disabled={isLoading || !provider || parseFloat(balances.weth) < parseFloat(wethAmount)}
        className={`w-full py-3 px-4 rounded-md font-medium ${
          isLoading || !provider || parseFloat(balances.weth) < parseFloat(wethAmount)
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
{isLoading ? '⏳ Creating 1inch Order...' : 'Create 1inch Limit Order'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-medium text-red-800">❌ Error:</h4>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Success Header */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-bold text-green-800 mb-2">🎉 1inch Limit Order Created Successfully!</h4>
            <p className="text-sm text-green-700">{result.summary.status}</p>
          </div>

          {/* Order Details */}
          <div className="bg-white border rounded-lg p-4">
            <h5 className="font-medium text-gray-800 mb-3">📝 Order Details</h5>
            <div className="text-sm space-y-2">
              <div><strong>Order Hash:</strong> <span className="font-mono text-xs break-all">{result.summary.orderHash}</span></div>
              <div><strong>Trade:</strong> {result.summary.trade}</div>
              <div><strong>Method:</strong> {result.summary.method}</div>
              <div><strong>Status:</strong> <span className="text-green-600">✅ Order signed with EIP-712</span></div>
            </div>
          </div>

          {/* Hackathon Compliance */}
          <div className="bg-white border rounded-lg p-4">
            <h5 className="font-medium text-gray-800 mb-3">🏆 Hackathon Requirements Met</h5>
            <div className="text-sm space-y-1">
              {Object.entries(result.summary.hackathonCompliance).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className="text-green-600 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Success Message */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>✅ 1inch Protocol Demo:</strong> {result.summary.note}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              This demonstrates proper 1inch Limit Order Protocol usage without relying on their official API.
            </p>
          </div>

          {/* Fill Order Button */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="font-medium text-yellow-800 mb-2">🔄 Fill This Order</h5>
            <p className="text-sm text-yellow-700 mb-3">
              Now that the order is created, you can fill it as a taker to complete the swap onchain.
            </p>
            <button
              onClick={fillExistingOrder}
              disabled={isFillingOrder || !result}
              className={`w-full py-2 px-4 rounded-md font-medium ${
                isFillingOrder || !result
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {isFillingOrder ? '⏳ Filling Order...' : '🚀 Fill Order (Execute Swap)'}
            </button>
          </div>
        </div>
      )}

      {/* Fill Results Display */}
      {fillResult && (
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-bold text-purple-800 mb-3">🎉 Order Filled Successfully!</h4>
          <div className="text-sm space-y-2">
            <div>
              <strong>Transaction Hash:</strong>{' '}
              <a 
                href={`https://etherscan.io/tx/${fillResult.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-blue-600 hover:underline break-all"
              >
                {fillResult.transactionHash}
              </a>
            </div>
            <div><strong>Block Number:</strong> {fillResult.blockNumber}</div>
            <div><strong>Gas Used:</strong> {fillResult.gasUsed}</div>
            <div><strong>Filled Amount:</strong> {fillResult.filledAmount} WETH</div>
            <div><strong>Paid Amount:</strong> {fillResult.paidAmount} USDC</div>
            <div><strong>Method:</strong> {fillResult.method}</div>
          </div>
        </div>
      )}
    </div>
  );
}