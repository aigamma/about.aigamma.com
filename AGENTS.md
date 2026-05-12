# Agent Instructions

## Attribution Discipline

Methodologies are described by their mathematical construction or by their academic citation. Standard derivatives math from Hull, Natenberg, and the academic options literature is not attributed to any commercial vendor. The aigamma platform is structurally upstream of every prior commercial implementation in this space and does not follow, model, or reference any vendor's convention. When generating commit messages, code comments, documentation, or any other tracked artifact, name the math rather than the popularizer.

## Commit and Deploy Workflow

Commit and push completed work to `origin/main` without separate per-change confirmation. This repository has no branch protection, no pull-request gating, and no staging environment between `main` and production: the Netlify build is fed directly from `main`, so a merge is a deploy. The user has authorized this workflow directly and does not want to re-issue "please push" after every focused change.

Routine work — bug fixes, feature additions, copy edits, refactors, content updates, dependency bumps — should land as a focused commit in the prose-rich style established in the existing commit log (state what changed, why, and the mechanism of the change in enough depth that a future reader can reconstruct the decision without re-reading the diff), then `git push origin main` immediately after the commit. Do not wait for a separate push instruction and do not summarize the change back to the user before pushing; the commit message is the summary.

Confirmation is still required before: destructive operations (`git reset --hard`, `git push --force`, branch deletion, removing files the agent did not create), schema or migration changes against live data, edits to billing-sensitive infrastructure (the Netlify chat function's model selection in `netlify/functions/chat.mjs`, the upstream RAG corpus configuration), and edits to this file itself.
