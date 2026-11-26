# Delivery workflow

For requested application changes, finish the full delivery workflow by default:

- Implement and run appropriate tests, type checks, lint checks, and the production build.
- Commit the task's changes and push to `main`, preserving unrelated work.
- Verify that Coolify finishes the matching production deployment and reports the application healthy.
- Smoke-test the affected behavior on https://uutil.space and report the result.

The user has requested automatic deployment after verified changes; do not wait for a separate deploy request. Follow any explicit instruction to defer deployment. Read-only reviews, questions, or diagnosis alone do not authorize changes or deployment.
