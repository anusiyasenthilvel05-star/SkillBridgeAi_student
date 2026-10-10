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

## Application architecture
- Use public TanStack leaf routes for website/auth and the client-only authenticated layout for learner pages; this keeps private sessions out of SSR.
- Keep learning operations in authenticated server functions and AI/PDF helpers in server-only modules; credentials and answer keys must never reach an unsubmitted quiz.
- Store private files in owner-scoped Cloud storage and enforce unique content hashes per learner; duplicate prevention must hold under concurrent uploads.
- Use transactional database scoring and derive topic mastery from stored answers; browser-submitted scores are never trusted.
- Keep reusable site, auth and learner views outside route files; route leaves supply unique metadata and page parameters.
