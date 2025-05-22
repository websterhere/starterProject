# Project Overview: Invoice Management Tool with AI SDK and QuickBooks

## Overview
This project is an AI-powered invoice management application that integrates the Vercel AI SDK with QuickBooks Online. It features a dual-panel interface: one for displaying invoice data and another for an AI chat assistant, allowing users to interact with their invoices using natural language.

## Architecture
- **QuickBooks Data Connector:** Handles all communication with QuickBooks APIs for invoice CRUD operations.
- **AI Tools (Vercel AI SDK):** Implements invoice-related tools (fetch by ID, by customer, top 5, etc.) as callable functions for the AI assistant.
- **React-based UI:** Dual-panel layout with invoice display and AI chat interface.

## AI SDK Tooling
- Tools are defined using the Vercel AI SDK's `tool` helper, with:
  - **Description:** Guides the AI on when to use the tool
  - **Parameters:** Defined with Zod schemas for validation
  - **Execute Function:** Implements the actual QuickBooks logic
- Multi-step interactions and tool state management are supported for complex workflows.
- Tool choice can be set to 'auto', 'required', or a specific tool for flexible AI behavior.

## QuickBooks Integration
- **Read:** Retrieve invoice details and lists using `qbo.getInvoice` and `qbo.findInvoices`.
- **Create:** Add new invoices via `qbo.createInvoice`.
- **Update:** Modify or void invoices with `qbo.updateInvoice`.
- **Delete:** Remove invoices using `qbo.deleteInvoice`.
- **Email:** Send invoice PDFs via `qbo.sendInvoicePdf`.

## UI/UX
- **Dual-Panel Layout:**
  - Left: Invoice data (list, details, search results)
  - Right: AI chat assistant (streaming responses, tool invocation feedback)
- **Streaming AI Responses:** Real-time updates to chat and invoice panels as the AI processes user queries and tool calls.

## Error Handling
- Handles tool invocation errors, invalid arguments, and QuickBooks API errors with user-friendly feedback.
- Tracks tool state and updates UI accordingly during multi-step workflows.

## Implementation Roadmap
1. Set up QuickBooks OAuth flow
2. Define invoice tools using the AI SDK tool helper
3. Implement execute functions with QuickBooks API calls
4. Create the dual-panel UI
5. Integrate streaming AI responses
6. Add error handling for tool execution
7. Implement multi-step workflows for complex invoice operations

This project serves as a robust, extensible foundation for AI-driven invoice management with QuickBooks and the Vercel AI SDK.

## Main Features
- **QuickBooks Integration:** Securely connects to QuickBooks to fetch and manage invoices.
- **AI Chat Assistant:** Users can interact with an AI assistant to get invoice details, top invoices, or search by customer name.
- **Invoice Search Tools:** Tools to fetch invoices by ID, by customer name, or get the top 5 invoices by total spending.
- **Modern UI:** Responsive, user-friendly interface for viewing and interacting with invoices.

## Tech Stack
- **Frontend:** React, Next.js, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, Node.js
- **AI:** OpenAI GPT-4 via `ai` and `@ai-sdk/openai` libraries
- **QuickBooks SDK:** `node-quickbooks`

## Folder Structure
```
invoice-ai/
  src/
    app/
      api/
        chat/                # AI chat API route
        quickbooks/
          invoices/          # Invoice-related API endpoints
            by-customer/     # Find invoices by customer name
            top5/            # Top 5 invoices endpoint
      ChatPanel.tsx          # Chat UI component
      page.tsx               # Main page and invoice panel
    lib/
      tools/
        quickbooksTools.ts   # All QuickBooks-related tools
  public/
  .env.local                # Environment variables
  package.json
  README.md
``` 