const agentMarkdown = `# Design Studio

An open platform for designers and product managers who build. Turn ideas into working prototypes with an agent that understands your components, context, and design principles.

## Install

1. At https://github.com/itspatmorgan/design-studio-starter, choose **Use this template → Create a new repository**. Select the owner (your account or organization), enter a repository name, and choose visibility.

2. In your new repository, copy the HTTPS clone URL from **Code**. Clone that copy, never the starter repository directly. Replace YOUR-ACCOUNT and YOUR-STUDIO below with its owner and repository name.

\`\`\`sh
git clone https://github.com/YOUR-ACCOUNT/YOUR-STUDIO.git
cd YOUR-STUDIO
\`\`\`

3. Install mise if needed: https://mise.jdx.dev/installing-mise.html. Run from the repository folder:

\`\`\`sh
mise install
mise exec -- pnpm install
mise exec -- pnpm dev
\`\`\`

\`mise install\` installs the configured Node.js and pnpm versions. \`pnpm install\` installs project dependencies; \`pnpm dev\` starts the local development server. \`mise exec --\` selects the project's tool versions without shell activation. If mise is already activated, plain \`pnpm install\` and \`pnpm dev\` work too.

Open the local URL printed by Vite. Keep the server running while using Studio.

## Use

Open the repository in your existing editor or coding agent, and run Studio alongside it. Read README.md and AGENTS.md before changing files. Follow the setup instructions to configure studio identity and the contributor. Resolve the assigned system before editing a prototype.

A prototype keeps views, diagrams, canvases, and documents together. Its assigned system supplies the theme, components, context, rules, and skills.

This marketing project uses the Marketing system: Geist, warm neutrals, and shadcn/Base UI components. The self-contained demo examples are rendered in code using the same Marketing system. Studio supplies the shared artifact tools.

A design operating system includes theme and components, context and principles, and rules and skills. The starter provides a considered starting point, fits your coding-agent workflow, and uses open-source tools and open file formats you can change and extend.

V3 adapts the personal website’s drafting-table illustrations and feedback-triage demo using React, CSS, and SVG. No image assets or personal portrait are included.

## Reference

Repository: https://github.com/itspatmorgan/design-studio-starter
Setup instructions: https://github.com/itspatmorgan/design-studio-plugin/blob/main/SETUP.md
`;

export default agentMarkdown;
