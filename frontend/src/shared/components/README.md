# Shared components

Reusable single-file components live directly in this directory and are imported by file name:

```tsx
import { Button } from '@/shared/components/Button';
```

Keep a component in its own subdirectory only when it has related implementation files, such as helper components. In that case, expose the public API from the directory's `index.ts`. Framework-generated primitives remain in `ui/`.
