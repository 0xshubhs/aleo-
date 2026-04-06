"use client";

import { useState, useCallback } from "react";
import Navigation from "../components/Navigation";

function CodeBlock({ content, id }: { content: string; id?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [content]);
  return (
    <div className="relative group">
      <pre className="bg-black/5 p-3 sm:p-4 pr-10 sm:pr-12 rounded-lg overflow-x-auto text-xs sm:text-sm min-w-0">
        <code className="text-black font-mono whitespace-pre" id={id}>
          {content}
        </code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded bg-black/10 hover:bg-black/20 text-black text-sm leading-none transition-colors"
        title="Copy code"
        aria-label="Copy code"
      >
        {copied ? "✓" : "📋"}
      </button>
      {copied && (
        <span className="absolute top-2 right-10 text-xs text-black/70 font-medium">
          Copied!
        </span>
      )}
    </div>
  );
}

type SectionType = "text" | "code" | "list" | "heading" | "table";

interface DocSection {
  id: string;
  title: string;
  description: string;
  sections: {
    title: string;
    content: string;
    type?: SectionType;
    rows?: string[][]; // for table: array of [col1, col2, ...]
  }[];
}

const docs: DocSection[] = [
  {
    id: "overview",
    title: "Overview & stack",
    description: "What this scaffold uses and how it’s built",
    sections: [
      { title: "Tech stack", content: "", type: "heading" },
      {
        title: "Frontend",
        content: "Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4. Styling is utility-first with custom landing headline styles in globals.css.",
        type: "text",
      },
      {
        title: "Aleo & wallet",
        content: "Leo for smart contracts. Wallet: @demox-labs/aleo-wallet-adapter-react, @demox-labs/aleo-wallet-adapter-reactui, @demox-labs/aleo-wallet-adapter-leo, @demox-labs/aleo-wallet-adapter-base. Network: TestnetBeta.",
        type: "text",
      },
      {
        title: "Packages (dependencies)",
        content: "@demox-labs/aleo-wallet-adapter-base ^0.0.23\n@demox-labs/aleo-wallet-adapter-leo ^0.0.25\n@demox-labs/aleo-wallet-adapter-react ^0.0.22\n@demox-labs/aleo-wallet-adapter-reactui ^0.0.36\nnext 16.1.1, react 19.2.3, react-dom 19.2.3",
        type: "code",
      },
      { title: "App routes", content: "", type: "heading" },
      {
        title: "Routes",
        content: "",
        type: "table",
        rows: [
          ["Route", "Program", "Purpose"],
          ["/", "—", "Landing (Aleo blockchain Starter-Kit)"],
          ["/bio", "onchainbio.aleo", "Register & fetch bio profiles"],
          ["/credits", "credits.aleo", "Credit records & transfer_public"],
          ["/greeting", "greeting.aleo", "Call greet transition"],
          ["/explorer", "—", "AleoLens explorer (sidebar + embed)"],
          ["/debug", "—", "Debug console"],
          ["/docs", "—", "This documentation"],
        ],
      },
    ],
  },
  {
    id: "architecture",
    title: "Architecture",
    description: "Project structure and wallet setup",
    sections: [
      { title: "Directory layout", content: "", type: "heading" },
      {
        title: "Key paths",
        content: "app/\n  page.tsx, bio/page.tsx, credits/page.tsx, greeting/page.tsx\n  explorer/page.tsx, docs/page.tsx, debug/page.tsx\n  components/Navigation.tsx\n  lib/aleo.ts          # stringToField, fieldToString, PROGRAM_ID, CREDITS_PROGRAM_ID\n  wallet/\n    WalletProvider.tsx  # Aleo + Leo wallet, modal only when visible\n    WalletButton.tsx\n    utils/RequestTransaction.tsx, RequestRecords.tsx, ...\nprogram/               # onchainbio.aleo\n  src/main.leo, deploy.sh\nprogram-greeting/      # greeting.aleo\n  src/main.leo, deploy.sh",
        type: "code",
      },
      {
        title: "Wallet provider",
        content: "WalletProvider wraps the app with AleoWalletProvider and WalletModalProvider. The wallet modal is rendered only when visible (useWalletModal().visible) so the overlay never blocks the page when closed. WalletModal uses container=\"#wallet-modal-container\" when open.",
        type: "text",
      },
      {
        title: "Network & fee",
        content: "All transaction and wallet code uses WalletAdapterNetwork.TestnetBeta. Fee is set per call (e.g. 150_000 for register_bio, 35_000 for transfer_public and greet).",
        type: "text",
      },
    ],
  },
  {
    id: "programs",
    title: "Programs reference",
    description: "Leo programs and transitions used in this app",
    sections: [
      { title: "onchainbio.aleo", content: "", type: "heading" },
      {
        title: "Record",
        content: "BioProfile { owner, name, bio, created_at_block, updated_at_block }",
        type: "code",
      },
      {
        title: "Transitions",
        content: "",
        type: "table",
        rows: [
          ["Transition", "Inputs", "Output"],
          ["register_bio", "name: field, bio: field, current_block: u64", "BioProfile"],
          ["update_bio", "bio_record: BioProfile, new_name, new_bio, current_block: u64", "BioProfile"],
          ["get_bio", "bio_record: BioProfile", "(address, field, field, u64, u64)"],
        ],
      },
      { title: "credits.aleo (native)", content: "", type: "heading" },
      {
        title: "Usage",
        content: "Native program; no deploy. We use requestRecords(\"credits.aleo\") and transfer_public(receiver_address, amount_u64). Amount in microcredits (1 credit = 1_000_000).",
        type: "text",
      },
      { title: "greeting.aleo", content: "", type: "heading" },
      {
        title: "Transition",
        content: "greet(message: field) -> (field). Deploy from program-greeting/ with ./deploy.sh <private_key>.",
        type: "code",
      },
    ],
  },
  {
    id: "wallet-api",
    title: "Wallet API",
    description: "useWallet, Transaction, requestTransaction, requestRecords",
    sections: [
      { title: "useWallet", content: "", type: "heading" },
      {
        title: "Import and usage",
        content: 'import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";\n\nconst {\n  publicKey,        // connected address or null\n  requestTransaction,\n  requestRecords,\n  connect,\n  disconnect,\n} = useWallet();',
        type: "code",
      },
      {
        title: "Submitting a transaction",
        content: 'import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";\n\nconst network = WalletAdapterNetwork.TestnetBeta;\nconst tx = Transaction.createTransaction(\n  publicKey,\n  network,\n  "onchainbio.aleo",\n  "register_bio",\n  [stringToField(name), stringToField(bio), "0u64"],\n  150_000\n);\nconst txId = await requestTransaction(tx);',
        type: "code",
      },
      {
        title: "Fetching records",
        content: 'const records = await requestRecords("onchainbio.aleo");\n// or requestRecords("credits.aleo");\n// Returns array of record strings (wallet may decrypt with view key).',
        type: "code",
      },
      {
        title: "RequestTransaction component",
        content: "app/wallet/utils/RequestTransaction.tsx is a button component that takes program, functionName, inputs, fee, network and calls requestTransaction. Use it when you want a declarative trigger.",
        type: "text",
      },
    ],
  },
  {
    id: "lib-aleo",
    title: "App lib: aleo.ts",
    description: "Field encoding and program IDs",
    sections: [
      {
        title: "stringToField(str, maxBytes?)",
        content: "Encodes a string as a Leo field (UTF-8 bytes as big-integer). Default max 31 bytes. Used for transition inputs (name, bio, message).",
        type: "text",
      },
      {
        title: "Example",
        content: 'import { stringToField } from "@/app/lib/aleo";\nstringToField("Hello");  // => "72field" (or similar)\nstringToField("Hi", 31);',
        type: "code",
      },
      {
        title: "fieldToString(field)",
        content: "Decodes a Leo field string (e.g. from record or return value) back to a JavaScript string.",
        type: "text",
      },
      {
        title: "Constants",
        content: 'PROGRAM_ID = "onchainbio.aleo"\nCREDITS_PROGRAM_ID = "credits.aleo"',
        type: "code",
      },
    ],
  },
  {
    id: "explorer",
    title: "Explorer (AleoLens)",
    description: "Embedded AleoLens explorer and APIs used for data",
    sections: [
      {
        title: "Explorer page",
        content: "The /explorer route embeds AleoLens in an iframe with a sidebar. Sidebar sections: Overview, Blocks, Transactions, Programs, DeFi, Validators, API Documentation. Base URL is set by NEXT_PUBLIC_ALEOLENS_URL (default: http://localhost:3001). Run the AleoLens app (see AleoLens folder) on port 3001 to use the embedded explorer.",
        type: "text",
      },
      {
        title: "AleoLens features",
        content: "Network overview (latest block, tx metrics), blocks list and block details, transaction history and lookup, program source and mappings, validators/committee, DeFi analytics (TVL, tokens). All data comes from Provable APIs; no database required.",
        type: "text",
      },
      { title: "APIs used by AleoLens (Provable)", content: "", type: "heading" },
      {
        title: "V2 REST (dashboard, metrics)",
        content: "",
        type: "table",
        rows: [
          ["Method", "Endpoint", "Description"],
          ["GET", "/api/v2/block/latest", "Latest block information"],
          ["GET", "/api/v2/block/height/latest", "Latest block height"],
          ["GET", "/api/v2/block/hash/latest", "Latest block hash"],
          ["GET", "/api/v2/metrics/transactions", "Transaction metrics per day"],
        ],
      },
      {
        title: "V1 (blocks, transactions, programs)",
        content: "",
        type: "table",
        rows: [
          ["Method", "Endpoint", "Description"],
          ["GET", "/api/blocks", "Paginated blocks (?page=1&limit=20&height=optional)"],
          ["GET", "/api/blocks/[height]", "Block by height with transactions"],
          ["GET", "/api/transactions", "Recent transactions (?limit=50&program=optional)"],
          ["GET", "/api/programs", "Program source and mappings (?id=credits.aleo)"],
          ["GET", "/api/validators", "Committee validators"],
        ],
      },
      {
        title: "Base URLs",
        content: "Provable v1: https://api.explorer.provable.com/v1/mainnet (or /testnet)\nProvable v2: https://api.explorer.provable.com/v2/mainnet (or /testnet)\nRate limit: 5 req/s, 100k req/day.",
        type: "code",
      },
    ],
  },
  {
    id: "installation",
    title: "Installation",
    description: "Set up the app and Leo CLI",
    sections: [
      { title: "Prerequisites", content: "Node.js 18+, Leo CLI, Git. Leo Wallet browser extension for testing.", type: "list" },
      { title: "Install app deps", content: "npm install", type: "code" },
      { title: "Leo CLI", content: "curl -L https://get.aleo.org/install | bash\nsource ~/.zshrc   # or ~/.bash_profile\nleo --version", type: "code" },
      { title: "Run dev server", content: "npm run dev\n# Open http://localhost:3000", type: "code" },
      { title: "Testnet", content: "Get testnet credits from faucet.aleo.org. Generate key: leo account new.", type: "text" },
    ],
  },
  {
    id: "deployment",
    title: "Deployment",
    description: "Deploy Leo programs to testnet",
    sections: [
      { title: "onchainbio.aleo", content: "cd program\nleo build\n./deploy.sh YOUR_PRIVATE_KEY", type: "code" },
      { title: "greeting.aleo", content: "cd program-greeting\nleo build\n./deploy.sh YOUR_PRIVATE_KEY", type: "code" },
      { title: "Manual deploy", content: "LEO_DISABLE_UPDATE_CHECK=1 leo deploy --private-key KEY --network testnet --yes --broadcast", type: "code" },
      { title: "Verify", content: "Check transaction and program on testnet.explorer.provable.com", type: "text" },
    ],
  },
  {
    id: "hooks-helpers",
    title: "Hooks & helpers",
    description: "React hooks and UI utilities",
    sections: [
      { title: "Wallet hooks", content: "useWallet() from @demox-labs/aleo-wallet-adapter-react: publicKey, requestTransaction, requestRecords, connect, disconnect, etc.", type: "text" },
      { title: "Modal", content: "useWalletModal() from @demox-labs/aleo-wallet-adapter-reactui: visible, setVisible(true/false).", type: "text" },
      { title: "Wallet utils (components)", content: "RequestTransaction, RequestRecords, RequestRecordPlaintexts, RequestTransactionHistory, DeployProgram, SignMessage, DecryptMessage, SubscribeToEvents — from app/wallet/utils.", type: "list" },
      { title: "Error handling", content: 'try {\n  const txId = await requestTransaction(tx);\n} catch (e) {\n  const msg = e instanceof Error ? e.message : String(e);\n  setError(msg);\n}', type: "code" },
      { title: "Loading", content: "Use local state: const [loading, setLoading] = useState(false); set before request, clear in finally.", type: "code" },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    description: "Common issues and fixes",
    sections: [
      { title: "Page not clickable", content: "If the wallet modal overlay blocks the page: ensure WalletModal is only rendered when visible (see WalletProvider and WalletModalWithContainer). CSS in globals.css makes #wallet-modal-container non-blocking.", type: "text" },
      { title: "BigInt / ES2020 build error", content: "If you see 'BigInt literals are not available when targeting lower than ES2020', use BigInt(0) and BigInt(256) instead of 0n and 256n (see app/lib/aleo.ts).", type: "text" },
      { title: "Wrong URL /credit", content: "The app redirects /credit to /credits in next.config.ts redirects.", type: "text" },
      { title: "Transaction fails", content: "Check: wallet connected, sufficient fee/credits, correct program id and transition name, inputs in Leo format (e.g. \"123field\", \"0u64\").", type: "list" },
    ],
  },
];

function renderSectionContent(
  section: DocSection["sections"][0],
  index: number
) {
  if (section.type === "code") {
    return <CodeBlock content={section.content} id={`code-${index}`} />;
  }
  if (section.type === "list") {
    return (
      <ul className="list-disc list-inside space-y-1 text-black/80 text-sm sm:text-base">
        {section.content.split("\n").map((item, i) => (
          <li key={i} className="ml-2">{item}</li>
        ))}
      </ul>
    );
  }
  if (section.type === "table" && section.rows?.length) {
    const [head, ...body] = section.rows;
    return (
      <div className="overflow-x-auto -mx-1 sm:mx-0">
        <table className="w-full border border-black/20 rounded-lg overflow-hidden text-left min-w-[280px]">
          <thead>
            <tr className="bg-black/5">
              {head.map((cell, i) => (
                <th key={i} className="px-2 sm:px-4 py-2 font-semibold text-black border-b border-black/20 text-xs sm:text-sm">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-black/10 last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 sm:px-4 py-2 text-black/80 text-xs sm:text-sm break-words">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (section.type === "heading") {
    return (
      <h3 className="text-lg sm:text-xl font-bold text-black mt-4 sm:mt-6 mb-2 first:mt-0">
        {section.title || section.content}
      </h3>
    );
  }
  return (
    <p className="text-black/80 leading-relaxed text-sm sm:text-base">{section.content}</p>
  );
}

export default function DocsPage() {
  const [selectedDoc, setSelectedDoc] = useState(docs[0]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFA977" }}>
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-2">
          Documentation
        </h1>
        <p className="text-black/80 mb-4 sm:mb-6 md:mb-8 max-w-2xl text-sm sm:text-base">
          Stack, architecture, programs, wallet API, and guides for this Aleo
          scaffold.
        </p>

        {/* Mobile: section dropdown */}
        <div className="md:hidden mb-4">
          <label htmlFor="docs-section-select" className="sr-only">
            Choose section
          </label>
          <select
            id="docs-section-select"
            value={selectedDoc.id}
            onChange={(e) => {
              const doc = docs.find((d) => d.id === e.target.value);
              if (doc) setSelectedDoc(doc);
            }}
            className="w-full rounded-lg border-2 border-black/20 bg-white px-4 py-3 text-black font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-black/30"
          >
            {docs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-4 gap-4 md:gap-6">
          <aside className="hidden md:block md:col-span-1">
            <nav className="bg-white rounded-lg p-4 sticky top-24 shadow-sm">
              <h2 className="text-lg font-bold text-black mb-4">Sections</h2>
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        selectedDoc.id === doc.id
                          ? "bg-black text-white"
                          : "text-black/70 hover:bg-black/10"
                      }`}
                    >
                      <span className="font-medium block">{doc.title}</span>
                      <span className="text-xs mt-0.5 opacity-80 line-clamp-2">
                        {doc.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="min-w-0 md:col-span-3">
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-4 sm:mb-6">
                {selectedDoc.title}
              </h2>
              <div className="space-y-4 sm:space-y-6">
                {selectedDoc.sections.map((section, index) => (
                  <div key={index}>
                    {section.type !== "heading" && section.title ? (
                      <h3 className="text-base sm:text-lg font-bold text-black mb-2">
                        {section.title}
                      </h3>
                    ) : null}
                    {renderSectionContent(section, index)}
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
