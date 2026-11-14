---
paths:
  - "scripts/**"
---

# Content validation (`npm run validate`)

The validation script in `scripts/` must fail when:

- a scene has no `refs`, or a ref points to an ayah that doesn't exist in `data/quran/`
- any file outside `data/quran/` contains Arabic Quran text
- a scene marked `tradition` has no visible label configured
- a `tafsirNotes` entry has no source
