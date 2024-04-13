# Details for Developers

## Libraries

### Next JS

This app is built using Next.JS using the App Router structure.
However, to avoid common issues with wallet integrations and SSR, the app is run entirely client-side, which the exception of the auto-stake-activation feature which is a backend API.

### Wagmi + Viem + RainbowKit

This app uses Viem as the engine for chain interaction, RainbowKit for wallet selection, and Wagmi to tie them together into React Hooks.

### TailwindCSS + HeadlessUI + DaisyUI

The app is styled almost entirely with TailwindCSS.
It also uses some reusable components from Headless (e.g. for modals).
And also DaisyUI for some theming and additional components.

## Code structure

- The pages are defined in the /src/app folder
- Business logic such as chain queries and interactions are in /src/features
- Generic, reusable components are in /src/components
- Constants and configs are in /src/config

## Runtime

Currently the app is configured to be run on Vercel. However, since the app runs entirely client-side, it could be restructured to be served from more decentralized infra like Fleek or IPFS, although the auto-stake-activation feature would be tricky to port.
