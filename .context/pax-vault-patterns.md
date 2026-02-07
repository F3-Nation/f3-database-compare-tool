# PAX-VAULT Patterns Reference

Patterns borrowed from the PAX-VAULT app for consistency.

| Pattern          | PAX-VAULT Source          | Our Adaptation                      |
| ---------------- | ------------------------- | ----------------------------------- |
| Firebase secrets | scripts/firebase-env.sh   | Same structure, DB URL secrets      |
| apphosting.yaml  | apphosting.yaml           | Same format, DB URLs                |
| CI/CD            | .github/workflows/pr.yaml | Identical 6-job structure           |
| .env management  | .env.example / .gitignore | Same `****` placeholder pattern     |
| firebase.json    | firebase.json             | Same structure, different backendId |
| ESLint           | eslint.config.mjs         | FlatCompat + next/core-web-vitals   |
| TypeScript       | tsconfig.json             | strict + @/\* alias                 |
