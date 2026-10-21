# DaV-nky Agent Guidelines & Tools

## DaVnky-A Workspace & Sync Tool Policy

A scratch/editing copy of the site exists at:
`C:\Users\Victor\Desktop\DaVnky-A`

Victor uses this folder to experiment with and edit important site files without affecting the main repository (`DaV-nky`).

### CRITICAL SAFETY RULE
**You (the AI assistant) are NEVER allowed to copy, sync, or commit changes from `DaVnky-A` into `DaV-nky` unless Victor has EXPLICITLY instructed or permitted you to do so in the current conversation.**
- You may run status checks (`tools/sync-a.py status`) or diffs (`tools/sync-a.py diff`) to report differences when relevant.
- You must NEVER execute `tools/sync-a.py apply` (or copy files across manually) without Victor's explicit permission.

### Using the Tool
- **Status check**: `python tools/sync-a.py status` (what changed in the copy, what changed here, and what changed on both sides)
- **Review diff**: `python tools/sync-a.py diff`
- **Apply the copy's changes (Victor approved only)**: `python tools/sync-a.py apply --yes`
  *(Only files changed in the copy alone are copied; DaV-nky's own newer files are never overwritten; files changed on both sides are listed and left alone. DaV-nky's old versions go into `_your-versions/backup-before-a-<timestamp>` first. It never commits: publishing is Victor's.)*
- **Bring DaV-nky's newer files into the copy**: `python tools/sync-a.py refresh --yes` (safe: it only writes inside DaVnky-A)
- How it knows which side changed: `DaVnky-A/.sync-base.json` (the files as they were when the two last agreed). Don't delete it.
- See also CLAUDE.md, which has every other rule for this site.

## Security: letters and bottles
A kept bottle is a stranger's words, shown to every visitor. The three letter renderers (`Sky.txtToHtml` in sky/sky.js, the desk's `inline` in sky/desk.js, tools/letters.html's) escape quote marks and pass every link and picture through `safe()` (only `http(s):`, `mailto:` or the site's own files). **Never remove or loosen that, in any of the three**: without it a visitor's bottle can run their code for everyone. (CLAUDE.md, *Secrets and safety*.)
