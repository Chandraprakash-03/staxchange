# Page snapshot

```yaml
- navigation:
  - link "AI Tech Stack Converter":
    - /url: /
    - img
    - text: AI Tech Stack Converter
  - link "Home":
    - /url: /
  - link "Projects":
    - /url: /projects
  - link "Import":
    - /url: /import
  - button "Import Project"
  - button "Sign In"
- main:
  - heading "Import Your Project" [level=1]
  - paragraph: Import your GitHub repository and let AI convert it to your target tech stack
  - heading "Enter GitHub Repository URL" [level=2]
  - text: Repository URL
  - textbox "Repository URL"
  - button "Import Repository" [disabled]
  - heading "Supported Repository Types" [level=3]
  - img
  - paragraph: Frontend Projects
  - paragraph: React, Vue, Angular, Svelte, vanilla JS/TS
  - img
  - paragraph: Backend Projects
  - paragraph: Node.js, Python, Java, Go, PHP, Ruby
  - img
  - paragraph: Full-Stack Projects
  - paragraph: Next.js, Nuxt.js, SvelteKit, Django, Rails
  - img
  - paragraph: Mobile Projects
  - paragraph: React Native, Flutter, Ionic
- alert
```