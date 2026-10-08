// lucide-react-native: `import { House, Map } from 'lucide-react-native'` → har ikonka o'z faylidan
// (`lucide-react-native/icons/house`). Aks holda Metro butun to'plamni (1 500+ ikonka) ilovaga qo'shib yuboradi.
const fs = require('fs');
const path = require('path');

let iconFiles;
function lucideIcons() {
  if (iconFiles) return iconFiles;
  iconFiles = new Map();
  const index = path.join(__dirname, 'node_modules/lucide-react-native/dist/esm/lucide-react-native.mjs');
  const re = /export \{([^}]+)\} from '\.\/icons\/([\w-]+)\.mjs'/g;
  for (const m of fs.readFileSync(index, 'utf8').matchAll(re)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/^default as /, '');
      iconFiles.set(name, m[2]);
    }
  }
  return iconFiles;
}

function lucideDeepImports({ types: t }) {
  return {
    visitor: {
      ImportDeclaration(p) {
        if (p.node.source.value !== 'lucide-react-native' || p.node.importKind === 'type') return;
        const icons = lucideIcons();
        const keep = [];
        const deep = [];
        for (const s of p.node.specifiers) {
          if (s.importKind === 'type') continue;
          const file = t.isImportSpecifier(s) && t.isIdentifier(s.imported) ? icons.get(s.imported.name) : undefined;
          if (file) {
            deep.push(t.importDeclaration([t.importDefaultSpecifier(t.identifier(s.local.name))], t.stringLiteral(`lucide-react-native/icons/${file}`)));
          } else keep.push(s);
        }
        if (!deep.length) return;
        if (keep.length) {
          p.node.specifiers = keep;
          p.insertAfter(deep);
        } else p.replaceWithMultiple(deep);
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo — expo paketi ichidagisi (Expo'ning o'zi ham shuni ishlatadi)
  const preset = require.resolve('babel-preset-expo', { paths: [path.dirname(require.resolve('expo/package.json'))] });
  return { presets: [preset], plugins: [lucideDeepImports] };
};
