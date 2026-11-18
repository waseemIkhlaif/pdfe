// The shell stylesheet is shipped next to the compiled components: apps import '@pdfe/ui-web/styles.css'.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
copyFileSync('src/styles/shell.css', 'dist/styles.css');
