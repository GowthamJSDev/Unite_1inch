// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';
import Working1inchDemo from '../components/Working1inchDemo';
import CrossChainSwap from '../components/CrossChainSwap';

export default function Dashboard() {
  const { account, disconnectWallet } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('limit-order');

  useEffect(() => {
    if (!account) {
      router.push('/');
    }
  }, [account, router]);

  const handleDisconnect = () => {
    disconnectWallet();
    router.push('/');
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>1inch Limit Order Demo</title>
        <meta name="description" content="1inch Limit Order Protocol Demo" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">1inch Limit Order Demo</h1>
                  <p className="text-sm text-gray-500">
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                Disconnect
              </button>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('limit-order')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'limit-order'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                1inch Limit Orders
              </button>
              <button
                onClick={() => setActiveTab('cross-chain')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cross-chain'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cross-Chain Fusion+ 🚀
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'limit-order' && <Working1inchDemo />}
            {activeTab === 'cross-chain' && <CrossChainSwap />}
          </div>
        </main>
      </div>
    </>
  );
}