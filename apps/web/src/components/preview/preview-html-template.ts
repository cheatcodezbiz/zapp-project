// ---------------------------------------------------------------------------
// HTML template builder for the sandboxed iframe preview
// ---------------------------------------------------------------------------

import { walletMockScript } from "./wallet-mock";

/**
 * Build a complete HTML document that renders the provided React/TSX code
 * inside a sandboxed iframe. Includes React, ReactDOM, Tailwind, ethers.js,
 * Babel standalone (for in-browser JSX transform), and a mock wallet provider.
 */
export function buildPreviewHTML(
  reactCode: string,
  contractABI?: string,
): string {
  const abiScript = contractABI
    ? `<script>window.CONTRACT_ABI = ${contractABI};</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zapp Preview</title>

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: '#6366f1',
            'primary-foreground': '#ffffff',
          },
        },
      },
    };
  </script>

  <!-- React 18.2.0 UMD -->
  <script crossorigin src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>

  <!-- ethers.js 6.7.0 -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.umd.min.js"></script>

  <!-- Babel standalone for in-browser JSX transform -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />

  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #111827; /* gray-900 */
      color: #f9fafb;           /* gray-50  */
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- Wallet mock provider -->
  <script>${walletMockScript}</script>

  <!-- Contract ABI (if available) -->
  ${abiScript}

  <!-- Error boundary — forward errors to parent -->
  <script>
    window.onerror = function (message, source, lineno, colno, error) {
      window.parent.postMessage(
        {
          type: 'preview-error',
          message: String(message),
          source: source || '',
          line: lineno || 0,
          column: colno || 0,
        },
        '*'
      );
      return true; // prevent default console error
    };

    window.addEventListener('unhandledrejection', function (event) {
      window.parent.postMessage(
        {
          type: 'preview-error',
          message: 'Unhandled promise rejection: ' + String(event.reason),
        },
        '*'
      );
    });
  </script>

  <!-- User code -->
  <script type="text/babel" data-type="module">
    const { useState, useEffect, useCallback, useMemo, useRef } = React;

    ${reactCode}

    // Mount the App component
    const rootElement = document.getElementById('root');
    if (rootElement) {
      const root = ReactDOM.createRoot(rootElement);
      root.render(React.createElement(typeof App !== 'undefined' ? App : (typeof StakingPage !== 'undefined' ? StakingPage : function() { return React.createElement('div', {className:'p-8 text-center text-gray-400'}, 'No App component exported'); })));
    }
  </script>
</body>
</html>`;
}
