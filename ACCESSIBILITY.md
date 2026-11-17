# Accessibility

`@xkid1/multipart` is a server-side library with no user interface. For this project,
accessibility means that its **documentation**, **error messages** and **developer
tooling** work for everyone, including people using screen readers, magnifiers,
keyboard-only workflows, or translation tools.

## What we do

### Documentation

- Headings follow a logical order (one H1, then H2 → H3), so screen-reader users can
  navigate by heading.
- Code samples are in fenced blocks with a language, so they render as code and can be
  copied as text. Content is never shown only as an image of code.
- Badges and images have alt text that states what they show (for example "Node.js 18 | 20 |
  22 | 24 | 26"). Badges duplicate information that is also in the text.
- Tables are used for tabular data only, and each has a header row.
- Links describe their destination; we avoid "click here".
- Plain, consistent language: technical terms are used the same way throughout, and we
  avoid idioms that translate poorly.

### Error messages and API

- Errors are plain text with a stable `code` and an HTTP `statusCode`
  (see [Errors](./README.md#errors)), so they can be read, searched and handled without
  relying on color or formatting.
- Exported functions have JSDoc, so editors and screen readers can announce
  parameter and return descriptions.

### Tooling

- Everything works from a terminal with the keyboard. No step requires a GUI.
- The logger only adds color in an interactive terminal and respects
  [`NO_COLOR`](https://no-color.org); the end-user test runner does the same.
  Status is always written as text (`PASS`, `FAIL`, `SKIP`), never shown by color alone.
- Issue and pull request templates use labeled form fields.

## Known gaps

- Documentation is English-only. Translations are welcome.
- There are no diagrams yet. If we add any, they will have a text equivalent.
- We haven't done a formal audit against a standard such as WCAG. The practices above
  are what we follow, not a claim of conformance.

## Reporting a barrier

If something in the docs, error output or tooling is hard to use with your setup, please
[open an issue](https://github.com/xkid1/multipart/issues/new/choose) using the
**Question or other request** form. Tell us:

- where the barrier is (page, command, or message);
- what you expected and what happened;
- your assistive technology or setup, if you're comfortable sharing it.

Accessibility issues are treated as bugs.
