# Workflow: how changes reach the live site

Two branches on GitHub:
- `production`: what visitors see.
- `main`: the working copy. Every upload here builds a **private preview**.

## For any change
1. Describe what you want to Claude.
2. Claude explains what changes and what could be affected (and any database or cost impact), builds it, and checks what it can.
3. Upload the files to GitHub **on the `main` branch**.
4. Open the preview: Vercel, your project, Deployments, the newest row marked Preview, Visit. Check it on phone and desktop. Ask for revisions freely; nothing is live.
5. When you approve, release: on GitHub open a pull request from `main` into `production` (GitHub shows "Compare & pull request"), then click **Merge pull request**. Vercel publishes in about two minutes.
6. Confirm the live site looks right.

## If something goes wrong
- A build that fails does not affect the live site. Vercel keeps serving the last good version.
- A bad release: Vercel, Deployments, find the last good Production deployment, open its menu, and promote or redeploy it. Code goes back within about a minute. **Database changes do not roll back automatically**, which is why backups and approval for schema changes matter.

## Rules
- Nothing reaches `production` without the founder clicking Merge.
- Previews use the staging database and Stripe test keys only.
- Schema (database) changes are explained and approved first.
