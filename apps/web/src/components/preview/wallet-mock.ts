// ---------------------------------------------------------------------------
// Mock Ethereum provider — injected as a script string into the iframe
// ---------------------------------------------------------------------------

/**
 * JavaScript source that creates a mock `window.ethereum` provider.
 * This lets generated dApp frontends call standard wallet methods without
 * requiring a real browser wallet extension.
 */
export const walletMockScript = `
(function () {
  const MOCK_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68';
  const MOCK_CHAIN_ID = '0x2105'; // Base (8453)
  const MOCK_BALANCE = '0xDE0B6B3A7640000'; // 1 ETH in hex (1e18)

  function randomHex(bytes) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return '0x' + Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  var ethereum = {
    isMetaMask: true,
    selectedAddress: MOCK_ADDRESS,
    chainId: MOCK_CHAIN_ID,
    networkVersion: '8453',

    request: function (args) {
      var method = args.method;

      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return Promise.resolve([MOCK_ADDRESS]);

        case 'eth_chainId':
          return Promise.resolve(MOCK_CHAIN_ID);

        case 'net_version':
          return Promise.resolve('8453');

        case 'eth_getBalance':
          return Promise.resolve(MOCK_BALANCE);

        case 'eth_blockNumber':
          return Promise.resolve('0x10A5E0F');

        case 'eth_estimateGas':
          return Promise.resolve('0x5208'); // 21000

        case 'eth_gasPrice':
          return Promise.resolve('0x3B9ACA00'); // 1 gwei

        case 'eth_sendTransaction':
          return Promise.resolve(randomHex(32));

        case 'personal_sign':
        case 'eth_sign':
        case 'eth_signTypedData':
        case 'eth_signTypedData_v4':
          return Promise.resolve(randomHex(65));

        case 'wallet_switchEthereumChain':
        case 'wallet_addEthereumChain':
          return Promise.resolve(null);

        case 'eth_call':
          return Promise.resolve('0x');

        default:
          return Promise.reject(
            new Error('[Zapp Mock] Unsupported method: ' + method)
          );
      }
    },

    on: function () { return ethereum; },
    removeListener: function () { return ethereum; },
    removeAllListeners: function () { return ethereum; },

    enable: function () {
      return Promise.resolve([MOCK_ADDRESS]);
    },
  };

  window.ethereum = ethereum;
})();
`;
