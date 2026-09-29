<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- All room coordinates and the post-ENTER scene's percentage layer boxes live in src/scenes/config.ts, keeping placement adjustments in one place.
- The post-ENTER scene uses seven images from the single commit-pinned GitHub-backed base in src/config/cdn.ts; never bundle them so copied workspaces and Vercel load the same artwork.
- The chamber uses commit-pinned GitHub-backed CDN assets so a fresh Lovable workspace or Vercel deployment does not rely on an old project's asset origin.
- Chamber object placement lives in src/scenes/config.ts in the 1672x941 background's pixel coordinate system; scale the frame uniformly and preserve each image's native aspect ratio to avoid stretching.
- The entry artwork uses a commit-pinned GitHub-backed CDN URL so copying the project or deploying to Vercel does not depend on a Lovable asset origin.
